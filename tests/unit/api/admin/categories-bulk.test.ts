import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  bulkDeleteCategories,
  bulkUpdateCategories,
} from '@/services/category-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/category-service', () => ({
  bulkDeleteCategories: vi.fn(),
  bulkUpdateCategories: vi.fn(),
}));

describe('POST /api/admin/categories/bulk', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const bulkDeleteCategoriesMock = vi.mocked(bulkDeleteCategories);
  const bulkUpdateCategoriesMock = vi.mocked(bulkUpdateCategories);

  const adminSession = {
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@example.com',
    },
  };

  const createPostRequest = (body: unknown) =>
    new NextRequest('http://localhost/api/admin/categories/bulk', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/categories/bulk/route');
    return { POST: handlers.POST };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { POST } = await loadHandlers();

    const response = await POST(createPostRequest({ action: 'delete' }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(bulkDeleteCategoriesMock).not.toHaveBeenCalled();
  });

  it('returns 400 for unknown bulk action', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(createPostRequest({ action: 'archive' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Invalid IDs' });
  });

  it('returns 400 when delete category IDs are missing', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ action: 'delete', categoryIds: [] })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Category IDs are required',
    });
    expect(bulkDeleteCategoriesMock).not.toHaveBeenCalled();
  });

  it('deletes categories in bulk', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    bulkDeleteCategoriesMock.mockResolvedValue({ count: 2 });
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ action: 'delete', categoryIds: ['c1', 'c2'] })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: '2 categories deleted successfully',
      count: 2,
    });
    expect(bulkDeleteCategoriesMock).toHaveBeenCalledWith(['c1', 'c2']);
  });

  it('returns 400 when update payload is empty', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ action: 'update', categoryIds: ['c1'], updates: {} })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid update action',
    });
    expect(bulkUpdateCategoriesMock).not.toHaveBeenCalled();
  });

  it('updates categories in bulk', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    bulkUpdateCategoriesMock.mockResolvedValue({ count: 2 });
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({
        action: 'update',
        categoryIds: ['c1', 'c2'],
        updates: { isActive: false },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: '2 Categories updated successfully',
      count: 2,
    });
    expect(bulkUpdateCategoriesMock).toHaveBeenCalledWith(['c1', 'c2'], {
      isActive: false,
    });
  });

  it('returns 400 when update service rejects', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    bulkUpdateCategoriesMock.mockRejectedValue(new Error('update failed'));
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({
        action: 'update',
        categoryIds: ['c1'],
        updates: { isActive: true },
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'update failed' });
  });
});
