# PostgreSQL Setup Guide

## Step 1: Install PostgreSQL

1. **Download PostgreSQL** from the official website:
   - Go to: https://www.postgresql.org/download/windows/
   - Download the latest version (currently 16.x)

2. **Run the installer**:
   - Choose your installation directory
   - Set a password for the `postgres` user (remember this!)
   - Keep the default port (5432)
   - Install all components (PostgreSQL Server, pgAdmin, Stack Builder)

3. **Verify installation**:
   - Open Command Prompt
   - Run: `psql --version`

## Step 2: Create Database

After installation, run these commands:

```bash
# Connect to PostgreSQL as postgres user
psql -U postgres

# Create database for your app
CREATE DATABASE leetcode_practice;

# Connect to the new database
\c leetcode_practice

# Create tables (see schema.sql file)
```

## Step 3: Database Schema

The schema will be created automatically when you run the setup script.

## Step 4: Node.js Backend

We'll create a simple Node.js backend to connect to PostgreSQL.

---

**Alternative: Use Docker (if you have Docker installed)**

```bash
# Pull PostgreSQL image
docker pull postgres:16

# Run PostgreSQL container
docker run --name leetcode-postgres -e POSTGRES_PASSWORD=yourpassword -e POSTGRES_DB=leetcode_practice -p 5432:5432 -d postgres:16
``` 