-- LeetCode Practice Database Schema
-- This file creates all necessary tables, indexes, and triggers

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS problems CASCADE;

-- Create problems table
CREATE TABLE IF NOT EXISTS problems (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    concept VARCHAR(100) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    acceptance_rate DECIMAL(5,2),
    popularity INTEGER,
    leetcode_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create user_progress table
CREATE TABLE IF NOT EXISTS user_progress (
    id SERIAL PRIMARY KEY,
    problem_id INTEGER REFERENCES problems(id) ON DELETE CASCADE,
    solved BOOLEAN DEFAULT FALSE,
    solved_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(problem_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_problems_concept ON problems(concept);
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_popularity ON problems(popularity);
CREATE INDEX IF NOT EXISTS idx_user_progress_solved ON user_progress(solved);
CREATE INDEX IF NOT EXISTS idx_user_progress_problem_id ON user_progress(problem_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
DROP TRIGGER IF EXISTS update_problems_updated_at ON problems;
CREATE TRIGGER update_problems_updated_at BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_progress_updated_at ON user_progress;
CREATE TRIGGER update_user_progress_updated_at BEFORE UPDATE ON user_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for problems with progress
CREATE OR REPLACE VIEW problems_with_progress AS
SELECT 
    p.*,
    COALESCE(up.solved, FALSE) as solved,
    up.notes,
    up.solved_at
FROM problems p
LEFT JOIN user_progress up ON p.id = up.problem_id;

-- Create function to get statistics
CREATE OR REPLACE FUNCTION get_progress_stats()
RETURNS TABLE(
    total_problems BIGINT,
    solved_problems BIGINT,
    easy_count BIGINT,
    medium_count BIGINT,
    hard_count BIGINT,
    solved_easy BIGINT,
    solved_medium BIGINT,
    solved_hard BIGINT
) AS $$
BEGIN
    RETURN QUERY
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
    LEFT JOIN user_progress up ON p.id = up.problem_id;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (if needed for multi-user setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;

COMMENT ON TABLE problems IS 'Stores all LeetCode problems with metadata';
COMMENT ON TABLE user_progress IS 'Stores user progress and notes for each problem';
COMMENT ON VIEW problems_with_progress IS 'Combined view of problems with user progress'; 