import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('redis client (no-redis fallback)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it('returns null when redis is not configured', async () => {
    const { getRedisClient } = await import('@/lib/redis/client');

    expect(getRedisClient()).toBeNull();
  });

  it('falls back to fetch function when redis is not configured', async () => {
    const { getCached } = await import('@/lib/redis/client');
    const fetchFn = vi.fn().mockResolvedValue({ value: 42 });

    const result = await getCached('key', fetchFn, 10);

    expect(result).toEqual({ value: 42 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('no-ops cache invalidation when redis is not configured', async () => {
    const { invalidateCache, clearCache, clearCachePattern } = await import(
      '@/lib/redis/client'
    );

    await expect(invalidateCache('pattern')).resolves.toBeUndefined();
    await expect(clearCache('key')).resolves.toBeUndefined();
    await expect(clearCachePattern(['a', 'b'])).resolves.toBeUndefined();
  });
});
