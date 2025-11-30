import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { log } from '@/lib/logger';

// Initialize Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Strict rate limiter for authentication endpoints (prevent brute force)
export const strictLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '2 m'), // 5 requests per 2 minutes
  analytics: true,
  prefix: 'ratelimit:strict',
});

// Moderate rate limiter for general API endpoints
export const apiLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
  analytics: true,
  prefix: 'ratelimit:api',
});

// Generous rate limiter for public endpoints (product browsing)
export const publicLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1000, '1 m'), // 1000 requests per minute
  analytics: true,
  prefix: 'ratelimit:public',
});

/**
 * Get client identifier for rate limiting
 * Uses user ID if authenticated, otherwise uses IP address
 */
export function getClientId(req: Request): string {
  // Try to get user ID from headers (set by NextAuth)
  const userId = req.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // Otherwise use IP address
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  return `ip:${ip}`;
}

/**
 * Check rate limit for a request
 * @param req The request object
 * @param limiter Which rate limiter to use (default: apiLimiter)
 * @returns Rate limit check result
 */
export async function checkRateLimit(
  req: Request,
  limiter: Ratelimit = apiLimiter
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}> {
  const identifier = getClientId(req);

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    if (!success) {
      log.warn('Rate limit exceeded', {
        identifier,
        limit,
        reset: new Date(reset).toISOString(),
      });
    }

    return { success, limit, remaining, reset };
  } catch (error) {
    log.error('Rate limit check failed', {
      identifier,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // If rate limiting fails, allow the request (fail open)
    return { success: true, limit: 0, remaining: 0, reset: 0 };
  }
}
