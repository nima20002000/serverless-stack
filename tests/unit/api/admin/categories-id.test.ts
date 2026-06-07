import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  getCategoryById,
  updateCategory,
  deleteCategory,
} from '@/services/category-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/category-service', () => ({
  getCategoryById: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}));

describe('admin category detail API', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getCategoryByIdMock = vi.mocked(getCategoryById);
  const updateCategoryMock = vi.mocked(updateCategory);
  const deleteCategoryMock = vi.mocked(deleteCategory);

  const adminSession = {
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@example.com',
    },
  };

  const params = { params: Promise.resolve({ id: 'c1' }) };

  const createPutRequest = (body: unknown) =>
    new NextRequest('http://localhost/api/admin/categories/c1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/categories/[id]/route');
    return { GET: handlers.GET, PUT: handlers.PUT, DELETE: handlers.DELETE };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('GET returns 403 when session is missing', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { GET } = await loadHandlers();

    const response = await GET(new NextRequest('http://localhost'), params);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(getCategoryByIdMock).not.toHaveBeenCalled();
  });

  it('GET returns 404 when category is not found', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getCategoryByIdMock.mockResolvedValue(null);
    const { GET } = await loadHandlers();

    const response = await GET(new NextRequest('http://localhost'), params);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'Category not found',
    });
    expect(getCategoryByIdMock).toHaveBeenCalledWith('c1');
  });

  it('GET returns category details', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getCategoryByIdMock.mockResolvedValue({ id: 'c1', name: 'Chairs' });
    const { GET } = await loadHandlers();

    const response = await GET(new NextRequest('http://localhost'), params);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      category: { id: 'c1', name: 'Chairs' },
    });
  });

  it('PUT updates category by route id', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    updateCategoryMock.mockResolvedValue({ id: 'c1', name: 'Updated' });
    const { PUT } = await loadHandlers();

    const response = await PUT(createPutRequest({ name: 'Updated' }), params);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      category: { id: 'c1', name: 'Updated' },
    });
    expect(updateCategoryMock).toHaveBeenCalledWith('c1', { name: 'Updated' });
  });

  it('PUT returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { PUT } = await loadHandlers();

    const response = await PUT(createPutRequest({ name: 'Updated' }), params);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(updateCategoryMock).not.toHaveBeenCalled();
  });

  it('DELETE deletes category by route id', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    deleteCategoryMock.mockResolvedValue({ success: true } as any);
    const { DELETE } = await loadHandlers();

    const response = await DELETE(new NextRequest('http://localhost'), params);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(deleteCategoryMock).toHaveBeenCalledWith('c1');
  });

  it('DELETE returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { DELETE } = await loadHandlers();

    const response = await DELETE(new NextRequest('http://localhost'), params);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(deleteCategoryMock).not.toHaveBeenCalled();
  });

  it('DELETE returns 500 when deletion fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getServerSessionMock.mockResolvedValue(adminSession as any);
    deleteCategoryMock.mockRejectedValue(new Error('category in use'));
    const { DELETE } = await loadHandlers();

    const response = await DELETE(new NextRequest('http://localhost'), params);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'category in use',
    });
  });
});
