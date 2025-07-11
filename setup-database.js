const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

async function setupDatabase() {
  try {
    console.log('Setting up database...');
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    console.log('Database schema created successfully');
    
    // Import problems from CSV if it exists
    const csvPath = path.join(__dirname, 'leetcode_master_with_popularity.csv');
    if (fs.existsSync(csvPath)) {
      console.log('Importing problems from CSV...');
      
      const csv = require('csv-parser');
      const problems = [];
      
      return new Promise((resolve, reject) => {
        fs.createReadStream(csvPath)
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
              
              console.log(`Imported ${problems.length} problems successfully`);
              resolve();
            } catch (err) {
              console.error('Error importing problems:', err);
              reject(err);
            }
          });
      });
    } else {
      console.log('CSV file not found. Skipping data import.');
    }
    
  } catch (err) {
    console.error('Error setting up database:', err);
    throw err;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('Database setup completed successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database setup failed:', err);
      process.exit(1);
    });
}

module.exports = { setupDatabase }; 