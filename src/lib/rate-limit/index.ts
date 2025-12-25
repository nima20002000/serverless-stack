import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { log } from '@/lib/logger';

// Lazy initialization to avoid build-time errors
let redis: Redis | null = null;
let _strictLimiter: Ratelimit | null = null;
let _apiLimiter: Ratelimit | null = null;
let _publicLimiter: Ratelimit | null = null;

function getRedis(): Redis {
  if (!redis) {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!redisUrl || !redisToken) {
      throw new Error(
        'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables are required'
      );
    }

    redis = new Redis({
      url: redisUrl,
      token: redisToken,
    });
  }
  return redis;
}

// Strict rate limiter for authentication endpoints (prevent brute force)
export function getStrictLimiter(): Ratelimit {
  if (!_strictLimiter) {
    _strictLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(5, '2 m'), // 5 requests per 2 minutes
      analytics: true,
      prefix: 'ratelimit:strict',
    });
  }
  return _strictLimiter;
}

// Moderate rate limiter for general API endpoints
export function getApiLimiter(): Ratelimit {
  if (!_apiLimiter) {
    _apiLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
      analytics: true,
      prefix: 'ratelimit:api',
    });
  }
  return _apiLimiter;
}

// Generous rate limiter for public endpoints (product browsing)
export function getPublicLimiter(): Ratelimit {
  if (!_publicLimiter) {
    _publicLimiter = new Ratelimit({
      redis: getRedis(),
      limiter: Ratelimit.slidingWindow(1000, '1 m'), // 1000 requests per minute
      analytics: true,
      prefix: 'ratelimit:public',
    });
  }
  return _publicLimiter;
}

// Backward compatible exports - these are getters that return the limiter on first access
export const strictLimiter = new Proxy({} as Ratelimit, {
  get(_, prop) {
    return getStrictLimiter()[prop as keyof Ratelimit];
  },
});

export const apiLimiter = new Proxy({} as Ratelimit, {
  get(_, prop) {
    return getApiLimiter()[prop as keyof Ratelimit];
  },
});

export const publicLimiter = new Proxy({} as Ratelimit, {
  get(_, prop) {
    return getPublicLimiter()[prop as keyof Ratelimit];
  },
});

/**
 * Get client identifier for rate limiting
 * Uses user ID if authenticated, otherwise uses IP address
 * @param req The request object
 * @param endpoint Optional endpoint identifier to create separate rate limit buckets per endpoint
 */
export function getClientId(req: Request, endpoint?: string): string {
  // Try to get user ID from headers (set by NextAuth)
  const userId = req.headers.get('x-user-id');

  // Base identifier
  let baseId: string;
  if (userId) {
    baseId = `user:${userId}`;
  } else {
    // Otherwise use IP address
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    baseId = `ip:${ip}`;
  }

  // Add endpoint-specific suffix to create separate buckets
  if (endpoint) {
    return `${baseId}:${endpoint}`;
  }

  return baseId;
}

/**
 * Check rate limit for a request
 * @param req The request object
 * @param limiter Which rate limiter to use (default: apiLimiter)
 * @param endpoint Optional endpoint identifier to create separate rate limit buckets
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  req: Request,
  limiter: Ratelimit = apiLimiter,
  endpoint?: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const identifier = getClientId(req, endpoint);

  try {
    const { success, limit, remaining, reset } =
      await limiter.limit(identifier);

    if (!success) {
      log.warn('Rate limit exceeded', {
        identifier,
        endpoint,
        limit,
        reset: new Date(reset).toISOString(),
      });
    }

    return { success, limit, remaining, reset };
  } catch (error) {
    log.error('Rate limit check failed', {
      identifier,
      endpoint,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // If rate limiting fails, allow the request (fail open)
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}
