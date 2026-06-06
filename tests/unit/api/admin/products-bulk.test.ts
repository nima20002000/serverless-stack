import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  bulkDeleteProducts,
  bulkUpdateProducts,
} from '@/services/product-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/product-service', () => ({
  bulkDeleteProducts: vi.fn(),
  bulkUpdateProducts: vi.fn(),
}));

describe('POST /api/admin/products/bulk', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const bulkDeleteProductsMock = vi.mocked(bulkDeleteProducts);
  const bulkUpdateProductsMock = vi.mocked(bulkUpdateProducts);

  const adminSession = {
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@example.com',
    },
  };

  const createPostRequest = (body: unknown) =>
    new NextRequest('http://localhost/api/admin/products/bulk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/products/bulk/route');
    return { POST: handlers.POST };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 403 when session is missing', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { POST } = await loadHandlers();

    const response = await POST(createPostRequest({ action: 'delete' }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(bulkDeleteProductsMock).not.toHaveBeenCalled();
  });

  it('returns 400 for unknown bulk action', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(createPostRequest({ action: 'archive' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid IDs' });
    expect(bulkDeleteProductsMock).not.toHaveBeenCalled();
    expect(bulkUpdateProductsMock).not.toHaveBeenCalled();
  });

  it('returns 400 when delete product IDs are missing', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ action: 'delete', productIds: [] })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Product IDs are required',
    });
    expect(bulkDeleteProductsMock).not.toHaveBeenCalled();
  });

  it('deletes products in bulk', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    bulkDeleteProductsMock.mockResolvedValue({ count: 2 });
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ action: 'delete', productIds: ['p1', 'p2'] })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: '2 Product deleted successfully',
      count: 2,
    });
    expect(bulkDeleteProductsMock).toHaveBeenCalledWith(['p1', 'p2']);
  });

  it('returns 400 when delete service rejects', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    bulkDeleteProductsMock.mockRejectedValue(new Error('delete failed'));
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ action: 'delete', productIds: ['p1'] })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'delete failed' });
  });

  it('returns 400 when update payload is empty', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ action: 'update', productIds: ['p1'], updates: {} })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid update action',
    });
    expect(bulkUpdateProductsMock).not.toHaveBeenCalled();
  });

  it('updates products in bulk', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    bulkUpdateProductsMock.mockResolvedValue({ count: 2 });
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({
        action: 'update',
        productIds: ['p1', 'p2'],
        updates: { isActive: false, stock: 0 },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: '2 Product updated successfully',
      count: 2,
    });
    expect(bulkUpdateProductsMock).toHaveBeenCalledWith(['p1', 'p2'], {
      isActive: false,
      stock: 0,
    });
  });
});
