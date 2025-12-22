import { NextRequest, NextResponse } from 'next/server';
import { getCached } from '@/lib/redis/client';
import { log } from '@/lib/logger';

type ApiHandler = (
  req: NextRequest,
  context?: unknown
) => Promise<NextResponse>;

export function withCache(
  handler: ApiHandler,
  cacheKeyFn: (req: NextRequest) => string,
  ttl: number = 300
): ApiHandler {
  return async (req: NextRequest, context?: unknown) => {
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

          const responseData = await response.json();
          return responseData;
        },
        ttl
      );

      return NextResponse.json(data, {
        headers: {
          'X-Cache': 'HIT',
        },
      });
    } catch (error) {
      log.debug('Cache bypass', {
        cacheKey,
        reason: error instanceof Error ? error.message : 'error or non-200',
      });
      const response = await handler(req, context);

      // Add cache miss header
      response.headers.set('X-Cache', 'MISS');

      return response;
    }
  };
}
