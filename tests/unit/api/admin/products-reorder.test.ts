import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { reorderProducts } from '@/services/product-service';
import { log } from '@/lib/logger';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/product-service', () => ({
  reorderProducts: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('POST /api/admin/products/reorder', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const reorderProductsMock = vi.mocked(reorderProducts);
  const logMock = vi.mocked(log);

  const adminSession = {
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@example.com',
    },
  };

  const createPostRequest = (body: unknown) =>
    new NextRequest('http://localhost/api/admin/products/reorder', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/products/reorder/route');
    return { POST: handlers.POST };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'USER' },
    } as any);
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ productOrders: [{ id: 'p1', displayOrder: 1 }] })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(reorderProductsMock).not.toHaveBeenCalled();
  });

  it('returns 400 when product order payload is not an array', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(createPostRequest({ productOrders: null }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Product order payload is invalid',
    });
    expect(reorderProductsMock).not.toHaveBeenCalled();
  });

  it('returns 400 when any order item is invalid', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ productOrders: [{ id: 'p1' }] })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Product order payload is invalid',
    });
    expect(reorderProductsMock).not.toHaveBeenCalled();
  });

  it('reorders products and logs the admin action', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    reorderProductsMock.mockResolvedValue(undefined);
    const { POST } = await loadHandlers();
    const productOrders = [
      { id: 'p1', displayOrder: 1 },
      { id: 'p2', displayOrder: 2 },
    ];

    const response = await POST(createPostRequest({ productOrders }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Products reordered successfully',
    });
    expect(reorderProductsMock).toHaveBeenCalledWith(productOrders);
    expect(logMock.info).toHaveBeenCalledWith('Products reordered via API', {
      adminId: 'admin-1',
      count: 2,
    });
  });

  it('returns 500 when reorder service rejects', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    reorderProductsMock.mockRejectedValue(new Error('reorder failed'));
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ productOrders: [{ id: 'p1', displayOrder: 1 }] })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Unable to update products',
    });
    expect(logMock.error).toHaveBeenCalledWith('Failed to reorder products', {
      error: 'reorder failed',
    });
  });
});
