import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { log } from '@/lib/logger';

vi.mock('@/lib/logger', () => ({
  log: {
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('observability report APIs', () => {
  const logMock = vi.mocked(log);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  function request(path: string, payload: unknown) {
    return new NextRequest(`http://localhost${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'unit-test-agent',
      },
      body: JSON.stringify(payload),
    });
  }

  it('logs sanitized client error reports with recursive redaction', async () => {
    const { POST } = await import('@/app/api/client-errors/route');

    const response = await POST(
      request('/api/client-errors', {
        message: 'client exploded',
        stack: 'stack-line',
        context: {
          nested: {
            token: 'secret-token',
            email: 'buyer@example.com',
            safeId: 'product-1',
          },
        },
      })
    );

    expect(response.status).toBe(200);
    expect(logMock.error).toHaveBeenCalledWith('Client error reported', {
      report: {
        message: 'client exploded',
        stack: 'stack-line',
        context: {
          nested: {
            token: '[REDACTED]',
            email: '[REDACTED]',
            safeId: 'product-1',
          },
        },
      },
      request: {
        path: '/api/client-errors',
        userAgent: 'unit-test-agent',
      },
    });
  });

  it('logs sanitized fallback warning reports', async () => {
    const { POST } = await import('@/app/api/fallback-warnings/route');

    const response = await POST(
      request('/api/fallback-warnings', {
        name: 'cart-sync-storage-failed',
        primary: 'localStorage cart sync event',
        fallback: 'current tab in-memory cart only',
        authorization: 'Bearer secret',
        context: { eventType: 'add' },
      })
    );

    expect(response.status).toBe(200);
    expect(logMock.warn).toHaveBeenCalledWith(
      'Client fallback warning reported',
      {
        report: {
          name: 'cart-sync-storage-failed',
          primary: 'localStorage cart sync event',
          fallback: 'current tab in-memory cart only',
          authorization: '[REDACTED]',
          context: { eventType: 'add' },
        },
        request: {
          path: '/api/fallback-warnings',
          userAgent: 'unit-test-agent',
        },
      }
    );
  });

  it('rejects non-object report payloads', async () => {
    const { POST } = await import('@/app/api/client-errors/route');

    const response = await POST(request('/api/client-errors', 'bad'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Report payload must be an object',
    });
    expect(logMock.error).not.toHaveBeenCalled();
  });

  it('rejects malformed fallback warnings before logging', async () => {
    const { POST } = await import('@/app/api/fallback-warnings/route');

    const response = await POST(request('/api/fallback-warnings', {}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Missing required report fields: name, primary, fallback',
    });
    expect(logMock.warn).not.toHaveBeenCalled();
  });

  it('rejects oversized report bodies before logging', async () => {
    const { POST } = await import('@/app/api/client-errors/route');
    const response = await POST(
      new NextRequest('http://localhost/api/client-errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'too large',
          context: { value: 'x'.repeat(20_000) },
        }),
      })
    );

    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toEqual({
      error: 'Report payload is too large',
    });
    expect(logMock.error).not.toHaveBeenCalled();
  });
});
