import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAllCategories, createCategory } from '@/services/category-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/category-service', () => ({
  getAllCategories: vi.fn(),
  createCategory: vi.fn(),
}));

describe('admin categories API', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getAllCategoriesMock = vi.mocked(getAllCategories);
  const createCategoryMock = vi.mocked(createCategory);

  const adminSession = {
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@example.com',
    },
  };

  const createPostRequest = (body: unknown) =>
    new NextRequest('http://localhost/api/admin/categories', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/categories/route');
    return { GET: handlers.GET, POST: handlers.POST };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('GET returns 403 when session is missing', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { GET } = await loadHandlers();

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(getAllCategoriesMock).not.toHaveBeenCalled();
  });

  it('GET returns categories for admins', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getAllCategoriesMock.mockResolvedValue([{ id: 'c1', name: 'Chairs' }]);
    const { GET } = await loadHandlers();

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      categories: [{ id: 'c1', name: 'Chairs' }],
    });
    expect(getAllCategoriesMock).toHaveBeenCalled();
  });

  it('POST returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ name: 'Chairs', slug: 'chairs' })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(createCategoryMock).not.toHaveBeenCalled();
  });

  it('POST returns 400 when name or slug is missing', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(createPostRequest({ name: 'Chairs' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Name and slug are required',
    });
    expect(createCategoryMock).not.toHaveBeenCalled();
  });

  it('POST creates a category and defaults isActive to true', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    createCategoryMock.mockResolvedValue({
      id: 'c1',
      name: 'Chairs',
      slug: 'chairs',
      isActive: true,
    });
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({
        name: 'Chairs',
        slug: 'chairs',
        description: 'Seating',
        image: '/chairs.jpg',
        parentId: 'parent-1',
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      category: {
        id: 'c1',
        name: 'Chairs',
        slug: 'chairs',
        isActive: true,
      },
    });
    expect(createCategoryMock).toHaveBeenCalledWith({
      name: 'Chairs',
      slug: 'chairs',
      description: 'Seating',
      image: '/chairs.jpg',
      parentId: 'parent-1',
      isActive: true,
    });
  });

  it('POST returns 500 when creation fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getServerSessionMock.mockResolvedValue(adminSession as any);
    createCategoryMock.mockRejectedValue(new Error('slug exists'));
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ name: 'Chairs', slug: 'chairs' })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'slug exists' });
  });
});
