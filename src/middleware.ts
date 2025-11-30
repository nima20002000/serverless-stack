import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { checkRateLimit, apiLimiter, strictLimiter, publicLimiter } from '@/lib/rate-limit';
import type { Ratelimit } from '@upstash/ratelimit';

export async function middleware(req: NextRequest) {
  // Apply rate limiting to ALL API routes FIRST (before any auth checks)
  if (req.nextUrl.pathname.startsWith('/api')) {
    // Choose appropriate limiter based on endpoint
    let limiter: Ratelimit = apiLimiter;
    let shouldRateLimit = true;

    // Strict rate limiting for authentication endpoints
    if (
      req.nextUrl.pathname === '/api/auth/login' ||
      req.nextUrl.pathname === '/api/auth/register'
    ) {
      limiter = strictLimiter; // Strict for login/register (5 requests per 2 minutes)
    } else if (req.nextUrl.pathname.startsWith('/api/auth/')) {
      // Don't rate limit other NextAuth endpoints (session, CSRF, providers, etc.)
      shouldRateLimit = false;
    } else if (
      req.nextUrl.pathname.startsWith('/api/products') ||
      req.nextUrl.pathname.startsWith('/api/categories') ||
      req.nextUrl.pathname.startsWith('/api/tags')
    ) {
      limiter = publicLimiter; // Generous for public browsing
    }

    if (shouldRateLimit) {
      const { success, limit, reset } = await checkRateLimit(req, limiter);

      if (!success) {
        const retryAfter = Math.ceil((reset - Date.now()) / 1000);

        return NextResponse.json(
          {
            error: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفاً کمی صبر کنید.',
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
  const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");
  const isProfileRoute = req.nextUrl.pathname.startsWith("/profile");

  // Protect admin routes - require ADMIN role
  if (isAdminRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (token.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // Protect profile routes - require any authenticated user
  if (isProfileRoute && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*", "/api/:path*"],
};
