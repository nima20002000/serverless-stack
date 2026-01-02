import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  checkRateLimit,
  apiLimiter,
  strictLimiter,
  publicLimiter,
} from '@/lib/rate-limit';
import type { Ratelimit } from '@upstash/ratelimit';

export async function middleware(req: NextRequest) {
  const isE2ETest =
    process.env.E2E_TEST === 'true' || req.headers.get('x-e2e-test') === 'true';

  // Apply rate limiting to ALL API routes FIRST (before any auth checks)
  if (req.nextUrl.pathname.startsWith('/api')) {
    // Choose appropriate limiter and endpoint identifier based on route
    let limiter: Ratelimit = apiLimiter;
    let shouldRateLimit = true;
    let endpoint: string | undefined;

    // Strict rate limiting for authentication endpoints
    // Each endpoint gets its own rate limit bucket to prevent cross-endpoint blocking
    if (req.nextUrl.pathname === '/api/auth/login') {
      limiter = strictLimiter; // Strict for login (5 requests per 2 minutes)
      endpoint = 'login'; // Separate bucket for login
    } else if (req.nextUrl.pathname === '/api/auth/register') {
      limiter = strictLimiter; // Strict for register (5 requests per 2 minutes)
      endpoint = 'register'; // Separate bucket for register
    } else if (req.nextUrl.pathname === '/api/auth/send-otp') {
      // Don't rate limit here - OTP service has its own rate limiting per email/phone
      shouldRateLimit = false;
    } else if (req.nextUrl.pathname === '/api/auth/verify-otp') {
      // Don't rate limit here - OTP service has its own attempt limiting
      shouldRateLimit = false;
    } else if (req.nextUrl.pathname === '/api/auth/checkout-verify-otp') {
      // Don't rate limit here - OTP service has its own attempt limiting
      shouldRateLimit = false;
    } else if (req.nextUrl.pathname === '/api/transactions/verify') {
      // Don't rate limit - this is an external callback from Zarinpal payment gateway
      // Users cannot trigger this directly; requires valid authority from database
      shouldRateLimit = false;
    } else if (req.nextUrl.pathname === '/api/transactions/verify-digipay') {
      // Don't rate limit - this is an external callback from Digipay payment gateway
      // Digipay POSTs payment result via browser redirect; requires valid ticket from database
      shouldRateLimit = false;
    } else if (req.nextUrl.pathname.startsWith('/api/auth/')) {
      // Don't rate limit other NextAuth endpoints (session, CSRF, providers, etc.)
      shouldRateLimit = false;
    } else if (
      req.nextUrl.pathname.startsWith('/api/products') ||
      req.nextUrl.pathname.startsWith('/api/categories') ||
      req.nextUrl.pathname.startsWith('/api/tags')
    ) {
      limiter = publicLimiter; // Generous for public browsing
      endpoint = 'public'; // Separate bucket for public endpoints
    }

    if (shouldRateLimit && !isE2ETest) {
      const { success, limit, reset } = await checkRateLimit(
        req,
        limiter,
        endpoint
      );

      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);

        return NextResponse.json(
          {
            error:
              'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید.',
            retryAfter: reset,
          },
          {
            status: 429,
            headers: {
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': reset.toString(),
              'Retry-After': retryAfter.toString(),
            },
          }
        );
      }
    }
  }

  // Handle auth-protected routes (admin, profile)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
  const isProfileRoute = req.nextUrl.pathname.startsWith('/profile');
  const debugHeaders = isE2ETest
    ? {
        'x-e2e-token-present': token ? '1' : '0',
        'x-e2e-token-role': token?.role ?? 'none',
        'x-e2e-secret-present': process.env.NEXTAUTH_SECRET ? '1' : '0',
      }
    : null;

  // Protect admin routes - require ADMIN role
  if (isAdminRoute) {
    if (!token) {
      const response = NextResponse.redirect(new URL('/login', req.url));
      if (debugHeaders) {
        for (const [key, value] of Object.entries(debugHeaders)) {
          response.headers.set(key, value);
        }
      }
      return response;
    }
    if (token.role !== 'ADMIN') {
      const response = NextResponse.redirect(new URL('/', req.url));
      if (debugHeaders) {
        for (const [key, value] of Object.entries(debugHeaders)) {
          response.headers.set(key, value);
        }
      }
      return response;
    }
  }

  // Protect profile routes - require any authenticated user
  if (isProfileRoute && !token) {
    const response = NextResponse.redirect(new URL('/login', req.url));
    if (debugHeaders) {
      for (const [key, value] of Object.entries(debugHeaders)) {
        response.headers.set(key, value);
      }
    }
    return response;
  }

  const response = NextResponse.next();
  if (debugHeaders) {
    for (const [key, value] of Object.entries(debugHeaders)) {
      response.headers.set(key, value);
    }
  }
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/profile/:path*', '/api/:path*'],
};
