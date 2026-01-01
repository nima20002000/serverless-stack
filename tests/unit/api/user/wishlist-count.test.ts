import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { getWishlistCount } from '@/services/wishlist-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/wishlist-service', () => ({
  getWishlistCount: vi.fn(),
}));

vi.mock('@/lib/api/with-logging', () => ({
  withLogging: (fn: Function) => fn,
}));

vi.mock('@/lib/logger', () => ({
  log: {
    error: vi.fn(),
  },
}));

describe('/api/user/wishlist/count', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getWishlistCountMock = vi.mocked(getWishlistCount);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getHandler() {
    const { GET } = await import('@/app/api/user/wishlist/count/route');
    return GET;
  }

  it('returns 401 when unauthenticated', async () => {
    const GET = await getHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'برای دسترسی به این صفحه باید وارد شوید',
    });
  });

  it('returns count when authenticated', async () => {
    const GET = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    getWishlistCountMock.mockResolvedValue(3);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ count: 3 });
    expect(getWishlistCountMock).toHaveBeenCalledWith('user-1');
  });
});
