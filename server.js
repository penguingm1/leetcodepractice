const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve static files

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Database connected successfully');
  }
});

// API Routes

// Get all problems
app.get('/api/problems', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, up.solved, up.notes, up.solved_at
      FROM problems p
      LEFT JOIN user_progress up ON p.id = up.problem_id
      ORDER BY p.concept, p.title
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching problems:', err);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

// Get problems by concept
app.get('/api/problems/concept/:concept', async (req, res) => {
  try {
    const { concept } = req.params;
    const result = await pool.query(`
      SELECT p.*, up.solved, up.notes, up.solved_at
      FROM problems p
      LEFT JOIN user_progress up ON p.id = up.problem_id
      WHERE p.concept = $1
      ORDER BY p.title
    `, [concept]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching problems by concept:', err);
    res.status(500).json({ error: 'Failed to fetch problems' });
  }
});

// Update problem progress (solved status and notes)
app.put('/api/problems/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { solved, notes } = req.body;
    
    const result = await pool.query(`
      INSERT INTO user_progress (problem_id, solved, notes, solved_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (problem_id)
      DO UPDATE SET
        solved = $2,
        notes = $3,
        solved_at = $4,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `, [id, solved, notes, solved ? new Date() : null]);
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating progress:', err);
    res.status(500).json({ error: 'Failed to update progress' });
  }
});

// Get progress statistics
app.get('/api/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_problems,
        COUNT(CASE WHEN up.solved = true THEN 1 END) as solved_problems,
        COUNT(CASE WHEN p.difficulty = 'Easy' THEN 1 END) as easy_count,
        COUNT(CASE WHEN p.difficulty = 'Medium' THEN 1 END) as medium_count,
        COUNT(CASE WHEN p.difficulty = 'Hard' THEN 1 END) as hard_count
      FROM problems p
      LEFT JOIN user_progress up ON p.id = up.problem_id
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Import problems from CSV (one-time setup)
app.post('/api/import-problems', async (req, res) => {
  try {
    const fs = require('fs');
    const csv = require('csv-parser');
    
    const problems = [];
    fs.createReadStream('leetcode_master_with_popularity.csv')
      .pipe(csv())
      .on('data', (row) => {
        problems.push({
          title: row.Title || row.title,
          concept: row.Concept || row.concept,
          difficulty: row.Difficulty || row.difficulty,
          acceptance_rate: parseFloat(row.Acceptance || row.acceptance) || null,
          popularity: parseInt(row.Popularity || row.popularity) || null,
          leetcode_link: row.LeetCodeLink || row.leetcodeLink
        });
      })
      .on('end', async () => {
        try {
          // Clear existing problems
          await pool.query('DELETE FROM problems');
          
          // Insert new problems
          for (const problem of problems) {
            await pool.query(`
              INSERT INTO problems (title, concept, difficulty, acceptance_rate, popularity, leetcode_link)
              VALUES ($1, $2, $3, $4, $5, $6)
            `, [problem.title, problem.concept, problem.difficulty, problem.acceptance_rate, problem.popularity, problem.leetcode_link]);
          }
          
          res.json({ message: `Imported ${problems.length} problems successfully` });
        } catch (err) {
          console.error('Error importing problems:', err);
          res.status(500).json({ error: 'Failed to import problems' });
        }
      });
  } catch (err) {
    console.error('Error reading CSV:', err);
    res.status(500).json({ error: 'Failed to read CSV file' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 