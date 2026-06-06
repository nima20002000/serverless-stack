import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { storage } from '@/lib/storage';
import { log } from '@/lib/logger';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/lib/storage', () => ({
  storage: {
    list: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('admin R2 browser API', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const storageMock = vi.mocked(storage);
  const logMock = vi.mocked(log);

  const adminSession = {
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@example.com',
    },
  };

  const createGetRequest = (query: Record<string, string> = {}) => {
    const url = new URL('http://localhost/api/admin/r2-browser');
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return new NextRequest(url);
  };

  const createDeleteRequest = (body: unknown) =>
    new NextRequest('http://localhost/api/admin/r2-browser', {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/r2-browser/route');
    return { GET: handlers.GET, DELETE: handlers.DELETE };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('GET returns 403 when session is missing', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { GET } = await loadHandlers();

    const response = await GET(createGetRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(storageMock.list).not.toHaveBeenCalled();
  });

  it('GET returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { GET } = await loadHandlers();

    const response = await GET(createGetRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(storageMock.list).not.toHaveBeenCalled();
  });

  it('GET lists objects with parsed browser parameters for admins', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    storageMock.list.mockResolvedValue({
      success: true,
      objects: [
        {
          key: 'products/images/p1.jpg',
          size: 1234,
          lastModified: new Date('2024-01-02T03:04:05.000Z'),
          url: 'https://cdn.example.com/products/images/p1.jpg',
          contentType: 'image/jpeg',
        },
      ],
      prefixes: ['products/images/nested/'],
      nextContinuationToken: 'next-page',
      isTruncated: true,
    });
    const { GET } = await loadHandlers();

    const response = await GET(
      createGetRequest({
        prefix: 'products/images/',
        delimiter: '/',
        maxKeys: '80',
        continuationToken: 'page-1',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      objects: [
        {
          key: 'products/images/p1.jpg',
          size: 1234,
          lastModified: '2024-01-02T03:04:05.000Z',
          url: 'https://cdn.example.com/products/images/p1.jpg',
          contentType: 'image/jpeg',
        },
      ],
      prefixes: ['products/images/nested/'],
      nextContinuationToken: 'next-page',
      isTruncated: true,
    });
    expect(storageMock.list).toHaveBeenCalledWith({
      prefix: 'products/images/',
      delimiter: '/',
      maxKeys: 80,
      continuationToken: 'page-1',
    });
    expect(logMock.info).toHaveBeenCalledWith('R2 browser list successful', {
      prefix: 'products/images/',
      count: 1,
      isTruncated: true,
    });
  });

  it.each(['', '0', '-1', '1.5', 'abc', '1001'])(
    'GET rejects invalid maxKeys value %s before listing storage',
    async (maxKeys) => {
      getServerSessionMock.mockResolvedValue(adminSession as any);
      const { GET } = await loadHandlers();

      const response = await GET(createGetRequest({ maxKeys }));

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: 'maxKeys must be an integer between 1 and 1000',
      });
      expect(storageMock.list).not.toHaveBeenCalled();
    }
  );

  it('GET returns storage failure details and logs the failed prefix', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    storageMock.list.mockResolvedValue({
      success: false,
      error: 'R2 list failed',
    });
    const { GET } = await loadHandlers();

    const response = await GET(
      createGetRequest({ prefix: 'products/images/' })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'R2 list failed',
    });
    expect(logMock.error).toHaveBeenCalledWith('R2 browser list failed', {
      error: 'R2 list failed',
      prefix: 'products/images/',
    });
  });

  it('DELETE returns 403 when session is missing', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { DELETE } = await loadHandlers();

    const response = await DELETE(
      createDeleteRequest({ path: 'products/images/p1.jpg' })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(storageMock.delete).not.toHaveBeenCalled();
  });

  it('DELETE returns 400 when path is missing', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { DELETE } = await loadHandlers();

    const response = await DELETE(createDeleteRequest({}));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'File key is required',
    });
    expect(storageMock.delete).not.toHaveBeenCalled();
  });

  it('DELETE deletes the requested object for admins', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    storageMock.delete.mockResolvedValue({ success: true });
    const { DELETE } = await loadHandlers();

    const response = await DELETE(
      createDeleteRequest({ path: 'products/images/p1.jpg' })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(storageMock.delete).toHaveBeenCalledWith('products/images/p1.jpg');
    expect(logMock.info).toHaveBeenCalledWith('R2 browser delete successful', {
      path: 'products/images/p1.jpg',
    });
  });

  it('DELETE returns storage failure details and logs the failed path', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    storageMock.delete.mockResolvedValue({
      success: false,
      error: 'R2 delete failed',
    });
    const { DELETE } = await loadHandlers();

    const response = await DELETE(
      createDeleteRequest({ path: 'products/images/p1.jpg' })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'R2 delete failed',
    });
    expect(logMock.error).toHaveBeenCalledWith('R2 browser delete failed', {
      error: 'R2 delete failed',
      path: 'products/images/p1.jpg',
    });
  });
});
