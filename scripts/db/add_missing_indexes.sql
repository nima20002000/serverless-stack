-- Add missing indexes to improve admin and product queries
-- Safe to run multiple times. Uses CONCURRENTLY to avoid long table locks.

-- Product media: accelerate product/variant media lookups and ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_media_product_default_order
  ON public.product_media ("productId", "isDefault" DESC, "order");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_media_variant_default_order
  ON public.product_media ("variantId", "isDefault" DESC, "order");

-- Product variants: accelerate active variants per product with ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_variants_product_active_order
  ON public.product_variants ("productId", "isActive", "order");

-- Product tags junction: accelerate tag lookup by product
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_to_tag_a
  ON public."_ProductToTag" ("A");

-- Categories: accelerate tree queries (root + children) ordered by name
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_parent_active_name
  ON public.categories ("parentId", "isActive", "name");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_active_name
  ON public.categories ("isActive", "name");
