-- Initialize PostgreSQL for Microplate AI
-- This script runs when the database container starts for the first time

-- Create schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS microplates;

-- Grant permissions
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT USAGE ON SCHEMA microplates TO postgres;
GRANT CREATE ON SCHEMA auth TO postgres;
GRANT CREATE ON SCHEMA microplates TO postgres;

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'Asia/Bangkok';

-- Create a function to generate request IDs
CREATE OR REPLACE FUNCTION generate_request_id() RETURNS TEXT AS $$
BEGIN
    RETURN 'req_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create audit_logs table in auth schema
CREATE TABLE IF NOT EXISTS auth.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Log initialization
INSERT INTO auth.audit_logs (action, resource, details, created_at)
VALUES ('DATABASE_INITIALIZED', 'Database', '{"message": "Database initialized successfully"}', NOW())
ON CONFLICT DO NOTHING;
