import { describe, it, expect, vi, beforeEach } from 'vitest';

const redisInstance = {
  get: vi.fn(),
  setex: vi.fn(),
  del: vi.fn(),
};

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn(() => redisInstance),
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('redis client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    vi.resetModules();
  });

  it('returns null when redis is not configured', async () => {
    const { getRedisClient } = await import('@/lib/redis/client');

    expect(getRedisClient()).toBeNull();
  });

  it('returns cached value when present', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    redisInstance.get.mockResolvedValue({ value: 42 });

    const { getCached } = await import('@/lib/redis/client');
    const fetchFn = vi.fn();

    const result = await getCached('key', fetchFn, 10);

    expect(result).toEqual({ value: 42 });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('stores fetched data on cache miss', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    redisInstance.get.mockResolvedValue(null);

    const { getCached } = await import('@/lib/redis/client');
    const fetchFn = vi.fn().mockResolvedValue({ value: 7 });

    const result = await getCached('key', fetchFn, 60);

    expect(result).toEqual({ value: 7 });
    expect(redisInstance.setex).toHaveBeenCalledWith(
      'key',
      60,
      JSON.stringify({ value: 7 })
    );
  });

  it('falls back when redis throws', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    redisInstance.get.mockRejectedValue(new Error('boom'));

    const { getCached } = await import('@/lib/redis/client');
    const fetchFn = vi.fn().mockResolvedValue({ value: 9 });

    const result = await getCached('key', fetchFn, 60);

    expect(result).toEqual({ value: 9 });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('clears multiple cache keys', async () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://redis';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';

    const { clearCachePattern } = await import('@/lib/redis/client');

    await clearCachePattern(['a', 'b']);

    expect(redisInstance.del).toHaveBeenCalledWith('a', 'b');
  });
});
