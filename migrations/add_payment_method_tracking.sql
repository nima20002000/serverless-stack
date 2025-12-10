-- Migration: Add Payment Method and Guest Tracking
-- Created: 2025-12-10
-- Database: PostgreSQL
--
-- This migration adds payment method tracking and explicit guest status
-- to support multi-gateway payments (Zarinpal, Digipay, future gateways)
--
-- IMPORTANT: Run this on each database separately:
-- 1. Local development database
-- 2. Production database (when ready to deploy)
-- 3. Preview database (ALREADY APPLIED - gozxjxtnrbuurmstjydo)

-- Step 1: Create PaymentMethod enum
CREATE TYPE "PaymentMethod" AS ENUM ('ZARINPAL', 'DIGIPAY');

-- Step 2: Add paymentMethod column with default value
ALTER TABLE transactions
ADD COLUMN "paymentMethod" "PaymentMethod" DEFAULT 'ZARINPAL' NOT NULL;

-- Step 3: Add isGuest boolean column with default value
ALTER TABLE transactions
ADD COLUMN "isGuest" BOOLEAN DEFAULT TRUE NOT NULL;

-- Step 4: Backfill isGuest for existing transactions
-- Set isGuest=false for transactions with a userId, true for guest transactions
UPDATE transactions
SET "isGuest" = ("userId" IS NULL);

-- Step 5: Create indexes for query performance
CREATE INDEX transactions_paymentmethod_idx ON transactions("paymentMethod");
CREATE INDEX transactions_isguest_idx ON transactions("isGuest");

-- Verification queries (run after migration):
-- SELECT "paymentMethod", "isGuest", COUNT(*)
-- FROM transactions
-- GROUP BY "paymentMethod", "isGuest";
--
-- Expected result:
-- ZARINPAL | true  | <count of guest transactions>
-- ZARINPAL | false | <count of registered user transactions>
