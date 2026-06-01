import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { getWishlistProductIds } from '@/services/wishlist-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/wishlist-service', () => ({
  getWishlistProductIds: vi.fn(),
}));

vi.mock('@/lib/api/with-logging', () => ({
  withLogging: (fn: Function) => fn,
}));

vi.mock('@/lib/logger', () => ({
  log: {
    error: vi.fn(),
  },
}));

describe('/api/user/wishlist/check', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getWishlistProductIdsMock = vi.mocked(getWishlistProductIds);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getHandlers() {
    const route = await import('@/app/api/user/wishlist/check/route');
    return route;
  }

  it('GET returns 401 when unauthenticated', async () => {
    const { GET } = await getHandlers();
    getServerSessionMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Authentication is required',
    });
  });

  it('GET returns wishlist product ids', async () => {
    const { GET } = await getHandlers();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    getWishlistProductIdsMock.mockResolvedValue(new Set(['prod-1', 'prod-2']));

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      productIds: ['prod-1', 'prod-2'],
    });
  });

  it('POST returns wishlist product ids', async () => {
    const { POST } = await getHandlers();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    getWishlistProductIdsMock.mockResolvedValue(new Set(['prod-9']));

    const response = await POST({} as any);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      productIds: ['prod-9'],
    });
  });
});
