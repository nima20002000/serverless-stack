import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as adminService from '@/services/admin-service';
import { createClient } from '@/lib/supabase/server';
import { createSupabaseMock, createQueryMock } from '../helpers/supabase-mock';

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('admin-service', () => {
  const createClientMock = vi.mocked(createClient);
  type SupabaseMockWithRpc = ReturnType<typeof createSupabaseMock> & {
    rpc: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns paginated users with aggregated counts and filters', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const usersQuery = createQueryMock({
      data: [
        {
          id: 'u1',
          uid: 'UID-2',
          email: 'a@example.com',
          phone: null,
          name: 'Ali',
          role: 'ADMIN',
          createdAt: '2024-01-02',
        },
        {
          id: 'u2',
          uid: 'UID-1',
          email: 'b@example.com',
          phone: '+1202555',
          name: 'Sara',
          role: 'USER',
          createdAt: '2024-01-01',
        },
      ],
      error: null,
      count: 22,
    });
    const transactionsQuery = createQueryMock({
      data: [{ userId: 'u1' }, { userId: 'u1' }, { userId: 'u2' }],
      error: null,
    });
    const promoQuery = createQueryMock({
      data: [{ userId: 'u2' }],
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(usersQuery)
      .mockReturnValueOnce(transactionsQuery)
      .mockReturnValueOnce(promoQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getAllUsers(2, 10, 'ali', 'ADMIN');

    expect(usersQuery.or).toHaveBeenCalledWith(
      'name.ilike.%ali%,email.ilike.%ali%'
    );
    expect(usersQuery.eq).toHaveBeenCalledWith('role', 'ADMIN');
    expect(usersQuery.order).toHaveBeenCalledWith('uid', { ascending: false });
    expect(usersQuery.order).toHaveBeenCalledWith('createdAt', {
      ascending: false,
    });
    expect(usersQuery.range).toHaveBeenCalledWith(10, 19);
    expect(transactionsQuery.in).toHaveBeenCalledWith('userId', ['u1', 'u2']);
    expect(promoQuery.in).toHaveBeenCalledWith('userId', ['u1', 'u2']);

    expect(result).toEqual({
      data: [
        {
          id: 'u1',
          uid: 'UID-2',
          email: 'a@example.com',
          phone: null,
          name: 'Ali',
          role: 'ADMIN',
          createdAt: '2024-01-02',
          _count: { transactions: 2, promoCodes: 0 },
        },
        {
          id: 'u2',
          uid: 'UID-1',
          email: 'b@example.com',
          phone: '+1202555',
          name: 'Sara',
          role: 'USER',
          createdAt: '2024-01-01',
          _count: { transactions: 1, promoCodes: 1 },
        },
      ],
      total: 22,
      page: 2,
      perPage: 10,
      totalPages: 3,
    });
  });

  it('throws when fetching users fails', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const usersQuery = createQueryMock({
      data: null,
      error: { message: 'fail' },
      count: null,
    });
    supabase.from.mockReturnValueOnce(usersQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(adminService.getAllUsers()).rejects.toThrow(
      'Unable to load users'
    );
  });

  // ============ getAllUsers - Edge Cases ============

  it('returns all users when search is empty string', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const usersQuery = createQueryMock({
      data: [
        {
          id: 'u1',
          uid: 'UID-1',
          email: 'a@example.com',
          phone: null,
          name: 'Ali',
          role: 'USER',
          createdAt: '2024-01-01',
        },
      ],
      error: null,
      count: 1,
    });
    const transactionsQuery = createQueryMock({ data: [], error: null });
    const promoQuery = createQueryMock({ data: [], error: null });

    supabase.from
      .mockReturnValueOnce(usersQuery)
      .mockReturnValueOnce(transactionsQuery)
      .mockReturnValueOnce(promoQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await adminService.getAllUsers(1, 20, '', undefined);

    expect(usersQuery.or).not.toHaveBeenCalled();
  });

  it('ignores invalid role filter', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const usersQuery = createQueryMock({
      data: [
        {
          id: 'u1',
          uid: 'UID-1',
          email: 'a@example.com',
          phone: null,
          name: 'Ali',
          role: 'USER',
          createdAt: '2024-01-01',
        },
      ],
      error: null,
      count: 1,
    });
    const transactionsQuery = createQueryMock({ data: [], error: null });
    const promoQuery = createQueryMock({ data: [], error: null });

    supabase.from
      .mockReturnValueOnce(usersQuery)
      .mockReturnValueOnce(transactionsQuery)
      .mockReturnValueOnce(promoQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await adminService.getAllUsers(1, 20, undefined, 'SUPERUSER');

    expect(usersQuery.eq).not.toHaveBeenCalledWith('role', 'SUPERUSER');
  });

  it('uses correct offset for first page', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const usersQuery = createQueryMock({
      data: [
        {
          id: 'u1',
          uid: 'UID-1',
          email: 'a@example.com',
          phone: null,
          name: 'Ali',
          role: 'USER',
          createdAt: '2024-01-01',
        },
      ],
      error: null,
      count: 1,
    });
    const transactionsQuery = createQueryMock({ data: [], error: null });
    const promoQuery = createQueryMock({ data: [], error: null });

    supabase.from
      .mockReturnValueOnce(usersQuery)
      .mockReturnValueOnce(transactionsQuery)
      .mockReturnValueOnce(promoQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await adminService.getAllUsers(1, 20);

    expect(usersQuery.range).toHaveBeenCalledWith(0, 19);
  });

  it('returns empty data when page exceeds total', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const usersQuery = createQueryMock({
      data: [],
      error: null,
      count: 5,
    });
    const transactionsQuery = createQueryMock({ data: [], error: null });
    const promoQuery = createQueryMock({ data: [], error: null });

    supabase.from
      .mockReturnValueOnce(usersQuery)
      .mockReturnValueOnce(transactionsQuery)
      .mockReturnValueOnce(promoQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getAllUsers(10, 20);

    expect(result).toEqual({
      data: [],
      total: 5,
      page: 10,
      perPage: 20,
      totalPages: 1,
    });
  });

  it('handles users with zero counts correctly', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const usersQuery = createQueryMock({
      data: [
        {
          id: 'u1',
          uid: 'UID-1',
          email: 'a@example.com',
          phone: null,
          name: 'Ali',
          role: 'USER',
          createdAt: '2024-01-01',
        },
        {
          id: 'u2',
          uid: 'UID-2',
          email: 'b@example.com',
          phone: null,
          name: 'Sara',
          role: 'USER',
          createdAt: '2024-01-02',
        },
      ],
      error: null,
      count: 2,
    });
    const transactionsQuery = createQueryMock({ data: [], error: null });
    const promoQuery = createQueryMock({ data: [], error: null });

    supabase.from
      .mockReturnValueOnce(usersQuery)
      .mockReturnValueOnce(transactionsQuery)
      .mockReturnValueOnce(promoQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getAllUsers();

    expect(result.data[0]._count).toEqual({ transactions: 0, promoCodes: 0 });
    expect(result.data[1]._count).toEqual({ transactions: 0, promoCodes: 0 });
  });

  it('handles search with special characters in query', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const usersQuery = createQueryMock({
      data: [],
      error: null,
      count: 0,
    });
    const transactionsQuery = createQueryMock({ data: [], error: null });
    const promoQuery = createQueryMock({ data: [], error: null });

    supabase.from
      .mockReturnValueOnce(usersQuery)
      .mockReturnValueOnce(transactionsQuery)
      .mockReturnValueOnce(promoQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await adminService.getAllUsers(1, 20, "ali%test'or");

    expect(usersQuery.or).toHaveBeenCalledWith(
      "name.ilike.%ali%test'or%,email.ilike.%ali%test'or%"
    );
  });

  it('returns user details with transactions and promo codes', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const userQuery = createQueryMock({
      data: {
        id: 'u1',
        uid: 'UID-1',
        email: 'a@example.com',
        phone: null,
        name: 'Ali',
        role: 'USER',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      },
      error: null,
    });
    const transactionsQuery = createQueryMock({
      data: [
        {
          id: 't1',
          transactionCode: 'T1',
          amount: 100,
          status: 'COMPLETED',
          createdAt: '2024-01-03',
          items: [
            {
              id: 'i1',
              quantity: 1,
              price: 100,
              product: { id: 'p1', name: 'Product' },
            },
          ],
        },
      ],
      error: null,
    });
    const promoQuery = createQueryMock({
      data: [
        {
          id: 'pc1',
          code: 'PROMO',
          isUsed: false,
          expiresAt: '2024-02-01',
          createdAt: '2024-01-10',
        },
      ],
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(userQuery)
      .mockReturnValueOnce(transactionsQuery)
      .mockReturnValueOnce(promoQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getUserById('u1');

    expect(result).toEqual({
      id: 'u1',
      uid: 'UID-1',
      email: 'a@example.com',
      phone: null,
      name: 'Ali',
      role: 'USER',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
      transactions: [
        {
          id: 't1',
          transactionCode: 'T1',
          amount: 100,
          status: 'COMPLETED',
          createdAt: '2024-01-03',
          items: [
            {
              id: 'i1',
              quantity: 1,
              price: 100,
              product: { id: 'p1', name: 'Product' },
            },
          ],
        },
      ],
      promoCodes: [
        {
          id: 'pc1',
          code: 'PROMO',
          isUsed: false,
          expiresAt: '2024-02-01',
          createdAt: '2024-01-10',
        },
      ],
    });
    expect(transactionsQuery.eq).toHaveBeenCalledWith('userId', 'u1');
    expect(transactionsQuery.order).toHaveBeenCalledWith('createdAt', {
      ascending: false,
    });
    expect(transactionsQuery.limit).toHaveBeenCalledWith(10);
  });

  it('throws when user is not found', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const userQuery = createQueryMock({
      data: null,
      error: { message: 'not found' },
    });
    supabase.from.mockReturnValueOnce(userQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(adminService.getUserById('u1')).rejects.toThrow(
      'User not found'
    );
  });

  // ============ getUserById - Edge Cases ============

  it('returns user with empty transactions array', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const userQuery = createQueryMock({
      data: {
        id: 'u1',
        uid: 'UID-1',
        email: 'a@example.com',
        phone: null,
        name: 'Ali',
        role: 'USER',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      },
      error: null,
    });
    const transactionsQuery = createQueryMock({ data: [], error: null });
    const promoQuery = createQueryMock({ data: [], error: null });

    supabase.from
      .mockReturnValueOnce(userQuery)
      .mockReturnValueOnce(transactionsQuery)
      .mockReturnValueOnce(promoQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getUserById('u1');

    expect(result.transactions).toEqual([]);
    expect(result.promoCodes).toEqual([]);
  });

  it('returns user even when transactions query fails', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const userQuery = createQueryMock({
      data: {
        id: 'u1',
        uid: 'UID-1',
        email: 'a@example.com',
        phone: null,
        name: 'Ali',
        role: 'USER',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      },
      error: null,
    });
    const transactionsQuery = createQueryMock({
      data: null,
      error: { message: 'transaction fetch failed' },
    });
    const promoQuery = createQueryMock({
      data: null,
      error: { message: 'promo fetch failed' },
    });

    supabase.from
      .mockReturnValueOnce(userQuery)
      .mockReturnValueOnce(transactionsQuery)
      .mockReturnValueOnce(promoQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getUserById('u1');

    expect(result.id).toBe('u1');
    expect(result.transactions).toEqual([]);
    expect(result.promoCodes).toEqual([]);
  });

  it('updates user role', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const updateQuery = createQueryMock({
      data: {
        id: 'u1',
        uid: 'UID-1',
        email: 'a@example.com',
        phone: null,
        name: 'Ali',
        role: 'ADMIN',
      },
      error: null,
    });
    supabase.from.mockReturnValueOnce(updateQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.updateUserRole('u1', 'ADMIN');

    expect(updateQuery.update).toHaveBeenCalledWith({ role: 'ADMIN' });
    expect(result.role).toBe('ADMIN');
  });

  it('refuses to delete admin users', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const fetchQuery = createQueryMock({
      data: { id: 'u1', role: 'ADMIN' },
      error: null,
    });
    supabase.from.mockReturnValueOnce(fetchQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(adminService.deleteUser('u1')).rejects.toThrow(
      'Admin users cannot be deleted'
    );
  });

  it('deletes non-admin users', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const fetchQuery = createQueryMock({
      data: { id: 'u1', role: 'USER' },
      error: null,
    });
    const deleteQuery = createQueryMock({
      data: null,
      error: null,
    });
    supabase.from
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(deleteQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.deleteUser('u1');

    expect(deleteQuery.delete).toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });

  // ============ deleteUser - Edge Cases ============

  it('throws error when user does not exist', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const fetchQuery = createQueryMock({
      data: null,
      error: null,
    });
    supabase.from.mockReturnValueOnce(fetchQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(adminService.deleteUser('nonexistent')).rejects.toThrow(
      'User not found'
    );
  });

  it('deletes user and cascade deletes related records', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const fetchQuery = createQueryMock({
      data: { id: 'u1', role: 'USER' },
      error: null,
    });
    const deleteQuery = createQueryMock({
      data: null,
      error: null,
    });
    supabase.from
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(deleteQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.deleteUser('u1');

    expect(fetchQuery.eq).toHaveBeenCalledWith('id', 'u1');
    expect(deleteQuery.delete).toHaveBeenCalled();
    expect(deleteQuery.eq).toHaveBeenCalledWith('id', 'u1');
    expect(result).toEqual({ success: true });
  });

  it('bulk deletes only user accounts', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const fetchQuery = createQueryMock({
      data: [{ id: 'u1' }, { id: 'u2' }],
      error: null,
    });
    const deleteQuery = createQueryMock({
      data: null,
      error: null,
      count: 2,
    });
    supabase.from
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(deleteQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.bulkDeleteUsers(['u1', 'u2', 'u3']);

    expect(fetchQuery.in).toHaveBeenCalledWith('id', ['u1', 'u2', 'u3']);
    expect(fetchQuery.eq).toHaveBeenCalledWith('role', 'USER');
    expect(deleteQuery.delete).toHaveBeenCalledWith({ count: 'exact' });
    expect(deleteQuery.in).toHaveBeenCalledWith('id', ['u1', 'u2']);
    expect(result).toEqual({ count: 2 });
  });

  it('returns zero when no users match bulk delete', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const fetchQuery = createQueryMock({
      data: [],
      error: null,
    });
    supabase.from.mockReturnValueOnce(fetchQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.bulkDeleteUsers(['u1']);

    expect(result).toEqual({ count: 0 });
  });

  // ============ bulkDeleteUsers - Edge Cases ============

  it('returns zero count when given empty array', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const fetchQuery = createQueryMock({
      data: [],
      error: null,
    });
    supabase.from.mockReturnValueOnce(fetchQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.bulkDeleteUsers([]);

    expect(result).toEqual({ count: 0 });
  });

  it('returns zero when all provided IDs are admin users', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const fetchQuery = createQueryMock({
      data: [],
      error: null,
    });
    supabase.from.mockReturnValueOnce(fetchQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.bulkDeleteUsers(['admin1', 'admin2']);

    expect(fetchQuery.in).toHaveBeenCalledWith('id', ['admin1', 'admin2']);
    expect(fetchQuery.eq).toHaveBeenCalledWith('role', 'USER');
    expect(result).toEqual({ count: 0 });
  });

  it('bulk updates users', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const updateQuery = createQueryMock({
      data: [{ id: 'u1' }, { id: 'u2' }],
      error: null,
    });
    supabase.from.mockReturnValueOnce(updateQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.bulkUpdateUsers(['u1', 'u2'], {
      role: 'ADMIN',
    });

    expect(updateQuery.update).toHaveBeenCalledWith({ role: 'ADMIN' });
    expect(updateQuery.in).toHaveBeenCalledWith('id', ['u1', 'u2']);
    expect(result).toEqual({ count: 2 });
  });

  it('returns filtered transactions with normalized invoices', async () => {
    const supabase = createSupabaseMock();
    const transactionsQuery = createQueryMock({
      data: [
        {
          id: 't1',
          transactionCode: 'TX-1',
          amount: 100,
          status: 'COMPLETED',
          invoice: [
            {
              id: 'inv-1',
              transactionId: 't1',
              invoiceNumber: 'I-1',
              generatedAt: '2024-01-01',
            },
          ],
        },
        {
          id: 't2',
          transactionCode: 'TX-2',
          amount: 200,
          status: 'PENDING',
          invoice: null,
        },
      ],
      error: null,
      count: 2,
    });
    supabase.from.mockReturnValueOnce(transactionsQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const dateFrom = '2024-05-01T00:00:00.000Z';
    const dateTo = '2024-05-10T00:00:00.000Z';
    const expectedEnd = new Date(dateTo);
    expectedEnd.setDate(expectedEnd.getDate() + 1);

    const result = await adminService.getAllTransactions(
      1,
      20,
      'COMPLETED',
      'TX',
      dateFrom,
      dateTo
    );

    expect(transactionsQuery.eq).toHaveBeenCalledWith('status', 'COMPLETED');
    expect(transactionsQuery.or).toHaveBeenCalledWith(
      'transactionCode.ilike.%TX%,fullName.ilike.%TX%,email.ilike.%TX%,phone.ilike.%TX%'
    );
    expect(transactionsQuery.gte).toHaveBeenCalledWith(
      'createdAt',
      new Date(dateFrom).toISOString()
    );
    expect(transactionsQuery.lt).toHaveBeenCalledWith(
      'createdAt',
      expectedEnd.toISOString()
    );

    expect(result.data).toEqual([
      {
        id: 't1',
        transactionCode: 'TX-1',
        amount: 100,
        status: 'COMPLETED',
        invoice: {
          id: 'inv-1',
          transactionId: 't1',
          invoiceNumber: 'I-1',
          generatedAt: '2024-01-01',
        },
      },
      {
        id: 't2',
        transactionCode: 'TX-2',
        amount: 200,
        status: 'PENDING',
        invoice: null,
      },
    ]);
    expect(result.total).toBe(2);
  });

  it('throws when transaction is not found', async () => {
    const supabase = createSupabaseMock();
    const txQuery = createQueryMock({
      data: null,
      error: { message: 'missing' },
    });
    supabase.from.mockReturnValueOnce(txQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(adminService.getTransactionById('t1')).rejects.toThrow(
      'Transaction not found'
    );
  });

  // ============ getAllTransactions - Edge Cases ============

  it('includes full day when dateFrom equals dateTo', async () => {
    const supabase = createSupabaseMock();
    const transactionsQuery = createQueryMock({
      data: [],
      error: null,
      count: 0,
    });
    supabase.from.mockReturnValueOnce(transactionsQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const dateFrom = '2024-05-15';
    const dateTo = '2024-05-15';
    const expectedEnd = new Date(dateTo);
    expectedEnd.setDate(expectedEnd.getDate() + 1);

    await adminService.getAllTransactions(
      1,
      20,
      undefined,
      undefined,
      dateFrom,
      dateTo
    );

    expect(transactionsQuery.gte).toHaveBeenCalledWith(
      'createdAt',
      new Date(dateFrom).toISOString()
    );
    expect(transactionsQuery.lt).toHaveBeenCalledWith(
      'createdAt',
      expectedEnd.toISOString()
    );
  });

  it('filters from date when only dateFrom is provided', async () => {
    const supabase = createSupabaseMock();
    const transactionsQuery = createQueryMock({
      data: [],
      error: null,
      count: 0,
    });
    supabase.from.mockReturnValueOnce(transactionsQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await adminService.getAllTransactions(
      1,
      20,
      undefined,
      undefined,
      '2024-05-01',
      undefined
    );

    expect(transactionsQuery.gte).toHaveBeenCalledWith(
      'createdAt',
      new Date('2024-05-01').toISOString()
    );
    expect(transactionsQuery.lt).not.toHaveBeenCalled();
  });

  it('filters to date when only dateTo is provided', async () => {
    const supabase = createSupabaseMock();
    const transactionsQuery = createQueryMock({
      data: [],
      error: null,
      count: 0,
    });
    supabase.from.mockReturnValueOnce(transactionsQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const dateTo = '2024-05-31';
    const expectedEnd = new Date(dateTo);
    expectedEnd.setDate(expectedEnd.getDate() + 1);

    await adminService.getAllTransactions(
      1,
      20,
      undefined,
      undefined,
      undefined,
      dateTo
    );

    expect(transactionsQuery.gte).not.toHaveBeenCalled();
    expect(transactionsQuery.lt).toHaveBeenCalledWith(
      'createdAt',
      expectedEnd.toISOString()
    );
  });

  it('searches across transactionCode, fullName, email, phone', async () => {
    const supabase = createSupabaseMock();
    const transactionsQuery = createQueryMock({
      data: [],
      error: null,
      count: 0,
    });
    supabase.from.mockReturnValueOnce(transactionsQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await adminService.getAllTransactions(1, 20, undefined, 'KT-123');

    expect(transactionsQuery.or).toHaveBeenCalledWith(
      'transactionCode.ilike.%KT-123%,fullName.ilike.%KT-123%,email.ilike.%KT-123%,phone.ilike.%KT-123%'
    );
  });

  it('normalizes null invoice correctly', async () => {
    const supabase = createSupabaseMock();
    const transactionsQuery = createQueryMock({
      data: [
        {
          id: 't1',
          transactionCode: 'TX-1',
          amount: 100,
          status: 'PENDING',
          invoice: null,
        },
      ],
      error: null,
      count: 1,
    });
    supabase.from.mockReturnValueOnce(transactionsQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getAllTransactions();

    expect(result.data[0].invoice).toBeNull();
  });

  it('normalizes empty invoice array to null', async () => {
    const supabase = createSupabaseMock();
    const transactionsQuery = createQueryMock({
      data: [
        {
          id: 't1',
          transactionCode: 'TX-1',
          amount: 100,
          status: 'PENDING',
          invoice: [],
        },
      ],
      error: null,
      count: 1,
    });
    supabase.from.mockReturnValueOnce(transactionsQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getAllTransactions();

    expect(result.data[0].invoice).toBeNull();
  });

  // ============ getTransactionById - Edge Cases ============

  it('returns transaction with user, items, and invoice', async () => {
    const supabase = createSupabaseMock();
    const txQuery = createQueryMock({
      data: {
        id: 't1',
        transactionCode: 'TX-1',
        amount: 100,
        status: 'COMPLETED',
        createdAt: '2024-05-01',
        user: {
          id: 'u1',
          uid: 'UID-1',
          name: 'Ali',
          email: 'ali@test.com',
          phone: '+12025554567',
        },
        items: [
          {
            id: 'i1',
            transactionId: 't1',
            productId: 'p1',
            variantId: null,
            quantity: 2,
            price: 50,
            product: { id: 'p1', name: 'Product 1' },
            variant: null,
          },
        ],
        invoice: [
          {
            id: 'inv-1',
            transactionId: 't1',
            invoiceNumber: 'INV-001',
            generatedAt: '2024-05-01',
          },
        ],
      },
      error: null,
    });
    supabase.from.mockReturnValueOnce(txQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getTransactionById('t1');

    expect(result.id).toBe('t1');
    expect(result.user).toEqual({
      id: 'u1',
      uid: 'UID-1',
      name: 'Ali',
      email: 'ali@test.com',
      phone: '+12025554567',
    });
    expect(result.items).toHaveLength(1);
    expect(result.invoice).toEqual({
      id: 'inv-1',
      transactionId: 't1',
      invoiceNumber: 'INV-001',
      generatedAt: '2024-05-01',
    });
  });

  it('returns transaction with null user for guest orders', async () => {
    const supabase = createSupabaseMock();
    const txQuery = createQueryMock({
      data: {
        id: 't1',
        transactionCode: 'TX-1',
        amount: 100,
        status: 'COMPLETED',
        createdAt: '2024-05-01',
        fullName: 'Guest User',
        email: 'guest@test.com',
        phone: '+12025554567',
        user: null,
        items: [],
        invoice: null,
      },
      error: null,
    });
    supabase.from.mockReturnValueOnce(txQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getTransactionById('t1');

    expect(result.id).toBe('t1');
    expect(result.user).toBeNull();
    expect(result.invoice).toBeNull();
  });

  it('returns dashboard stats with recent transaction mapping', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-15T10:00:00.000Z'));

    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const totalUsersQuery = createQueryMock({
      data: null,
      error: null,
      count: 10,
    });
    const totalProductsQuery = createQueryMock({
      data: null,
      error: null,
      count: 4,
    });
    const totalTransactionsQuery = createQueryMock({
      data: null,
      error: null,
      count: 20,
    });
    const completedTransactionsQuery = createQueryMock({
      data: null,
      error: null,
      count: 12,
    });
    const newUsersQuery = createQueryMock({
      data: null,
      error: null,
      count: 3,
    });
    const activeProductsQuery = createQueryMock({
      data: null,
      error: null,
      count: 2,
    });
    const pendingTransactionsQuery = createQueryMock({
      data: null,
      error: null,
      count: 5,
    });
    const failedTransactionsQuery = createQueryMock({
      data: null,
      error: null,
      count: 3,
    });
    const recentTransactionsQuery = createQueryMock({
      data: [
        {
          id: 't1',
          transactionCode: 'TX-1',
          amount: '1000',
          status: 'COMPLETED',
          createdAt: '2024-05-14',
          fullName: 'Guest Name',
          email: null,
          user: null,
        },
        {
          id: 't2',
          transactionCode: 'TX-2',
          amount: 200,
          status: 'PENDING',
          createdAt: '2024-05-13',
          fullName: null,
          email: null,
          user: { name: null, email: null },
        },
      ],
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(totalUsersQuery)
      .mockReturnValueOnce(totalProductsQuery)
      .mockReturnValueOnce(totalTransactionsQuery)
      .mockReturnValueOnce(completedTransactionsQuery)
      .mockReturnValueOnce(newUsersQuery)
      .mockReturnValueOnce(activeProductsQuery)
      .mockReturnValueOnce(pendingTransactionsQuery)
      .mockReturnValueOnce(failedTransactionsQuery)
      .mockReturnValueOnce(recentTransactionsQuery);
    supabase.rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: '1500' })
      .mockResolvedValueOnce({ data: 400 });
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getDashboardStats();

    const now = new Date();
    const thisMonthISO = new Date(
      now.getFullYear(),
      now.getMonth(),
      1
    ).toISOString();
    expect(newUsersQuery.gte).toHaveBeenCalledWith('createdAt', thisMonthISO);
    expect(activeProductsQuery.eq).toHaveBeenCalledWith('isActive', true);
    expect(completedTransactionsQuery.eq).toHaveBeenCalledWith(
      'status',
      'COMPLETED'
    );
    expect(pendingTransactionsQuery.eq).toHaveBeenCalledWith(
      'status',
      'PENDING'
    );
    expect(failedTransactionsQuery.eq).toHaveBeenCalledWith('status', 'FAILED');
    expect(supabase.rpc).toHaveBeenCalledWith('get_monthly_revenue', {
      month_start: thisMonthISO,
    });

    expect(result).toEqual({
      users: { total: 10, new: 3 },
      products: { total: 4, active: 2 },
      transactions: {
        total: 20,
        pending: 5,
        completed: 12,
        failed: 3,
      },
      revenue: { total: 1500, thisMonth: 400 },
      recentTransactions: [
        {
          id: 't1',
          transactionCode: 'TX-1',
          amount: 1000,
          status: 'COMPLETED',
          createdAt: '2024-05-14',
          user: { name: 'Guest Name', email: 'Guest' },
        },
        {
          id: 't2',
          transactionCode: 'TX-2',
          amount: 200,
          status: 'PENDING',
          createdAt: '2024-05-13',
          user: { name: 'Unnamed user', email: '' },
        },
      ],
    });
  });

  it('throws a friendly error when dashboard stats fail', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    supabase.rpc = vi.fn(() => {
      throw new Error('rpc fail');
    });
    supabase.from.mockReturnValue(createQueryMock({ data: null, error: null }));
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(adminService.getDashboardStats()).rejects.toThrow(
      'Unable to load dashboard stats'
    );
  });

  // ============ getDashboardStats - Edge Cases ============

  it('parses string revenue values from RPC', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-15T10:00:00.000Z'));

    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const countQuery = createQueryMock({ data: null, error: null, count: 0 });
    const recentQuery = createQueryMock({ data: [], error: null });

    supabase.from
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(recentQuery);
    supabase.rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: '2500000' })
      .mockResolvedValueOnce({ data: '750000' });
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getDashboardStats();

    expect(result.revenue).toEqual({
      total: 2500000,
      thisMonth: 750000,
    });
  });

  it('handles null RPC results gracefully', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-15T10:00:00.000Z'));

    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const countQuery = createQueryMock({ data: null, error: null, count: 0 });
    const recentQuery = createQueryMock({ data: [], error: null });

    supabase.from
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(recentQuery);
    supabase.rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: null });
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getDashboardStats();

    expect(result.revenue).toEqual({
      total: 0,
      thisMonth: 0,
    });
  });

  it('maps guest transactions correctly', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-15T10:00:00.000Z'));

    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const countQuery = createQueryMock({ data: null, error: null, count: 0 });
    const recentQuery = createQueryMock({
      data: [
        {
          id: 't1',
          transactionCode: 'TX-1',
          amount: 1000,
          status: 'COMPLETED',
          createdAt: '2024-05-14',
          fullName: 'Guest Ali',
          email: 'guest@test.com',
          user: null,
        },
        {
          id: 't2',
          transactionCode: 'TX-2',
          amount: 500,
          status: 'PENDING',
          createdAt: '2024-05-13',
          fullName: null,
          email: null,
          user: null,
        },
      ],
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(recentQuery);
    supabase.rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: 0 })
      .mockResolvedValueOnce({ data: 0 });
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getDashboardStats();

    // When user is null but email exists, use fullName and email from transaction
    expect(result.recentTransactions[0].user).toEqual({
      name: 'Guest Ali',
      email: 'guest@test.com',
    });
    // When user is null and both fullName and email are null, use 'Guest' for both
    expect(result.recentTransactions[1].user).toEqual({
      name: 'Guest',
      email: 'Guest',
    });
  });

  it('uses default name when user name is null', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-15T10:00:00.000Z'));

    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const countQuery = createQueryMock({ data: null, error: null, count: 0 });
    const recentQuery = createQueryMock({
      data: [
        {
          id: 't1',
          transactionCode: 'TX-1',
          amount: 1000,
          status: 'COMPLETED',
          createdAt: '2024-05-14',
          fullName: 'Guest',
          email: null,
          user: { name: null, email: 'user@test.com' },
        },
      ],
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(recentQuery);
    supabase.rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: 0 })
      .mockResolvedValueOnce({ data: 0 });
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getDashboardStats();

    expect(result.recentTransactions[0].user).toEqual({
      name: 'Unnamed user',
      email: 'user@test.com',
    });
  });

  it('handles partial query failures in parallel execution', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-05-15T10:00:00.000Z'));

    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const errorQuery = createQueryMock({
      data: null,
      error: { message: 'query failed' },
      count: null,
    });
    const validQuery = createQueryMock({ data: null, error: null, count: 5 });
    const recentQuery = createQueryMock({ data: [], error: null });

    supabase.from
      .mockReturnValueOnce(validQuery)
      .mockReturnValueOnce(validQuery)
      .mockReturnValueOnce(validQuery)
      .mockReturnValueOnce(validQuery)
      .mockReturnValueOnce(validQuery)
      .mockReturnValueOnce(validQuery)
      .mockReturnValueOnce(validQuery)
      .mockReturnValueOnce(validQuery)
      .mockReturnValueOnce(recentQuery);
    supabase.rpc = vi
      .fn()
      .mockResolvedValueOnce({ data: 1000 })
      .mockResolvedValueOnce({ data: 500 });
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getDashboardStats();

    expect(result.users.total).toBe(5);
    expect(result.revenue.total).toBe(1000);
    expect(result.revenue.thisMonth).toBe(500);
  });
});
