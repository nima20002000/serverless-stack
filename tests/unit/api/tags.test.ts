import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getAllTags, searchTags } from '@/services/tag-service';

vi.mock('@/services/tag-service', () => ({
  getAllTags: vi.fn(),
  searchTags: vi.fn(),
}));

vi.mock('@/lib/api/with-cache', () => ({
  withCache: (fn: Function) => fn,
}));

vi.mock('@/lib/api/with-logging', () => ({
  withLogging: (fn: Function) => fn,
}));

const createTagsRequest = (query = '') =>
  new NextRequest(`http://localhost/api/tags${query}`);

describe('GET /api/tags', () => {
  const getAllTagsMock = vi.mocked(getAllTags);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { GET } = await import('@/app/api/tags/route');
    return { GET };
  };

  it('returns tags list', async () => {
    const { GET } = await loadHandler();
    getAllTagsMock.mockResolvedValue([{ id: 't1' }]);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      tags: [{ id: 't1' }],
    });
  });

  it('returns 500 when service fails', async () => {
    const { GET } = await loadHandler();
    getAllTagsMock.mockRejectedValue(new Error('boom'));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'boom' });
  });
});

describe('GET /api/tags/search', () => {
  const searchTagsMock = vi.mocked(searchTags);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { GET } = await import('@/app/api/tags/search/route');
    return { GET };
  };

  it('returns empty list for empty query', async () => {
    const { GET } = await loadHandler();

    const response = await GET(createTagsRequest('/search'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ tags: [] });
    expect(searchTagsMock).not.toHaveBeenCalled();
  });

  it('searches tags for query', async () => {
    const { GET } = await loadHandler();
    searchTagsMock.mockResolvedValue([{ id: 't1' }]);

    const response = await GET(createTagsRequest('/search?q=kit'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ tags: [{ id: 't1' }] });
    expect(searchTagsMock).toHaveBeenCalledWith('kit');
  });

  it('returns 500 when service fails', async () => {
    const { GET } = await loadHandler();
    searchTagsMock.mockRejectedValue(new Error('boom'));

    const response = await GET(createTagsRequest('/search?q=kit'));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'boom' });
  });
});
