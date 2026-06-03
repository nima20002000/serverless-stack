import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withRateLimit } from '@/lib/api/with-rate-limit';
import { checkRateLimit } from '@/lib/rate-limit';

vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: vi.fn(),
  apiLimiter: {},
}));

describe('withRateLimit', () => {
  const checkRateLimitMock = vi.mocked(checkRateLimit);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns 429 with retry headers when rate limit exceeded', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const reset = Date.now() + 6500;
    checkRateLimitMock.mockResolvedValue({
      success: false,
      limit: 10,
      remaining: 0,
      reset,
    });

    const handler = vi.fn();
    const wrapped = withRateLimit(handler);
    const req = new NextRequest('http://localhost/api/test');

    const response = await wrapped(req);
    const body = await response.json();

    expect(response.status).toBe(429);
    expect(body.error).toBe('Too many requests. Please wait before trying again.');
    expect(body.retryAfter).toBe(reset);
    expect(handler).not.toHaveBeenCalled();
    expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(response.headers.get('X-RateLimit-Reset')).toBe(reset.toString());
    expect(response.headers.get('Retry-After')).toBe('7');
  });

  it('adds rate limit headers to successful responses', async () => {
    const reset = Date.now() + 10000;
    checkRateLimitMock.mockResolvedValue({
      success: true,
      limit: 20,
      remaining: 15,
      reset,
    });

    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: true }, { status: 200 }));
    const wrapped = withRateLimit(handler);
    const req = new NextRequest('http://localhost/api/test');

    const response = await wrapped(req);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(response.headers.get('X-RateLimit-Limit')).toBe('20');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('15');
    expect(response.headers.get('X-RateLimit-Reset')).toBe(reset.toString());
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
