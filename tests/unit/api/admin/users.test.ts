import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAllUsers } from '@/services/admin-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/admin-service', () => ({
  getAllUsers: vi.fn(),
}));

describe('admin users API', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getAllUsersMock = vi.mocked(getAllUsers);

  const adminSession = {
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@kitia.ir',
    },
  };

  const createRequest = (query: Record<string, string> = {}) => {
    const url = new URL('http://localhost/api/admin/users');
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return new NextRequest(url);
  };

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/users/route');
    return { GET: handlers.GET };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('GET returns 403 when session is missing', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { GET } = await loadHandlers();

    const response = await GET(createRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'دسترسی غیرمجاز' });
    expect(getAllUsersMock).not.toHaveBeenCalled();
  });

  it('GET returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { GET } = await loadHandlers();

    const response = await GET(createRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'دسترسی غیرمجاز' });
    expect(getAllUsersMock).not.toHaveBeenCalled();
  });

  it('GET returns paginated users with parsed filters', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getAllUsersMock.mockResolvedValue({
      data: [{ id: 'u1', email: 'user@kitia.ir' }],
      total: 1,
      page: 2,
      perPage: 10,
      totalPages: 1,
    });
    const { GET } = await loadHandlers();

    const response = await GET(
      createRequest({
        page: '2',
        limit: '10',
        search: 'sara',
        role: 'USER',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [{ id: 'u1', email: 'user@kitia.ir' }],
      total: 1,
      page: 2,
      perPage: 10,
      totalPages: 1,
    });
    expect(getAllUsersMock).toHaveBeenCalledWith(2, 10, 'sara', 'USER');
  });

  it('GET returns 500 when service throws', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getAllUsersMock.mockRejectedValue(new Error('db down'));
    const { GET } = await loadHandlers();

    const response = await GET(createRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'db down' });
  });
});
