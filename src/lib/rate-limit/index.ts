import { Ratelimit, type Duration } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { log } from '@/lib/logger';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

if (!redis) {
  log.warn('Redis credentials not configured, rate limiting disabled');
}

const disabledLimiter = {
  limit: async () => ({
    success: true,
    limit: 0,
    remaining: 0,
    reset: 0,
  }),
} as unknown as Ratelimit;

function createLimiter(
  requests: number,
  window: Duration,
  prefix: string
): Ratelimit {
  if (!redis) return disabledLimiter;

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix,
  });
}

// Strict rate limiter for authentication endpoints (prevent brute force)
export const strictLimiter = createLimiter(5, '2 m', 'ratelimit:strict');

// Moderate rate limiter for general API endpoints
export const apiLimiter = createLimiter(100, '1 m', 'ratelimit:api');

// Generous rate limiter for public endpoints (product browsing)
export const publicLimiter = createLimiter(1000, '1 m', 'ratelimit:public');

type RateLimitResult = {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

const RATE_LIMIT_CACHE_TTL_MS = 1000;
const rateLimitCache = new Map<
  string,
  { value: RateLimitResult; expiresAt: number }
>();

function getLimiterKey(limiter: Ratelimit) {
  if (limiter === strictLimiter) return 'strict';
  if (limiter === publicLimiter) return 'public';
  return 'api';
}

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
): Promise<RateLimitResult> {
  const identifier = getClientId(req, endpoint);
  const cacheKey = `${getLimiterKey(limiter)}:${endpoint || 'default'}:${identifier}`;
  const cached = rateLimitCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

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

    const result = { success, limit, remaining, reset };
    rateLimitCache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + RATE_LIMIT_CACHE_TTL_MS,
    });
    return result;
  } catch (error) {
    log.error('Rate limit check failed', {
      identifier,
      endpoint,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // If rate limiting fails, allow the request (fail open)
    const result = { success: true, limit: 0, remaining: 0, reset: 0 };
    rateLimitCache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + RATE_LIMIT_CACHE_TTL_MS,
    });
    return result;
  }
}
