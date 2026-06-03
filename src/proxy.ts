import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import {
  checkRateLimit,
  apiLimiter,
  strictLimiter,
  publicLimiter,
} from '@/lib/rate-limit';
import { isServerE2EMode } from '@/lib/e2e-mode';
import type { Ratelimit } from '@upstash/ratelimit';

export async function proxy(req: NextRequest) {
  const isE2ETest = isServerE2EMode();

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
    } else if (req.nextUrl.pathname === '/api/transactions/webhook-stripe') {
      // Don't rate limit - this is a signed external callback from Stripe
      shouldRateLimit = false;
    } else if (req.nextUrl.pathname === '/api/transactions/webhook-paypal') {
      // Don't rate limit - this is a signed external callback from PayPal
      shouldRateLimit = false;
    } else if (req.nextUrl.pathname === '/api/transactions/paypal/capture') {
      // Don't rate limit - this is a PayPal return/callback endpoint
      shouldRateLimit = false;
    } else if (req.nextUrl.pathname === '/api/search') {
      // Dedicated bucket for search to avoid cross-endpoint blocking
      limiter = apiLimiter;
      endpoint = 'search';
    } else if (req.nextUrl.pathname.startsWith('/api/auth/')) {
      // Don't rate limit other NextAuth endpoints (session, CSRF, providers, etc.)
      shouldRateLimit = false;
    } else if (req.nextUrl.pathname === '/api/transactions/create') {
      limiter = apiLimiter;
      endpoint = 'checkout-create';
    } else if (req.nextUrl.pathname.startsWith('/api/transactions/')) {
      limiter = apiLimiter;
      endpoint = 'transactions';
    } else if (req.nextUrl.pathname.startsWith('/api/admin/')) {
      limiter = apiLimiter;
      endpoint = 'admin';
    } else if (req.nextUrl.pathname.startsWith('/api/user/')) {
      limiter = apiLimiter;
      endpoint = 'user';
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
            error: 'Too many requests. Please wait before trying again.',
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
