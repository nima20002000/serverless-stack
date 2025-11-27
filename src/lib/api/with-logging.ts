import { NextRequest, NextResponse } from 'next/server';
import { log } from '@/lib/logger';

type ApiHandler = (req: NextRequest, context?: unknown) => Promise<NextResponse>;

export function withLogging(handler: ApiHandler, routeName: string): ApiHandler {
  return async (req: NextRequest, context?: unknown) => {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    log.info('API Request Started', {
      requestId,
      route: routeName,
      method: req.method,
      url: req.url,
      userAgent: req.headers.get('user-agent'),
    });

    try {
      const response = await handler(req, context);

      log.info('API Request Completed', {
        requestId,
        route: routeName,
        method: req.method,
        status: response.status,
        duration: `${Date.now() - startTime}ms`,
      });

      return response;
    } catch (error) {
      log.error('API Request Failed', {
        requestId,
        route: routeName,
        method: req.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        duration: `${Date.now() - startTime}ms`,
      });

      throw error;
    }
  };
}
