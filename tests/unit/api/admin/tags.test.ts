import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAllTags, createTag } from '@/services/tag-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/tag-service', () => ({
  getAllTags: vi.fn(),
  createTag: vi.fn(),
}));

describe('admin tags API', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getAllTagsMock = vi.mocked(getAllTags);
  const createTagMock = vi.mocked(createTag);

  const adminSession = {
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@example.com',
    },
  };

  const createPostRequest = (body: unknown) =>
    new NextRequest('http://localhost/api/admin/tags', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/tags/route');
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
    expect(getAllTagsMock).not.toHaveBeenCalled();
  });

  it('GET returns tags for admins', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getAllTagsMock.mockResolvedValue([{ id: 't1', name: 'Sale' }]);
    const { GET } = await loadHandlers();

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      tags: [{ id: 't1', name: 'Sale' }],
    });
    expect(getAllTagsMock).toHaveBeenCalled();
  });

  it('POST returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ name: 'Sale', slug: 'sale' })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(createTagMock).not.toHaveBeenCalled();
  });

  it('POST returns 400 when name or slug is missing', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(createPostRequest({ name: 'Sale' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Name and slug are required',
    });
    expect(createTagMock).not.toHaveBeenCalled();
  });

  it('POST creates a tag', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    createTagMock.mockResolvedValue({ id: 't1', name: 'Sale', slug: 'sale' });
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ name: 'Sale', slug: 'sale' })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      tag: { id: 't1', name: 'Sale', slug: 'sale' },
    });
    expect(createTagMock).toHaveBeenCalledWith({ name: 'Sale', slug: 'sale' });
  });

  it('POST returns 500 when creation fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getServerSessionMock.mockResolvedValue(adminSession as any);
    createTagMock.mockRejectedValue(new Error('slug exists'));
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ name: 'Sale', slug: 'sale' })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'slug exists' });
  });
});
