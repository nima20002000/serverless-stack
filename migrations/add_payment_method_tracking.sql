-- Migration: Add Payment Method and Guest Tracking
-- Created: 2025-12-10
-- Database: PostgreSQL
--
-- This migration adds payment method tracking and explicit guest status
-- to support the built-in Stripe and PayPal payment providers.
--
-- Historical note: new boilerplate projects should use the Supabase CLI
-- migration chain in supabase/migrations instead of applying root-level
-- archived migrations directly.

-- Step 1: Create PaymentMethod enum
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'PAYPAL');

-- Step 2: Add paymentMethod column with default value
ALTER TABLE transactions
ADD COLUMN "paymentMethod" "PaymentMethod" DEFAULT 'STRIPE' NOT NULL;

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
-- STRIPE | true  | <count of guest transactions>
-- STRIPE | false | <count of registered user transactions>
