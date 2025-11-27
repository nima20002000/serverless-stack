# Rate Limiting Implementation

## Status: ⏳ PENDING
**Priority**: High
**Estimated Complexity**: Medium
**Estimated Time**: 2-3 hours

---

## Overview
Implement rate limiting using Upstash to protect API endpoints from abuse, brute-force attacks, and excessive usage. This ensures application stability and security.

---

## Business Value
- **Security**: Prevent brute-force attacks on login/register endpoints
- **Stability**: Prevent API abuse from overwhelming the server
- **Fair Usage**: Ensure resources are distributed fairly among users
- **Cost Control**: Prevent runaway costs from excessive API calls

---

## Prerequisites
- Upstash account (can use same Redis from Task 10)
- Understanding of rate limiting concepts
- Task 09 (Structured Logging) completed (recommended)

---

## Tasks

### 1. Setup Upstash Redis (if not done in Task 10)
- [ ] If you already have Upstash from Task 10, you can use the same instance
- [ ] Otherwise, create new Redis database at https://upstash.com
- [ ] Copy connection credentials (same as Task 10)

### 2. Install Dependencies
- [ ] Install Upstash rate limiting library
  ```bash
  npm install @upstash/ratelimit @upstash/redis
  ```
- [ ] Verify package.json updated

### 3. Create Rate Limiter Utility
- [ ] Create `src/lib/rate-limit/index.ts`
- [ ] Configure different rate limiters for different use cases:
  - Strict: Authentication endpoints (5 requests / 15 minutes)
  - Moderate: API endpoints (100 requests / minute)
  - Generous: Public endpoints (1000 requests / minute)
- [ ] Create helper function to get client identifier (IP or user ID)
- [ ] Create helper function to check rate limit
- [ ] Add logging integration

**File**: `src/lib/rate-limit/index.ts`
```typescript
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
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 requests per 15 minutes
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
```

### 4. Create Rate Limiting Wrapper
- [ ] Create `src/lib/api/with-rate-limit.ts`
- [ ] Implement rate limiting wrapper for API routes
- [ ] Return 429 status with retry-after header when limit exceeded
- [ ] Add rate limit headers to all responses

**File**: `src/lib/api/with-rate-limit.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, apiLimiter } from '@/lib/rate-limit';
import type { Ratelimit } from '@upstash/ratelimit';

type ApiHandler = (req: NextRequest, context?: any) => Promise<NextResponse>;

export function withRateLimit(
  handler: ApiHandler,
  limiter: Ratelimit = apiLimiter
): ApiHandler {
  return async (req: NextRequest, context?: any) => {
    const { success, limit, remaining, reset } = await checkRateLimit(req, limiter);

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

    // Call handler
    const response = await handler(req, context);

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());

    return response;
  };
}
```

### 5. Apply Rate Limiting to Authentication Endpoints

#### Login Endpoint
- [ ] Update `src/app/api/auth/login/route.ts` (if exists)
- [ ] Use `strictLimiter` (5 requests / 15 minutes)

```typescript
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { strictLimiter } from '@/lib/rate-limit';
import { withLogging } from '@/lib/api/with-logging';

const postHandler = async (req: NextRequest) => {
  // Login logic
  const body = await req.json();
  // ... authentication
  return NextResponse.json({ success: true });
};

export const POST = withLogging(
  withRateLimit(postHandler, strictLimiter),
  'POST /api/auth/login'
);
```

#### Register Endpoint
- [ ] Update `src/app/api/auth/register/route.ts`
- [ ] Use `strictLimiter` (prevent mass account creation)

```typescript
export const POST = withLogging(
  withRateLimit(postHandler, strictLimiter),
  'POST /api/auth/register'
);
```

### 6. Apply Rate Limiting to Critical Endpoints

#### Transaction Creation
- [ ] Update `src/app/api/transactions/create/route.ts`
- [ ] Use `apiLimiter` (100 requests / minute)

```typescript
export const POST = withLogging(
  withRateLimit(postHandler, apiLimiter),
  'POST /api/transactions/create'
);
```

#### Admin Endpoints
- [ ] Apply `apiLimiter` to admin endpoints
- [ ] Update routes in `src/app/api/admin/*/route.ts`

### 7. Global Rate Limiting via Middleware
- [ ] Update `src/middleware.ts`
- [ ] Add global rate limiting for all API routes
- [ ] Apply appropriate limiter based on route pattern

```typescript
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

      const { success, limit, remaining, reset } = await checkRateLimit(req, limiter);

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

        if (isAuthRoute) return true;
        if (isAdminRoute) return !!token;

        return true;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*", "/profile/:path*", "/api/:path*"],
};
```

### 8. Environment Configuration
- [ ] Environment variables should already be set from Task 10
- [ ] If not, add to `.env.example`
  ```env
  UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
  UPSTASH_REDIS_REST_TOKEN=your-token-here
  ```
- [ ] Ensure Vercel environment variables are set

---

## Testing Checklist

### Local Testing

#### Test Authentication Rate Limiting
- [ ] Test login endpoint with repeated requests
  ```bash
  # Send 6 requests (limit is 5)
  for i in {1..6}; do
    echo "Request $i"
    curl -X POST http://localhost:3000/api/auth/register \
      -H "Content-Type: application/json" \
      -d '{"email":"test@example.com","password":"12345678","name":"Test"}'
    sleep 1
  done
  ```
  Expected:
  - Requests 1-5: Success or validation error
  - Request 6: 429 Too Many Requests
  - Headers: `X-RateLimit-Limit: 5`, `Retry-After: XXX`

#### Test API Rate Limiting
- [ ] Test product endpoint with many requests
  ```bash
  # Send 101 requests (limit is 100/min)
  for i in {1..101}; do
    curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/products
  done
  ```
  Expected:
  - Requests 1-100: 200 OK
  - Request 101: 429 Too Many Requests

#### Test Rate Limit Headers
- [ ] Check response headers
  ```bash
  curl -I http://localhost:3000/api/products
  ```
  Expected headers:
  ```
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 999
  X-RateLimit-Reset: 1234567890000
  ```

#### Test Different Rate Limits
- [ ] Verify different limits for different endpoints
  - `/api/auth/*` → 5 requests / 15 min
  - `/api/products` → 1000 requests / min
  - `/api/transactions/create` → 100 requests / min

### Automated Testing Script
- [ ] Create `test-rate-limits.sh`
```bash
#!/bin/bash

echo "🧪 Testing Rate Limits..."

# Test 1: Public endpoint (generous limit)
echo "Test 1: Public endpoint rate limit"
success_count=0
for i in {1..50}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/products)
  if [ $status -eq 200 ]; then
    ((success_count++))
  fi
done
echo "✅ Public endpoint: $success_count/50 requests succeeded"

# Test 2: Auth endpoint (strict limit)
echo "Test 2: Auth endpoint rate limit (should hit limit at 6)"
for i in {1..6}; do
  status=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"test$i@example.com\",\"password\":\"12345678\",\"name\":\"Test\"}")
  echo "Request $i: $status"
done

echo "✅ Rate limit tests completed"
```

### Git Workflow
- [ ] Create feature branch
  ```bash
  git checkout -b feature/11-rate-limiting
  ```

- [ ] Commit changes
  ```bash
  git add .
  git commit -m "feat: add API rate limiting with Upstash

  - Add Upstash rate limiter integration
  - Create rate limit wrapper for API routes
  - Implement tiered rate limits (strict/moderate/generous)
  - Add rate limiting to auth endpoints (5 req/15min)
  - Add rate limiting to API endpoints (100 req/min)
  - Add rate limiting to public endpoints (1000 req/min)
  - Add global rate limiting via middleware
  - Add rate limit headers to responses
  - Fail open if rate limiter unavailable

  Refs: 2do/11-rate-limiting.md"
  ```

- [ ] Push to GitHub
  ```bash
  git push origin feature/11-rate-limiting
  ```

### Vercel Preview Testing
- [ ] Wait for Vercel preview deployment
- [ ] Test rate limiting on preview URL
  ```bash
  # Test auth endpoint
  for i in {1..6}; do
    curl -X POST https://kitia-preview.vercel.app/api/auth/register \
      -H "Content-Type: application/json" \
      -d '{"email":"test'$i'@example.com","password":"12345678","name":"Test"}'
  done
  ```

- [ ] Check Upstash dashboard
  - Go to Upstash console
  - Check rate limit analytics
  - Verify requests are being tracked

### Production Deployment
- [ ] Create pull request
- [ ] Review changes
- [ ] Merge to main
- [ ] Monitor for false positives (legitimate users getting blocked)
- [ ] Check Upstash analytics

---

## Database Changes
**None** - This task does not require database migrations.

---

## Rollback Plan
If issues occur:
1. Comment out rate limiting in middleware
2. Or revert the merge commit
   ```bash
   git revert HEAD
   git push origin main
   ```
3. Rate limiting is non-critical, can be disabled temporarily

---

## Success Criteria
- [x] ✅ Upstash rate limiter configured
- [x] ✅ Rate limiting utility created
- [x] ✅ Authentication endpoints protected (5 req/15min)
- [x] ✅ API endpoints protected (100 req/min)
- [x] ✅ Public endpoints protected (1000 req/min)
- [x] ✅ 429 responses returned when limit exceeded
- [x] ✅ Rate limit headers present in all responses
- [x] ✅ No false positives blocking legitimate users
- [x] ✅ Fail open if rate limiter unavailable
- [x] ✅ Rate limiting visible in Upstash analytics

---

## Monitoring After Deployment

### Upstash Dashboard
- Check "Rate Limit" analytics
- Monitor requests per endpoint
- Check violation rate
- Identify abusive IPs

### Vercel Logs
- Monitor 429 responses
- Check for patterns of abuse
- Verify legitimate users not blocked

### Metrics to Track
- Total requests
- Rate limit violations
- Top violators (IP addresses)
- False positive rate (should be <1%)

---

## Rate Limit Configuration Guide

### Endpoint Categories

**Strict (Authentication):**
- `/api/auth/login`
- `/api/auth/register`
- Limit: 5 requests / 15 minutes
- Reason: Prevent brute force attacks

**Moderate (Mutations):**
- `/api/transactions/create`
- `/api/admin/*`
- `/api/upload/*`
- Limit: 100 requests / minute
- Reason: Prevent API abuse

**Generous (Public Read):**
- `/api/products`
- `/api/categories`
- `/api/tags`
- Limit: 1000 requests / minute
- Reason: Allow browsing, prevent scraping

### Adjusting Limits
If you see legitimate users hitting limits:
1. Check Upstash analytics
2. Identify the problematic endpoint
3. Adjust the limit in `src/lib/rate-limit/index.ts`
4. Deploy update

---

## Security Considerations
- Rate limiting by IP can be bypassed with VPNs/proxies
- Consider rate limiting by user ID for authenticated requests
- Monitor for distributed attacks (many IPs)
- Implement CAPTCHA for repeated violations
- Log and alert on suspicious patterns

---

## Cost Estimation
**Upstash Free Tier:**
- 10,000 requests/day for rate limiting
- Can be shared with caching (Task 10)

**Paid Tier:**
- Same as caching (~$10-20/month)

---

## Documentation
- [ ] Update README.md with rate limiting info
- [ ] Document rate limits for each endpoint
- [ ] Add guide for adjusting limits
- [ ] Document monitoring procedures

---

## Related Tasks
- Task 09: Structured Logging (logs rate limit violations)
- Task 10: Redis Caching (shares Redis instance)

---

## Notes
- Start with conservative limits, increase if needed
- Monitor for first 48 hours after deployment
- Rate limits are per IP, not per user (unless authenticated)
- Consider implementing progressive rate limiting (harder limits for repeated violations)
- Add CAPTCHA for users who repeatedly hit limits
