import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { mergeWishlist, getUserWishlist } from '@/services/wishlist-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/wishlist-service', () => ({
  mergeWishlist: vi.fn(),
  getUserWishlist: vi.fn(),
}));

vi.mock('@/lib/api/with-logging', () => ({
  withLogging: (fn: Function) => fn,
}));

vi.mock('@/lib/logger', () => ({
  log: {
    error: vi.fn(),
  },
}));

const createRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/user/wishlist/merge', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/user/wishlist/merge', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const mergeWishlistMock = vi.mocked(mergeWishlist);
  const getUserWishlistMock = vi.mocked(getUserWishlist);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getHandler() {
    const { POST } = await import('@/app/api/user/wishlist/merge/route');
    return POST;
  }

  it('returns 401 when unauthenticated', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await POST(createRequest({ items: [] }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'برای دسترسی به این صفحه باید وارد شوید',
    });
  });

  it('returns 400 when items are invalid', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);

    const response = await POST(createRequest({ items: 'not-array' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'لیست محصولات نامعتبر است',
    });
  });

  it('returns existing wishlist when no valid items', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    getUserWishlistMock.mockResolvedValue([{ id: 'wish-1' }] as any);

    const response = await POST(
      createRequest({ items: [{ productId: 123 }, null, { variantId: 'v1' }] })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      merged: { added: 0, skipped: 0 },
      wishlist: [{ id: 'wish-1' }],
    });
    expect(mergeWishlistMock).not.toHaveBeenCalled();
  });

  it('merges sanitized items and returns wishlist', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    mergeWishlistMock.mockResolvedValue({ added: 2, skipped: 0 } as any);
    getUserWishlistMock.mockResolvedValue([{ id: 'wish-2' }] as any);

    const response = await POST(
      createRequest({
        items: [
          { productId: 'prod-1', variantId: 'v1' },
          { productId: 'prod-2' },
        ],
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      merged: { added: 2, skipped: 0 },
      wishlist: [{ id: 'wish-2' }],
    });
    expect(mergeWishlistMock).toHaveBeenCalledWith('user-1', [
      { productId: 'prod-1', variantId: 'v1' },
      { productId: 'prod-2', variantId: null },
    ]);
  });
});
