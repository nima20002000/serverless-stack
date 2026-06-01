/**
 * Integration Tests for Middleware Rate Limiting
 *
 * Tests the middleware rate limiting integration with realistic multi-request
 * scenarios, bucket isolation, and fail-open behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';

// Mock checkRateLimit to control behavior precisely
const checkRateLimitMock = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: checkRateLimitMock,
  apiLimiter: { name: 'apiLimiter' },
  strictLimiter: { name: 'strictLimiter' },
  publicLimiter: { name: 'publicLimiter' },
}));

// Mock next-auth
const getTokenMock = vi.fn();
vi.mock('next-auth/jwt', () => ({
  getToken: getTokenMock,
}));

// Helper to create request
function createRequest(
  pathname: string,
  headers: Record<string, string> = {}
): NextRequest {
  const url = new URL(`http://localhost${pathname}`);
  return {
    nextUrl: url,
    url: url.toString(),
    headers: new Headers(headers),
  } as unknown as NextRequest;
}

describe('Middleware Rate Limiting Integration', () => {
  let middleware: (req: NextRequest) => Promise<Response>;
  let requestCount: Record<string, number>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.NEXTAUTH_SECRET = 'test-secret';
    requestCount = {};

    // Simulate realistic rate limiting behavior with per-endpoint buckets
    checkRateLimitMock.mockImplementation(async (_req, limiter, endpoint) => {
      const bucketKey = `${limiter.name}:${endpoint || 'default'}`;

      if (!requestCount[bucketKey]) {
        requestCount[bucketKey] = 0;
      }
      requestCount[bucketKey]++;

      let limit: number;
      if (limiter.name === 'strictLimiter') {
        limit = 5;
      } else if (limiter.name === 'publicLimiter') {
        limit = 1000;
      } else {
        limit = 100;
      }

      const success = requestCount[bucketKey] <= limit;
      return {
        success,
        limit,
        remaining: Math.max(0, limit - requestCount[bucketKey]),
        reset: Date.now() + 120000,
      };
    });

    getTokenMock.mockResolvedValue(null);

    const module = await import('@/middleware');
    middleware = module.middleware;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================
  // Per-Endpoint Bucket Isolation Tests
  // ============================================

  describe('Per-Endpoint Bucket Isolation', () => {
    it('login rate limit does not affect register rate limit', async () => {
      // Exhaust login rate limit (5 requests)
      for (let i = 0; i < 5; i++) {
        const loginReq = createRequest('/api/auth/login');
        const response = await middleware(loginReq);
        expect(response.status).not.toBe(429);
      }

      // 6th login request should be rate limited
      const loginReq = createRequest('/api/auth/login');
      const limitedResponse = await middleware(loginReq);
      expect(limitedResponse.status).toBe(429);

      // But register should still work (different bucket)
      const registerReq = createRequest('/api/auth/register');
      const registerResponse = await middleware(registerReq);
      expect(registerResponse.status).not.toBe(429);
    });

    it('register rate limit does not affect login rate limit', async () => {
      // Exhaust register rate limit (5 requests)
      for (let i = 0; i < 5; i++) {
        const registerReq = createRequest('/api/auth/register');
        await middleware(registerReq);
      }

      // 6th register request should be rate limited
      const registerReq = createRequest('/api/auth/register');
      const limitedResponse = await middleware(registerReq);
      expect(limitedResponse.status).toBe(429);

      // But login should still work (different bucket)
      const loginReq = createRequest('/api/auth/login');
      const loginResponse = await middleware(loginReq);
      expect(loginResponse.status).not.toBe(429);
    });

    it('public bucket is shared between products, categories, and tags', async () => {
      // Make requests to different public endpoints
      for (let i = 0; i < 333; i++) {
        await middleware(createRequest('/api/products'));
        await middleware(createRequest('/api/categories'));
        await middleware(createRequest('/api/tags'));
      }

      // All share the "public" bucket with 1000 limit
      // After 999 requests, the 1000th should succeed, 1001st should fail
      const successResponse = await middleware(createRequest('/api/products'));
      expect(successResponse.status).not.toBe(429);

      const failResponse = await middleware(createRequest('/api/products'));
      expect(failResponse.status).toBe(429);
    });

    it('general API endpoints use default bucket independently from auth', async () => {
      // Exhaust login rate limit
      for (let i = 0; i < 6; i++) {
        await middleware(createRequest('/api/auth/login'));
      }

      // General API should still work
      const cartReq = createRequest('/api/cart');
      const response = await middleware(cartReq);
      expect(response.status).not.toBe(429);
    });
  });

  // ============================================
  // IP-Based Rate Limiting Tests
  // ============================================

  describe('IP-Based Rate Limiting', () => {
    it('rate limits based on client IP', async () => {
      // Reset to use custom mock that tracks IP
      checkRateLimitMock.mockReset();
      const ipRequestCount: Record<string, number> = {};

      checkRateLimitMock.mockImplementation(async (req) => {
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

        if (!ipRequestCount[ip]) {
          ipRequestCount[ip] = 0;
        }
        ipRequestCount[ip]++;

        return {
          success: ipRequestCount[ip] <= 5,
          limit: 5,
          remaining: Math.max(0, 5 - ipRequestCount[ip]),
          reset: Date.now() + 120000,
        };
      });

      // First IP makes 6 requests
      for (let i = 0; i < 5; i++) {
        const req = createRequest('/api/auth/login', {
          'x-forwarded-for': '1.2.3.4',
        });
        const response = await middleware(req);
        expect(response.status).not.toBe(429);
      }

      // 6th request from same IP should be limited
      const limitedReq = createRequest('/api/auth/login', {
        'x-forwarded-for': '1.2.3.4',
      });
      const limitedResponse = await middleware(limitedReq);
      expect(limitedResponse.status).toBe(429);

      // Different IP should not be limited
      const differentIpReq = createRequest('/api/auth/login', {
        'x-forwarded-for': '5.6.7.8',
      });
      const differentIpResponse = await middleware(differentIpReq);
      expect(differentIpResponse.status).not.toBe(429);
    });

    it('extracts first IP from x-forwarded-for header chain', async () => {
      checkRateLimitMock.mockReset();
      const capturedIps: string[] = [];

      checkRateLimitMock.mockImplementation(async (req) => {
        const forwarded = req.headers.get('x-forwarded-for');
        const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
        capturedIps.push(ip);

        return {
          success: true,
          limit: 100,
          remaining: 99,
          reset: Date.now() + 60000,
        };
      });

      // Request with multiple IPs in chain
      const req = createRequest('/api/users/me', {
        'x-forwarded-for': '10.0.0.1, 192.168.1.1, 172.16.0.1',
      });
      await middleware(req);

      // The rate limit should use the first IP (client IP)
      expect(capturedIps[0]).toBe('10.0.0.1');
    });
  });

  // ============================================
  // User-Based Rate Limiting Tests
  // ============================================

  describe('User-Based Rate Limiting', () => {
    it('rate limits based on user ID when authenticated', async () => {
      checkRateLimitMock.mockReset();
      const userRequestCount: Record<string, number> = {};

      checkRateLimitMock.mockImplementation(async (req) => {
        const userId = req.headers.get('x-user-id');
        const identifier = userId || 'anonymous';

        if (!userRequestCount[identifier]) {
          userRequestCount[identifier] = 0;
        }
        userRequestCount[identifier]++;

        return {
          success: userRequestCount[identifier] <= 5,
          limit: 5,
          remaining: Math.max(0, 5 - userRequestCount[identifier]),
          reset: Date.now() + 120000,
        };
      });

      // User 1 makes requests
      for (let i = 0; i < 5; i++) {
        const req = createRequest('/api/auth/login', { 'x-user-id': 'user-1' });
        const response = await middleware(req);
        expect(response.status).not.toBe(429);
      }

      // User 1 is now limited
      const limitedReq = createRequest('/api/auth/login', {
        'x-user-id': 'user-1',
      });
      const limitedResponse = await middleware(limitedReq);
      expect(limitedResponse.status).toBe(429);

      // User 2 should not be limited
      const user2Req = createRequest('/api/auth/login', {
        'x-user-id': 'user-2',
      });
      const user2Response = await middleware(user2Req);
      expect(user2Response.status).not.toBe(429);
    });
  });

  // ============================================
  // Fail-Open Behavior Tests
  // ============================================
  // Note: The fail-open behavior is implemented in checkRateLimit function,
  // not in the middleware itself. The middleware simply awaits checkRateLimit
  // and acts on the result. These tests verify the middleware's behavior
  // when checkRateLimit returns a success result (as it would do when failing open).

  describe('Fail-Open Behavior', () => {
    it('allows requests when rate limit returns success on error recovery', async () => {
      // Simulate checkRateLimit's fail-open behavior: returns success:true when error occurs
      checkRateLimitMock.mockResolvedValue({
        success: true,
        limit: 0,
        remaining: 0,
        reset: 0,
      });

      const req = createRequest('/api/auth/login');
      const response = await middleware(req);

      // Should proceed - rate limit check returned success
      expect(response.status).not.toBe(429);
    });

    it('allows requests when checkRateLimit returns fail-open response', async () => {
      // This mimics what checkRateLimit does when Redis is down:
      // It catches the error and returns { success: true, limit: 0, remaining: 0, reset: 0 }
      checkRateLimitMock.mockResolvedValue({
        success: true,
        limit: 0,
        remaining: 0,
        reset: 0,
      });

      const req = createRequest('/api/users/me');
      const response = await middleware(req);

      expect(response.status).not.toBe(429);
    });

    it('allows multiple requests when rate limiter returns fail-open responses', async () => {
      // Simulate continuous fail-open behavior
      checkRateLimitMock.mockResolvedValue({
        success: true,
        limit: 0,
        remaining: 0,
        reset: 0,
      });

      const responses = [];
      for (let i = 0; i < 10; i++) {
        const req = createRequest('/api/auth/login');
        responses.push(await middleware(req));
      }

      // All requests should be allowed with fail-open behavior
      expect(responses.every((r) => r.status !== 429)).toBe(true);
    });
  });

  // ============================================
  // Rate Limit Window Tests
  // ============================================

  describe('Rate Limit Window', () => {
    it('returns reset time in response for rate limited requests', async () => {
      const resetTime = Date.now() + 120000;
      checkRateLimitMock.mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: resetTime,
      });

      const req = createRequest('/api/auth/login');
      const response = await middleware(req);

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.retryAfter).toBe(resetTime);
    });

    it('includes appropriate Retry-After header', async () => {
      const now = Date.now();
      const resetTime = now + 60000; // 60 seconds from now
      checkRateLimitMock.mockResolvedValue({
        success: false,
        limit: 5,
        remaining: 0,
        reset: resetTime,
      });

      const req = createRequest('/api/auth/login');
      const response = await middleware(req);

      const retryAfter = parseInt(
        response.headers.get('Retry-After') || '0',
        10
      );
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(60);
    });
  });

  // ============================================
  // Exempt Endpoints Tests
  // ============================================

  describe('Exempt Endpoints', () => {
    it('never rate limits non-login/register auth endpoints', async () => {
      const authEndpoints = [
        '/api/auth/session',
        '/api/auth/providers',
        '/api/auth/csrf',
      ];

      for (const endpoint of authEndpoints) {
        checkRateLimitMock.mockClear();

        const req = createRequest(endpoint);
        const response = await middleware(req);

        expect(checkRateLimitMock).not.toHaveBeenCalled();
        expect(response.status).not.toBe(429);
      }
    });

    it('never rate limits payment provider callbacks', async () => {
      const paymentEndpoints = [
        '/api/transactions/webhook-stripe',
        '/api/transactions/webhook-paypal',
        '/api/transactions/paypal/capture',
      ];

      for (const endpoint of paymentEndpoints) {
        checkRateLimitMock.mockClear();

        const req = createRequest(endpoint);
        const response = await middleware(req);

        expect(checkRateLimitMock).not.toHaveBeenCalled();
        expect(response.status).not.toBe(429);
      }
    });

    it('never rate limits NextAuth session endpoints', async () => {
      const nextAuthEndpoints = [
        '/api/auth/session',
        '/api/auth/providers',
        '/api/auth/csrf',
        '/api/auth/callback/credentials',
        '/api/auth/signout',
      ];

      for (const endpoint of nextAuthEndpoints) {
        checkRateLimitMock.mockClear();

        const req = createRequest(endpoint);
        const response = await middleware(req);

        expect(checkRateLimitMock).not.toHaveBeenCalled();
        expect(response.status).not.toBe(429);
      }
    });
  });

  // ============================================
  // Concurrent Requests Tests
  // ============================================

  describe('Concurrent Requests', () => {
    it('handles concurrent requests to same endpoint', async () => {
      // Reset with counter-based mock
      let counter = 0;
      checkRateLimitMock.mockImplementation(async () => {
        counter++;
        return {
          success: counter <= 5,
          limit: 5,
          remaining: Math.max(0, 5 - counter),
          reset: Date.now() + 120000,
        };
      });

      // Send 10 concurrent requests
      const requests = Array(10)
        .fill(null)
        .map(() => middleware(createRequest('/api/auth/login')));

      const responses = await Promise.all(requests);

      // First 5 should succeed, remaining 5 should be rate limited
      const successCount = responses.filter((r) => r.status !== 429).length;
      const limitedCount = responses.filter((r) => r.status === 429).length;

      expect(successCount).toBe(5);
      expect(limitedCount).toBe(5);
    });

    it('handles concurrent requests to different endpoints', async () => {
      const endpointCounters: Record<string, number> = {};
      checkRateLimitMock.mockImplementation(
        async (_req, _limiter, endpoint) => {
          const key = endpoint || 'default';
          if (!endpointCounters[key]) {
            endpointCounters[key] = 0;
          }
          endpointCounters[key]++;

          return {
            success: endpointCounters[key] <= 5,
            limit: 5,
            remaining: Math.max(0, 5 - endpointCounters[key]),
            reset: Date.now() + 120000,
          };
        }
      );

      // Send concurrent requests to login and register
      const loginRequests = Array(6)
        .fill(null)
        .map(() => middleware(createRequest('/api/auth/login')));
      const registerRequests = Array(6)
        .fill(null)
        .map(() => middleware(createRequest('/api/auth/register')));

      const [loginResponses, registerResponses] = await Promise.all([
        Promise.all(loginRequests),
        Promise.all(registerRequests),
      ]);

      // Each endpoint should have 5 success, 1 limited
      const loginSuccess = loginResponses.filter(
        (r) => r.status !== 429
      ).length;
      const registerSuccess = registerResponses.filter(
        (r) => r.status !== 429
      ).length;

      expect(loginSuccess).toBe(5);
      expect(registerSuccess).toBe(5);
    });
  });
});
