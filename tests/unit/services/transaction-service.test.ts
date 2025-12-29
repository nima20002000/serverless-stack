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
    const insertQuery = createQueryMock({
      data: null,
      error: { message: 'fail' },
    });
    supabase.from.mockReturnValue(insertQuery);
    createClientMock.mockReturnValue(supabase as unknown);

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
    const insertItems = createQueryMock({
      data: null,
      error: { message: 'bad' },
    }) as ReturnType<typeof createQueryMock> & {
      insert: ReturnType<typeof vi.fn>;
    };
    const deleteTx = createQueryMock({ data: null, error: null });

    supabase.from
      .mockReturnValueOnce(insertTransaction)
      .mockReturnValueOnce(insertItems)
      .mockReturnValueOnce(deleteTx);

    createClientMock.mockReturnValue(supabase as unknown);

    await expect(
      transactionService.createTransaction({
        items: [{ productId: 'p1', quantity: 1, price: 10 }],
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

  it('creates a transaction with items and returns full record', async () => {
    const supabase = createSupabaseMock();

    const insertTransaction = createQueryMock({
      data: { id: 'tx-1', transactionCode: 'KT-ABC123' },
      error: null,
    });
    const insertItems = createQueryMock({
      data: null,
      error: null,
    }) as ReturnType<typeof createQueryMock> & {
      insert: ReturnType<typeof vi.fn>;
    };
    const fetchTransaction = createQueryMock({
      data: {
        id: 'tx-1',
        transactionCode: 'KT-ABC123',
        items: [{ id: 'item-1', productId: 'p1' }],
      },
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(insertTransaction)
      .mockReturnValueOnce(insertItems)
      .mockReturnValueOnce(fetchTransaction);

    createClientMock.mockReturnValue(supabase as unknown);

    const result = await transactionService.createTransaction({
      items: [{ productId: 'p1', quantity: 2, price: 25 }],
      amount: 50,
      shippingInfo: {
        fullName: 'Test',
        phone: '09123456789',
        shippingAddress: 'Addr',
      },
    });

    const insertedItems = insertItems.insert.mock.calls[0][0] as Array<{
      id: string;
      transactionId: string;
      productId: string;
      quantity: number;
      price: number;
    }>;

    expect(result.id).toBe('tx-1');
    expect(insertTransaction.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 50,
        status: 'PENDING',
        isGuest: true,
      })
    );
    expect(insertedItems).toHaveLength(1);
    expect(insertedItems[0]).toEqual(
      expect.objectContaining({
        transactionId: 'tx-1',
        productId: 'p1',
        quantity: 2,
        price: 25,
      })
    );
    expect(insertedItems[0].id).toEqual(expect.any(String));
  });

  it('updates transaction status with optional fields', async () => {
    const supabase = createSupabaseMock();
    const updateQuery = createQueryMock({
      data: { id: 'tx-1', status: 'COMPLETED' },
      error: null,
    });

    supabase.from.mockReturnValue(updateQuery);
    createClientMock.mockReturnValue(supabase as unknown);

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

  it('returns transaction with flattened invoice data', async () => {
    const supabase = createSupabaseMock();
    const fetchQuery = createQueryMock({
      data: {
        id: 'tx-1',
        invoice: [{ invoiceNumber: 'INV-1', pdfUrl: 'url' }],
      },
      error: null,
    });

    supabase.from.mockReturnValue(fetchQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await transactionService.getTransactionById('tx-1');

    expect(result.invoice).toEqual({ invoiceNumber: 'INV-1', pdfUrl: 'url' });
  });

  it('returns paginated user transactions with invoice normalization', async () => {
    const supabase = createSupabaseMock();

    const countQuery = createQueryMock({ data: null, error: null, count: 3 });
    const listQuery = createQueryMock({
      data: [
        { id: 'tx-1', invoice: [{ invoiceNumber: 'INV-1' }] },
        { id: 'tx-2', invoice: [] },
      ],
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(listQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await transactionService.getUserTransactions('user-1', {
      page: 2,
      perPage: 2,
    });

    expect(countQuery.select).toHaveBeenCalledWith('*', {
      count: 'exact',
      head: true,
    });
    expect(listQuery.range).toHaveBeenCalledWith(2, 3);
    expect(result).toEqual({
      data: [
        { id: 'tx-1', invoice: { invoiceNumber: 'INV-1' } },
        { id: 'tx-2', invoice: null },
      ],
      total: 3,
      page: 2,
      perPage: 2,
      totalPages: 2,
    });
  });

  it('verifies stock availability with variant requirements', async () => {
    const supabase = createSupabaseMock();

    const productsQuery = createQueryMock({
      data: [
        {
          id: 'p1',
          stock: 5,
          name: 'Product',
          isActive: true,
          hasVariants: true,
        },
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
    createClientMock.mockReturnValue(supabase as unknown);

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
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(transactionService.reduceProductStock('tx-1')).rejects.toThrow(
      'فقط برای تراکنش‌های موفق امکان کاهش موجودی وجود دارد'
    );
  });

  // Activity tracking tests for ipAddress and userAgent
  describe('createTransaction with activity tracking fields', () => {
    it('creates transaction with ipAddress and userAgent stored correctly', async () => {
      const supabase = createSupabaseMock();

      const insertTransaction = createQueryMock({
        data: { id: 'tx-1', transactionCode: 'KT-ABC123' },
        error: null,
      });
      const insertItems = createQueryMock({
        data: null,
        error: null,
      });
      const fetchTransaction = createQueryMock({
        data: {
          id: 'tx-1',
          transactionCode: 'KT-ABC123',
          ip_address: '203.0.113.50',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          items: [],
        },
        error: null,
      });

      supabase.from
        .mockReturnValueOnce(insertTransaction)
        .mockReturnValueOnce(insertItems)
        .mockReturnValueOnce(fetchTransaction);

      createClientMock.mockReturnValue(supabase as unknown);

      await transactionService.createTransaction({
        items: [],
        amount: 100,
        shippingInfo: {
          fullName: 'Test User',
          phone: '09123456789',
          shippingAddress: 'Test Address',
        },
        ipAddress: '203.0.113.50',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      });

      expect(insertTransaction.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '203.0.113.50',
          user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        })
      );
    });

    it('creates transaction with ipAddress but no userAgent', async () => {
      const supabase = createSupabaseMock();

      const insertTransaction = createQueryMock({
        data: { id: 'tx-2', transactionCode: 'KT-DEF456' },
        error: null,
      });
      const insertItems = createQueryMock({ data: null, error: null });
      const fetchTransaction = createQueryMock({
        data: { id: 'tx-2', transactionCode: 'KT-DEF456', items: [] },
        error: null,
      });

      supabase.from
        .mockReturnValueOnce(insertTransaction)
        .mockReturnValueOnce(insertItems)
        .mockReturnValueOnce(fetchTransaction);

      createClientMock.mockReturnValue(supabase as unknown);

      await transactionService.createTransaction({
        items: [],
        amount: 200,
        shippingInfo: {
          fullName: 'User Two',
          phone: '09123456780',
          shippingAddress: 'Address Two',
        },
        ipAddress: '8.8.8.8',
      });

      expect(insertTransaction.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '8.8.8.8',
          user_agent: null,
        })
      );
    });

    it('creates transaction with neither ipAddress nor userAgent', async () => {
      const supabase = createSupabaseMock();

      const insertTransaction = createQueryMock({
        data: { id: 'tx-3', transactionCode: 'KT-GHI789' },
        error: null,
      });
      const insertItems = createQueryMock({ data: null, error: null });
      const fetchTransaction = createQueryMock({
        data: { id: 'tx-3', transactionCode: 'KT-GHI789', items: [] },
        error: null,
      });

      supabase.from
        .mockReturnValueOnce(insertTransaction)
        .mockReturnValueOnce(insertItems)
        .mockReturnValueOnce(fetchTransaction);

      createClientMock.mockReturnValue(supabase as unknown);

      await transactionService.createTransaction({
        items: [],
        amount: 300,
        shippingInfo: {
          fullName: 'User Three',
          phone: '09123456781',
          shippingAddress: 'Address Three',
        },
      });

      expect(insertTransaction.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: null,
          user_agent: null,
        })
      );
    });

    it('creates transaction with very long userAgent string (2000 chars)', async () => {
      const supabase = createSupabaseMock();
      const longUserAgent = 'Mozilla/5.0 ' + 'X'.repeat(2000);

      const insertTransaction = createQueryMock({
        data: { id: 'tx-4', transactionCode: 'KT-JKL012' },
        error: null,
      });
      const insertItems = createQueryMock({ data: null, error: null });
      const fetchTransaction = createQueryMock({
        data: { id: 'tx-4', transactionCode: 'KT-JKL012', items: [] },
        error: null,
      });

      supabase.from
        .mockReturnValueOnce(insertTransaction)
        .mockReturnValueOnce(insertItems)
        .mockReturnValueOnce(fetchTransaction);

      createClientMock.mockReturnValue(supabase as unknown);

      await transactionService.createTransaction({
        items: [],
        amount: 400,
        shippingInfo: {
          fullName: 'User Four',
          phone: '09123456782',
          shippingAddress: 'Address Four',
        },
        userAgent: longUserAgent,
      });

      expect(insertTransaction.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_agent: longUserAgent,
        })
      );
    });

    it('creates transaction with IPv6 address', async () => {
      const supabase = createSupabaseMock();
      const ipv6Address = '2001:0db8:85a3:0000:0000:8a2e:0370:7334';

      const insertTransaction = createQueryMock({
        data: { id: 'tx-5', transactionCode: 'KT-MNO345' },
        error: null,
      });
      const insertItems = createQueryMock({ data: null, error: null });
      const fetchTransaction = createQueryMock({
        data: { id: 'tx-5', transactionCode: 'KT-MNO345', items: [] },
        error: null,
      });

      supabase.from
        .mockReturnValueOnce(insertTransaction)
        .mockReturnValueOnce(insertItems)
        .mockReturnValueOnce(fetchTransaction);

      createClientMock.mockReturnValue(supabase as unknown);

      await transactionService.createTransaction({
        items: [],
        amount: 500,
        shippingInfo: {
          fullName: 'User Five',
          phone: '09123456783',
          shippingAddress: 'Address Five',
        },
        ipAddress: ipv6Address,
        userAgent: 'IPv6 Test Agent',
      });

      expect(insertTransaction.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: ipv6Address,
          user_agent: 'IPv6 Test Agent',
        })
      );
    });

    it('creates transaction with null ipAddress and userAgent passed explicitly', async () => {
      const supabase = createSupabaseMock();

      const insertTransaction = createQueryMock({
        data: { id: 'tx-6', transactionCode: 'KT-PQR678' },
        error: null,
      });
      const insertItems = createQueryMock({ data: null, error: null });
      const fetchTransaction = createQueryMock({
        data: { id: 'tx-6', transactionCode: 'KT-PQR678', items: [] },
        error: null,
      });

      supabase.from
        .mockReturnValueOnce(insertTransaction)
        .mockReturnValueOnce(insertItems)
        .mockReturnValueOnce(fetchTransaction);

      createClientMock.mockReturnValue(supabase as unknown);

      await transactionService.createTransaction({
        items: [],
        amount: 600,
        shippingInfo: {
          fullName: 'User Six',
          phone: '09123456784',
          shippingAddress: 'Address Six',
        },
        ipAddress: null,
        userAgent: null,
      });

      expect(insertTransaction.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: null,
          user_agent: null,
        })
      );
    });
  });
});
