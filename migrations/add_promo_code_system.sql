-- Migration: add_promo_code_system
-- Created: 2026-01-01
-- Purpose: Implement comprehensive promo code system with discount types, usage limits, and tracking

-- =====================================================
-- Step 1: Alter promo_codes table
-- =====================================================

-- Drop existing foreign key constraint
ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS promo_codes_userId_fkey;

-- Add new columns for promo code system
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS "discountType" TEXT DEFAULT 'PERCENT';
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS "discountValue" DECIMAL(10,2) DEFAULT 10;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS "maxUsageCount" INT;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS "currentUsageCount" INT DEFAULT 0;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT true;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS "minOrderAmount" DECIMAL(10,2);
ALTER TABLE promo_codes ADD COLUMN IF NOT EXISTS "maxDiscountAmount" DECIMAL(10,2);

-- Make userId optional (for public codes)
ALTER TABLE promo_codes ALTER COLUMN "userId" DROP NOT NULL;

-- Update existing records to have NOT NULL discountType/discountValue if they were added as nullable
UPDATE promo_codes
SET "discountType" = 'PERCENT', "discountValue" = 10
WHERE "discountType" IS NULL OR "discountValue" IS NULL;

-- Now make discountType and discountValue NOT NULL
ALTER TABLE promo_codes ALTER COLUMN "discountType" SET NOT NULL;
ALTER TABLE promo_codes ALTER COLUMN "discountValue" SET NOT NULL;

-- Add back foreign key with ON DELETE SET NULL
ALTER TABLE promo_codes ADD CONSTRAINT promo_codes_userId_fkey
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE SET NULL;

-- Add check constraint for discount type
ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS chk_discount_type;
ALTER TABLE promo_codes ADD CONSTRAINT chk_discount_type
  CHECK ("discountType" IN ('PERCENT', 'FIXED'));

-- Add unique constraint on code (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'unique_promo_code' AND conrelid = 'promo_codes'::regclass
  ) THEN
    ALTER TABLE promo_codes ADD CONSTRAINT unique_promo_code UNIQUE (code);
  END IF;
END $$;

-- =====================================================
-- Step 2: Alter transactions table
-- =====================================================

-- Add promo code tracking fields to transactions
-- NOTE: Using TEXT type to match existing id columns
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "promoCodeId" TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(10,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(10,2);

-- Add foreign key for promoCodeId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_promoCodeId_fkey'
  ) THEN
    ALTER TABLE transactions ADD CONSTRAINT transactions_promoCodeId_fkey
      FOREIGN KEY ("promoCodeId") REFERENCES promo_codes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- Step 3: Create promo code usages table
-- =====================================================

-- NOTE: Using TEXT type for all id columns to match existing schema
CREATE TABLE IF NOT EXISTS promo_code_usages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "promoCodeId" TEXT NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
  "transactionId" TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  "userId" TEXT REFERENCES users(id) ON DELETE SET NULL,
  "usedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_promo_usage_code ON promo_code_usages("promoCodeId");
CREATE INDEX IF NOT EXISTS idx_promo_usage_user ON promo_code_usages("userId");
CREATE INDEX IF NOT EXISTS idx_promo_usage_transaction ON promo_code_usages("transactionId");

-- Index for active promo codes lookup
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes("isActive", "expiresAt");
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);

-- Index for transaction promo lookups
CREATE INDEX IF NOT EXISTS idx_transactions_promo ON transactions("promoCodeId");

-- =====================================================
-- Verification queries (run after migration)
-- =====================================================

-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'promo_codes'
-- ORDER BY ordinal_position;

-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'transactions'
-- AND column_name IN ('promoCodeId', 'discountAmount', 'subtotal')
-- ORDER BY ordinal_position;

-- SELECT EXISTS (
--   SELECT FROM information_schema.tables
--   WHERE table_name = 'promo_code_usages'
-- );
