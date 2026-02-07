import { describe, it, expect, vi, beforeEach } from 'vitest';

const limitMock = vi.fn();
const RedisMock = vi.fn(function RedisMock() {
  return {};
});
const RatelimitMock = vi.fn(function RatelimitMock() {
  return {
    limit: limitMock,
  };
});
(RatelimitMock as any).slidingWindow = vi.fn(() => 'window');

vi.mock('@upstash/redis', () => ({
  Redis: RedisMock,
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: RatelimitMock,
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('rate-limit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.redis';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
  });

  it('creates client identifiers using user id and endpoint', async () => {
    vi.resetModules();
    const { getClientId } = await import('@/lib/rate-limit');

    const req = new Request('http://localhost', {
      headers: { 'x-user-id': 'user-1' },
    });

    expect(getClientId(req, 'login')).toBe('user:user-1:login');
  });

  it('uses IP address when user id is missing', async () => {
    vi.resetModules();
    const { getClientId } = await import('@/lib/rate-limit');

    const req = new Request('http://localhost', {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
    });

    expect(getClientId(req)).toBe('ip:1.2.3.4');
  });

  it('returns limiter response and preserves failure', async () => {
    limitMock.mockResolvedValue({
      success: false,
      limit: 5,
      remaining: 0,
      reset: 123,
    });

    vi.resetModules();
    const { checkRateLimit } = await import('@/lib/rate-limit');

    const req = new Request('http://localhost');
    const result = await checkRateLimit(req);

    expect(result).toEqual({
      success: false,
      limit: 5,
      remaining: 0,
      reset: 123,
    });
  });

  it('fails open when limiter throws', async () => {
    limitMock.mockRejectedValue(new Error('boom'));

    vi.resetModules();
    const { checkRateLimit } = await import('@/lib/rate-limit');

    const req = new Request('http://localhost');
    const result = await checkRateLimit(req);

    expect(result).toEqual({
      success: true,
      limit: 0,
      remaining: 0,
      reset: 0,
    });
  });
});
