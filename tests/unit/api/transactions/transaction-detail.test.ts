import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getTransactionById } from '@/services/transaction-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/transaction-service', () => ({
  getTransactionById: vi.fn(),
}));

describe('GET /api/transactions/[id]', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getTransactionByIdMock = vi.mocked(getTransactionById);

  const createRequest = () =>
    new NextRequest('http://localhost/api/transactions/tx-1');

  const loadHandler = async () => {
    const { GET } = await import('@/app/api/transactions/[id]/route');
    return GET;
  };

  const params = (id: string) => ({
    params: Promise.resolve({ id }),
  });

  const transaction = {
    id: 'tx-1',
    userId: 'user-1',
    transactionCode: 'TX-001',
    status: 'COMPLETED',
    paymentMethod: 'STRIPE',
    amount: '42.50',
    items: [
      {
        id: 'item-1',
        price: '12.25',
        quantity: 2,
        product: {
          id: 'product-1',
          name: 'Travel mug',
          price: '20.00',
        },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 400 for missing or overlong ids before checking auth', async () => {
    const GET = await loadHandler();

    const missingIdResponse = await GET(createRequest(), params(''));
    const longIdResponse = await GET(createRequest(), params('x'.repeat(65)));

    expect(missingIdResponse.status).toBe(400);
    expect(longIdResponse.status).toBe(400);
    await expect(missingIdResponse.json()).resolves.toEqual({
      error: 'Invalid transaction id.',
    });
    await expect(longIdResponse.json()).resolves.toEqual({
      error: 'Invalid transaction id.',
    });
    expect(getServerSessionMock).not.toHaveBeenCalled();
    expect(getTransactionByIdMock).not.toHaveBeenCalled();
  });

  it('returns 401 when the user is not signed in', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const GET = await loadHandler();

    const response = await GET(createRequest(), params('tx-1'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Sign in to view this transaction.',
    });
    expect(getTransactionByIdMock).not.toHaveBeenCalled();
  });

  it('returns serialized transaction details for the owning user', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'USER' },
    } as any);
    getTransactionByIdMock.mockResolvedValue(transaction as any);
    const GET = await loadHandler();

    const response = await GET(createRequest(), params('tx-1'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      transaction: {
        ...transaction,
        amount: 42.5,
        items: [
          {
            ...transaction.items[0],
            price: 12.25,
            product: {
              ...transaction.items[0].product,
              price: 20,
            },
          },
        ],
      },
    });
    expect(getTransactionByIdMock).toHaveBeenCalledWith('tx-1');
  });

  it('allows admins to view transactions owned by another user', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'admin-1', role: 'ADMIN' },
    } as any);
    getTransactionByIdMock.mockResolvedValue(transaction as any);
    const GET = await loadHandler();

    const response = await GET(createRequest(), params('tx-1'));

    expect(response.status).toBe(200);
    expect((await response.json()).transaction.userId).toBe('user-1');
  });

  it('returns 403 when a signed-in user does not own the transaction', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-2', role: 'USER' },
    } as any);
    getTransactionByIdMock.mockResolvedValue(transaction as any);
    const GET = await loadHandler();

    const response = await GET(createRequest(), params('tx-1'));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'You do not have access to this transaction.',
    });
  });

  it('returns 404 and logs when the transaction service fails', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1', role: 'USER' },
    } as any);
    getTransactionByIdMock.mockRejectedValue(
      new Error('Transaction not found')
    );
    const GET = await loadHandler();

    const response = await GET(createRequest(), params('missing-tx'));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'Transaction not found',
    });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching transaction:',
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();
  });
});
