import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  getUserById,
  updateUserRole,
  deleteUser,
} from '@/services/admin-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/admin-service', () => ({
  getUserById: vi.fn(),
  updateUserRole: vi.fn(),
  deleteUser: vi.fn(),
}));

describe('admin user detail API', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getUserByIdMock = vi.mocked(getUserById);
  const updateUserRoleMock = vi.mocked(updateUserRole);
  const deleteUserMock = vi.mocked(deleteUser);

  const adminSession = {
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@kitia.ir',
    },
  };

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/users/[id]/route');
    return { GET: handlers.GET, PUT: handlers.PUT, DELETE: handlers.DELETE };
  };

  const createPutRequest = (body: unknown) =>
    new NextRequest('http://localhost/api/admin/users/u2', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('GET returns 403 when session is missing', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { GET } = await loadHandlers();

    const response = await GET(new NextRequest('http://localhost'), {
      params: { id: 'u1' },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'دسترسی غیرمجاز' });
    expect(getUserByIdMock).not.toHaveBeenCalled();
  });

  it('GET returns serialized user details', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getUserByIdMock.mockResolvedValue({
      id: 'u1',
      email: 'user@kitia.ir',
      transactions: [
        {
          id: 't1',
          transactionCode: 'TX-1',
          amount: '1200',
          status: 'COMPLETED',
          createdAt: '2024-01-01',
        },
      ],
      promoCodes: [
        {
          id: 'p1',
          code: 'PROMO',
          expiresAt: '2024-02-01',
          isUsed: false,
        },
      ],
    });
    const { GET } = await loadHandlers();

    const response = await GET(new NextRequest('http://localhost'), {
      params: { id: 'u1' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      user: {
        id: 'u1',
        email: 'user@kitia.ir',
        _count: { transactions: 1, promoCodes: 1 },
        transactions: [
          {
            id: 't1',
            transactionCode: 'TX-1',
            amount: 1200,
            status: 'COMPLETED',
            createdAt: '2024-01-01',
          },
        ],
        promoCodes: [
          {
            id: 'p1',
            code: 'PROMO',
            expiresAt: '2024-02-01',
            isUsed: false,
          },
        ],
      },
    });
    expect(getUserByIdMock).toHaveBeenCalledWith('u1');
  });

  it('GET returns 500 when service throws', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getUserByIdMock.mockRejectedValue(new Error('not found'));
    const { GET } = await loadHandlers();

    const response = await GET(new NextRequest('http://localhost'), {
      params: { id: 'u1' },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'not found' });
  });

  it('PUT returns 403 when session is missing', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { PUT } = await loadHandlers();

    const response = await PUT(createPutRequest({ role: 'ADMIN' }), {
      params: { id: 'u2' },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'دسترسی غیرمجاز' });
    expect(updateUserRoleMock).not.toHaveBeenCalled();
  });

  it('PUT forbids changing own role', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { PUT } = await loadHandlers();

    const response = await PUT(createPutRequest({ role: 'USER' }), {
      params: { id: 'admin-1' },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'نمی‌توانید نقش خود را تغییر دهید',
    });
    expect(updateUserRoleMock).not.toHaveBeenCalled();
  });

  it('PUT returns 400 for invalid role', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { PUT } = await loadHandlers();

    const response = await PUT(createPutRequest({ role: 'SUPERUSER' }), {
      params: { id: 'u2' },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'نقش کاربری نامعتبر است',
    });
    expect(updateUserRoleMock).not.toHaveBeenCalled();
  });

  it('PUT updates user role for admin', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    updateUserRoleMock.mockResolvedValue({ id: 'u2', role: 'ADMIN' });
    const { PUT } = await loadHandlers();

    const response = await PUT(createPutRequest({ role: 'ADMIN' }), {
      params: { id: 'u2' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ id: 'u2', role: 'ADMIN' });
    expect(updateUserRoleMock).toHaveBeenCalledWith('u2', 'ADMIN');
  });

  it('PUT returns 500 when update fails', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    updateUserRoleMock.mockRejectedValue(new Error('update failed'));
    const { PUT } = await loadHandlers();

    const response = await PUT(createPutRequest({ role: 'USER' }), {
      params: { id: 'u2' },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'update failed' });
  });

  it('DELETE returns 403 when session is missing', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { DELETE } = await loadHandlers();

    const response = await DELETE(new NextRequest('http://localhost'), {
      params: { id: 'u2' },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'دسترسی غیرمجاز' });
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('DELETE forbids deleting own account', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { DELETE } = await loadHandlers();

    const response = await DELETE(new NextRequest('http://localhost'), {
      params: { id: 'admin-1' },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'نمی‌توانید حساب کاربری خود را حذف کنید',
    });
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it('DELETE removes user account', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    deleteUserMock.mockResolvedValue();
    const { DELETE } = await loadHandlers();

    const response = await DELETE(new NextRequest('http://localhost'), {
      params: { id: 'u2' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(deleteUserMock).toHaveBeenCalledWith('u2');
  });

  it('DELETE returns 500 when delete fails', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    deleteUserMock.mockRejectedValue(new Error('delete failed'));
    const { DELETE } = await loadHandlers();

    const response = await DELETE(new NextRequest('http://localhost'), {
      params: { id: 'u2' },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'delete failed' });
  });
});
