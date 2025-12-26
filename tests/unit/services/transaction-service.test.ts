import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as transactionService from '@/services/transaction-service';
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

describe('transaction-service', () => {
  const createClientMock = vi.mocked(createClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates transaction code in KT-XXXXXX format', () => {
    const code = transactionService.generateTransactionCode();
    expect(code).toMatch(/^KT-[A-Z0-9]{6}$/);
  });

  it('throws when transaction creation fails', async () => {
    const supabase = createSupabaseMock();
    const insertQuery = createQueryMock({ data: null, error: { message: 'fail' } });
    supabase.from.mockReturnValue(insertQuery);
    createClientMock.mockReturnValue(supabase as any);

    await expect(
      transactionService.createTransaction({
        items: [],
        amount: 1000,
        shippingInfo: {
          fullName: 'Test',
          phone: '09123456789',
          shippingAddress: 'Addr',
        },
      })
    ).rejects.toThrow('خطا در ایجاد تراکنش');
  });

  it('rolls back transaction when items insert fails', async () => {
    const supabase = createSupabaseMock();

    const insertTransaction = createQueryMock({
      data: { id: 'tx-1', transactionCode: 'KT-ABC123' },
      error: null,
    });
    const insertItems = createQueryMock({ data: null, error: { message: 'bad' } });
    const deleteTx = createQueryMock({ data: null, error: null });

    supabase.from
      .mockReturnValueOnce(insertTransaction)
      .mockReturnValueOnce(insertItems)
      .mockReturnValueOnce(deleteTx);

    createClientMock.mockReturnValue(supabase as any);

    await expect(
      transactionService.createTransaction({
        items: [
          { productId: 'p1', quantity: 1, price: 10 },
        ],
        amount: 10,
        shippingInfo: {
          fullName: 'Test',
          phone: '09123456789',
          shippingAddress: 'Addr',
        },
      })
    ).rejects.toThrow('خطا در ایجاد آیتم‌های تراکنش');

    expect(deleteTx.delete).toHaveBeenCalled();
  });

  it('updates transaction status with optional fields', async () => {
    const supabase = createSupabaseMock();
    const updateQuery = createQueryMock({
      data: { id: 'tx-1', status: 'COMPLETED' },
      error: null,
    });

    supabase.from.mockReturnValue(updateQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await transactionService.updateTransactionStatus(
      'tx-1',
      'COMPLETED',
      'AUTH-1',
      123
    );

    expect(result).toEqual({ id: 'tx-1', status: 'COMPLETED' });
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'COMPLETED',
        zarinpalAuthority: 'AUTH-1',
        zarinpalRefId: 123,
      })
    );
  });

  it('verifies stock availability with variant requirements', async () => {
    const supabase = createSupabaseMock();

    const productsQuery = createQueryMock({
      data: [
        { id: 'p1', stock: 5, name: 'Product', isActive: true, hasVariants: true },
      ],
      error: null,
    });
    const variantsQuery = createQueryMock({
      data: [],
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(productsQuery)
      .mockReturnValueOnce(variantsQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await transactionService.verifyStockAvailability([
      { productId: 'p1', quantity: 1 },
    ]);

    expect(result.available).toBe(false);
    expect(result.errors).toEqual([
      'برای محصول Product باید یک نوع (رنگ، سایز، ...) انتخاب کنید',
    ]);
  });

  it('refuses to reduce stock for non-completed transactions', async () => {
    const supabase = createSupabaseMock();
    const fetchQuery = createQueryMock({
      data: {
        id: 'tx-1',
        status: 'PENDING',
        items: [],
      },
      error: null,
    });

    supabase.from.mockReturnValue(fetchQuery);
    createClientMock.mockReturnValue(supabase as any);

    await expect(transactionService.reduceProductStock('tx-1')).rejects.toThrow(
      'فقط برای تراکنش‌های موفق امکان کاهش موجودی وجود دارد'
    );
  });
});
