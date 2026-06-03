import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getUserTransactions } from '@/services/user-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/user-service', () => ({
  getUserTransactions: vi.fn(),
}));

vi.mock('@/lib/api/with-logging', () => ({
  withLogging: (fn: Function) => fn,
}));

const createRequest = (url: string) => new NextRequest(url);

describe('GET /api/user/transactions', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getUserTransactionsMock = vi.mocked(getUserTransactions);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getHandler() {
    const { GET } = await import('@/app/api/user/transactions/route');
    return GET;
  }

  it('returns 401 when user is not authenticated', async () => {
    const GET = await getHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await GET(
      createRequest('http://localhost/api/user/transactions')
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Sign in to continue.',
    });
  });

  it('uses default pagination when query params are missing', async () => {
    const GET = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    getUserTransactionsMock.mockResolvedValue({ items: [], total: 0 } as any);

    const response = await GET(
      createRequest('http://localhost/api/user/transactions')
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ items: [], total: 0 });
    expect(getUserTransactionsMock).toHaveBeenCalledWith('user-1', {
      limit: 10,
      offset: 0,
    });
  });

  it('passes status, limit, and offset to the service', async () => {
    const GET = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    getUserTransactionsMock.mockResolvedValue({
      items: [{ id: 'tx-1' }],
      total: 1,
    } as any);

    const response = await GET(
      createRequest(
        'http://localhost/api/user/transactions?limit=5&offset=10&status=COMPLETED'
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      items: [{ id: 'tx-1' }],
      total: 1,
    });
    expect(getUserTransactionsMock).toHaveBeenCalledWith('user-1', {
      limit: 5,
      offset: 10,
      status: 'COMPLETED',
    });
  });
});
