-- Migration: Add Zibal Payment Gateway Support
-- Created: 2025-12-28
-- Database: PostgreSQL
--
-- This migration adds Zibal payment gateway support:
-- 1. Adds 'ZIBAL' to the PaymentMethod enum
-- 2. Adds zibalTrackId column for storing Zibal tracking IDs
-- 3. Adds zibalRefNumber column for storing Zibal reference numbers
--
-- IMPORTANT: Run this on each database separately:
-- 1. Local development database
-- 2. Production database (when ready to deploy)

-- Step 1: Add ZIBAL to PaymentMethod enum
ALTER TYPE "PaymentMethod" ADD VALUE 'ZIBAL';

-- Step 2: Add zibalTrackId column (VARCHAR for flexibility, Zibal trackId is numeric but can be large)
ALTER TABLE transactions
ADD COLUMN "zibalTrackId" VARCHAR(50);

-- Step 3: Add zibalRefNumber column for verification reference
ALTER TABLE transactions
ADD COLUMN "zibalRefNumber" VARCHAR(50);

-- Step 4: Create index for zibalTrackId for faster lookups
CREATE INDEX transactions_zibaltrackid_idx ON transactions("zibalTrackId");

-- Verification queries (run after migration):
-- SELECT enumlabel FROM pg_enum WHERE enumtypid = '"PaymentMethod"'::regtype;
-- Expected result should include: ZARINPAL, DIGIPAY, ZIBAL
--
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'transactions' AND column_name LIKE 'zibal%';
