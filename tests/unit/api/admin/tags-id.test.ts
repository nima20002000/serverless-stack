import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getTagById, updateTag, deleteTag } from '@/services/tag-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/tag-service', () => ({
  getTagById: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}));

describe('admin tag detail API', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getTagByIdMock = vi.mocked(getTagById);
  const updateTagMock = vi.mocked(updateTag);
  const deleteTagMock = vi.mocked(deleteTag);

  const adminSession = {
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@example.com',
    },
  };

  const params = { params: Promise.resolve({ id: 't1' }) };

  const createPutRequest = (body: unknown) =>
    new NextRequest('http://localhost/api/admin/tags/t1', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/tags/[id]/route');
    return { GET: handlers.GET, PUT: handlers.PUT, DELETE: handlers.DELETE };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('GET returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { GET } = await loadHandlers();

    const response = await GET(new NextRequest('http://localhost'), params);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(getTagByIdMock).not.toHaveBeenCalled();
  });

  it('GET returns 404 when tag is not found', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getTagByIdMock.mockResolvedValue(null);
    const { GET } = await loadHandlers();

    const response = await GET(new NextRequest('http://localhost'), params);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'Tag not found' });
    expect(getTagByIdMock).toHaveBeenCalledWith('t1');
  });

  it('GET returns tag details', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getTagByIdMock.mockResolvedValue({ id: 't1', name: 'Sale' });
    const { GET } = await loadHandlers();

    const response = await GET(new NextRequest('http://localhost'), params);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      tag: { id: 't1', name: 'Sale' },
    });
  });

  it('PUT updates tag by route id', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    updateTagMock.mockResolvedValue({ id: 't1', name: 'Featured' });
    const { PUT } = await loadHandlers();

    const response = await PUT(createPutRequest({ name: 'Featured' }), params);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      tag: { id: 't1', name: 'Featured' },
    });
    expect(updateTagMock).toHaveBeenCalledWith('t1', { name: 'Featured' });
  });

  it('PUT returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { PUT } = await loadHandlers();

    const response = await PUT(createPutRequest({ name: 'Featured' }), params);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(updateTagMock).not.toHaveBeenCalled();
  });

  it('DELETE deletes tag by route id', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    deleteTagMock.mockResolvedValue({ success: true } as any);
    const { DELETE } = await loadHandlers();

    const response = await DELETE(new NextRequest('http://localhost'), params);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(deleteTagMock).toHaveBeenCalledWith('t1');
  });

  it('DELETE returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { DELETE } = await loadHandlers();

    const response = await DELETE(new NextRequest('http://localhost'), params);

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(deleteTagMock).not.toHaveBeenCalled();
  });

  it('PUT returns 500 when update fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getServerSessionMock.mockResolvedValue(adminSession as any);
    updateTagMock.mockRejectedValue(new Error('slug exists'));
    const { PUT } = await loadHandlers();

    const response = await PUT(createPutRequest({ slug: 'sale' }), params);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'slug exists' });
  });
});
