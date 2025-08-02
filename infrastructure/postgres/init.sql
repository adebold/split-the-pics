-- Create database if not exists
SELECT 'CREATE DATABASE securesnap'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'securesnap')\gexec

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE securesnap TO securesnap;