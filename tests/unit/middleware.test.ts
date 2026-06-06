import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Mock rate-limit module
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

// Helper functions
function createRequest(
  pathname: string,
  options: RequestInit = {}
): NextRequest {
  const url = new URL(`http://localhost${pathname}`);
  return {
    nextUrl: url,
    url: url.toString(),
    headers: new Headers(options.headers as HeadersInit),
  } as unknown as NextRequest;
}

function mockRateLimitSuccess() {
  checkRateLimitMock.mockResolvedValue({
    success: true,
    limit: 30,
    remaining: 29,
    reset: Date.now() + 60000,
  });
}

function mockRateLimitFailure(reset: number = Date.now() + 120000) {
  checkRateLimitMock.mockResolvedValue({
    success: false,
    limit: 5,
    remaining: 0,
    reset,
  });
}

describe('middleware', () => {
  let proxy: (req: NextRequest) => Promise<NextResponse>;
  let middlewareConfig: { matcher: string[] };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.NEXTAUTH_SECRET = 'test-secret';
    delete process.env.E2E_TEST;

    // Import proxy fresh for each test
    const module = await import('@/proxy');
    proxy = module.proxy;
    middlewareConfig = module.config;
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.E2E_TEST;
  });

  // ============================================
  // Rate Limiting - Endpoint Selection Tests
  // ============================================

  describe('Rate Limiting - Endpoint Selection', () => {
    it('uses strictLimiter with "login" bucket for /api/auth/login', async () => {
      const req = createRequest('/api/auth/login');
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue(null);

      await proxy(req);

      expect(checkRateLimitMock).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ name: 'strictLimiter' }),
        'login'
      );
    });

    it('uses strictLimiter with "register" bucket for /api/auth/register', async () => {
      const req = createRequest('/api/auth/register');
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue(null);

      await proxy(req);

      expect(checkRateLimitMock).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ name: 'strictLimiter' }),
        'register'
      );
    });

    it('skips rate limiting for non-login/register /api/auth/* routes', async () => {
      const req = createRequest('/api/auth/custom-endpoint');
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue(null);

      await proxy(req);

      expect(checkRateLimitMock).not.toHaveBeenCalled();
    });

    it('skips rate limiting for Stripe webhooks', async () => {
      const req = createRequest('/api/transactions/webhook-stripe');
      getTokenMock.mockResolvedValue(null);

      const response = await proxy(req);

      expect(checkRateLimitMock).not.toHaveBeenCalled();
      expect(response.status).not.toBe(429);
    });

    it('rate limits deleted legacy payment callbacks', async () => {
      const legacyCallbackPaths = [
        '/api/transactions/verify',
        '/api/transactions/verify-digipay',
        '/api/transactions/verify-zibal',
      ];

      for (const path of legacyCallbackPaths) {
        checkRateLimitMock.mockClear();
        mockRateLimitSuccess();
        getTokenMock.mockResolvedValue(null);

        const req = createRequest(path);
        await proxy(req);

        expect(checkRateLimitMock).toHaveBeenCalledWith(
          req,
          expect.objectContaining({ name: 'apiLimiter' }),
          'transactions'
        );
      }
    });

    it('skips rate limiting for /api/auth/session (NextAuth)', async () => {
      const req = createRequest('/api/auth/session');
      getTokenMock.mockResolvedValue(null);

      const response = await proxy(req);

      expect(checkRateLimitMock).not.toHaveBeenCalled();
      expect(response.status).not.toBe(429);
    });

    it('skips rate limiting for /api/auth/providers (NextAuth)', async () => {
      const req = createRequest('/api/auth/providers');
      getTokenMock.mockResolvedValue(null);

      await proxy(req);

      expect(checkRateLimitMock).not.toHaveBeenCalled();
    });

    it('skips rate limiting for /api/auth/csrf (NextAuth)', async () => {
      const req = createRequest('/api/auth/csrf');
      getTokenMock.mockResolvedValue(null);

      await proxy(req);

      expect(checkRateLimitMock).not.toHaveBeenCalled();
    });

    it('uses publicLimiter for /api/products', async () => {
      const req = createRequest('/api/products');
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue(null);

      await proxy(req);

      expect(checkRateLimitMock).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ name: 'publicLimiter' }),
        'public'
      );
    });

    it('uses publicLimiter for /api/products/123', async () => {
      const req = createRequest('/api/products/123');
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue(null);

      await proxy(req);

      expect(checkRateLimitMock).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ name: 'publicLimiter' }),
        'public'
      );
    });

    it('uses publicLimiter for /api/categories', async () => {
      const req = createRequest('/api/categories');
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue(null);

      await proxy(req);

      expect(checkRateLimitMock).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ name: 'publicLimiter' }),
        'public'
      );
    });

    it('uses publicLimiter for dotted category API slugs', async () => {
      const req = createRequest('/api/categories/summer.sale');
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue(null);

      await proxy(req);

      expect(middlewareConfig.matcher).toContain('/api/:path*');
      expect(checkRateLimitMock).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ name: 'publicLimiter' }),
        'public'
      );
    });

    it('uses publicLimiter for /api/tags', async () => {
      const req = createRequest('/api/tags');
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue(null);

      await proxy(req);

      expect(checkRateLimitMock).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ name: 'publicLimiter' }),
        'public'
      );
    });

    it('uses apiLimiter for general API endpoints', async () => {
      const req = createRequest('/api/users/me');
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue(null);

      await proxy(req);

      expect(checkRateLimitMock).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ name: 'apiLimiter' }),
        undefined
      );
    });

    it('uses apiLimiter for /api/cart', async () => {
      const req = createRequest('/api/cart');
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue(null);

      await proxy(req);

      expect(checkRateLimitMock).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ name: 'apiLimiter' }),
        undefined
      );
    });
  });

  // ============================================
  // Rate Limit Enforcement Tests
  // ============================================

  describe('Rate Limit Enforcement', () => {
    it('returns 429 response when rate limit exceeded', async () => {
      const resetTime = Date.now() + 120000;
      mockRateLimitFailure(resetTime);
      getTokenMock.mockResolvedValue(null);

      const req = createRequest('/api/auth/login');
      const response = await proxy(req);

      expect(response.status).toBe(429);
      const body = await response.json();
      expect(body.error).toBe(
        'Too many requests. Please wait before trying again.'
      );
      expect(body.retryAfter).toBe(resetTime);
    });

    it('does not trust x-e2e-test header for rate limit bypass', async () => {
      const resetTime = Date.now() + 120000;
      mockRateLimitFailure(resetTime);
      getTokenMock.mockResolvedValue(null);

      const req = createRequest('/api/auth/login', {
        headers: { 'x-e2e-test': 'true' },
      });
      const response = await proxy(req);

      expect(response.status).toBe(429);
      expect(checkRateLimitMock).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ name: 'strictLimiter' }),
        'login'
      );
    });

    it('skips rate limiting only when server E2E mode is enabled', async () => {
      process.env.E2E_TEST = 'true';
      mockRateLimitFailure();
      getTokenMock.mockResolvedValue(null);

      const req = createRequest('/api/auth/login');
      const response = await proxy(req);

      expect(response.status).not.toBe(429);
      expect(checkRateLimitMock).not.toHaveBeenCalled();
    });

    it('includes rate limit headers in 429 response', async () => {
      const resetTime = Date.now() + 120000;
      mockRateLimitFailure(resetTime);
      getTokenMock.mockResolvedValue(null);

      const req = createRequest('/api/auth/login');
      const response = await proxy(req);

      expect(response.headers.get('X-RateLimit-Limit')).toBe('5');
      expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
      expect(response.headers.get('X-RateLimit-Reset')).toBe(
        resetTime.toString()
      );
      expect(response.headers.get('Retry-After')).toBeDefined();
    });

    it('includes Retry-After in seconds', async () => {
      const now = Date.now();
      const resetTime = now + 120000; // 120 seconds
      mockRateLimitFailure(resetTime);
      getTokenMock.mockResolvedValue(null);

      const req = createRequest('/api/auth/login');
      const response = await proxy(req);

      const retryAfter = parseInt(
        response.headers.get('Retry-After') || '0',
        10
      );
      expect(retryAfter).toBeGreaterThan(0);
      expect(retryAfter).toBeLessThanOrEqual(120);
    });

    it('continues to next handler when rate limit not exceeded', async () => {
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue(null);

      const req = createRequest('/api/users/me');
      const response = await proxy(req);

      expect(response.status).not.toBe(429);
    });
  });

  // ============================================
  // Authentication Tests
  // ============================================

  describe('Authentication', () => {
    it('redirects to login for unauthenticated admin requests', async () => {
      const req = createRequest('/admin/dashboard');
      getTokenMock.mockResolvedValue(null);

      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/login');
    });

    it('redirects to home for non-admin user on admin route', async () => {
      const req = createRequest('/admin/users');
      getTokenMock.mockResolvedValue({ role: 'USER', email: 'user@test.com' });

      const response = await proxy(req);

      expect(response.status).toBe(307);
      const location = response.headers.get('Location');
      expect(location).not.toContain('/login');
      expect(location).toContain('http://localhost/');
    });

    it('redirects admin users on unprefixed admin routes to locale-prefixed admin routes', async () => {
      const req = createRequest('/admin/users');
      getTokenMock.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@test.com',
      });

      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/en/admin/users');
    });

    it('redirects to login for unauthenticated profile requests', async () => {
      const req = createRequest('/profile');
      getTokenMock.mockResolvedValue(null);

      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/login');
    });

    it('redirects authenticated users on unprefixed profile routes to locale-prefixed profile routes', async () => {
      const req = createRequest('/profile');
      getTokenMock.mockResolvedValue({ role: 'USER', email: 'user@test.com' });

      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/en/profile');
    });

    it('redirects admin users on unprefixed profile routes to locale-prefixed profile routes', async () => {
      const req = createRequest('/profile');
      getTokenMock.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@test.com',
      });

      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/en/profile');
    });
  });

  // ============================================
  // Non-Matching Routes Tests
  // ============================================

  describe('Non-Matching Routes', () => {
    it('does not rate limit non-API routes', async () => {
      const req = createRequest('/products/123');
      getTokenMock.mockResolvedValue(null);

      await proxy(req);

      expect(checkRateLimitMock).not.toHaveBeenCalled();
    });

    it('does not rate limit static pages', async () => {
      const req = createRequest('/about');
      getTokenMock.mockResolvedValue(null);

      await proxy(req);

      expect(checkRateLimitMock).not.toHaveBeenCalled();
    });

    it('redirects public pages to the negotiated locale without requiring auth', async () => {
      const req = createRequest('/');
      getTokenMock.mockResolvedValue(null);

      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toBe('http://localhost/en');
    });
  });

  // ============================================
  // Edge Cases Tests
  // ============================================

  describe('Edge Cases', () => {
    it('protects nested admin routes like /admin/users/123/edit', async () => {
      const req = createRequest('/admin/users/123/edit');
      getTokenMock.mockResolvedValue(null);

      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/login');
    });

    it('protects deeply nested admin routes', async () => {
      const req = createRequest('/admin/products/categories/123/items/456');
      getTokenMock.mockResolvedValue(null);

      const response = await proxy(req);

      expect(response.status).toBe(307);
    });

    it('applies rate limiting regardless of query parameters', async () => {
      const req = createRequest('/api/products?search=test&page=1');
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue(null);

      await proxy(req);

      expect(checkRateLimitMock).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ name: 'publicLimiter' }),
        'public'
      );
    });

    it('applies strict limiter regardless of query parameters on login', async () => {
      const req = createRequest('/api/auth/login?redirect=/admin');
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue(null);

      await proxy(req);

      expect(checkRateLimitMock).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ name: 'strictLimiter' }),
        'login'
      );
    });

    it('protects nested profile routes', async () => {
      const req = createRequest('/profile/orders/123');
      getTokenMock.mockResolvedValue(null);

      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/login');
    });

    it('redirects authenticated user on unprefixed nested profile routes to locale-prefixed routes', async () => {
      const req = createRequest('/profile/settings');
      getTokenMock.mockResolvedValue({ role: 'USER', email: 'user@test.com' });

      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain(
        '/en/profile/settings'
      );
    });

    it('uses apiLimiter for /api/admin endpoints', async () => {
      const req = createRequest('/api/admin/users');
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@test.com',
      });

      await proxy(req);

      expect(checkRateLimitMock).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ name: 'apiLimiter' }),
        'admin'
      );
    });
  });

  // ============================================
  // Bucket Isolation Tests
  // ============================================

  describe('Bucket Isolation', () => {
    it('uses different buckets for login and register', async () => {
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue(null);

      const loginReq = createRequest('/api/auth/login');
      await proxy(loginReq);

      const registerReq = createRequest('/api/auth/register');
      await proxy(registerReq);

      const calls = checkRateLimitMock.mock.calls;
      expect(calls[0][2]).toBe('login');
      expect(calls[1][2]).toBe('register');
    });

    it('uses same "public" bucket for products, categories, and tags', async () => {
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue(null);

      const productsReq = createRequest('/api/products');
      await proxy(productsReq);

      const categoriesReq = createRequest('/api/categories');
      await proxy(categoriesReq);

      const tagsReq = createRequest('/api/tags');
      await proxy(tagsReq);

      const calls = checkRateLimitMock.mock.calls;
      expect(calls[0][2]).toBe('public');
      expect(calls[1][2]).toBe('public');
      expect(calls[2][2]).toBe('public');
    });

    it('uses no specific bucket for general API endpoints', async () => {
      mockRateLimitSuccess();
      getTokenMock.mockResolvedValue(null);

      const req = createRequest('/api/settings');
      await proxy(req);

      expect(checkRateLimitMock).toHaveBeenCalledWith(
        req,
        expect.objectContaining({ name: 'apiLimiter' }),
        undefined
      );
    });
  });

  // ============================================
  // Rate Limiting + Auth Combination Tests
  // ============================================

  describe('Rate Limiting + Auth Combination', () => {
    it('applies rate limiting before auth checks for API routes', async () => {
      mockRateLimitFailure();
      getTokenMock.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@test.com',
      });

      const req = createRequest('/api/admin/users');
      const response = await proxy(req);

      // Rate limit should still be applied even for authenticated admin
      expect(response.status).toBe(429);
    });

    it('admin routes do not apply API rate limiting', async () => {
      // /admin/* routes are not /api/* routes, so no rate limiting
      getTokenMock.mockResolvedValue({
        role: 'ADMIN',
        email: 'admin@test.com',
      });

      const req = createRequest('/admin/dashboard');
      await proxy(req);

      expect(checkRateLimitMock).not.toHaveBeenCalled();
    });

    it('profile routes do not apply API rate limiting', async () => {
      // /profile/* routes are not /api/* routes, so no rate limiting
      getTokenMock.mockResolvedValue({ role: 'USER', email: 'user@test.com' });

      const req = createRequest('/profile');
      await proxy(req);

      expect(checkRateLimitMock).not.toHaveBeenCalled();
    });
  });

  describe('Locale routing', () => {
    it('uses URL locale before cookie and Accept-Language', async () => {
      const req = createRequest('/de/cart', {
        headers: {
          cookie: 'site-locale=en',
          'accept-language': 'en-US',
        },
      });
      getTokenMock.mockResolvedValue(null);

      const response = await proxy(req);

      expect(response.status).not.toBe(307);
      expect(response.headers.get('Set-Cookie')).toContain('site-locale=de');
      expect(response.headers.get('x-middleware-rewrite')).toContain('/cart');
    });

    it('does not overwrite locale cookies on API responses', async () => {
      const req = createRequest('/api/auth/session', {
        headers: {
          cookie: 'site-locale=de',
        },
      });
      getTokenMock.mockResolvedValue(null);

      const response = await proxy(req);

      expect(response.headers.get('Set-Cookie')).toBeNull();
    });

    it('uses locale cookie before Accept-Language on unprefixed pages', async () => {
      const req = createRequest('/cart', {
        headers: {
          cookie: 'site-locale=de',
          'accept-language': 'en-US',
        },
      });
      getTokenMock.mockResolvedValue(null);

      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toBe('http://localhost/de/cart');
    });

    it('does not parse auth tokens for public locale redirects', async () => {
      const req = createRequest('/products', {
        headers: {
          'accept-language': 'de-DE,en;q=0.8',
        },
      });

      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toBe(
        'http://localhost/de/products'
      );
      expect(getTokenMock).not.toHaveBeenCalled();
    });

    it('uses Accept-Language when URL and cookie locale are absent', async () => {
      const req = createRequest('/cart', {
        headers: {
          'accept-language': 'de-DE,en;q=0.8',
        },
      });
      getTokenMock.mockResolvedValue(null);

      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toBe('http://localhost/de/cart');
    });

    it('treats malformed locale cookies as absent', async () => {
      const req = createRequest('/cart', {
        headers: {
          cookie: 'site-locale=%',
          'accept-language': 'de-DE,en;q=0.8',
        },
      });

      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toBe('http://localhost/de/cart');
    });

    it('falls back to the default locale for unsupported locale URLs', async () => {
      const req = createRequest('/fr/cart', {
        headers: {
          'accept-language': 'de-DE',
        },
      });
      getTokenMock.mockResolvedValue(null);

      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toBe('http://localhost/en/cart');
      expect(response.headers.get('Set-Cookie')).toContain('site-locale=en');
    });

    it('redirects regional URL locales to configured locale routes', async () => {
      const req = createRequest('/de-DE/cart', {
        headers: {
          'accept-language': 'en-US',
        },
      });

      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toBe('http://localhost/de/cart');
      expect(response.headers.get('Set-Cookie')).toContain('site-locale=de');
      expect(getTokenMock).not.toHaveBeenCalled();
    });

    it('protects localized admin routes without redirecting to the locale prefix first', async () => {
      const req = createRequest('/de/admin/users');
      getTokenMock.mockResolvedValue(null);

      const response = await proxy(req);

      expect(response.status).toBe(307);
      expect(response.headers.get('Location')).toContain('/de/login');
    });
  });
});
