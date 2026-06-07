// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetObservabilityForTests,
  reportClientError,
  reportFallbackWarning,
} from '@/lib/observability/client';

describe('observability client helper', () => {
  beforeEach(() => {
    __resetObservabilityForTests();
    vi.restoreAllMocks();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}')))
    );
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: undefined,
    });
  });

  it('sends client error reports without throwing', () => {
    window.history.pushState({}, '', '/reset-password?token=secret#fragment');

    reportClientError({
      name: 'TypeError',
      message: 'button failed',
      stack: 'stack',
      source: 'unit',
    });

    expect(fetch).toHaveBeenCalledWith(
      '/api/client-errors',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
      })
    );
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      name: 'TypeError',
      message: 'button failed',
      source: 'unit',
      url: `${window.location.origin}/reset-password`,
      path: '/reset-password',
    });
    expect(body.url).not.toContain('token=secret');
    expect(body.url).not.toContain('fragment');
  });

  it('dedupes repeated fallback warnings inside the throttle window', () => {
    const warning = {
      name: 'cart-sync-storage-failed',
      primary: 'localStorage cart sync event',
      fallback: 'current tab in-memory cart only',
      reason: 'QuotaExceededError',
    };

    reportFallbackWarning(warning);
    reportFallbackWarning(warning);

    expect(fetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body).toMatchObject(warning);
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('/api/fallback-warnings');
  });

  it('swallows reporting transport failures', () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('network down')))
    );

    expect(() =>
      reportFallbackWarning({
        name: 'version-check-failed',
        primary: 'fetch /api/version',
        fallback: 'continue with current loaded bundle',
      })
    ).not.toThrow();
  });

  it('swallows non-serializable report payloads before transport', () => {
    expect(() =>
      reportClientError({
        message: 'bad context',
        context: { value: BigInt(1) },
      })
    ).not.toThrow();

    expect(fetch).not.toHaveBeenCalled();
  });
});
