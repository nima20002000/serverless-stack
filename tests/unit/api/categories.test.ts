import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  getActiveCategories,
  getCategoryTree,
  getCategoryBySlug,
} from '@/services/category-service';

vi.mock('@/services/category-service', () => ({
  getActiveCategories: vi.fn(),
  getCategoryTree: vi.fn(),
  getCategoryBySlug: vi.fn(),
}));

vi.mock('@/lib/api/with-cache', () => ({
  withCache: (fn: Function) => fn,
}));

vi.mock('@/lib/api/with-logging', () => ({
  withLogging: (fn: Function) => fn,
}));

const createCategoriesRequest = (query = '') =>
  new NextRequest(`http://localhost/api/categories${query}`);

describe('GET /api/categories', () => {
  const getActiveCategoriesMock = vi.mocked(getActiveCategories);
  const getCategoryTreeMock = vi.mocked(getCategoryTree);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { GET } = await import('@/app/api/categories/route');
    return { GET };
  };

  it('returns active categories by default', async () => {
    const { GET } = await loadHandler();
    getActiveCategoriesMock.mockResolvedValue([{ id: 'c1' }]);

    const response = await GET(createCategoriesRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      categories: [{ id: 'c1' }],
    });
    expect(getActiveCategoriesMock).toHaveBeenCalled();
    expect(getCategoryTreeMock).not.toHaveBeenCalled();
  });

  it('returns category tree when requested', async () => {
    const { GET } = await loadHandler();
    getCategoryTreeMock.mockResolvedValue([{ id: 'root' }]);

    const response = await GET(createCategoriesRequest('?tree=true'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      categories: [{ id: 'root' }],
    });
    expect(getCategoryTreeMock).toHaveBeenCalled();
  });

  it('returns 500 when service fails', async () => {
    const { GET } = await loadHandler();
    getActiveCategoriesMock.mockRejectedValue(new Error('boom'));

    const response = await GET(createCategoriesRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'boom' });
  });
});

describe('GET /api/categories/[slug]', () => {
  const getCategoryBySlugMock = vi.mocked(getCategoryBySlug);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { GET } = await import('@/app/api/categories/[slug]/route');
    return { GET };
  };

  it('returns 404 when category is missing', async () => {
    const { GET } = await loadHandler();
    getCategoryBySlugMock.mockResolvedValue(null);

    const response = await GET(createCategoriesRequest(), {
      params: { slug: 'missing' },
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'Category not found',
    });
  });

  it('returns category when found', async () => {
    const { GET } = await loadHandler();
    getCategoryBySlugMock.mockResolvedValue({ id: 'c1', slug: 'cat' } as any);

    const response = await GET(createCategoriesRequest(), {
      params: { slug: 'cat' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      category: { id: 'c1', slug: 'cat' },
    });
  });

  it('returns 500 when service fails', async () => {
    const { GET } = await loadHandler();
    getCategoryBySlugMock.mockRejectedValue(new Error('boom'));

    const response = await GET(createCategoriesRequest(), {
      params: { slug: 'cat' },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'boom' });
  });
});
