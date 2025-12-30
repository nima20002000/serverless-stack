import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  updateStock,
  getPriceDisplay,
  addProductMedia,
  deleteProductMedia,
  updateProductStockFromVariants,
  createProductVariant,
  createProduct,
  updateProduct,
  deleteProduct,
  getAllProducts,
  searchProducts,
  getProductById,
} from '@/services/product-service';
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

vi.mock('@/lib/redis/client', () => ({
  clearCachePattern: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('product-service', () => {
  const createClientMock = vi.mocked(createClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const queueFetchProductRelations = (
    supabase: ReturnType<typeof createSupabaseMock>
  ) => {
    const productQuery = createQueryMock({
      data: {
        id: 'prod-1',
        name: 'Test Product',
        description: 'Desc',
        price: 100,
        discountPercent: null,
        stock: 3,
        images: [],
        categoryId: null,
        hasVariants: false,
        isFeatured: false,
        isActive: true,
      },
      error: null,
    });
    const productTagsQuery = createQueryMock({
      data: [{ B: 'tag-1' }, { B: 'tag-2' }],
      error: null,
    });
    const tagsQuery = createQueryMock({
      data: [
        { id: 'tag-1', name: 'Tag 1' },
        { id: 'tag-2', name: 'Tag 2' },
      ],
      error: null,
    });
    const mediaQuery = createQueryMock({ data: [], error: null });
    const variantsQuery = createQueryMock({ data: [], error: null });
    const variantMediaQuery = createQueryMock({ data: [], error: null });

    supabase.from
      .mockReturnValueOnce(productQuery)
      .mockReturnValueOnce(productTagsQuery)
      .mockReturnValueOnce(tagsQuery)
      .mockReturnValueOnce(mediaQuery)
      .mockReturnValueOnce(variantsQuery)
      .mockReturnValueOnce(variantMediaQuery);
  };

  it('rejects product creation with negative stock', async () => {
    // The createProduct function should validate that stock >= 0
    await expect(
      createProduct({
        name: 'Test Product',
        description: 'Desc',
        price: 100,
        stock: -5, // Negative stock should be rejected
      })
    ).rejects.toThrow('موجودی نمی‌تواند منفی باشد');
  });

  it('rejects product creation with negative price', async () => {
    // The createProduct function should validate that price > 0
    await expect(
      createProduct({
        name: 'Test Product',
        description: 'Desc',
        price: -100, // Negative price should be rejected
        stock: 10,
      })
    ).rejects.toThrow('قیمت باید بیشتر از صفر باشد');
  });

  it('rejects product creation with zero price', async () => {
    // The createProduct function should validate that price > 0
    await expect(
      createProduct({
        name: 'Test Product',
        description: 'Desc',
        price: 0, // Zero price should be rejected
        stock: 10,
      })
    ).rejects.toThrow('قیمت باید بیشتر از صفر باشد');
  });

  it('creates a product and connects tags', async () => {
    const supabase = createSupabaseMock();

    const insertProductQuery = createQueryMock({
      data: {
        id: 'prod-1',
        name: 'Test Product',
        description: 'Desc',
        price: 100,
        discountPercent: null,
        stock: 3,
        images: [],
        categoryId: null,
        hasVariants: false,
        isFeatured: false,
        isActive: true,
      },
      error: null,
    });
    const insertTagsQuery = createQueryMock({
      data: null,
      error: null,
    }) as ReturnType<typeof createQueryMock> & {
      insert: ReturnType<typeof vi.fn>;
    };

    supabase.from
      .mockReturnValueOnce(insertProductQuery)
      .mockReturnValueOnce(insertTagsQuery);

    queueFetchProductRelations(supabase);

    createClientMock.mockReturnValue(supabase as unknown);

    const result = await createProduct({
      name: 'Test Product',
      description: 'Desc',
      price: 100,
      stock: 3,
      tagIds: ['tag-1', 'tag-2'],
    });

    const tagConnections = insertTagsQuery.insert.mock.calls[0][0] as Array<{
      A: string;
      B: string;
    }>;

    expect(result.id).toBe('prod-1');
    expect(insertProductQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Test Product',
        description: 'Desc',
        price: 100,
        stock: 3,
      })
    );
    expect(tagConnections).toHaveLength(2);
    expect(new Set(tagConnections.map((tag) => tag.A)).size).toBe(1);
    expect(tagConnections.map((tag) => tag.B)).toEqual(['tag-1', 'tag-2']);
  });

  it('updates product data and tag connections', async () => {
    const supabase = createSupabaseMock();

    const existingProductQuery = createQueryMock({
      data: { id: 'prod-1' },
      error: null,
    });
    const updateProductQuery = createQueryMock({ data: null, error: null });
    const deleteTagsQuery = createQueryMock({ data: null, error: null });
    const insertTagsQuery = createQueryMock({ data: null, error: null });

    supabase.from
      .mockReturnValueOnce(existingProductQuery)
      .mockReturnValueOnce(updateProductQuery)
      .mockReturnValueOnce(deleteTagsQuery)
      .mockReturnValueOnce(insertTagsQuery);

    queueFetchProductRelations(supabase);

    createClientMock.mockReturnValue(supabase as unknown);

    const result = await updateProduct('prod-1', {
      name: 'Updated',
      price: 250,
      tagIds: ['tag-1'],
    });

    expect(result.name).toBe('Test Product');
    expect(updateProductQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Updated', price: 250 })
    );
    expect(deleteTagsQuery.delete).toHaveBeenCalled();
    expect(insertTagsQuery.insert).toHaveBeenCalledWith([
      { A: 'prod-1', B: 'tag-1' },
    ]);
  });

  it('deletes product when no transaction history exists', async () => {
    const supabase = createSupabaseMock();

    const fetchProductQuery = createQueryMock({
      data: { id: 'prod-1' },
      error: null,
    });
    const transactionCountQuery = createQueryMock({
      data: null,
      error: null,
      count: 0,
    });
    const deleteProductQuery = createQueryMock({ data: null, error: null });

    supabase.from
      .mockReturnValueOnce(fetchProductQuery)
      .mockReturnValueOnce(transactionCountQuery)
      .mockReturnValueOnce(deleteProductQuery);

    createClientMock.mockReturnValue(supabase as unknown);

    const result = await deleteProduct('prod-1');

    expect(result).toEqual({ success: true });
    expect(deleteProductQuery.delete).toHaveBeenCalled();
  });

  it('returns paginated products with search and stock filters', async () => {
    const supabase = createSupabaseMock();

    const productsQuery = createQueryMock({
      data: [
        {
          id: 'p1',
          name: 'Test',
          description: 'Desc',
          price: 100,
          discountPercent: null,
          stock: 5,
          images: ['img'],
          categoryId: null,
          hasVariants: false,
          isFeatured: false,
          isActive: true,
        },
      ],
      error: null,
      count: 1,
    });

    supabase.from.mockReturnValue(productsQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await getAllProducts({
      page: 2,
      perPage: 1,
      search: 'Test',
      stock: 'in-stock',
      includeRelations: false,
    });

    expect(productsQuery.or).toHaveBeenCalledWith(
      'name.ilike.%Test%,description.ilike.%Test%'
    );
    expect(productsQuery.gt).toHaveBeenCalledWith('stock', 0);
    expect(productsQuery.range).toHaveBeenCalledWith(1, 1);
    expect(result).toEqual({
      data: [
        {
          id: 'p1',
          name: 'Test',
          description: 'Desc',
          price: 100,
          discountPercent: null,
          stock: 5,
          images: ['img'],
          categoryId: null,
          hasVariants: false,
          isFeatured: false,
          isActive: true,
          category: null,
          tags: [],
          media: [],
          variants: [],
        },
      ],
      total: 1,
      page: 2,
      perPage: 1,
      totalPages: 1,
    });
  });

  it('searches products with pagination and returns metadata', async () => {
    const supabase = createSupabaseMock();

    const searchQuery = createQueryMock({
      data: [{ id: 'p1', name: 'Match' }],
      error: null,
      count: 3,
    });

    supabase.from.mockReturnValue(searchQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await searchProducts('Match', { page: 2, perPage: 2 });

    expect(searchQuery.or).toHaveBeenCalledWith(
      'name.ilike.%Match%,description.ilike.%Match%'
    );
    expect(searchQuery.range).toHaveBeenCalledWith(2, 3);
    expect(result).toEqual({
      data: [{ id: 'p1', name: 'Match' }],
      total: 3,
      page: 2,
      perPage: 2,
      totalPages: 2,
    });
  });

  it('updates stock when quantity is available', async () => {
    const supabase = createSupabaseMock();

    const fetchQuery = createQueryMock({
      data: { id: 'p1', stock: 5 },
      error: null,
    });
    const updateQuery = createQueryMock({
      data: { id: 'p1', stock: 7 },
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(updateQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await updateStock('p1', 2);

    expect(result.stock).toBe(7);
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ stock: 7 })
    );
  });

  it('rejects stock update when result would be negative', async () => {
    const supabase = createSupabaseMock();

    const fetchQuery = createQueryMock({
      data: { id: 'p1', stock: 1 },
      error: null,
    });

    supabase.from.mockReturnValue(fetchQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(updateStock('p1', -5)).rejects.toThrow('موجودی کافی نیست');
  });

  it('calculates price display with discounts', () => {
    const result = getPriceDisplay(1000, 20);
    expect(result).toEqual({
      originalPrice: 1000,
      finalPrice: 800,
      hasDiscount: true,
      discountAmount: 200,
    });
  });

  it('adds product media and sets default when none exists', async () => {
    const supabase = createSupabaseMock();

    const countQuery = createQueryMock({ count: 0, error: null });
    const unsetDefaultQuery = createQueryMock({ data: null, error: null });
    const insertQuery = createQueryMock({
      data: { id: 'm1', productId: 'p1', isDefault: true },
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(unsetDefaultQuery)
      .mockReturnValueOnce(insertQuery);

    createClientMock.mockReturnValue(supabase as unknown);

    const result = await addProductMedia({
      productId: 'p1',
      type: 'IMAGE',
      url: 'https://example.com/image.jpg',
    });

    expect(result.isDefault).toBe(true);
    expect(unsetDefaultQuery.update).toHaveBeenCalledWith({ isDefault: false });
  });

  it('deletes default media and promotes first remaining', async () => {
    const supabase = createSupabaseMock();

    const fetchQuery = createQueryMock({
      data: { productId: 'p1', variantId: null, isDefault: true },
      error: null,
    });
    const deleteQuery = createQueryMock({ data: null, error: null });
    const selectRemaining = createQueryMock({
      data: { id: 'm2' },
      error: null,
    });
    const updateRemaining = createQueryMock({ data: null, error: null });

    supabase.from
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(deleteQuery)
      .mockReturnValueOnce(selectRemaining)
      .mockReturnValueOnce(updateRemaining);

    createClientMock.mockReturnValue(supabase as unknown);

    const result = await deleteProductMedia('m1');

    expect(result).toEqual({ success: true });
    expect(updateRemaining.update).toHaveBeenCalledWith({ isDefault: true });
  });

  it('updates product stock from variant totals and sets hasVariants true', async () => {
    const supabase = createSupabaseMock();

    const variantsQuery = createQueryMock({
      data: [{ stock: 2 }, { stock: 3 }],
      error: null,
    });
    const updateQuery = createQueryMock({ data: null, error: null });

    supabase.from
      .mockReturnValueOnce(variantsQuery)
      .mockReturnValueOnce(updateQuery);

    createClientMock.mockReturnValue(supabase as unknown);

    await updateProductStockFromVariants('p1');

    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ stock: 5, hasVariants: true })
    );
  });

  it('sets hasVariants to false when no variants exist', async () => {
    const supabase = createSupabaseMock();

    const variantsQuery = createQueryMock({
      data: [], // No variants
      error: null,
    });
    const updateQuery = createQueryMock({ data: null, error: null });

    supabase.from
      .mockReturnValueOnce(variantsQuery)
      .mockReturnValueOnce(updateQuery);

    createClientMock.mockReturnValue(supabase as unknown);

    await updateProductStockFromVariants('p1');

    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ hasVariants: false })
    );
  });

  it('creates product variant with auto order and updates hasVariants', async () => {
    const supabase = createSupabaseMock();

    const skuQuery = createQueryMock({ data: null, error: null });
    const maxOrderQuery = createQueryMock({ data: { order: 2 }, error: null });
    const insertQuery = createQueryMock({
      data: { id: 'v1', order: 3 },
      error: null,
    });
    const variantsQuery = createQueryMock({
      data: [{ stock: 2 }, { stock: 3 }],
      error: null,
    });
    const updateProductQuery = createQueryMock({ data: null, error: null });

    supabase.from
      .mockReturnValueOnce(skuQuery)
      .mockReturnValueOnce(maxOrderQuery)
      .mockReturnValueOnce(insertQuery)
      .mockReturnValueOnce(variantsQuery)
      .mockReturnValueOnce(updateProductQuery);

    createClientMock.mockReturnValue(supabase as unknown);

    const result = await createProductVariant({
      productId: 'p1',
      name: 'Variant',
      sku: 'SKU-1',
      stock: 5,
    });

    expect(result.order).toBe(3);
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({ order: 3, sku: 'SKU-1' })
    );
    // Verify hasVariants is set to true when variant is created
    expect(updateProductQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ hasVariants: true })
    );
  });

  describe('getProductById variant filtering', () => {
    /**
     * Tests for the feature that filters out inactive variants from public product listings.
     * When includeInactive=false (default), only active variants are returned.
     * When includeInactive=true (admin access), all variants are returned.
     */

    it('filters out inactive variants by default (public access)', async () => {
      const supabase = createSupabaseMock();

      // Product query
      const productQuery = createQueryMock({
        data: {
          id: 'prod-1',
          name: 'Test Product',
          description: 'Desc',
          price: 100,
          discountPercent: null,
          stock: 30,
          images: [],
          categoryId: null,
          hasVariants: true,
          isFeatured: false,
          isActive: true,
        },
        error: null,
      });

      // Tags query (empty)
      const productTagsQuery = createQueryMock({
        data: [],
        error: null,
      });

      // Media query (empty)
      const mediaQuery = createQueryMock({ data: [], error: null });

      // Variants query - should filter by isActive=true
      const variantsQuery = createQueryMock({
        data: [
          { id: 'v1', name: 'Active Variant', stock: 10, isActive: true },
          { id: 'v2', name: 'Active Variant 2', stock: 20, isActive: true },
        ],
        error: null,
      });

      // Variant media query
      const variantMediaQuery = createQueryMock({ data: [], error: null });

      supabase.from
        .mockReturnValueOnce(productQuery)
        .mockReturnValueOnce(productTagsQuery)
        .mockReturnValueOnce(mediaQuery)
        .mockReturnValueOnce(variantsQuery)
        .mockReturnValueOnce(variantMediaQuery);

      createClientMock.mockReturnValue(supabase as unknown);

      const result = await getProductById('prod-1', true, false);

      // Verify the variants query was called with isActive=true filter
      expect(variantsQuery.eq).toHaveBeenCalledWith('isActive', true);

      // Result should only contain active variants
      expect('variants' in result && result.variants).toBeDefined();
      if ('variants' in result && result.variants) {
        expect(result.variants.length).toBe(2);
        result.variants.forEach((v) => {
          expect(v.isActive).toBe(true);
        });
      }
    });

    it('includes inactive variants when includeInactive=true (admin access)', async () => {
      const supabase = createSupabaseMock();

      // Product query
      const productQuery = createQueryMock({
        data: {
          id: 'prod-1',
          name: 'Test Product',
          description: 'Desc',
          price: 100,
          discountPercent: null,
          stock: 35,
          images: [],
          categoryId: null,
          hasVariants: true,
          isFeatured: false,
          isActive: true,
        },
        error: null,
      });

      // Tags query (empty)
      const productTagsQuery = createQueryMock({
        data: [],
        error: null,
      });

      // Media query (empty)
      const mediaQuery = createQueryMock({ data: [], error: null });

      // Variants query - should NOT filter by isActive when includeInactive=true
      const variantsQuery = createQueryMock({
        data: [
          { id: 'v1', name: 'Active Variant', stock: 10, isActive: true },
          { id: 'v2', name: 'Inactive Variant', stock: 5, isActive: false },
          { id: 'v3', name: 'Active Variant 2', stock: 20, isActive: true },
        ],
        error: null,
      });

      // Variant media query
      const variantMediaQuery = createQueryMock({ data: [], error: null });

      supabase.from
        .mockReturnValueOnce(productQuery)
        .mockReturnValueOnce(productTagsQuery)
        .mockReturnValueOnce(mediaQuery)
        .mockReturnValueOnce(variantsQuery)
        .mockReturnValueOnce(variantMediaQuery);

      createClientMock.mockReturnValue(supabase as unknown);

      // Call with includeInactive=true (admin access)
      const result = await getProductById('prod-1', true, true);

      // When includeInactive=true, the isActive filter should NOT be applied
      // The variantsQuery.eq should NOT have been called with ('isActive', true)
      const eqCalls = variantsQuery.eq.mock.calls;
      const hasActiveFilter = eqCalls.some(
        (call: unknown[]) => call[0] === 'isActive' && call[1] === true
      );
      expect(hasActiveFilter).toBe(false);

      // Result should contain all variants (active and inactive)
      expect('variants' in result && result.variants).toBeDefined();
      if ('variants' in result && result.variants) {
        expect(result.variants.length).toBe(3);
      }
    });

    it('calculates stock from only active variants for public access', async () => {
      const supabase = createSupabaseMock();

      // Product query
      const productQuery = createQueryMock({
        data: {
          id: 'prod-1',
          name: 'Test Product',
          description: 'Desc',
          price: 100,
          discountPercent: null,
          stock: 0, // Will be calculated from variants
          images: [],
          categoryId: null,
          hasVariants: true,
          isFeatured: false,
          isActive: true,
        },
        error: null,
      });

      // Tags query (empty)
      const productTagsQuery = createQueryMock({
        data: [],
        error: null,
      });

      // Media query (empty)
      const mediaQuery = createQueryMock({ data: [], error: null });

      // Variants query - only active variants are returned (filtered by service)
      const variantsQuery = createQueryMock({
        data: [
          { id: 'v1', name: 'Active Variant 1', stock: 10, isActive: true },
          { id: 'v2', name: 'Active Variant 2', stock: 15, isActive: true },
        ],
        error: null,
      });

      // Variant media query
      const variantMediaQuery = createQueryMock({ data: [], error: null });

      supabase.from
        .mockReturnValueOnce(productQuery)
        .mockReturnValueOnce(productTagsQuery)
        .mockReturnValueOnce(mediaQuery)
        .mockReturnValueOnce(variantsQuery)
        .mockReturnValueOnce(variantMediaQuery);

      createClientMock.mockReturnValue(supabase as unknown);

      const result = await getProductById('prod-1', true, false);

      // Stock should be calculated from only the active variants (10 + 15 = 25)
      expect(result.stock).toBe(25);
    });

    it('returns empty variants array when all variants are inactive', async () => {
      const supabase = createSupabaseMock();

      // Product query
      const productQuery = createQueryMock({
        data: {
          id: 'prod-1',
          name: 'Test Product',
          description: 'Desc',
          price: 100,
          discountPercent: null,
          stock: 0,
          images: [],
          categoryId: null,
          hasVariants: true,
          isFeatured: false,
          isActive: true,
        },
        error: null,
      });

      // Tags query (empty)
      const productTagsQuery = createQueryMock({
        data: [],
        error: null,
      });

      // Media query (empty)
      const mediaQuery = createQueryMock({ data: [], error: null });

      // Variants query - no active variants returned
      const variantsQuery = createQueryMock({
        data: [],
        error: null,
      });

      supabase.from
        .mockReturnValueOnce(productQuery)
        .mockReturnValueOnce(productTagsQuery)
        .mockReturnValueOnce(mediaQuery)
        .mockReturnValueOnce(variantsQuery);

      createClientMock.mockReturnValue(supabase as unknown);

      const result = await getProductById('prod-1', true, false);

      // Should return product with empty variants and stock 0
      expect('variants' in result && result.variants).toBeDefined();
      if ('variants' in result && result.variants) {
        expect(result.variants.length).toBe(0);
      }
      expect(result.stock).toBe(0);
    });
  });
});
