// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react-dom/test-utils';
import { useApiWithRateLimit } from '@/hooks/useApiWithRateLimit';
import { renderHook } from '@utils/hook-utils';

describe('useApiWithRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sets rate limit info on 429 responses', async () => {
    const { result, unmount } = renderHook(() => useApiWithRateLimit());

    const fetchFn = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: 'rate limited',
          retryAfter: 123,
        }),
        { status: 429 }
      )
    );

    await act(async () => {
      const data = await result().fetchWithRateLimit(fetchFn);
      expect(data).toBeNull();
    });

    expect(result().rateLimitInfo).toEqual({
      isRateLimited: true,
      retryAfter: 123,
      error: 'rate limited',
    });

    unmount();
  });

  it('clears rate limit info after successful response', async () => {
    const { result, unmount } = renderHook(() => useApiWithRateLimit());

    const rateLimitedFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ error: 'rate limited', retryAfter: 100 }),
          { status: 429 }
        )
      );

    await act(async () => {
      await result().fetchWithRateLimit(rateLimitedFetch);
    });

    const successFetch = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ ok: true }), { status: 200 })
      );

    await act(async () => {
      const data = await result().fetchWithRateLimit(successFetch);
      expect(data).toEqual({ ok: true });
    });

    expect(result().rateLimitInfo).toEqual({
      isRateLimited: false,
      retryAfter: null,
      error: null,
    });

    unmount();
  });

  it('throws error for non-ok responses', async () => {
    const { result, unmount } = renderHook(() => useApiWithRateLimit());

    const fetchFn = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ error: 'bad' }), { status: 500 })
      );

    await expect(result().fetchWithRateLimit(fetchFn)).rejects.toThrow('bad');

    expect(result().rateLimitInfo.isRateLimited).toBe(false);

    unmount();
  });
});
