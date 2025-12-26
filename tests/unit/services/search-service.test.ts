import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchAll } from '@/services/search-service';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
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

describe('search-service', () => {
  const createClientMock = vi.mocked(createClient);
  const logMock = vi.mocked(log);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty results for blank query', async () => {
    const result = await searchAll('   ');

    expect(result).toEqual({ products: [], categories: [], total: 0 });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('searches products and categories with filters and maps results', async () => {
    const supabase = createSupabaseMock();

    const productsQuery = createQueryMock({
      data: [
        {
          id: 'p1',
          name: 'Alpha',
          description: 'First',
          price: 100,
          discountPercent: 10,
          images: null,
          categoryId: 'c1',
          category: { name: 'Cat 1' },
        },
        {
          id: 'p2',
          name: 'Beta',
          description: null,
          price: 50,
          discountPercent: null,
          images: ['img.jpg'],
          categoryId: 'c2',
          category: null,
        },
      ],
      error: null,
    }) as ReturnType<typeof createQueryMock> & {
      order: ReturnType<typeof vi.fn>;
    };
    const categoriesQuery = createQueryMock({
      data: [
        {
          id: 'c1',
          name: 'Cat 1',
          slug: 'cat-1',
          description: 'Cat desc',
          image: 'cat.jpg',
        },
      ],
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(productsQuery)
      .mockReturnValueOnce(categoriesQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await searchAll('  tea  ', { limit: 3 });

    expect(supabase.from).toHaveBeenCalledWith('products');
    expect(productsQuery.or).toHaveBeenCalledWith(
      'name.ilike.%tea%,description.ilike.%tea%'
    );
    expect(productsQuery.eq).toHaveBeenCalledWith('isActive', true);
    expect(productsQuery.order).toHaveBeenCalledWith('name', {
      ascending: true,
    });
    expect(productsQuery.limit).toHaveBeenCalledWith(3);

    expect(supabase.from).toHaveBeenCalledWith('categories');
    expect(categoriesQuery.or).toHaveBeenCalledWith(
      'name.ilike.%tea%,description.ilike.%tea%'
    );
    expect(categoriesQuery.eq).toHaveBeenCalledWith('isActive', true);
    expect(categoriesQuery.order).toHaveBeenCalledWith('name', {
      ascending: true,
    });
    expect(categoriesQuery.limit).toHaveBeenCalledWith(3);

    expect(result).toEqual({
      products: [
        {
          id: 'p1',
          name: 'Alpha',
          description: 'First',
          price: 100,
          discountPercent: 10,
          images: [],
          categoryId: 'c1',
          categoryName: 'Cat 1',
          type: 'product',
        },
        {
          id: 'p2',
          name: 'Beta',
          description: null,
          price: 50,
          discountPercent: null,
          images: ['img.jpg'],
          categoryId: 'c2',
          categoryName: null,
          type: 'product',
        },
      ],
      categories: [
        {
          id: 'c1',
          name: 'Cat 1',
          slug: 'cat-1',
          description: 'Cat desc',
          image: 'cat.jpg',
          type: 'category',
        },
      ],
      total: 3,
    });
  });

  it('skips active filtering when includeInactive is true', async () => {
    const supabase = createSupabaseMock();
    const productsQuery = createQueryMock({
      data: [],
      error: null,
    }) as ReturnType<typeof createQueryMock> & {
      order: ReturnType<typeof vi.fn>;
    };
    const categoriesQuery = createQueryMock({ data: [], error: null });

    supabase.from
      .mockReturnValueOnce(productsQuery)
      .mockReturnValueOnce(categoriesQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await searchAll('match', { includeInactive: true });

    expect(productsQuery.eq).not.toHaveBeenCalled();
    expect(categoriesQuery.eq).not.toHaveBeenCalled();
    expect(productsQuery.limit).toHaveBeenCalledWith(5);
    expect(categoriesQuery.limit).toHaveBeenCalledWith(5);
  });

  it('logs errors from product and category searches', async () => {
    const supabase = createSupabaseMock();
    const productError = new Error('Product search failed');
    const categoryError = new Error('Category search failed');

    const productsQuery = createQueryMock({
      data: null,
      error: productError,
    });
    const categoriesQuery = createQueryMock({
      data: null,
      error: categoryError,
    });

    supabase.from
      .mockReturnValueOnce(productsQuery)
      .mockReturnValueOnce(categoriesQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await searchAll('error');

    expect(logMock.error).toHaveBeenCalledWith('Error searching products', {
      query: 'error',
      error: productError,
    });
    expect(logMock.error).toHaveBeenCalledWith('Error searching categories', {
      query: 'error',
      error: categoryError,
    });
    expect(result).toEqual({ products: [], categories: [], total: 0 });
  });

  it('returns empty results and logs when an exception is thrown', async () => {
    const supabase = createSupabaseMock();
    const productsQuery = createQueryMock({
      data: [],
      error: null,
    }) as ReturnType<typeof createQueryMock> & {
      order: ReturnType<typeof vi.fn>;
    };
    const categoriesQuery = createQueryMock({ data: [], error: null });

    productsQuery.order.mockImplementation(() => {
      throw new Error('boom');
    });

    supabase.from
      .mockReturnValueOnce(productsQuery)
      .mockReturnValueOnce(categoriesQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await searchAll('  fail  ');

    expect(logMock.error).toHaveBeenCalledWith(
      'Error in searchAll',
      expect.objectContaining({
        query: 'fail',
        error: expect.any(Error),
      })
    );
    expect(result).toEqual({ products: [], categories: [], total: 0 });
  });
});
