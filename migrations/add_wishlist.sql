-- Migration: Add Wishlist Feature
-- Created: 2025-12-30
-- Database: PostgreSQL (Supabase)
--
-- Historical note: new boilerplate projects should use the Supabase CLI
-- migration chain in supabase/migrations. If this archived migration is needed
-- for an existing project, test it locally before applying it to a hosted
-- project.
--
-- IMPORTANT: This migration is idempotent (safe to re-run)

BEGIN;

-- =============================================================================
-- Step 1: Create wishlists table
-- =============================================================================
DO $$
BEGIN
  -- Verify required tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    RAISE EXCEPTION 'users table does not exist - cannot proceed with migration';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    RAISE EXCEPTION 'products table does not exist - cannot proceed with migration';
  END IF;

  -- Create table if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wishlists') THEN
    CREATE TABLE wishlists (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

      -- Unique constraint: a user can only have one wishlist entry per product+variant combo
      CONSTRAINT unique_wishlist_item UNIQUE (user_id, product_id, variant_id)
    );
    RAISE NOTICE 'wishlists table created successfully';
  ELSE
    RAISE NOTICE 'wishlists table already exists, skipping creation';
  END IF;
END $$;

-- =============================================================================
-- Step 2: Create indexes for performance
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_wishlists_user_id ON wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_product_id ON wishlists(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_created_at ON wishlists(created_at DESC);

-- Composite index for common query: get user's wishlist ordered by date
CREATE INDEX IF NOT EXISTS idx_wishlists_user_created
  ON wishlists(user_id, created_at DESC);

COMMIT;

-- =============================================================================
-- Verification Queries (run AFTER migration)
-- =============================================================================

-- Verify table structure
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'wishlists'
-- ORDER BY ordinal_position;

-- Verify indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'wishlists';

-- Verify foreign key constraints
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'wishlists'::regclass;
