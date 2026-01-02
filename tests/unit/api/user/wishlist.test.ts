import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  getUserWishlist,
  addToWishlist,
  removeFromWishlistByProduct,
} from '@/services/wishlist-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/wishlist-service', () => ({
  getUserWishlist: vi.fn(),
  addToWishlist: vi.fn(),
  removeFromWishlistByProduct: vi.fn(),
}));

vi.mock('@/lib/api/with-logging', () => ({
  withLogging: (fn: Function) => fn,
}));

vi.mock('@/lib/logger', () => ({
  log: {
    error: vi.fn(),
  },
}));

const createRequest = (method: string, body?: unknown) =>
  new NextRequest('http://localhost/api/user/wishlist', {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

describe('/api/user/wishlist', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getUserWishlistMock = vi.mocked(getUserWishlist);
  const addToWishlistMock = vi.mocked(addToWishlist);
  const removeFromWishlistByProductMock = vi.mocked(
    removeFromWishlistByProduct
  );

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getHandlers() {
    const route = await import('@/app/api/user/wishlist/route');
    return route;
  }

  it('GET returns 401 when unauthenticated', async () => {
    const { GET } = await getHandlers();
    getServerSessionMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'برای دسترسی به این صفحه باید وارد شوید',
    });
  });

  it('GET returns wishlist items', async () => {
    const { GET } = await getHandlers();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    getUserWishlistMock.mockResolvedValue([{ id: 'wish-1' }] as any);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([{ id: 'wish-1' }]);
    expect(getUserWishlistMock).toHaveBeenCalledWith('user-1');
  });

  it('POST returns 400 when productId is missing', async () => {
    const { POST } = await getHandlers();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);

    const response = await POST(createRequest('POST', { variantId: 'v1' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'شناسه محصول الزامی است',
    });
  });

  it('POST adds item to wishlist', async () => {
    const { POST } = await getHandlers();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    addToWishlistMock.mockResolvedValue({ id: 'wish-1' } as any);

    const response = await POST(
      createRequest('POST', { productId: 'prod-1', variantId: 'v1' })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ id: 'wish-1' });
    expect(addToWishlistMock).toHaveBeenCalledWith('user-1', 'prod-1', 'v1');
  });

  it('DELETE returns 400 when productId is missing', async () => {
    const { DELETE } = await getHandlers();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);

    const response = await DELETE(createRequest('DELETE', { variantId: 'v1' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'شناسه محصول الزامی است',
    });
  });

  it('DELETE removes item by product', async () => {
    const { DELETE } = await getHandlers();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    removeFromWishlistByProductMock.mockResolvedValue({ success: true } as any);

    const response = await DELETE(
      createRequest('DELETE', { productId: 'prod-1', variantId: 'v1' })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(removeFromWishlistByProductMock).toHaveBeenCalledWith(
      'user-1',
      'prod-1',
      'v1'
    );
  });
});
