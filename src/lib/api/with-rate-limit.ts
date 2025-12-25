import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, apiLimiter } from '@/lib/rate-limit';
import type { Ratelimit } from '@upstash/ratelimit';

type ApiHandler = (
  req: NextRequest,
  context?: unknown
) => Promise<NextResponse>;

export function withRateLimit(
  handler: ApiHandler,
  limiter: Ratelimit = apiLimiter
): ApiHandler {
  return async (req: NextRequest, context?: unknown) => {
    const { success, limit, remaining, reset } = await checkRateLimit(
      req,
      limiter
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

    // Call handler
    const response = await handler(req, context);

    // Add rate limit headers to successful responses
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());

    return response;
  };
}
