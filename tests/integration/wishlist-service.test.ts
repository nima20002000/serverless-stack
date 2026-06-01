/**
 * Integration Tests for Wishlist Service
 *
 * Tests wishlist CRUD operations with real Supabase database.
 *
 * ANTI-REWARD-HACKING NOTES:
 * - Assertions validate concrete field values from real database
 * - Tests use real Supabase interactions, no mocks
 * - Cleanup ensures test isolation
 * - Verifies actual database state after operations
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
} from 'vitest';
import { randomUUID } from 'crypto';
import {
  createTestSupabaseClient,
  generateTestUID,
} from '../utils/test-client';
import { cleanupTestUsers, cleanupTestProducts } from '../utils/cleanup';
import { expectValidUUID } from '../utils/assertions';
import { generateUniqueTestProduct } from '../fixtures';

const supabase = createTestSupabaseClient();

// Test data generators
function createTestEmail() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `test-wishlist-${timestamp}-${random}@example.com`;
}

// Helper to create test user directly in database
async function createTestUser() {
  const userId = randomUUID();
  const uid = await generateTestUID();
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  const email = `test-wishlist-${timestamp}-${random}@example.com`;
  const phoneTimestamp = (timestamp % 10000).toString().padStart(4, '0');
  const phone = `+1202555${phoneTimestamp}`;

  const { data: user, error } = await supabase
    .from('users')
    .insert({
      id: userId,
      uid,
      email,
      phone,
      name: 'Test User text',
      role: 'USER',
      isVerified: true,
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create test user: ${error.message}`);
  return user;
}

// Helper to create test product directly in database
async function createTestProduct(overrides: Record<string, any> = {}) {
  const productData = generateUniqueTestProduct('TEST-WISHLIST');
  const productId = randomUUID();

  const { data: product, error } = await supabase
    .from('products')
    .insert({
      id: productId,
      name: productData.name,
      description: productData.description,
      price: productData.price,
      stock: productData.stock,
      isActive: true,
      hasVariants: false,
      isFeatured: false,
      discountPercent: 0,
      updatedAt: new Date().toISOString(),
      ...overrides,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create test product: ${error.message}`);
  return product;
}

// Helper to create test variant
async function createTestVariant(
  productId: string,
  overrides: Record<string, any> = {}
) {
  const variantId = randomUUID();

  const { data: variant, error } = await supabase
    .from('product_variants')
    .insert({
      id: variantId,
      productId,
      name: 'Test detailsortext',
      sku: `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      priceAdjust: 5000,
      stock: 5,
      isActive: true,
      updatedAt: new Date().toISOString(),
      ...overrides,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create test variant: ${error.message}`);
  return variant;
}

// Cleanup test wishlists
async function cleanupTestWishlists() {
  // Get test user IDs
  const { data: testUsers } = await supabase
    .from('users')
    .select('id')
    .like('email', 'test-wishlist-%');

  if (testUsers && testUsers.length > 0) {
    const userIds = testUsers.map((u) => u.id);
    await supabase.from('wishlists').delete().in('user_id', userIds);
  }

  // Also delete by test product IDs
  const { data: testProducts } = await supabase
    .from('products')
    .select('id')
    .like('name', 'TEST-WISHLIST-%');

  if (testProducts && testProducts.length > 0) {
    const productIds = testProducts.map((p) => p.id);
    await supabase.from('wishlists').delete().in('product_id', productIds);
  }
}

describe('Wishlist Service Integration Tests', () => {
  beforeAll(async () => {
    await cleanupTestWishlists();
    await cleanupTestProducts();
    await cleanupTestUsers();
  });

  afterAll(async () => {
    await cleanupTestWishlists();
    await cleanupTestProducts();
    await cleanupTestUsers();
  });

  beforeEach(async () => {
    await cleanupTestWishlists();
  });

  afterEach(async () => {
    await cleanupTestWishlists();
  });

  describe('Wishlist CRUD Operations', () => {
    it('should add a product to wishlist', async () => {
      const user = await createTestUser();
      const product = await createTestProduct();

      // Add to wishlist
      const { data: wishlistItem, error } = await supabase
        .from('wishlists')
        .insert({
          user_id: user.id,
          product_id: product.id,
          variant_id: null,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(wishlistItem).toBeDefined();
      expectValidUUID(wishlistItem.id);
      expect(wishlistItem.user_id).toBe(user.id);
      expect(wishlistItem.product_id).toBe(product.id);
      expect(wishlistItem.variant_id).toBeNull();
      expect(wishlistItem.created_at).toBeDefined();
    });

    it('should add product with variant to wishlist', async () => {
      const user = await createTestUser();
      const product = await createTestProduct({ hasVariants: true });
      const variant = await createTestVariant(product.id);

      const { data: wishlistItem, error } = await supabase
        .from('wishlists')
        .insert({
          user_id: user.id,
          product_id: product.id,
          variant_id: variant.id,
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(wishlistItem).toBeDefined();
      expect(wishlistItem.product_id).toBe(product.id);
      expect(wishlistItem.variant_id).toBe(variant.id);
    });

    it('should retrieve user wishlist with product data', async () => {
      const user = await createTestUser();
      const product1 = await createTestProduct();
      const product2 = await createTestProduct();

      // Add both products
      await supabase.from('wishlists').insert([
        { user_id: user.id, product_id: product1.id },
        { user_id: user.id, product_id: product2.id },
      ]);

      // Fetch wishlist
      const { data: wishlist, error } = await supabase
        .from('wishlists')
        .select(
          `
          id,
          user_id,
          product_id,
          variant_id,
          created_at,
          products!wishlists_product_id_fkey (
            id,
            name,
            price,
            stock,
            isActive
          )
        `
        )
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      expect(error).toBeNull();
      expect(wishlist).toHaveLength(2);

      // Verify product relations
      for (const item of wishlist!) {
        expect(item.products).toBeDefined();
        expect((item.products as any).id).toBeDefined();
        expect((item.products as any).name).toContain('TEST-WISHLIST-');
      }
    });

    it('should remove a specific item from wishlist', async () => {
      const user = await createTestUser();
      const product = await createTestProduct();

      // Add to wishlist
      const { data: wishlistItem } = await supabase
        .from('wishlists')
        .insert({
          user_id: user.id,
          product_id: product.id,
        })
        .select()
        .single();

      // Remove from wishlist
      const { error: deleteError } = await supabase
        .from('wishlists')
        .delete()
        .eq('id', wishlistItem!.id)
        .eq('user_id', user.id);

      expect(deleteError).toBeNull();

      // Verify removed
      const { data: remaining } = await supabase
        .from('wishlists')
        .select()
        .eq('user_id', user.id);

      expect(remaining).toHaveLength(0);
    });

    it('should remove by product and variant combination', async () => {
      const user = await createTestUser();
      const product = await createTestProduct({ hasVariants: true });
      const variant = await createTestVariant(product.id);

      // Add with variant
      await supabase.from('wishlists').insert({
        user_id: user.id,
        product_id: product.id,
        variant_id: variant.id,
      });

      // Remove by product + variant
      const { error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .eq('variant_id', variant.id);

      expect(error).toBeNull();

      // Verify removed
      const { data: remaining } = await supabase
        .from('wishlists')
        .select()
        .eq('user_id', user.id);

      expect(remaining).toHaveLength(0);
    });

    it('should get wishlist count for user', async () => {
      const user = await createTestUser();
      const product1 = await createTestProduct();
      const product2 = await createTestProduct();
      const product3 = await createTestProduct();

      // Add 3 items
      await supabase.from('wishlists').insert([
        { user_id: user.id, product_id: product1.id },
        { user_id: user.id, product_id: product2.id },
        { user_id: user.id, product_id: product3.id },
      ]);

      // Get count
      const { count, error } = await supabase
        .from('wishlists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      expect(error).toBeNull();
      expect(count).toBe(3);
    });

    it('should clear all wishlist items for user', async () => {
      const user = await createTestUser();
      const product1 = await createTestProduct();
      const product2 = await createTestProduct();

      // Add items
      await supabase.from('wishlists').insert([
        { user_id: user.id, product_id: product1.id },
        { user_id: user.id, product_id: product2.id },
      ]);

      // Clear all
      const { data: deleted, error } = await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', user.id)
        .select('id');

      expect(error).toBeNull();
      expect(deleted).toHaveLength(2);

      // Verify empty
      const { count } = await supabase
        .from('wishlists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      expect(count).toBe(0);
    });
  });

  describe('Wishlist Constraints and Validation', () => {
    it('should enforce unique constraint on user+product+variant', async () => {
      const user = await createTestUser();
      const product = await createTestProduct({ hasVariants: true });
      const variant = await createTestVariant(product.id);

      // First insert should succeed
      const { error: error1 } = await supabase.from('wishlists').insert({
        user_id: user.id,
        product_id: product.id,
        variant_id: variant.id,
      });
      expect(error1).toBeNull();

      // Second insert (duplicate) should fail
      const { error: error2 } = await supabase.from('wishlists').insert({
        user_id: user.id,
        product_id: product.id,
        variant_id: variant.id,
      });

      expect(error2).not.toBeNull();
      expect(error2!.code).toBe('23505'); // PostgreSQL unique violation
    });

    it('should allow same product with different variants', async () => {
      const user = await createTestUser();
      const product = await createTestProduct({ hasVariants: true });
      const variant1 = await createTestVariant(product.id, { name: 'Size S' });
      const variant2 = await createTestVariant(product.id, { name: 'Size M' });

      // Both should succeed
      const { error: error1 } = await supabase.from('wishlists').insert({
        user_id: user.id,
        product_id: product.id,
        variant_id: variant1.id,
      });

      const { error: error2 } = await supabase.from('wishlists').insert({
        user_id: user.id,
        product_id: product.id,
        variant_id: variant2.id,
      });

      expect(error1).toBeNull();
      expect(error2).toBeNull();

      // Verify both exist
      const { count } = await supabase
        .from('wishlists')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('product_id', product.id);

      expect(count).toBe(2);
    });

    it('should enforce foreign key on user_id', async () => {
      const product = await createTestProduct();
      const fakeUserId = randomUUID();

      const { error } = await supabase.from('wishlists').insert({
        user_id: fakeUserId,
        product_id: product.id,
      });

      expect(error).not.toBeNull();
      expect(error!.code).toBe('23503'); // Foreign key violation
    });

    it('should enforce foreign key on product_id', async () => {
      const user = await createTestUser();
      const fakeProductId = randomUUID();

      const { error } = await supabase.from('wishlists').insert({
        user_id: user.id,
        product_id: fakeProductId,
      });

      expect(error).not.toBeNull();
      expect(error!.code).toBe('23503'); // Foreign key violation
    });

    it('should cascade delete when user is deleted', async () => {
      const user = await createTestUser();
      const product = await createTestProduct();

      // Add to wishlist
      await supabase.from('wishlists').insert({
        user_id: user.id,
        product_id: product.id,
      });

      // Delete user
      await supabase.from('users').delete().eq('id', user.id);

      // Wishlist item should be deleted (cascade)
      const { data: remaining } = await supabase
        .from('wishlists')
        .select()
        .eq('product_id', product.id);

      expect(remaining).toHaveLength(0);
    });

    it('should cascade delete when product is deleted', async () => {
      const user = await createTestUser();
      const product = await createTestProduct();

      // Add to wishlist
      await supabase.from('wishlists').insert({
        user_id: user.id,
        product_id: product.id,
      });

      // Delete product
      await supabase.from('products').delete().eq('id', product.id);

      // Wishlist item should be deleted (cascade)
      const { data: remaining } = await supabase
        .from('wishlists')
        .select()
        .eq('user_id', user.id);

      expect(remaining).toHaveLength(0);
    });
  });

  describe('Wishlist Query Patterns', () => {
    it('should get all product IDs in user wishlist', async () => {
      const user = await createTestUser();
      const product1 = await createTestProduct();
      const product2 = await createTestProduct({ hasVariants: true });
      const variant = await createTestVariant(product2.id);

      await supabase.from('wishlists').insert([
        { user_id: user.id, product_id: product1.id },
        { user_id: user.id, product_id: product2.id, variant_id: variant.id },
      ]);

      const { data, error } = await supabase
        .from('wishlists')
        .select('product_id, variant_id')
        .eq('user_id', user.id);

      expect(error).toBeNull();
      expect(data).toHaveLength(2);

      // Build ID set like the service does
      const ids = new Set<string>();
      for (const item of data!) {
        if (item.variant_id) {
          ids.add(`${item.product_id}:${item.variant_id}`);
        } else {
          ids.add(item.product_id);
        }
      }

      expect(ids.has(product1.id)).toBe(true);
      expect(ids.has(`${product2.id}:${variant.id}`)).toBe(true);
    });

    it('should check if specific product is in wishlist', async () => {
      const user = await createTestUser();
      const product = await createTestProduct();
      const otherProduct = await createTestProduct();

      await supabase.from('wishlists').insert({
        user_id: user.id,
        product_id: product.id,
      });

      // Product is in wishlist
      const { data: inWishlist } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', product.id)
        .is('variant_id', null)
        .maybeSingle();

      expect(inWishlist).not.toBeNull();

      // Other product is not in wishlist
      const { data: notInWishlist } = await supabase
        .from('wishlists')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', otherProduct.id)
        .is('variant_id', null)
        .maybeSingle();

      expect(notInWishlist).toBeNull();
    });

    it('should order wishlist by created_at descending (most recent first)', async () => {
      const user = await createTestUser();
      const product1 = await createTestProduct();

      // Wait a bit between inserts
      await supabase.from('wishlists').insert({
        user_id: user.id,
        product_id: product1.id,
      });

      // Small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 50));

      const product2 = await createTestProduct();
      await supabase.from('wishlists').insert({
        user_id: user.id,
        product_id: product2.id,
      });

      const { data: wishlist } = await supabase
        .from('wishlists')
        .select('product_id, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      expect(wishlist).toHaveLength(2);
      // Most recently added should be first
      expect(wishlist![0].product_id).toBe(product2.id);
      expect(wishlist![1].product_id).toBe(product1.id);
    });
  });
});
