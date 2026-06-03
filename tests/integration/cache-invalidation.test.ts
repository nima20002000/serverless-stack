/**
 * Integration Tests for Cache Invalidation
 *
 * Tests Redis cache helpers and invalidation behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import {
  getCached,
  clearCache,
  clearCachePattern,
  invalidateCache,
  redis,
} from '../../src/lib/redis/client';

function requireRedis() {
  if (!redis) {
    throw new Error('Redis is not configured for cache integration tests');
  }
  return redis;
}

describe('Cache Invalidation Integration Tests', () => {
  beforeEach(async () => {
    const client = requireRedis();
    await client.del('test:cache:*');
  });

  it('should cache data and return cached result on subsequent calls', async () => {
    const client = requireRedis();
    const key = `test:cache:${randomUUID()}`;
    await client.del(key);

    let fetchCount = 0;
    const fetchFn = async () => {
      fetchCount += 1;
      return { key, fetchedAt: Date.now() };
    };

    const first = await getCached(key, fetchFn, 60);
    expect(first.key).toBe(key);
    expect(typeof first.fetchedAt).toBe('number');
    expect(fetchCount).toBe(1);

    const second = await getCached(key, fetchFn, 60);
    expect(second.key).toBe(key);
    expect(second.fetchedAt).toBe(first.fetchedAt);
    expect(fetchCount).toBe(1);

    const raw = await client.get<string>(key);
    if (raw === null) {
      throw new Error('Expected cached value to exist in Redis');
    }
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    expect(parsed.key).toBe(key);
    expect(parsed.fetchedAt).toBe(first.fetchedAt);
  });

  it('should clear a cache key explicitly', async () => {
    const client = requireRedis();
    const key = `test:cache:${randomUUID()}`;

    await client.set(key, 'value');
    await clearCache(key);

    const value = await client.get(key);
    expect(value).toBeNull();
  });

  it('should clear a batch of cache keys', async () => {
    const client = requireRedis();
    const keys = [`test:cache:${randomUUID()}`, `test:cache:${randomUUID()}`];

    await Promise.all(keys.map((key) => client.set(key, 'value')));
    await clearCachePattern(keys);

    const values = await Promise.all(keys.map((key) => client.get(key)));
    expect(values).toEqual([null, null]);
  });

  it('should invalidate a cache key by exact pattern', async () => {
    const client = requireRedis();
    const key = `test:cache:${randomUUID()}`;

    await client.set(key, 'value');
    await invalidateCache(key);

    const value = await client.get(key);
    expect(value).toBeNull();
  });
});
