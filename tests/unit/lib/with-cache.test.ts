import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withCache } from '@/lib/api/with-cache';
import { getCached } from '@/lib/redis/client';

vi.mock('@/lib/redis/client', () => ({
  getCached: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('withCache', () => {
  const getCachedMock = vi.mocked(getCached);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bypasses cache for non-GET requests', async () => {
    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: true }, { status: 200 }));
    const wrapped = withCache(handler, () => 'cache:key');
    const req = new NextRequest('http://localhost/api/test', {
      method: 'POST',
    });

    const response = await wrapped(req);

    expect(getCachedMock).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(response.headers.get('X-Cache')).toBeNull();
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('returns cached data with HIT header when cache resolves', async () => {
    getCachedMock.mockResolvedValue({ cached: true });

    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: false }, { status: 200 }));
    const wrapped = withCache(handler, () => 'cache:key', 120);
    const req = new NextRequest('http://localhost/api/test');

    const response = await wrapped(req);

    expect(getCachedMock).toHaveBeenCalledWith(
      'cache:key',
      expect.any(Function),
      120
    );
    expect(handler).not.toHaveBeenCalled();
    expect(response.headers.get('X-Cache')).toBe('HIT');
    await expect(response.json()).resolves.toEqual({ cached: true });
  });

  it('returns MISS header when cache lookup fails', async () => {
    getCachedMock.mockRejectedValue(new Error('redis down'));

    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: true }, { status: 200 }));
    const wrapped = withCache(handler, () => 'cache:key');
    const req = new NextRequest('http://localhost/api/test');

    const response = await wrapped(req);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(response.headers.get('X-Cache')).toBe('MISS');
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('skips caching non-200 responses and falls back to handler', async () => {
    getCachedMock.mockImplementation(async (_key, fetcher) => fetcher());

    const handler = vi
      .fn()
      .mockResolvedValueOnce(
        NextResponse.json({ error: 'bad' }, { status: 500 })
      )
      .mockResolvedValueOnce(NextResponse.json({ ok: true }, { status: 200 }));
    const wrapped = withCache(handler, () => 'cache:key');
    const req = new NextRequest('http://localhost/api/test');

    const response = await wrapped(req);

    expect(handler).toHaveBeenCalledTimes(2);
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Cache')).toBe('MISS');
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
