import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getTransactionById } from '@/services/admin-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/admin-service', () => ({
  getTransactionById: vi.fn(),
}));

describe('admin transaction detail API', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getTransactionByIdMock = vi.mocked(getTransactionById);

  const adminSession = {
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@kitia.ir',
    },
  };

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/transactions/[id]/route');
    return { GET: handlers.GET };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('GET returns 403 when session is missing', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { GET } = await loadHandlers();

    const response = await GET(new NextRequest('http://localhost'), {
      params: { id: 't1' },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'دسترسی غیرمجاز' });
    expect(getTransactionByIdMock).not.toHaveBeenCalled();
  });

  it('GET returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { GET } = await loadHandlers();

    const response = await GET(new NextRequest('http://localhost'), {
      params: { id: 't1' },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'دسترسی غیرمجاز' });
    expect(getTransactionByIdMock).not.toHaveBeenCalled();
  });

  it('GET returns transaction details for admin', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getTransactionByIdMock.mockResolvedValue({ id: 't1', status: 'COMPLETED' });
    const { GET } = await loadHandlers();

    const response = await GET(new NextRequest('http://localhost'), {
      params: { id: 't1' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: 't1',
      status: 'COMPLETED',
    });
    expect(getTransactionByIdMock).toHaveBeenCalledWith('t1');
  });

  it('GET returns 500 when service throws', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getTransactionByIdMock.mockRejectedValue(new Error('missing'));
    const { GET } = await loadHandlers();

    const response = await GET(new NextRequest('http://localhost'), {
      params: { id: 't1' },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'missing' });
  });
});
