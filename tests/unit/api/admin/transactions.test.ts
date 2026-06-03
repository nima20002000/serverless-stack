import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAllTransactions } from '@/services/admin-service';
import { log } from '@/lib/logger';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/admin-service', () => ({
  getAllTransactions: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('admin transactions API', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getAllTransactionsMock = vi.mocked(getAllTransactions);
  const logMock = vi.mocked(log);

  const adminSession = {
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@example.com',
    },
  };

  const createRequest = (query: Record<string, string> = {}) => {
    const url = new URL('http://localhost/api/admin/transactions');
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return new NextRequest(url);
  };

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/transactions/route');
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
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(getAllTransactionsMock).not.toHaveBeenCalled();
  });

  it('GET returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { GET } = await loadHandlers();

    const response = await GET(createRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(getAllTransactionsMock).not.toHaveBeenCalled();
  });

  it('GET returns transactions with parsed filters', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getAllTransactionsMock.mockResolvedValue({
      data: [{ id: 't1' }],
      total: 1,
      page: 1,
      perPage: 20,
    });
    const { GET } = await loadHandlers();

    const response = await GET(
      createRequest({
        page: '2',
        limit: '50',
        status: 'COMPLETED',
        search: 'KT-123',
        dateFrom: '2024-01-01',
        dateTo: '2024-02-01',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [{ id: 't1' }],
      total: 1,
      page: 1,
      perPage: 20,
    });
    expect(getAllTransactionsMock).toHaveBeenCalledWith(
      2,
      50,
      'COMPLETED',
      'KT-123',
      '2024-01-01',
      '2024-02-01'
    );
    expect(logMock.info).toHaveBeenCalledWith('Admin transactions fetched', {
      count: 1,
      total: 1,
    });
  });

  it('GET returns 500 when service throws', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getAllTransactionsMock.mockRejectedValue(new Error('db down'));
    const { GET } = await loadHandlers();

    const response = await GET(createRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'db down' });
    expect(logMock.error).toHaveBeenCalledWith('Error fetching transactions', {
      error: expect.any(Error),
    });
  });
});
