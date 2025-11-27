import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { checkRateLimit, apiLimiter, strictLimiter, publicLimiter } from '@/lib/rate-limit';
import type { Ratelimit } from '@upstash/ratelimit';

export default withAuth(
  async function middleware(req) {
    // Apply rate limiting to API routes
    if (req.nextUrl.pathname.startsWith('/api')) {
      // Choose appropriate limiter based on endpoint
      let limiter: Ratelimit = apiLimiter;

      if (req.nextUrl.pathname.startsWith('/api/auth/')) {
        limiter = strictLimiter; // Strict for authentication
      } else if (
        req.nextUrl.pathname.startsWith('/api/products') ||
        req.nextUrl.pathname.startsWith('/api/categories') ||
        req.nextUrl.pathname.startsWith('/api/tags')
      ) {
        limiter = publicLimiter; // Generous for public browsing
      }

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

    // Existing auth logic
    const token = req.nextauth.token;
    const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

    // Protect admin routes
    if (isAdminRoute && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const isAuthRoute = req.nextUrl.pathname.startsWith("/login") ||
                           req.nextUrl.pathname.startsWith("/register");
        const isAdminRoute = req.nextUrl.pathname.startsWith("/admin");

        // Allow access to auth routes
        if (isAuthRoute) {
          return true;
        }

        // Require token for admin routes
        if (isAdminRoute) {
          return !!token;
        }

        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*", "/api/:path*"],
};
