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
import {
  defaultLocale,
  getLocaleDirection,
  isSupportedLocale,
  localeCookieName,
  localeDirectionHeaderName,
  localeHeaderName,
  type Locale,
} from '@/lib/i18n/config';
import {
  negotiateLocale,
  normalizeLocaleTag,
  parsePathLocale,
  prefixPathWithLocale,
  shouldHandleLocaleRouting,
} from '@/lib/i18n/routing';
import type { Ratelimit } from '@upstash/ratelimit';

function readCookie(req: NextRequest, name: string): string | null {
  const cookieFromRequest = req.cookies?.get(name)?.value;
  if (cookieFromRequest) return cookieFromRequest;

  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader) return null;

  const cookie = cookieHeader
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!cookie) return null;

  try {
    return decodeURIComponent(cookie.split('=').slice(1).join('='));
  } catch {
    return null;
  }
}

function addLocaleCookie(response: NextResponse, locale: Locale): NextResponse {
  response.cookies.set(localeCookieName, locale, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

function createLocalizedRequestHeaders(
  req: NextRequest,
  locale: Locale
): Headers {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(localeHeaderName, locale);
  requestHeaders.set(localeDirectionHeaderName, getLocaleDirection(locale));
  return requestHeaders;
}

function getTokenRole(token: Awaited<ReturnType<typeof getToken>> | null) {
  if (!token || typeof token === 'string') return null;
  return typeof token.role === 'string' ? token.role : null;
}

export async function proxy(req: NextRequest) {
  const isE2ETest = isServerE2EMode();
  const pathInfo = parsePathLocale(req.nextUrl.pathname);
  const shouldRouteLocale = shouldHandleLocaleRouting(req.nextUrl.pathname);
  const locale = shouldRouteLocale
    ? negotiateLocale({
        urlLocale: pathInfo.locale,
        cookieLocale: readCookie(req, localeCookieName),
        acceptLanguage: req.headers.get('accept-language'),
      })
    : defaultLocale;
  let token: Awaited<ReturnType<typeof getToken>> | null = null;
  let hasLoadedToken = false;
  const loadToken = async () => {
    if (!hasLoadedToken) {
      token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      hasLoadedToken = true;
    }
    return token;
  };
  const getDebugHeaders = (
    currentToken: Awaited<ReturnType<typeof getToken>> | null
  ) =>
    isE2ETest
      ? {
          'x-e2e-token-present': currentToken ? '1' : '0',
          'x-e2e-token-role': getTokenRole(currentToken) ?? 'none',
          'x-e2e-secret-present': process.env.NEXTAUTH_SECRET ? '1' : '0',
        }
      : null;
  const attachDebugHeaders = (
    response: NextResponse,
    currentToken: Awaited<ReturnType<typeof getToken>> | null
  ) => {
    const debugHeaders = getDebugHeaders(currentToken);
    if (debugHeaders) {
      for (const [key, value] of Object.entries(debugHeaders)) {
        response.headers.set(key, value);
      }
    }
  };

  if (shouldRouteLocale && pathInfo.unsupportedLocale) {
    const url = new URL(req.url);
    const normalizedLocale = normalizeLocaleTag(pathInfo.unsupportedLocale);
    const redirectLocale = isSupportedLocale(normalizedLocale)
      ? normalizedLocale
      : defaultLocale;
    url.pathname = prefixPathWithLocale(
      pathInfo.pathnameWithoutLocale,
      redirectLocale
    );
    const response = NextResponse.redirect(url);
    return addLocaleCookie(response, redirectLocale);
  }

  if (shouldRouteLocale && !pathInfo.locale) {
    const isUnprefixedAdminRoute = req.nextUrl.pathname.startsWith('/admin');
    const isUnprefixedProfileRoute =
      req.nextUrl.pathname.startsWith('/profile');

    if (isUnprefixedAdminRoute) {
      const currentToken = await loadToken();

      if (!currentToken) {
        const response = NextResponse.redirect(
          new URL(prefixPathWithLocale('/login', locale), req.url)
        );
        attachDebugHeaders(response, currentToken);
        return addLocaleCookie(response, locale);
      }

      if (getTokenRole(currentToken) !== 'ADMIN') {
        const response = NextResponse.redirect(
          new URL(prefixPathWithLocale('/', locale), req.url)
        );
        attachDebugHeaders(response, currentToken);
        return addLocaleCookie(response, locale);
      }
    }

    if (isUnprefixedProfileRoute) {
      const currentToken = await loadToken();

      if (!currentToken) {
        const response = NextResponse.redirect(
          new URL(prefixPathWithLocale('/login', locale), req.url)
        );
        attachDebugHeaders(response, currentToken);
        return addLocaleCookie(response, locale);
      }
    }

    const url = new URL(req.url);
    url.pathname = prefixPathWithLocale(req.nextUrl.pathname, locale);
    const response = NextResponse.redirect(url);
    return addLocaleCookie(response, locale);
  }

  const routePathname =
    shouldRouteLocale && pathInfo.locale
      ? pathInfo.pathnameWithoutLocale
      : req.nextUrl.pathname;

  // Apply rate limiting to ALL API routes FIRST (before any auth checks)
  if (routePathname.startsWith('/api')) {
    // Choose appropriate limiter and endpoint identifier based on route
    let limiter: Ratelimit = apiLimiter;
    let shouldRateLimit = true;
    let endpoint: string | undefined;

    // Strict rate limiting for authentication endpoints
    // Each endpoint gets its own rate limit bucket to prevent cross-endpoint blocking
    if (routePathname === '/api/auth/login') {
      limiter = strictLimiter; // Strict for login (5 requests per 2 minutes)
      endpoint = 'login'; // Separate bucket for login
    } else if (routePathname === '/api/auth/register') {
      limiter = strictLimiter; // Strict for register (5 requests per 2 minutes)
      endpoint = 'register'; // Separate bucket for register
    } else if (routePathname === '/api/transactions/webhook-stripe') {
      // Don't rate limit - this is a signed external callback from Stripe
      shouldRateLimit = false;
    } else if (routePathname === '/api/transactions/webhook-paypal') {
      // Don't rate limit - this is a signed external callback from PayPal
      shouldRateLimit = false;
    } else if (routePathname === '/api/transactions/paypal/capture') {
      // Don't rate limit - this is a PayPal return/callback endpoint
      shouldRateLimit = false;
    } else if (routePathname === '/api/search') {
      // Dedicated bucket for search to avoid cross-endpoint blocking
      limiter = apiLimiter;
      endpoint = 'search';
    } else if (routePathname.startsWith('/api/auth/')) {
      // Don't rate limit other NextAuth endpoints (session, CSRF, providers, etc.)
      shouldRateLimit = false;
    } else if (routePathname === '/api/transactions/create') {
      limiter = apiLimiter;
      endpoint = 'checkout-create';
    } else if (routePathname.startsWith('/api/transactions/')) {
      limiter = apiLimiter;
      endpoint = 'transactions';
    } else if (routePathname.startsWith('/api/admin/')) {
      limiter = apiLimiter;
      endpoint = 'admin';
    } else if (routePathname.startsWith('/api/user/')) {
      limiter = apiLimiter;
      endpoint = 'user';
    } else if (
      routePathname.startsWith('/api/products') ||
      routePathname.startsWith('/api/categories') ||
      routePathname.startsWith('/api/tags')
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
  const isAdminRoute = routePathname.startsWith('/admin');
  const isProfileRoute = routePathname.startsWith('/profile');

  // Protect admin routes - require ADMIN role
  if (isAdminRoute) {
    token = await loadToken();

    if (!token) {
      const response = NextResponse.redirect(
        new URL(prefixPathWithLocale('/login', locale), req.url)
      );
      attachDebugHeaders(response, token);
      return addLocaleCookie(response, locale);
    }
    if (getTokenRole(token) !== 'ADMIN') {
      const response = NextResponse.redirect(
        new URL(prefixPathWithLocale('/', locale), req.url)
      );
      attachDebugHeaders(response, token);
      return addLocaleCookie(response, locale);
    }
  }

  // Protect profile routes - require any authenticated user
  if (isProfileRoute) {
    token = await loadToken();

    if (!token) {
      const response = NextResponse.redirect(
        new URL(prefixPathWithLocale('/login', locale), req.url)
      );
      attachDebugHeaders(response, token);
      return addLocaleCookie(response, locale);
    }
  }

  const response =
    shouldRouteLocale && pathInfo.locale
      ? NextResponse.rewrite(
          new URL(`${routePathname}${req.nextUrl.search}`, req.url),
          {
            request: {
              headers: createLocalizedRequestHeaders(req, locale),
            },
          }
        )
      : NextResponse.next({
          request: {
            headers: createLocalizedRequestHeaders(req, locale),
          },
        });
  attachDebugHeaders(response, token);
  return shouldRouteLocale ? addLocaleCookie(response, locale) : response;
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|favicon.svg|robots.txt|sitemap.xml|.*\\..*).*)',
  ],
};
