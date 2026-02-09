-- Create per-service databases to isolate Prisma migrations
-- This script runs only on first init of the Postgres data volume.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'microplate_auth') THEN
    CREATE DATABASE microplate_auth;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'microplate_image') THEN
    CREATE DATABASE microplate_image;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'microplate_labware') THEN
    CREATE DATABASE microplate_labware;
  END IF;
END
$$;

-- Ensure required extensions exist in every database used by Prisma services
\connect microplate
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\connect microplate_auth
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\connect microplate_image
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

\connect microplate_labware
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
