const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Database connection configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'leetcode_practice',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  // Add connection timeout and retry logic
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
});

// Test database connection
async function testConnection() {
  try {
    const client = await pool.connect();
    client.release();
    console.log('Database connection successful');
    return true;
  } catch (err) {
    console.error('Database connection failed:', err.message);
    return false;
  }
}

// Read and execute schema
async function createSchema() {
  try {
    console.log('Creating database schema');
    
    const schemaPath = path.
join(__dirname, 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error('schema.sql file not found');
    }
    
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Execute the entire schema as one statement to avoid parsing issues
    try {
      await pool.query(schema);
      console.log(' Database schema created successfully');
      return true;
    } catch (err) {
      console.error('Error executing schema:', err.message);
      return false;
    }
  } catch (err) {
    console.error('Error creating schema:', err.message);
    return false;
  }
}

// Import problems from CSV
async function importProblems() {
  try {
    const csvPath = path.join(__dirname, 'leetcode_master_with_popularity.csv');
    
    if (!fs.existsSync(csvPath)) {
      console.log('CSV file not found. Skipping data import.');
      console.log('Expected file: leetcode_master_with_popularity.csv');
      return true;
    }
    
    console.log('Importing problems from CSV...');
    
    // Use csv-parser if available, otherwise use simple parsing
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
      console.log('⚠️  csv-parser not available, using simple CSV parsing...');
      // Simple CSV parsing as fallback
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
      console.log('No problems found in CSV file');
      return true;
    }
    
    console.log(`Found ${problems.length} problems to import`);
    
    // Check if problems table already has data
    const existingCount = await pool.query('SELECT COUNT(*) as count FROM problems');
    const hasExistingData = parseInt(existingCount.rows[0].count) > 0;
    
    if (hasExistingData) {
      console.log('📊 Existing problems found. Updating problem data while preserving progress...');
      
      // Update existing problems instead of deleting
      for (const problem of problems) {
        try {
          await pool.query(`
            INSERT INTO problems (title, concept, difficulty, acceptance_rate, popularity, leetcode_link)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (title) DO UPDATE SET
              concept = EXCLUDED.concept,
              difficulty = EXCLUDED.difficulty,
              acceptance_rate = EXCLUDED.acceptance_rate,
              popularity = EXCLUDED.popularity,
              leetcode_link = EXCLUDED.leetcode_link
          `, [
            problem.title,
            problem.concept,
            problem.difficulty,
            problem.acceptance_rate,
            problem.popularity,
            problem.leetcode_link
          ]);
        } catch (err) {
          console.error(`❌ Error updating problem "${problem.title}":`, err.message);
        }
      }
      
      console.log('✅ Updated existing problems while preserving progress');
    } else {
      console.log('📥 No existing problems found. Importing fresh data...');
      
      // Clear existing problems only if table is empty
      await pool.query('DELETE FROM problems');
      console.log('🗑️  Cleared existing problems');
      
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
            console.error(`❌ Error importing problem "${problem.title}":`, err.message);
          }
        }
        
        const progress = Math.min(((i + batchSize) / problems.length) * 100, 100);
        process.stdout.write(`\r📥 Import progress: ${Math.round(progress)}%`);
      }
      
      console.log(`\n✅ Successfully imported ${problems.length} problems`);
    }
    
    return true;
    
  } catch (err) {
    console.error('❌ Error importing problems:', err.message);
    return false;
  }
}

// Add solution column if it doesn't exist
async function addSolutionColumn() {
  try {
    await pool.query(`
      ALTER TABLE problems 
      ADD COLUMN IF NOT EXISTS solution TEXT
    `);
    console.log('✅ Solution column added successfully');
    return true;
  } catch (err) {
    console.error('❌ Error adding solution column:', err.message);
    return false;
  }
}

// Main setup function
async function setupDatabase() {
  console.log('🚀 Starting database setup...\n');
  
  try {
    // Test connection
    const connectionOk = await testConnection();
    if (!connectionOk) {
      throw new Error('Database connection failed');
    }
    
    // Create schema
    const schemaOk = await createSchema();
    if (!schemaOk) {
      throw new Error('Schema creation failed');
    }
    
    // Add solution column
    const solutionColumnOk = await addSolutionColumn();
    if (!solutionColumnOk) {
      throw new Error('Solution column addition failed');
    }
    
    // Import problems
    const importOk = await importProblems();
    if (!importOk) {
      throw new Error('Problem import failed');
    }
    
    // Verify setup
    const result = await pool.query('SELECT COUNT(*) as count FROM problems');
    const problemCount = parseInt(result.rows[0].count);
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log(`📊 Total problems in database: ${problemCount}`);
    console.log('\n📝 Next steps:');
    console.log('1. Start the server: npm run dev');
    console.log('2. Open http://localhost:3001 in your browser');
    console.log('3. Your progress will now be saved to the database!');
    
  } catch (err) {
    console.error('\n❌ Database setup failed:', err.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check PostgreSQL is running');
    console.log('2. Verify .env file configuration');
    console.log('3. Try: psql -U postgres -d leetcode_practice');
    throw err;
  } finally {
    await pool.end();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => {
      console.log('\n✅ Setup completed successfully!');
      process.exit(0);
    })
    .catch((err) => {
      console.error('\n❌ Setup failed:', err.message);
      process.exit(1);
    });
}

module.exports = { setupDatabase, testConnection }; 