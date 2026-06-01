-- Migration: Normalize Database Default Values
-- Created: 2025-12-18
-- Database: PostgreSQL
--
-- This archived migration normalizes default values between environments.
-- Fixes:
-- 1. categories.id - Add gen_random_uuid() default
-- 2. categories.updatedAt - Add CURRENT_TIMESTAMP default
-- 3. tags.id - Add gen_random_uuid() default
-- 4. tags.createdAt - Change from CURRENT_TIMESTAMP to now()
-- 5. tags.updatedAt - Change from CURRENT_TIMESTAMP to now()

-- Fix 1: categories.id default
ALTER TABLE categories
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Fix 2: categories.updatedAt default
ALTER TABLE categories
ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Fix 3: tags.id default
ALTER TABLE tags
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Fix 4: tags.createdAt default (change to now())
ALTER TABLE tags
ALTER COLUMN "createdAt" SET DEFAULT now();

-- Fix 5: tags.updatedAt default (change to now())
ALTER TABLE tags
ALTER COLUMN "updatedAt" SET DEFAULT now();

-- Verification queries (run after migration):
-- SELECT column_name, column_default
-- FROM information_schema.columns
-- WHERE table_name IN ('categories', 'tags')
-- AND column_name IN ('id', 'createdAt', 'updatedAt')
-- ORDER BY table_name, column_name;
