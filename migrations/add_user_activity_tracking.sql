-- Migration: Add User Activity Tracking
-- Created: 2025-12-28
-- Database: PostgreSQL (Supabase)
--
-- This migration adds minimal, essential user activity tracking
-- to monitor authentication, profile changes, and transaction contexts.
--
-- Historical note: new boilerplate projects should use the Supabase CLI
-- migration chain in supabase/migrations. If this archived migration is needed
-- for an existing project, test it locally before applying it to a hosted
-- project.
--
-- IMPORTANT: This migration is idempotent (safe to re-run)

BEGIN;

-- =============================================================================
-- Step 1: Create activity_type enum (if not exists)
-- =============================================================================
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM (
    'LOGIN_SUCCESS',
    'LOGIN_FAILED',
    'REGISTER',
    'LOGOUT',
    'PASSWORD_CHANGE',
    'PROFILE_UPDATE',
    'OTP_SENT',
    'OTP_VERIFIED',
    'OTP_FAILED'
  );
EXCEPTION
  WHEN duplicate_object THEN
    RAISE NOTICE 'activity_type enum already exists, skipping creation';
END $$;

-- =============================================================================
-- Step 2: Create user_activity_logs table (if not exists)
-- =============================================================================
DO $$
BEGIN
  -- Verify users table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    RAISE EXCEPTION 'users table does not exist - cannot proceed with migration';
  END IF;

  -- Create table if it doesn't exist
  -- Note: user_id is TEXT to match users.id column type
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activity_logs') THEN
    CREATE TABLE user_activity_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      activity_type activity_type NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      success BOOLEAN DEFAULT true,
      error_message TEXT,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    );
    RAISE NOTICE 'user_activity_logs table created successfully';
  ELSE
    RAISE NOTICE 'user_activity_logs table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- Step 3: Create indexes (if not exist)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_user_activity_user_id
  ON user_activity_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_user_activity_type
  ON user_activity_logs(activity_type);

CREATE INDEX IF NOT EXISTS idx_user_activity_created_at
  ON user_activity_logs(created_at DESC);

-- =============================================================================
-- Step 4: Add columns to transactions table (if not exist)
-- =============================================================================
DO $$
BEGIN
  -- Verify transactions table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    RAISE EXCEPTION 'transactions table does not exist - cannot proceed with migration';
  END IF;

  -- Add ip_address column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'ip_address'
  ) THEN
    ALTER TABLE transactions ADD COLUMN ip_address VARCHAR(45);
    RAISE NOTICE 'Added ip_address column to transactions table';
  ELSE
    RAISE NOTICE 'ip_address column already exists in transactions table';
  END IF;

  -- Add user_agent column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'user_agent'
  ) THEN
    ALTER TABLE transactions ADD COLUMN user_agent TEXT;
    RAISE NOTICE 'Added user_agent column to transactions table';
  ELSE
    RAISE NOTICE 'user_agent column already exists in transactions table';
  END IF;
END $$;

COMMIT;

-- =============================================================================
-- Verification Queries (run AFTER migration)
-- =============================================================================

-- Verify user_activity_logs table structure
-- SELECT
--   column_name,
--   data_type,
--   is_nullable,
--   column_default
-- FROM information_schema.columns
-- WHERE table_name = 'user_activity_logs'
-- ORDER BY ordinal_position;

-- Verify indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'user_activity_logs';

-- Verify transactions columns
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'transactions'
--   AND column_name IN ('ip_address', 'user_agent');
