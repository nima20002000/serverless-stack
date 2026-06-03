import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { removeFromWishlist } from '@/services/wishlist-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/wishlist-service', () => ({
  removeFromWishlist: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DELETE /api/user/wishlist/[id]', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const removeFromWishlistMock = vi.mocked(removeFromWishlist);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getHandler() {
    const { DELETE } = await import('@/app/api/user/wishlist/[id]/route');
    return DELETE;
  }

  it('returns 401 when unauthenticated', async () => {
    const DELETE = await getHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await DELETE(new NextRequest('http://localhost'), {
      params: Promise.resolve({ id: 'wish-1' }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Authentication is required',
    });
  });

  it('returns 400 when id is missing', async () => {
    const DELETE = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);

    const response = await DELETE(new NextRequest('http://localhost'), {
      params: Promise.resolve({ id: '' }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'ID is required',
    });
  });

  it('removes wishlist item by id', async () => {
    const DELETE = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    removeFromWishlistMock.mockResolvedValue({ success: true } as any);

    const response = await DELETE(new NextRequest('http://localhost'), {
      params: Promise.resolve({ id: 'wish-1' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(removeFromWishlistMock).toHaveBeenCalledWith('user-1', 'wish-1');
  });
});
