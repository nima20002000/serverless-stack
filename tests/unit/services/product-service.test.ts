import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  updateStock,
  getPriceDisplay,
  addProductMedia,
  deleteProductMedia,
  updateProductStockFromVariants,
  createProductVariant,
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

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('product-service', () => {
  const createClientMock = vi.mocked(createClient);

  beforeEach(() => {
    vi.clearAllMocks();
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
    createClientMock.mockReturnValue(supabase as any);

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
    createClientMock.mockReturnValue(supabase as any);

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

    createClientMock.mockReturnValue(supabase as any);

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

    createClientMock.mockReturnValue(supabase as any);

    const result = await deleteProductMedia('m1');

    expect(result).toEqual({ success: true });
    expect(updateRemaining.update).toHaveBeenCalledWith({ isDefault: true });
  });

  it('updates product stock from variant totals', async () => {
    const supabase = createSupabaseMock();

    const variantsQuery = createQueryMock({
      data: [{ stock: 2 }, { stock: 3 }],
      error: null,
    });
    const updateQuery = createQueryMock({ data: null, error: null });

    supabase.from
      .mockReturnValueOnce(variantsQuery)
      .mockReturnValueOnce(updateQuery);

    createClientMock.mockReturnValue(supabase as any);

    await updateProductStockFromVariants('p1');

    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ stock: 5 })
    );
  });

  it('creates product variant with auto order', async () => {
    const supabase = createSupabaseMock();

    const skuQuery = createQueryMock({ data: null, error: null });
    const maxOrderQuery = createQueryMock({ data: { order: 2 }, error: null });
    const insertQuery = createQueryMock({
      data: { id: 'v1', order: 3 },
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(skuQuery)
      .mockReturnValueOnce(maxOrderQuery)
      .mockReturnValueOnce(insertQuery);

    createClientMock.mockReturnValue(supabase as any);

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
  });
});
