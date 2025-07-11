const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.')); // Serve static files

// Database connection with better error handling
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
});

// Test database connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    console.log('🔧 Make sure PostgreSQL is running and .env file is configured');
  } else {
    console.log('✅ Database connected successfully');
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// Get all problems with progress
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

// Get a single problem by ID
app.get('/api/problems/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT p.*, up.solved, up.notes, up.solved_at
      FROM problems p
      LEFT JOIN user_progress up ON p.id = up.problem_id
      WHERE p.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Problem not found' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching problem:', err);
    res.status(500).json({ error: 'Failed to fetch problem' });
  }
});

// Update problem progress (solved status and notes)
app.put('/api/problems/:id/progress', async (req, res) => {
  try {
    const { id } = req.params;
    const { solved, notes } = req.body;
    
    // Validate input
    if (typeof solved !== 'boolean') {
      return res.status(400).json({ error: 'solved must be a boolean' });
    }
    
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
        COUNT(CASE WHEN p.difficulty = 'Hard' THEN 1 END) as hard_count,
        COUNT(CASE WHEN p.difficulty = 'Easy' AND up.solved = true THEN 1 END) as solved_easy,
        COUNT(CASE WHEN p.difficulty = 'Medium' AND up.solved = true THEN 1 END) as solved_medium,
        COUNT(CASE WHEN p.difficulty = 'Hard' AND up.solved = true THEN 1 END) as solved_hard
      FROM problems p
      LEFT JOIN user_progress up ON p.id = up.problem_id
    `);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching stats:', err);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get concepts with progress
app.get('/api/concepts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.concept,
        COUNT(*) as total_problems,
        COUNT(CASE WHEN up.solved = true THEN 1 END) as solved_problems
      FROM problems p
      LEFT JOIN user_progress up ON p.id = up.problem_id
      GROUP BY p.concept
      ORDER BY p.concept
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching concepts:', err);
    res.status(500).json({ error: 'Failed to fetch concepts' });
  }
});

// Search problems
app.get('/api/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Search query required' });
    }
    
    const result = await pool.query(`
      SELECT p.*, up.solved, up.notes, up.solved_at
      FROM problems p
      LEFT JOIN user_progress up ON p.id = up.problem_id
      WHERE p.title ILIKE $1 OR p.concept ILIKE $1
      ORDER BY p.title
      LIMIT 50
    `, [`%${q}%`]);
    
    res.json(result.rows);
  } catch (err) {
    console.error('Error searching problems:', err);
    res.status(500).json({ error: 'Failed to search problems' });
  }
});

// Import problems from CSV (one-time setup)
app.post('/api/import-problems', async (req, res) => {
  try {
    const fs = require('fs');
    const csvPath = path.join(__dirname, 'leetcode_master_with_popularity.csv');
    
    if (!fs.existsSync(csvPath)) {
      return res.status(404).json({ error: 'CSV file not found' });
    }
    
    let problems = [];
    
    try {
      const csv = require('csv-parser');
      problems = await new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(csvPath)
          .pipe(csv())
          .on('data', (row) => {
            results.push({
              title: row.Title || row.title || '',
              concept: row.Concept || row.concept || '',
              difficulty: row.Difficulty || row.difficulty || 'Medium',
              acceptance_rate: parseFloat(row.Acceptance || row.acceptance) || null,
              popularity: parseInt(row.Popularity || row.popularity) || null,
              leetcode_link: row.LeetCodeLink || row.leetcodeLink || ''
            });
          })
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    } catch (err) {
      // Fallback to simple CSV parsing
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      const lines = csvContent.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          
          problems.push({
            title: row.Title || row.title || '',
            concept: row.Concept || row.concept || '',
            difficulty: row.Difficulty || row.difficulty || 'Medium',
            acceptance_rate: parseFloat(row.Acceptance || row.acceptance) || null,
            popularity: parseInt(row.Popularity || row.popularity) || null,
            leetcode_link: row.LeetCodeLink || row.leetcodeLink || ''
          });
        }
      }
    }
    
    if (problems.length === 0) {
      return res.status(400).json({ error: 'No problems found in CSV' });
    }
    
    // Clear existing problems
    await pool.query('DELETE FROM problems');
    
    // Insert problems in batches
    const batchSize = 100;
    for (let i = 0; i < problems.length; i += batchSize) {
      const batch = problems.slice(i, i + batchSize);
      
      for (const problem of batch) {
        try {
          await pool.query(`
            INSERT INTO problems (title, concept, difficulty, acceptance_rate, popularity, leetcode_link)
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            problem.title,
            problem.concept,
            problem.difficulty,
            problem.acceptance_rate,
            problem.popularity,
            problem.leetcode_link
          ]);
        } catch (err) {
          console.error(`Error importing problem "${problem.title}":`, err.message);
        }
      }
    }
    
    res.json({ 
      message: `Imported ${problems.length} problems successfully`,
      count: problems.length
    });
    
  } catch (err) {
    console.error('Error importing problems:', err);
    res.status(500).json({ error: 'Failed to import problems' });
  }
});

// Serve the main app
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 API available at http://localhost:${PORT}/api`);
  console.log(`🌐 Frontend available at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  pool.end(() => {
    console.log('✅ Database connections closed');
    process.exit(0);
  });
}); 