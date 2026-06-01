-- Migration: Add Human-Readable User UID
-- Created: 2025-12-10
-- Database: PostgreSQL
--
-- This migration adds a human-readable UID (User ID) field to the users table
-- Format: U-000001, U-000002, etc.
--
-- Historical note: new boilerplate projects should use the Supabase CLI
-- migration chain in supabase/migrations. If this archived migration is needed
-- for an existing project, test it locally before applying it to a hosted
-- project.

-- Step 1: Add uid column (nullable first for backfill)
ALTER TABLE users
ADD COLUMN uid TEXT;

-- Step 2: Backfill UIDs for existing users based on creation order
-- Format: U-{6-digit sequential number}
WITH numbered_users AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt") as row_num
  FROM users
)
UPDATE users
SET uid = 'U-' || LPAD(numbered_users.row_num::TEXT, 6, '0')
FROM numbered_users
WHERE users.id = numbered_users.id;

-- Step 3: Make uid NOT NULL and UNIQUE
ALTER TABLE users
ALTER COLUMN uid SET NOT NULL;

CREATE UNIQUE INDEX users_uid_key ON users(uid);

-- Step 4: Create index for faster lookups
CREATE INDEX users_uid_idx ON users(uid);

-- Verification query (run after migration):
-- SELECT uid, name, email, "createdAt"
-- FROM users
-- ORDER BY "createdAt"
-- LIMIT 10;
