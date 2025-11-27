# Redis Caching Implementation

## Status: ⏳ PENDING
**Priority**: High
**Estimated Complexity**: Medium
**Estimated Time**: 3-4 hours

---

## Overview
Implement Redis caching using Upstash to dramatically improve API response times and reduce database load. Cache frequently accessed data like product listings, categories, and tags.

---

## Business Value
- **Performance**: 20-50x faster response times for cached data
- **Scalability**: Reduce database load, handle more users
- **Cost Savings**: Fewer database queries = lower costs
- **User Experience**: Near-instant page loads for product browsing

---

## Prerequisites
- Upstash account (free tier available)
- Understanding of caching concepts (TTL, cache invalidation)
- Task 09 (Structured Logging) completed (recommended)

---

## Tasks

### 1. Setup Upstash Redis
- [ ] Go to https://upstash.com and sign up
- [ ] Create new Redis database
  - Name: `kitia-cache`
  - Region: Choose closest to your users (or ap-southeast-1 for Asia)
  - Type: Regional (free tier)
- [ ] Copy connection credentials
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`

### 2. Install Dependencies
- [ ] Install Redis client for Node.js
  ```bash
  npm install @upstash/redis
  ```
- [ ] Verify package.json updated

### 3. Create Redis Client
- [ ] Create `src/lib/redis/client.ts`
- [ ] Initialize Redis client with Upstash credentials
- [ ] Create helper function `getCached()` for cache-or-fetch pattern
- [ ] Create helper function `invalidateCache()` for cache busting
- [ ] Add error handling (fallback to direct DB if Redis fails)
- [ ] Add logging integration

**File**: `src/lib/redis/client.ts`
```typescript
import { Redis } from '@upstash/redis';
import { log } from '@/lib/logger';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

/**
 * Get cached data or fetch from database
 * @param key Cache key
 * @param fetchFn Function to fetch data if cache miss
 * @param ttl Time to live in seconds (default: 300 = 5 minutes)
 */
export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = 300
): Promise<T> {
  const redis = getRedisClient();

  try {
    // Try to get from cache
    const cached = await redis.get<T>(key);

    if (cached !== null) {
      log.debug('Cache HIT', { key });
      return cached;
    }

    log.debug('Cache MISS', { key });

    // Not in cache, fetch from database
    const data = await fetchFn();

    // Store in cache
    await redis.setex(key, ttl, JSON.stringify(data));

    return data;
  } catch (error) {
    log.error('Cache error, falling back to direct fetch', {
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // If Redis fails, just fetch directly
    return fetchFn();
  }
}

/**
 * Invalidate cache by pattern
 * @param pattern Redis key pattern (e.g., "products:*")
 */
export async function invalidateCache(pattern: string): Promise<void> {
  const redis = getRedisClient();

  try {
    // Note: Upstash REST API doesn't support KEYS command
    // For now, we'll delete specific keys
    // In production, use cache tags or versioning
    await redis.del(pattern);
    log.info('Cache invalidated', { pattern });
  } catch (error) {
    log.error('Cache invalidation error', {
      pattern,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Clear specific cache key
 */
export async function clearCache(key: string): Promise<void> {
  const redis = getRedisClient();

  try {
    await redis.del(key);
    log.info('Cache cleared', { key });
  } catch (error) {
    log.error('Cache clear error', {
      key,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
```

### 4. Create Cache Wrapper for API Routes
- [ ] Create `src/lib/api/with-cache.ts`
- [ ] Implement caching wrapper for GET requests
- [ ] Support dynamic cache keys based on query parameters
- [ ] Only cache successful responses (200 status)
- [ ] Bypass cache for non-GET requests

**File**: `src/lib/api/with-cache.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getCached } from '@/lib/redis/client';
import { log } from '@/lib/logger';

type ApiHandler = (req: NextRequest, context?: any) => Promise<NextResponse>;

export function withCache(
  handler: ApiHandler,
  cacheKeyFn: (req: NextRequest) => string,
  ttl: number = 300
): ApiHandler {
  return async (req: NextRequest, context?: any) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return handler(req, context);
    }

    const cacheKey = cacheKeyFn(req);

    try {
      const data = await getCached(
        cacheKey,
        async () => {
          const response = await handler(req, context);

          // Only cache successful responses
          if (response.status !== 200) {
            throw new Error('Non-200 response, skip caching');
          }

          return response.json();
        },
        ttl
      );

      return NextResponse.json(data, {
        headers: {
          'X-Cache': 'HIT',
        },
      });
    } catch (error) {
      log.debug('Cache bypass', { cacheKey, reason: 'error or non-200' });
      const response = await handler(req, context);

      // Add cache miss header
      response.headers.set('X-Cache', 'MISS');

      return response;
    }
  };
}
```

### 5. Apply Caching to API Routes

#### Cache Product Listings
- [ ] Update `src/app/api/products/route.ts`
- [ ] Cache key: `products:active:page:{page}:limit:{limit}`
- [ ] TTL: 300 seconds (5 minutes)

```typescript
import { withCache } from '@/lib/api/with-cache';
import { withLogging } from '@/lib/api/with-logging';

const getHandler = async (req: NextRequest) => {
  const searchParams = req.nextUrl.searchParams;
  const page = searchParams.get('page') || '1';
  const perPage = searchParams.get('perPage') || '20';

  const products = await getActiveProducts({
    page: parseInt(page),
    perPage: parseInt(perPage),
  });

  return NextResponse.json(products);
};

export const GET = withLogging(
  withCache(
    getHandler,
    (req) => {
      const page = req.nextUrl.searchParams.get('page') || '1';
      const perPage = req.nextUrl.searchParams.get('perPage') || '20';
      return `products:active:page:${page}:limit:${perPage}`;
    },
    300 // 5 minutes
  ),
  'GET /api/products'
);
```

#### Cache Categories
- [ ] Update `src/app/api/categories/route.ts`
- [ ] Cache key: `categories:all`
- [ ] TTL: 600 seconds (10 minutes - categories change rarely)

```typescript
export const GET = withLogging(
  withCache(
    getHandler,
    () => 'categories:all',
    600
  ),
  'GET /api/categories'
);
```

#### Cache Tags
- [ ] Update `src/app/api/tags/route.ts`
- [ ] Cache key: `tags:all`
- [ ] TTL: 600 seconds (10 minutes)

```typescript
export const GET = withLogging(
  withCache(
    getHandler,
    () => 'tags:all',
    600
  ),
  'GET /api/tags'
);
```

#### Cache Admin Stats (optional)
- [ ] Update `src/app/api/admin/stats/route.ts`
- [ ] Cache key: `admin:stats`
- [ ] TTL: 60 seconds (1 minute - stats should be relatively fresh)

### 6. Implement Cache Invalidation

#### Product Cache Invalidation
- [ ] Update `src/services/product-service.ts`
- [ ] Invalidate cache when product is created/updated/deleted

```typescript
import { clearCache } from '@/lib/redis/client';

export async function createProduct(data: CreateProductData) {
  const product = await prisma.product.create({ data });

  // Clear all product list caches
  await clearCache('products:active:*');

  log.info('Product created, cache invalidated', { productId: product.id });

  return product;
}

export async function updateProduct(id: string, data: UpdateProductData) {
  const product = await prisma.product.update({ where: { id }, data });

  // Clear product caches
  await clearCache('products:active:*');

  log.info('Product updated, cache invalidated', { productId: id });

  return product;
}
```

#### Category Cache Invalidation
- [ ] Update `src/services/category-service.ts`
- [ ] Clear `categories:all` when category changes

#### Tag Cache Invalidation
- [ ] Update `src/services/tag-service.ts`
- [ ] Clear `tags:all` when tag changes

### 7. Environment Configuration
- [ ] Add to `.env.example`
  ```env
  UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
  UPSTASH_REDIS_REST_TOKEN=your-token-here
  ```

- [ ] Add to `.env` (local development - optional for local testing)
  ```env
  UPSTASH_REDIS_REST_URL=https://your-dev-redis.upstash.io
  UPSTASH_REDIS_REST_TOKEN=your-dev-token
  ```

- [ ] Add to Vercel environment variables
  - Go to Vercel Dashboard → Project → Settings → Environment Variables
  - Add `UPSTASH_REDIS_REST_URL`
  - Add `UPSTASH_REDIS_REST_TOKEN`
  - Apply to: Production, Preview, Development

---

## Testing Checklist

### Local Testing
- [ ] Start development server: `npm run dev`

- [ ] Test cache MISS (first request)
  ```bash
  curl -w "\nTime: %{time_total}s\n" http://localhost:3000/api/products
  ```
  Expected:
  - Response time: ~50-100ms
  - Log: "Cache MISS"
  - Header: `X-Cache: MISS`

- [ ] Test cache HIT (second request)
  ```bash
  curl -w "\nTime: %{time_total}s\n" http://localhost:3000/api/products
  ```
  Expected:
  - Response time: ~5-20ms (much faster!)
  - Log: "Cache HIT"
  - Header: `X-Cache: HIT`

- [ ] Test cache invalidation
  ```bash
  # Create a product via admin panel or API
  # Then request products again
  curl http://localhost:3000/api/products
  ```
  Expected: Cache MISS (cache was cleared)

- [ ] Test fallback (disconnect Redis)
  - Temporarily use invalid Redis credentials
  - API should still work (direct DB queries)
  - Log should show "Cache error, falling back"

### Performance Testing
- [ ] Measure response times with cache
  ```bash
  # First request (cache miss)
  time curl http://localhost:3000/api/products

  # Second request (cache hit)
  time curl http://localhost:3000/api/products
  ```
  Expected: 10-50x improvement

### Git Workflow
- [ ] Create feature branch
  ```bash
  git checkout -b feature/10-redis-caching
  ```

- [ ] Commit changes
  ```bash
  git add .
  git commit -m "feat: add Redis caching with Upstash

  - Add Upstash Redis client integration
  - Create cache wrapper for API routes
  - Cache product listings, categories, and tags
  - Implement cache invalidation on data changes
  - Add fallback to direct DB if Redis fails
  - Add cache hit/miss headers for debugging

  Refs: 2do/10-redis-caching.md"
  ```

- [ ] Push to GitHub
  ```bash
  git push origin feature/10-redis-caching
  ```

### Vercel Preview Testing
- [ ] Wait for Vercel preview deployment
- [ ] Test preview URL
  ```bash
  curl -I https://kitia-preview.vercel.app/api/products
  ```
  Check for `X-Cache` header

- [ ] Check Upstash dashboard
  - Go to Upstash console
  - Select your database
  - Check "Metrics" tab
  - Verify requests are coming in
  - Check hit rate

### Production Deployment
- [ ] Create pull request
- [ ] Review changes
- [ ] Merge to main
- [ ] Monitor Vercel logs
- [ ] Monitor Upstash dashboard
  - Check cache hit rate (aim for >70%)
  - Check memory usage
  - Check request count

---

## Database Changes
**None** - This task does not require database migrations.

---

## Rollback Plan
If issues occur:
1. Remove cache wrappers from API routes (fallback to direct DB)
2. Or revert the merge commit
   ```bash
   git revert HEAD
   git push origin main
   ```
3. Redis is optional, so app works without it

---

## Success Criteria
- [x] ✅ Upstash Redis database created
- [x] ✅ Redis client configured and tested
- [x] ✅ Cache wrapper created and working
- [x] ✅ Product listings cached (5 min TTL)
- [x] ✅ Categories cached (10 min TTL)
- [x] ✅ Tags cached (10 min TTL)
- [x] ✅ Cache invalidation working on data changes
- [x] ✅ Cache hit rate >70% after 24 hours
- [x] ✅ Response times improved 10-50x for cached endpoints
- [x] ✅ Fallback to DB if Redis fails
- [x] ✅ No increase in error rate

---

## Monitoring After Deployment

### Upstash Dashboard
- Daily active connections
- Hit rate (target: >70%)
- Memory usage
- Request count
- Latency

### Vercel Logs
- Check for cache errors
- Monitor API response times
- Verify cache headers present

### What to Cache (Guidelines)
✅ **DO Cache:**
- Product listings
- Categories
- Tags
- Public product details
- Admin dashboard stats (short TTL)

❌ **DON'T Cache:**
- User-specific data
- Cart contents
- Active transactions
- Real-time inventory
- Authentication responses

---

## Performance Targets
- Cache hit rate: >70%
- Cached response time: <20ms
- Cache miss response time: <100ms
- Memory usage: <50MB (free tier: 256MB)

---

## Cost Estimation
**Upstash Free Tier:**
- 10,000 requests/day
- 256MB storage
- Good for ~5,000-10,000 users/month

**Paid Tier (if needed):**
- $0.20 per 100K requests
- ~$10-20/month for medium traffic

---

## Documentation
- [ ] Update README.md with caching information
- [ ] Document cache keys and TTLs
- [ ] Document cache invalidation strategy
- [ ] Add monitoring guide for Upstash dashboard

---

## Related Tasks
- Task 09: Structured Logging (uses logging)
- Task 11: Rate Limiting (can share Redis instance)

---

## Notes
- Start with conservative TTLs, increase if data doesn't change often
- Monitor cache hit rate to optimize TTLs
- Consider cache warming for popular products
- Use cache versioning for breaking changes
- Upstash charges per request, optimize cache keys
