import { describe, it, expect, vi, beforeEach } from 'vitest';

const loadRedisClient = async () => {
  vi.resetModules();
  vi.doMock('@/lib/logger', () => ({
    log: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
  }));
  return import('@/lib/redis/client');
};

const base64 = (value: string) => Buffer.from(value, 'utf8').toString('base64');

const mockFetch = (responses: Array<{ result: unknown }>) => {
  const queue = [...responses];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const response = queue.shift();
    if (!response) {
      throw new Error('Mock fetch response queue exhausted');
    }
    const isPipeline =
      typeof url === 'string' &&
      (url.endsWith('/pipeline') || url.endsWith('/multi-exec'));
    const payload = isPipeline ? [response] : response;
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

describe('redis client (no-redis fallback)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('returns null when redis is not configured', async () => {
    const { getRedisClient } = await loadRedisClient();

    expect(getRedisClient()).toBeNull();
  });

  it('falls back to fetch function when redis is not configured', async () => {
    const { getCached } = await loadRedisClient();
    const fetchFn = vi.fn().mockResolvedValue({ value: 42 });

    const result = await getCached('key', fetchFn, 10);

    expect(result).toEqual({ value: 42 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('no-ops cache invalidation when redis is not configured', async () => {
    const { invalidateCache, clearCache, clearCachePattern } =
      await loadRedisClient();

    await expect(invalidateCache('pattern')).resolves.toBeUndefined();
    await expect(clearCache('key')).resolves.toBeUndefined();
    await expect(clearCachePattern(['a', 'b'])).resolves.toBeUndefined();
  });
});

describe('redis client (redis configured)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
  });

  it('returns cached value when present', async () => {
    const fetchMock = mockFetch([{ result: base64('cached-value') }]);

    const { getCached } = await loadRedisClient();
    const fetchFn = vi.fn();

    const result = await getCached('key', fetchFn, 10);

    expect(result).toBe('cached-value');
    expect(fetchFn).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stores fetched data on cache miss', async () => {
    const fetchMock = mockFetch([{ result: null }, { result: 'OK' }]);

    const { getCached } = await loadRedisClient();
    const fetchFn = vi.fn().mockResolvedValue({ value: 7 });

    const result = await getCached('key', fetchFn, 60);

    expect(result).toEqual({ value: 7 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clears multiple cache keys', async () => {
    const fetchMock = mockFetch([{ result: 2 }]);

    const { clearCachePattern } = await loadRedisClient();

    await clearCachePattern(['a', 'b']);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
