-- WARNING: Dev only! Drops all data

DROP TABLE IF EXISTS review_history CASCADE;
DROP TABLE IF EXISTS review_patterns CASCADE;
DROP TABLE IF EXISTS problems CASCADE;

-- Then run: \i init_schema.sql
