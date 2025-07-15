-- LeetCode Practice Database Schema
-- This file creates all necessary tables, indexes, and triggers

-- Create problems table
CREATE TABLE IF NOT EXISTS problems (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL UNIQUE,
    concept VARCHAR(100) NOT NULL,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    acceptance_rate DECIMAL(5,2),
    popularity INTEGER,
    solved BOOLEAN DEFAULT FALSE,
    notes TEXT,
    solution TEXT,
    leetcode_link TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Spaced repetition columns
    current_interval INTEGER DEFAULT 0,
    next_review_date DATE,
    review_count INTEGER DEFAULT 0,
    in_review_cycle BOOLEAN DEFAULT FALSE,
    -- Additional tracking columns
    total_attempts INTEGER DEFAULT 0,
    successful_attempts INTEGER DEFAULT 0,
    last_reviewed DATE,
    first_solved_date DATE
);

-- Create review patterns table
CREATE TABLE IF NOT EXISTS review_patterns (
    id SERIAL PRIMARY KEY,
    difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
    pattern INTEGER[] NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default patterns
INSERT INTO review_patterns (difficulty, pattern) VALUES 
('Easy', ARRAY[0, 1, 3, 7, 14, 30]),
('Medium', ARRAY[0, 1, 2, 4, 8, 16, 32]),
('Hard', ARRAY[0, 1, 2, 4, 6, 10, 20, 40])
ON CONFLICT DO NOTHING;

-- Create review history table
CREATE TABLE IF NOT EXISTS review_history (
    id SERIAL PRIMARY KEY,
    problem_id INTEGER NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
    review_date DATE NOT NULL DEFAULT CURRENT_DATE,
    result VARCHAR(20) NOT NULL CHECK (result IN ('remembered', 'forgot', 'initial')),
    interval_days INTEGER NOT NULL,
    next_review_date DATE,
    notes TEXT,
    time_spent_minutes INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_problems_next_review_date ON problems(next_review_date);
CREATE INDEX IF NOT EXISTS idx_problems_in_review_cycle ON problems(in_review_cycle);
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_solved ON problems(solved);
CREATE INDEX IF NOT EXISTS idx_review_history_problem_id ON review_history(problem_id);
CREATE INDEX IF NOT EXISTS idx_review_history_next_review_date ON review_history(next_review_date);
CREATE INDEX IF NOT EXISTS idx_review_history_review_date ON review_history(review_date);

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
CREATE TRIGGER update_problems_updated_at 
    BEFORE UPDATE ON problems
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get review history for a specific problem
CREATE OR REPLACE FUNCTION get_problem_review_history(problem_id_param INTEGER)
RETURNS TABLE (
    problem_name VARCHAR(255),
    difficulty VARCHAR(20),
    total_attempts BIGINT,
    remembered_count BIGINT,
    forgot_count BIGINT,
    success_rate DECIMAL(5,2),
    review_dates DATE[],
    next_planned_reviews DATE[]
) AS $$
BEGIN
    RETURN QUERY
    WITH problem_stats AS (
        SELECT 
            p.title,
            p.difficulty,
            COUNT(rh.id) as total_attempts,
            COUNT(CASE WHEN rh.result = 'remembered' THEN 1 END) as remembered_count,
            COUNT(CASE WHEN rh.result = 'forgot' THEN 1 END) as forgot_count,
            CASE 
                WHEN COUNT(rh.id) > 0 THEN 
                    ROUND((COUNT(CASE WHEN rh.result = 'remembered' THEN 1 END) * 100.0 / COUNT(rh.id)), 2)
                ELSE 0
            END as success_rate,
            ARRAY_AGG(rh.review_date ORDER BY rh.review_date) FILTER (WHERE rh.review_date IS NOT NULL) as review_dates
        FROM problems p
        LEFT JOIN review_history rh ON p.id = rh.problem_id
        WHERE p.id = problem_id_param
        GROUP BY p.id, p.title, p.difficulty
    ),
    future_reviews AS (
        SELECT ARRAY_AGG(future_date ORDER BY future_date) as next_reviews
        FROM (
            SELECT 
                p.next_review_date + (interval '1 day' * generate_series(0, 2)) as future_date
            FROM problems p
            WHERE p.id = problem_id_param 
            AND p.next_review_date IS NOT NULL
            AND p.next_review_date >= CURRENT_DATE
            LIMIT 3
        ) dates
    )
    SELECT 
        ps.title,
        ps.difficulty,
        ps.total_attempts,
        ps.remembered_count,
        ps.forgot_count,
        ps.success_rate,
        ps.review_dates,
        COALESCE(fr.next_reviews, ARRAY[]::DATE[])
    FROM problem_stats ps
    CROSS JOIN future_reviews fr;
END;
$$ LANGUAGE plpgsql;

-- Function to record a review attempt
CREATE OR REPLACE FUNCTION record_review_attempt(
    problem_id_param INTEGER,
    result_param VARCHAR(20),
    notes_param TEXT DEFAULT NULL,
    time_spent_param INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    current_pattern INTEGER[];
    next_interval INTEGER;
    problem_difficulty VARCHAR(20);
    current_review_count INTEGER;
BEGIN
    -- Get problem difficulty and current review count
    SELECT difficulty, review_count INTO problem_difficulty, current_review_count
    FROM problems WHERE id = problem_id_param;
    
    -- Get the review pattern for this difficulty
    SELECT pattern INTO current_pattern
    FROM review_patterns 
    WHERE difficulty = problem_difficulty;
    
    -- Calculate next interval based on result
    IF result_param = 'remembered' THEN
        -- Move to next interval in pattern
        IF current_review_count + 1 <= array_length(current_pattern, 1) THEN
            next_interval := current_pattern[current_review_count + 1];
        ELSE
            -- Beyond pattern, double the last interval
            next_interval := current_pattern[array_length(current_pattern, 1)] * 2;
        END IF;
    ELSE
        -- Reset to beginning of pattern
        next_interval := current_pattern[1];
        current_review_count := 0;
    END IF;
    
    -- Insert review history record
    INSERT INTO review_history (
        problem_id, 
        review_date, 
        result, 
        interval_days, 
        next_review_date,
        notes,
        time_spent_minutes
    ) VALUES (
        problem_id_param,
        CURRENT_DATE,
        result_param,
        next_interval,
        CURRENT_DATE + INTERVAL '1 day' * next_interval,
        notes_param,
        time_spent_param
    );
    
    -- Update problems table
    UPDATE problems SET
        total_attempts = total_attempts + 1,
        successful_attempts = CASE WHEN result_param = 'remembered' THEN successful_attempts + 1 ELSE successful_attempts END,
        current_interval = next_interval,
        next_review_date = CURRENT_DATE + INTERVAL '1 day' * next_interval,
        review_count = CASE WHEN result_param = 'remembered' THEN current_review_count + 1 ELSE 0 END,
        in_review_cycle = TRUE,
        last_reviewed = CURRENT_DATE,
        first_solved_date = CASE WHEN first_solved_date IS NULL AND result_param = 'remembered' THEN CURRENT_DATE ELSE first_solved_date END
    WHERE id = problem_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get problems due for review today
CREATE OR REPLACE FUNCTION get_problems_due_for_review()
RETURNS TABLE (
    id INTEGER,
    title VARCHAR(255),
    difficulty VARCHAR(20),
    next_review_date DATE,
    days_overdue INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.difficulty,
        p.next_review_date,
        (CURRENT_DATE - p.next_review_date)::INTEGER as days_overdue
    FROM problems p
    WHERE p.in_review_cycle = TRUE 
    AND p.next_review_date <= CURRENT_DATE
    ORDER BY p.next_review_date ASC, p.difficulty DESC;
END;
$$ LANGUAGE plpgsql; 