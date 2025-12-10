-- Migration: Add variantId to transaction_items table
-- This allows tracking which specific product variant was purchased

-- Add variantId column (nullable for backward compatibility)
ALTER TABLE transaction_items
ADD COLUMN "variantId" TEXT;

-- Add foreign key constraint to product_variants table
ALTER TABLE transaction_items
ADD CONSTRAINT transaction_items_variantId_fkey
FOREIGN KEY ("variantId") REFERENCES product_variants(id)
ON DELETE SET NULL;

-- Add comment for documentation
COMMENT ON COLUMN transaction_items."variantId" IS 'Optional: Which variant was purchased (null for products without variants)';
