import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { searchAll } from '@/services/search-service';
import { log } from '@/lib/logger';

vi.mock('@/services/search-service', () => ({
  searchAll: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  log: {
    error: vi.fn(),
  },
}));

const createSearchRequest = (query = '') =>
  new NextRequest(`http://localhost/api/search${query}`);

describe('GET /api/search', () => {
  const searchAllMock = vi.mocked(searchAll);
  const logMock = vi.mocked(log);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { GET } = await import('@/app/api/search/route');
    return { GET };
  };

  it('returns empty results for missing query', async () => {
    const { GET } = await loadHandler();

    const response = await GET(createSearchRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      products: [],
      categories: [],
      total: 0,
    });
    expect(searchAllMock).not.toHaveBeenCalled();
  });

  it('returns empty results for whitespace query', async () => {
    const { GET } = await loadHandler();

    const response = await GET(createSearchRequest('?q=   '));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      products: [],
      categories: [],
      total: 0,
    });
    expect(searchAllMock).not.toHaveBeenCalled();
  });

  it('searches with default limit', async () => {
    const { GET } = await loadHandler();
    searchAllMock.mockResolvedValue({
      products: [{ id: 'p1' }],
      categories: [],
      total: 1,
    } as any);

    const response = await GET(createSearchRequest('?q=kit'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      products: [{ id: 'p1' }],
      categories: [],
      total: 1,
    });
    expect(searchAllMock).toHaveBeenCalledWith('kit', { limit: 5 });
  });

  it('searches with custom limit', async () => {
    const { GET } = await loadHandler();
    searchAllMock.mockResolvedValue({
      products: [],
      categories: [{ id: 'c1' }],
      total: 1,
    } as any);

    const response = await GET(createSearchRequest('?q=kit&limit=10'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      products: [],
      categories: [{ id: 'c1' }],
      total: 1,
    });
    expect(searchAllMock).toHaveBeenCalledWith('kit', { limit: 10 });
  });

  it('returns 500 when service fails', async () => {
    const { GET } = await loadHandler();
    searchAllMock.mockRejectedValue(new Error('boom'));

    const response = await GET(createSearchRequest('?q=kit'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Unable to search',
    });
    expect(logMock.error).toHaveBeenCalledWith('Search API error', {
      error: expect.any(Error),
    });
  });
});
