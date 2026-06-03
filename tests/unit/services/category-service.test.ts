import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  bulkDeleteCategories,
  bulkUpdateCategories,
  getActiveCategories,
} from '@/services/category-service';
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

describe('category-service', () => {
  const createClientMock = vi.mocked(createClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects bulk delete when categories have products', async () => {
    const supabase = createSupabaseMock();

    const categoriesQuery = createQueryMock({
      data: [
        { id: 'c1', name: 'Cat 1' },
        { id: 'c2', name: 'Cat 2' },
      ],
      error: null,
    });
    const productsQuery = createQueryMock({
      data: [{ categoryId: 'c2' }],
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(categoriesQuery)
      .mockReturnValueOnce(productsQuery);

    createClientMock.mockReturnValue(supabase as any);

    await expect(bulkDeleteCategories(['c1', 'c2'])).rejects.toThrow(
      'Cannot delete categories that contain products: Cat 2'
    );
  });

  it('rejects bulk delete when categories have children', async () => {
    const supabase = createSupabaseMock();

    const categoriesQuery = createQueryMock({
      data: [
        { id: 'c1', name: 'Cat 1' },
        { id: 'c2', name: 'Cat 2' },
      ],
      error: null,
    });
    const productsQuery = createQueryMock({ data: [], error: null });
    const childrenQuery = createQueryMock({
      data: [{ parentId: 'c1' }],
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(categoriesQuery)
      .mockReturnValueOnce(productsQuery)
      .mockReturnValueOnce(childrenQuery);

    createClientMock.mockReturnValue(supabase as any);

    await expect(bulkDeleteCategories(['c1', 'c2'])).rejects.toThrow(
      'Cannot delete categories that contain subcategories: Cat 1'
    );
  });

  it('deletes categories and returns count', async () => {
    const supabase = createSupabaseMock();

    const categoriesQuery = createQueryMock({
      data: [{ id: 'c1', name: 'Cat 1' }],
      error: null,
    });
    const productsQuery = createQueryMock({ data: [], error: null });
    const childrenQuery = createQueryMock({ data: [], error: null });
    const deleteQuery = createQueryMock({ data: null, error: null, count: 1 });

    supabase.from
      .mockReturnValueOnce(categoriesQuery)
      .mockReturnValueOnce(productsQuery)
      .mockReturnValueOnce(childrenQuery)
      .mockReturnValueOnce(deleteQuery);

    createClientMock.mockReturnValue(supabase as any);

    const result = await bulkDeleteCategories(['c1']);

    expect(result).toEqual({ count: 1 });
    expect(deleteQuery.delete).toHaveBeenCalled();
  });

  it('bulk updates categories and returns count', async () => {
    const supabase = createSupabaseMock();
    const updateQuery = createQueryMock({
      data: [{ id: 'c1' }, { id: 'c2' }],
      error: null,
    });

    supabase.from.mockReturnValue(updateQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await bulkUpdateCategories(['c1', 'c2'], {
      isActive: false,
    });

    expect(result).toEqual({ count: 2 });
    expect(updateQuery.update).toHaveBeenCalledWith({ isActive: false });
  });

  it('returns active root categories even when they have no children', async () => {
    const supabase = createSupabaseMock();
    const categoriesQuery = createQueryMock({
      data: [
        {
          id: 'root',
          name: 'Root',
          children: [],
        },
        {
          id: 'root-with-inactive-child',
          name: 'Root With Inactive Child',
          children: [{ id: 'child', isActive: false }],
        },
      ],
      error: null,
    });

    supabase.from.mockReturnValue(categoriesQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await getActiveCategories();

    expect(result).toEqual([
      { id: 'root', name: 'Root', children: [] },
      {
        id: 'root-with-inactive-child',
        name: 'Root With Inactive Child',
        children: [],
      },
    ]);
    expect(categoriesQuery.select).toHaveBeenCalledWith(
      '*, parent:categories!parentId(*), children:categories!parentId(id, name, slug, isActive)'
    );
    expect(categoriesQuery.eq).toHaveBeenCalledOnce();
    expect(categoriesQuery.eq).toHaveBeenCalledWith('isActive', true);
  });
});
