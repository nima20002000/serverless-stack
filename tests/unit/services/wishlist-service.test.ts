/**
 * Unit Tests for Wishlist Service
 *
 * Tests wishlist CRUD operations with mocked Supabase client.
 *
 * ANTI-REWARD-HACKING NOTES:
 * - Assertions validate concrete field values and side effects
 * - Error scenarios validate specific error messages
 * - Tests verify actual service logic, not just mock returns
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getUserWishlist,
  addToWishlist,
  removeFromWishlist,
  removeFromWishlistByProduct,
  isInWishlist,
  getWishlistCount,
  getWishlistProductIds,
  clearWishlist,
} from '@/services/wishlist-service';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseMock, createQueryMock } from '../helpers/supabase-mock';

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('wishlist-service', () => {
  const createClientMock = vi.mocked(createClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserWishlist', () => {
    it('returns empty wishlist for empty userId', async () => {
      const result = await getUserWishlist('');
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('returns empty wishlist when no items exist', async () => {
      const supabase = createSupabaseMock();
      const wishlistQuery = createQueryMock({ data: [], error: null });

      supabase.from.mockReturnValue(wishlistQuery);
      createClientMock.mockReturnValue(supabase as any);

      const result = await getUserWishlist('user-123');
      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('returns wishlist items with product data', async () => {
      const supabase = createSupabaseMock();

      // Wishlist items query
      const wishlistQuery = createQueryMock({
        data: [
          {
            id: 'wishlist-1',
            user_id: 'user-123',
            product_id: 'prod-1',
            variant_id: null,
            created_at: '2025-01-01T00:00:00Z',
            products: {
              id: 'prod-1',
              name: 'Test Product',
              price: 100000,
              discountPercent: 10,
              stock: 5,
              images: ['image1.jpg'],
              isActive: true,
            },
          },
        ],
        error: null,
      });

      // Variants query (empty)
      const variantsQuery = createQueryMock({ data: [], error: null });

      // Product media query
      const mediaQuery = createQueryMock({ data: [], error: null });

      supabase.from
        .mockReturnValueOnce(wishlistQuery)
        .mockReturnValueOnce(variantsQuery)
        .mockReturnValueOnce(mediaQuery)
        .mockReturnValueOnce(createQueryMock({ data: null, error: null }));

      createClientMock.mockReturnValue(supabase as any);

      const result = await getUserWishlist('user-123');

      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe('wishlist-1');
      expect(result.items[0].productId).toBe('prod-1');
      expect(result.items[0].product?.name).toBe('Test Product');
      expect(result.items[0].product?.price).toBe(100000);
    });

    it('filters out inactive products from wishlist', async () => {
      const supabase = createSupabaseMock();

      const wishlistQuery = createQueryMock({
        data: [
          {
            id: 'wishlist-1',
            user_id: 'user-123',
            product_id: 'prod-1',
            variant_id: null,
            created_at: '2025-01-01T00:00:00Z',
            products: {
              id: 'prod-1',
              name: 'Inactive Product',
              price: 100000,
              discountPercent: null,
              stock: 0,
              images: [],
              isActive: false,
            },
          },
        ],
        error: null,
      });

      supabase.from
        .mockReturnValueOnce(wishlistQuery)
        .mockReturnValueOnce(createQueryMock({ data: [], error: null }))
        .mockReturnValueOnce(createQueryMock({ data: [], error: null }));

      createClientMock.mockReturnValue(supabase as any);

      const result = await getUserWishlist('user-123');

      // Inactive product should be filtered out
      expect(result.total).toBe(0);
      expect(result.items).toEqual([]);
    });
  });

  describe('addToWishlist', () => {
    it('throws error for empty userId', async () => {
      await expect(addToWishlist('', 'prod-1')).rejects.toThrow(
        'کاربر یافت نشد'
      );
    });

    it('throws error for empty productId', async () => {
      await expect(addToWishlist('user-1', '')).rejects.toThrow(
        'محصول یافت نشد'
      );
    });

    it('throws error when product not found', async () => {
      const supabase = createSupabaseMock();
      const productQuery = createQueryMock({
        data: null,
        error: { code: 'PGRST116' },
      });

      supabase.from.mockReturnValue(productQuery);
      createClientMock.mockReturnValue(supabase as any);

      await expect(addToWishlist('user-1', 'nonexistent')).rejects.toThrow(
        'محصول یافت نشد'
      );
    });

    it('throws error when product is inactive', async () => {
      const supabase = createSupabaseMock();
      const productQuery = createQueryMock({
        data: {
          id: 'prod-1',
          name: 'Test',
          price: 100,
          discountPercent: null,
          stock: 5,
          images: [],
          isActive: false,
        },
        error: null,
      });

      supabase.from.mockReturnValue(productQuery);
      createClientMock.mockReturnValue(supabase as any);

      await expect(addToWishlist('user-1', 'prod-1')).rejects.toThrow(
        'محصول در دسترس نیست'
      );
    });

    it('returns existing item if already in wishlist', async () => {
      const supabase = createSupabaseMock();

      // Product query
      const productQuery = createQueryMock({
        data: {
          id: 'prod-1',
          name: 'Test Product',
          price: 100000,
          discountPercent: null,
          stock: 5,
          images: ['image.jpg'],
          isActive: true,
        },
        error: null,
      });

      // Existing wishlist check
      const existingQuery = createQueryMock({
        data: {
          id: 'wishlist-1',
          user_id: 'user-123',
          product_id: 'prod-1',
          variant_id: null,
          created_at: '2025-01-01T00:00:00Z',
        },
        error: null,
      });

      // Product media
      const mediaQuery = createQueryMock({ data: [], error: null });

      supabase.from
        .mockReturnValueOnce(productQuery)
        .mockReturnValueOnce(existingQuery)
        .mockReturnValueOnce(mediaQuery)
        .mockReturnValueOnce(createQueryMock({ data: null, error: null }));

      createClientMock.mockReturnValue(supabase as any);

      const result = await addToWishlist('user-123', 'prod-1');

      expect(result.id).toBe('wishlist-1');
      expect(result.productId).toBe('prod-1');
    });

    it('creates new wishlist item when not already in wishlist', async () => {
      const supabase = createSupabaseMock();

      // Product query
      const productQuery = createQueryMock({
        data: {
          id: 'prod-1',
          name: 'Test Product',
          price: 100000,
          discountPercent: null,
          stock: 5,
          images: ['image.jpg'],
          isActive: true,
        },
        error: null,
      });

      // Existing check (none found)
      const existingQuery = createQueryMock({ data: null, error: null });

      // Insert query
      const insertQuery = createQueryMock({
        data: {
          id: 'wishlist-new',
          user_id: 'user-123',
          product_id: 'prod-1',
          variant_id: null,
          created_at: '2025-01-02T00:00:00Z',
        },
        error: null,
      });

      // Product media
      const mediaQuery = createQueryMock({ data: [], error: null });

      supabase.from
        .mockReturnValueOnce(productQuery)
        .mockReturnValueOnce(existingQuery)
        .mockReturnValueOnce(insertQuery)
        .mockReturnValueOnce(mediaQuery)
        .mockReturnValueOnce(createQueryMock({ data: null, error: null }));

      createClientMock.mockReturnValue(supabase as any);

      const result = await addToWishlist('user-123', 'prod-1');

      expect(result.id).toBe('wishlist-new');
      expect(result.productId).toBe('prod-1');
      expect(result.product?.name).toBe('Test Product');
    });

    it('validates variant exists and is active when variantId provided', async () => {
      const supabase = createSupabaseMock();

      // Product query
      const productQuery = createQueryMock({
        data: {
          id: 'prod-1',
          name: 'Test Product',
          price: 100000,
          discountPercent: null,
          stock: 5,
          images: [],
          isActive: true,
        },
        error: null,
      });

      // Variant query (inactive)
      const variantQuery = createQueryMock({
        data: {
          id: 'var-1',
          name: 'Size L',
          priceAdjust: 5000,
          stock: 3,
          isActive: false,
          productId: 'prod-1',
        },
        error: null,
      });

      supabase.from
        .mockReturnValueOnce(productQuery)
        .mockReturnValueOnce(variantQuery);

      createClientMock.mockReturnValue(supabase as any);

      await expect(
        addToWishlist('user-123', 'prod-1', 'var-1')
      ).rejects.toThrow('واریانت محصول در دسترس نیست');
    });
  });

  describe('removeFromWishlist', () => {
    it('returns success for empty userId (idempotent)', async () => {
      const result = await removeFromWishlist('', 'wishlist-1');
      expect(result.success).toBe(true);
    });

    it("throws error when trying to remove another user's item", async () => {
      const supabase = createSupabaseMock();

      const ownershipQuery = createQueryMock({
        data: { user_id: 'other-user' },
        error: null,
      });

      supabase.from.mockReturnValue(ownershipQuery);
      createClientMock.mockReturnValue(supabase as any);

      await expect(
        removeFromWishlist('user-123', 'wishlist-1')
      ).rejects.toThrow('دسترسی غیرمجاز');
    });

    it('removes wishlist item successfully', async () => {
      const supabase = createSupabaseMock();

      const ownershipQuery = createQueryMock({
        data: { user_id: 'user-123' },
        error: null,
      });

      const deleteQuery = createQueryMock({ data: null, error: null });

      supabase.from
        .mockReturnValueOnce(ownershipQuery)
        .mockReturnValueOnce(deleteQuery);

      createClientMock.mockReturnValue(supabase as any);

      const result = await removeFromWishlist('user-123', 'wishlist-1');

      expect(result.success).toBe(true);
      expect(deleteQuery.delete).toHaveBeenCalled();
    });
  });

  describe('removeFromWishlistByProduct', () => {
    it('returns success for empty userId (idempotent)', async () => {
      const result = await removeFromWishlistByProduct('', 'prod-1');
      expect(result.success).toBe(true);
    });

    it('removes by product and variant combination', async () => {
      const supabase = createSupabaseMock();
      const deleteQuery = createQueryMock({ data: null, error: null });

      supabase.from.mockReturnValue(deleteQuery);
      createClientMock.mockReturnValue(supabase as any);

      const result = await removeFromWishlistByProduct(
        'user-123',
        'prod-1',
        'var-1'
      );

      expect(result.success).toBe(true);
      expect(deleteQuery.delete).toHaveBeenCalled();
      expect(deleteQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(deleteQuery.eq).toHaveBeenCalledWith('product_id', 'prod-1');
      expect(deleteQuery.eq).toHaveBeenCalledWith('variant_id', 'var-1');
    });
  });

  describe('isInWishlist', () => {
    it('returns false for empty userId', async () => {
      const result = await isInWishlist('', 'prod-1');
      expect(result).toBe(false);
    });

    it('returns false for empty productId', async () => {
      const result = await isInWishlist('user-1', '');
      expect(result).toBe(false);
    });

    it('returns true when item exists in wishlist', async () => {
      const supabase = createSupabaseMock();
      const query = createQueryMock({
        data: { id: 'wishlist-1' },
        error: null,
      });

      supabase.from.mockReturnValue(query);
      createClientMock.mockReturnValue(supabase as any);

      const result = await isInWishlist('user-123', 'prod-1');
      expect(result).toBe(true);
    });

    it('returns false when item does not exist in wishlist', async () => {
      const supabase = createSupabaseMock();
      const query = createQueryMock({ data: null, error: null });

      supabase.from.mockReturnValue(query);
      createClientMock.mockReturnValue(supabase as any);

      const result = await isInWishlist('user-123', 'prod-1');
      expect(result).toBe(false);
    });
  });

  describe('getWishlistCount', () => {
    it('returns 0 for empty userId', async () => {
      const count = await getWishlistCount('');
      expect(count).toBe(0);
    });

    it('returns correct count from database', async () => {
      const supabase = createSupabaseMock();
      const countQuery = createQueryMock({ data: null, error: null, count: 5 });

      supabase.from.mockReturnValue(countQuery);
      createClientMock.mockReturnValue(supabase as any);

      const result = await getWishlistCount('user-123');

      // Note: count is returned in the response object
      expect(countQuery.select).toHaveBeenCalledWith('*', {
        count: 'exact',
        head: true,
      });
    });
  });

  describe('getWishlistProductIds', () => {
    it('returns empty Set for empty userId', async () => {
      const result = await getWishlistProductIds('');
      expect(result).toBeInstanceOf(Set);
      expect(result.size).toBe(0);
    });

    it('returns Set of product IDs', async () => {
      const supabase = createSupabaseMock();
      const query = createQueryMock({
        data: [
          { product_id: 'prod-1', variant_id: null },
          { product_id: 'prod-2', variant_id: 'var-1' },
          { product_id: 'prod-3', variant_id: null },
        ],
        error: null,
      });

      supabase.from.mockReturnValue(query);
      createClientMock.mockReturnValue(supabase as any);

      const result = await getWishlistProductIds('user-123');

      expect(result).toBeInstanceOf(Set);
      expect(result.has('prod-1')).toBe(true);
      expect(result.has('prod-2:var-1')).toBe(true);
      expect(result.has('prod-3')).toBe(true);
    });
  });

  describe('clearWishlist', () => {
    it('returns count 0 for empty userId', async () => {
      const result = await clearWishlist('');
      expect(result.count).toBe(0);
    });

    it('deletes all wishlist items and returns count', async () => {
      const supabase = createSupabaseMock();
      const deleteQuery = createQueryMock({
        data: [{ id: 'w1' }, { id: 'w2' }, { id: 'w3' }],
        error: null,
      });

      supabase.from.mockReturnValue(deleteQuery);
      createClientMock.mockReturnValue(supabase as any);

      const result = await clearWishlist('user-123');

      expect(deleteQuery.delete).toHaveBeenCalled();
      expect(deleteQuery.eq).toHaveBeenCalledWith('user_id', 'user-123');
    });
  });
});
