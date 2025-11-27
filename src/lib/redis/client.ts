import { Redis } from '@upstash/redis';
import { log } from '@/lib/logger';

let redis: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      log.warn('Redis credentials not configured, caching disabled');
      return null;
    }

    redis = new Redis({
      url,
      token,
    });

    log.info('Redis client initialized');
  }
  return redis;
}

/**
 * Get cached data or fetch from database
 * @param key Cache key
 * @param fetchFn Function to fetch data if cache miss
 * @param ttl Time to live in seconds (default: 300 = 5 minutes)
 */
export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  const redis = getRedisClient();

  // If Redis is not configured, just fetch directly
  if (!redis) {
    return fetchFn();
  }

  try {
    // Try to get from cache
    const cached = await redis.get<T>(key);

    if (cached !== null) {
      log.debug('Cache HIT', { key });
      return cached;
    }

    log.debug('Cache MISS', { key });

    // Not in cache, fetch from database
    const data = await fetchFn();

    // Store in cache
    await redis.setex(key, ttl, JSON.stringify(data));

    return data;
  } catch (error) {
    log.error('Cache error, falling back to direct fetch', {
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // If Redis fails, just fetch directly
    return fetchFn();
  }
}

/**
 * Invalidate cache by pattern
 * @param pattern Redis key pattern (e.g., "products:*")
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  try {
    // Note: Upstash REST API doesn't support KEYS command
    // For now, we'll delete specific keys
    // In production, use cache tags or versioning
    await redis.del(pattern);
    log.info('Cache invalidated', { pattern });
  } catch (error) {
    log.error('Cache invalidation error', {
      pattern,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Clear specific cache key
 */
export async function clearCache(key: string): Promise<void> {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  try {
    await redis.del(key);
    log.info('Cache cleared', { key });
  } catch (error) {
    log.error('Cache clear error', {
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Clear multiple cache keys matching a pattern
 * Since Upstash doesn't support KEYS pattern matching,
 * we need to specify exact keys to clear
 */
export async function clearCachePattern(keys: string[]): Promise<void> {
  const redis = getRedisClient();

  if (!redis) {
    return;
  }

  try {
    if (keys.length > 0) {
      await redis.del(...keys);
      log.info('Cache pattern cleared', { count: keys.length });
    }
  } catch (error) {
    log.error('Cache pattern clear error', {
      keys,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
