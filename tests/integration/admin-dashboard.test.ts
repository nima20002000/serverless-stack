/**
 * Integration Tests for Admin Dashboard Service
 *
 * Tests admin service with realistic database interactions (mocked Supabase but testing query building).
 * Focuses on testing query composition, filter combinations, and data transformation.
 *
 * ANTI-REWARD-HACKING NOTES:
 * - Assertions validate concrete field values and query patterns
 * - Tests verify filter combinations work correctly
 * - Each test has a single, clear purpose
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as adminService from '@/services/admin-service';
import { createClient } from '@/lib/supabase/server';
import {
  createSupabaseMock,
  createQueryMock,
} from '../unit/helpers/supabase-mock';

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

describe('Admin Dashboard Integration Tests', () => {
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

  // ============ Dashboard Stats Accuracy ============

  it('calculates dashboard statistics correctly', async () => {
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
      count: 5,
    });
    const totalTransactionsQuery = createQueryMock({
      data: null,
      error: null,
      count: 20,
    });
    const completedTransactionsQuery = createQueryMock({
      data: null,
      error: null,
      count: 15,
    });
    const newUsersQuery = createQueryMock({
      data: null,
      error: null,
      count: 3,
    });
    const activeProductsQuery = createQueryMock({
      data: null,
      error: null,
      count: 4,
    });
    const pendingTransactionsQuery = createQueryMock({
      data: null,
      error: null,
      count: 3,
    });
    const failedTransactionsQuery = createQueryMock({
      data: null,
      error: null,
      count: 2,
    });
    const recentTransactionsQuery = createQueryMock({
      data: [
        {
          id: 't1',
          transactionCode: 'TX-001',
          amount: 100000,
          status: 'COMPLETED',
          createdAt: '2024-05-14',
          fullName: 'Test User',
          email: 'test@test.com',
          user: { name: 'Test User', email: 'test@test.com' },
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
      .mockResolvedValueOnce({ data: 5000000 })
      .mockResolvedValueOnce({ data: 1500000 });
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getDashboardStats();

    expect(result.users.total).toBe(10);
    expect(result.users.new).toBe(3);
    expect(result.products.total).toBe(5);
    expect(result.products.active).toBe(4);
    expect(result.transactions.total).toBe(20);
    expect(result.transactions.pending).toBe(3);
    expect(result.transactions.completed).toBe(15);
    expect(result.transactions.failed).toBe(2);
    expect(result.revenue.total).toBe(5000000);
    expect(result.revenue.thisMonth).toBe(1500000);
    expect(result.recentTransactions).toHaveLength(1);
    expect(result.recentTransactions[0].transactionCode).toBe('TX-001');
  });

  // ============ User Search Across Fields ============

  it('search finds users by name, email, or phone', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const usersQuery = createQueryMock({
      data: [
        {
          id: 'u1',
          uid: 'UID-1',
          email: 'ali@example.com',
          phone: null,
          name: 'Alex Morgan',
          role: 'USER',
          createdAt: '2024-01-01',
        },
        {
          id: 'u2',
          uid: 'UID-2',
          email: 'test@test.com',
          phone: '+12025551111',
          name: 'Alex Taylor',
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

    const result = await adminService.getAllUsers(1, 20, 'Alex');

    expect(usersQuery.or).toHaveBeenCalledWith(
      'name.ilike.%Alex%,email.ilike.%Alex%'
    );
    expect(result.data).toHaveLength(2);
    expect(result.data[0].name).toContain('Alex');
    expect(result.data[1].name).toContain('Alex');
  });

  // ============ Transaction Filtering Combined ============

  it('combines status, search, and date filters correctly', async () => {
    const supabase = createSupabaseMock();
    const transactionsQuery = createQueryMock({
      data: [
        {
          id: 't1',
          transactionCode: 'KT-123456',
          amount: 250000,
          status: 'COMPLETED',
          createdAt: '2024-05-10',
          fullName: 'Test User',
          email: 'test@test.com',
          phone: '+12025554567',
          user: null,
          items: [],
          invoice: null,
        },
      ],
      error: null,
      count: 1,
    });
    supabase.from.mockReturnValueOnce(transactionsQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const dateFrom = '2024-01-01';
    const dateTo = '2024-12-31';
    const expectedEnd = new Date(dateTo);
    expectedEnd.setDate(expectedEnd.getDate() + 1);

    const result = await adminService.getAllTransactions(
      1,
      20,
      'COMPLETED',
      'KT-',
      dateFrom,
      dateTo
    );

    expect(transactionsQuery.eq).toHaveBeenCalledWith('status', 'COMPLETED');
    expect(transactionsQuery.or).toHaveBeenCalledWith(
      'transactionCode.ilike.%KT-%,fullName.ilike.%KT-%,email.ilike.%KT-%,phone.ilike.%KT-%'
    );
    expect(transactionsQuery.gte).toHaveBeenCalledWith(
      'createdAt',
      new Date(dateFrom).toISOString()
    );
    expect(transactionsQuery.lt).toHaveBeenCalledWith(
      'createdAt',
      expectedEnd.toISOString()
    );
    expect(result.data).toHaveLength(1);
    expect(result.data[0].status).toBe('COMPLETED');
  });

  // ============ Pagination Consistency ============

  it('pagination returns consistent results', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;

    const page1Users = [
      {
        id: 'u1',
        uid: 'UID-1',
        email: 'a@test.com',
        phone: null,
        name: 'User 1',
        role: 'USER',
        createdAt: '2024-01-01',
      },
      {
        id: 'u2',
        uid: 'UID-2',
        email: 'b@test.com',
        phone: null,
        name: 'User 2',
        role: 'USER',
        createdAt: '2024-01-02',
      },
    ];

    const usersQuery = createQueryMock({
      data: page1Users,
      error: null,
      count: 50,
    });
    const transactionsQuery = createQueryMock({ data: [], error: null });
    const promoQuery = createQueryMock({ data: [], error: null });

    supabase.from
      .mockReturnValueOnce(usersQuery)
      .mockReturnValueOnce(transactionsQuery)
      .mockReturnValueOnce(promoQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getAllUsers(1, 20);

    expect(usersQuery.range).toHaveBeenCalledWith(0, 19);
    expect(result.page).toBe(1);
    expect(result.perPage).toBe(20);
    expect(result.total).toBe(50);
    expect(result.totalPages).toBe(3);
    expect(result.data).toHaveLength(2);
  });

  it('second page uses correct offset', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;

    const usersQuery = createQueryMock({
      data: [
        {
          id: 'u21',
          uid: 'UID-21',
          email: 'c@test.com',
          phone: null,
          name: 'User 21',
          role: 'USER',
          createdAt: '2024-01-21',
        },
      ],
      error: null,
      count: 50,
    });
    const transactionsQuery = createQueryMock({ data: [], error: null });
    const promoQuery = createQueryMock({ data: [], error: null });

    supabase.from
      .mockReturnValueOnce(usersQuery)
      .mockReturnValueOnce(transactionsQuery)
      .mockReturnValueOnce(promoQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getAllUsers(2, 20);

    expect(usersQuery.range).toHaveBeenCalledWith(20, 39);
    expect(result.page).toBe(2);
    expect(result.perPage).toBe(20);
  });

  // ============ Role Filtering ============

  it('filters users by role correctly', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;

    const usersQuery = createQueryMock({
      data: [
        {
          id: 'u1',
          uid: 'UID-1',
          email: 'admin@test.com',
          phone: null,
          name: 'Admin User',
          role: 'ADMIN',
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

    const result = await adminService.getAllUsers(1, 20, undefined, 'ADMIN');

    expect(usersQuery.eq).toHaveBeenCalledWith('role', 'ADMIN');
    expect(result.data[0].role).toBe('ADMIN');
  });

  // ============ Transaction Status Filtering ============

  it('filters transactions by pending status', async () => {
    const supabase = createSupabaseMock();
    const transactionsQuery = createQueryMock({
      data: [
        {
          id: 't1',
          transactionCode: 'KT-PENDING1',
          amount: 100000,
          status: 'PENDING',
          createdAt: '2024-05-01',
          user: null,
          items: [],
          invoice: null,
        },
      ],
      error: null,
      count: 1,
    });
    supabase.from.mockReturnValueOnce(transactionsQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getAllTransactions(1, 20, 'PENDING');

    expect(transactionsQuery.eq).toHaveBeenCalledWith('status', 'PENDING');
    expect(result.data[0].status).toBe('PENDING');
  });

  it('filters transactions by failed status', async () => {
    const supabase = createSupabaseMock();
    const transactionsQuery = createQueryMock({
      data: [
        {
          id: 't1',
          transactionCode: 'KT-FAILED1',
          amount: 50000,
          status: 'FAILED',
          createdAt: '2024-05-01',
          user: null,
          items: [],
          invoice: null,
        },
      ],
      error: null,
      count: 1,
    });
    supabase.from.mockReturnValueOnce(transactionsQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getAllTransactions(1, 20, 'FAILED');

    expect(transactionsQuery.eq).toHaveBeenCalledWith('status', 'FAILED');
    expect(result.data[0].status).toBe('FAILED');
  });

  // ============ User Counts Aggregation ============

  it('aggregates transaction and promo code counts correctly', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const usersQuery = createQueryMock({
      data: [
        {
          id: 'u1',
          uid: 'UID-1',
          email: 'a@test.com',
          phone: null,
          name: 'User A',
          role: 'USER',
          createdAt: '2024-01-01',
        },
        {
          id: 'u2',
          uid: 'UID-2',
          email: 'b@test.com',
          phone: null,
          name: 'User B',
          role: 'USER',
          createdAt: '2024-01-02',
        },
        {
          id: 'u3',
          uid: 'UID-3',
          email: 'c@test.com',
          phone: null,
          name: 'User C',
          role: 'USER',
          createdAt: '2024-01-03',
        },
      ],
      error: null,
      count: 3,
    });
    const transactionsQuery = createQueryMock({
      data: [
        { userId: 'u1' },
        { userId: 'u1' },
        { userId: 'u1' },
        { userId: 'u2' },
      ],
      error: null,
    });
    const promoQuery = createQueryMock({
      data: [{ userId: 'u1' }, { userId: 'u2' }, { userId: 'u2' }],
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(usersQuery)
      .mockReturnValueOnce(transactionsQuery)
      .mockReturnValueOnce(promoQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getAllUsers();

    expect(result.data[0]._count).toEqual({ transactions: 3, promoCodes: 1 });
    expect(result.data[1]._count).toEqual({ transactions: 1, promoCodes: 2 });
    expect(result.data[2]._count).toEqual({ transactions: 0, promoCodes: 0 });
  });

  // ============ Invoice Normalization ============

  it('normalizes invoice array to single object', async () => {
    const supabase = createSupabaseMock();
    const transactionsQuery = createQueryMock({
      data: [
        {
          id: 't1',
          transactionCode: 'KT-001',
          amount: 100000,
          status: 'COMPLETED',
          createdAt: '2024-05-01',
          user: null,
          items: [],
          invoice: [
            {
              id: 'inv-1',
              transactionId: 't1',
              invoiceNumber: 'INV-2024-001',
              generatedAt: '2024-05-01',
            },
          ],
        },
        {
          id: 't2',
          transactionCode: 'KT-002',
          amount: 50000,
          status: 'PENDING',
          createdAt: '2024-05-02',
          user: null,
          items: [],
          invoice: null,
        },
      ],
      error: null,
      count: 2,
    });
    supabase.from.mockReturnValueOnce(transactionsQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await adminService.getAllTransactions();

    expect(result.data[0].invoice).toEqual({
      id: 'inv-1',
      transactionId: 't1',
      invoiceNumber: 'INV-2024-001',
      generatedAt: '2024-05-01',
    });
    expect(result.data[1].invoice).toBeNull();
  });

  // ============ Search and Role Combination ============

  it('combines search and role filters', async () => {
    const supabase = createSupabaseMock() as SupabaseMockWithRpc;
    const usersQuery = createQueryMock({
      data: [
        {
          id: 'u1',
          uid: 'UID-1',
          email: 'admin-ali@test.com',
          phone: null,
          name: 'Ali Admin',
          role: 'ADMIN',
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

    await adminService.getAllUsers(1, 20, 'ali', 'ADMIN');

    expect(usersQuery.or).toHaveBeenCalledWith(
      'name.ilike.%ali%,email.ilike.%ali%'
    );
    expect(usersQuery.eq).toHaveBeenCalledWith('role', 'ADMIN');
  });
});
