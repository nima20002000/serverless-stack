import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as promoService from '@/services/promo-service';
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

describe('promo-service', () => {
  const createClientMock = vi.mocked(createClient);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('generates promo codes with WELCOME- prefix', async () => {
    const code = await promoService.generatePromoCode();
    expect(code.startsWith('WELCOME-')).toBe(true);
    expect(code.length).toBe(12);
  });

  it('creates a first-time promo code with expiry', async () => {
    const supabase = createSupabaseMock();
    const insertQuery = createQueryMock({
      data: {
        id: 'promo-1',
        code: 'WELCOME-ABCD',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        isUsed: false,
      },
      error: null,
    });

    supabase.from.mockReturnValue(insertQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await promoService.createFirstTimePromoCode('user-1');

    expect(result.userId).toBe('user-1');
    expect(result.isUsed).toBe(false);
    expect(insertQuery.insert).toHaveBeenCalled();
  });

  it('fetches active promo code or null', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({ data: null, error: null });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as any);

    const result = await promoService.getActivePromoCode('user-1');
    expect(result).toBeNull();
  });

  it('rejects using an already used promo code', async () => {
    const supabase = createSupabaseMock();
    const fetchQuery = createQueryMock({
      data: {
        code: 'WELCOME-ABCD',
        isUsed: true,
        expiresAt: new Date(Date.now() + 1000).toISOString(),
      },
      error: null,
    });

    supabase.from.mockReturnValue(fetchQuery);
    createClientMock.mockReturnValue(supabase as any);

    await expect(promoService.usePromoCode('WELCOME-ABCD')).rejects.toThrow(
      'این کد تخفیف قبلاً استفاده شده است'
    );
  });

  it('marks promo code as used when valid', async () => {
    const supabase = createSupabaseMock();
    const fetchQuery = createQueryMock({
      data: {
        code: 'WELCOME-ABCD',
        isUsed: false,
        expiresAt: new Date(Date.now() + 1000).toISOString(),
      },
      error: null,
    });
    const updateQuery = createQueryMock({
      data: { code: 'WELCOME-ABCD', isUsed: true },
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(updateQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await promoService.usePromoCode('WELCOME-ABCD');

    expect(result.isUsed).toBe(true);
    expect(updateQuery.update).toHaveBeenCalledWith({ isUsed: true });
  });

  it('validates promo code and returns capped percentage discount', async () => {
    const supabase = createSupabaseMock();
    const promoQuery = createQueryMock({
      data: {
        id: 'promo-1',
        code: 'SAVE20',
        isActive: true,
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        discountType: 'PERCENT',
        discountValue: 20,
        maxUsageCount: null,
        currentUsageCount: 0,
        userId: null,
        minOrderAmount: null,
        maxDiscountAmount: 15000,
      },
      error: null,
    });
    const usageQuery = createQueryMock({ data: null, error: null });
    supabase.from
      .mockReturnValueOnce(promoQuery)
      .mockReturnValueOnce(usageQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await promoService.validatePromoCode('save20', 100000, 'u1');

    expect(result.valid).toBe(true);
    expect(result.discountAmount).toBe(15000);
    expect(result.promoCode?.code).toBe('SAVE20');
  });

  it('rejects promo code when inactive', async () => {
    const supabase = createSupabaseMock();
    const promoQuery = createQueryMock({
      data: {
        id: 'promo-1',
        code: 'OFF',
        isActive: false,
        expiresAt: new Date(Date.now() + 1000).toISOString(),
      },
      error: null,
    });
    supabase.from.mockReturnValue(promoQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await promoService.validatePromoCode('OFF', 20000);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('کد تخفیف غیرفعال است');
  });

  it('rejects promo code when usage limit reached', async () => {
    const supabase = createSupabaseMock();
    const promoQuery = createQueryMock({
      data: {
        id: 'promo-1',
        code: 'LIMIT1',
        isActive: true,
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        maxUsageCount: 1,
        currentUsageCount: 1,
      },
      error: null,
    });
    supabase.from.mockReturnValue(promoQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await promoService.validatePromoCode('LIMIT1', 30000);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('سقف استفاده از این کد تخفیف تکمیل شده است');
  });

  it('rejects user-specific promo code for another user', async () => {
    const supabase = createSupabaseMock();
    const promoQuery = createQueryMock({
      data: {
        id: 'promo-1',
        code: 'USER1',
        isActive: true,
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        userId: 'user-1',
      },
      error: null,
    });
    supabase.from.mockReturnValue(promoQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await promoService.validatePromoCode(
      'USER1',
      25000,
      'user-2'
    );

    expect(result.valid).toBe(false);
    expect(result.error).toBe('این کد تخفیف برای شما قابل استفاده نیست');
  });

  it('rejects promo code when order total below minimum', async () => {
    const supabase = createSupabaseMock();
    const promoQuery = createQueryMock({
      data: {
        id: 'promo-1',
        code: 'MIN100',
        isActive: true,
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        minOrderAmount: 100000,
      },
      error: null,
    });
    supabase.from.mockReturnValue(promoQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await promoService.validatePromoCode('MIN100', 50000);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('حداقل مبلغ سفارش');
    expect(result.error).toContain('تومان');
  });

  it('rejects promo code when user already used it', async () => {
    const supabase = createSupabaseMock();
    const promoQuery = createQueryMock({
      data: {
        id: 'promo-1',
        code: 'REPEAT',
        isActive: true,
        expiresAt: new Date(Date.now() + 1000).toISOString(),
        userId: null,
      },
      error: null,
    });
    const usageQuery = createQueryMock({
      data: { id: 'usage-1' },
      error: null,
    });
    supabase.from
      .mockReturnValueOnce(promoQuery)
      .mockReturnValueOnce(usageQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await promoService.validatePromoCode(
      'REPEAT',
      20000,
      'user-1'
    );

    expect(result.valid).toBe(false);
    expect(result.error).toBe('شما قبلاً از این کد تخفیف استفاده کرده‌اید');
  });

  it('calculates fixed discount capped at subtotal', () => {
    const discount = promoService.calculateDiscount(
      {
        discountType: 'FIXED',
        discountValue: 50000,
        maxDiscountAmount: null,
      } as any,
      20000
    );

    expect(discount).toBe(20000);
  });

  it('records promo usage and increments count', async () => {
    const supabase = createSupabaseMock();
    const insertQuery = createQueryMock({
      data: { id: 'usage-1', promoCodeId: 'promo-1', transactionId: 'tx-1' },
      error: null,
    });
    supabase.from.mockReturnValue(insertQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await promoService.recordPromoUsage(
      'promo-1',
      'tx-1',
      'user-1'
    );

    expect(result?.id).toBe('usage-1');
    expect(insertQuery.insert).toHaveBeenCalledWith({
      promoCodeId: 'promo-1',
      transactionId: 'tx-1',
      userId: 'user-1',
    });
    expect(createClientMock).toHaveBeenCalledTimes(2);
    expect(insertQuery.update).toHaveBeenCalledWith({
      currentUsageCount: 1,
    });
  });

  it('increments promo usage count when promo exists', async () => {
    const supabase = createSupabaseMock();
    const selectQuery = createQueryMock({
      data: { currentUsageCount: 2 },
      error: null,
    });
    const updateQuery = createQueryMock({ data: null, error: null });
    supabase.from
      .mockReturnValueOnce(selectQuery)
      .mockReturnValueOnce(updateQuery);
    createClientMock.mockReturnValue(supabase as any);

    await promoService.incrementUsageCount('promo-1');

    expect(updateQuery.update).toHaveBeenCalledWith({ currentUsageCount: 3 });
  });

  it('returns promo list with pagination', async () => {
    const supabase = createSupabaseMock();
    const listQuery = createQueryMock({
      data: [{ id: 'promo-1' }, { id: 'promo-2' }],
      error: null,
      count: 12,
    });
    supabase.from.mockReturnValue(listQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await promoService.getAllPromoCodes({
      page: 2,
      perPage: 5,
      activeOnly: true,
    });

    expect(listQuery.eq).toHaveBeenCalledWith('isActive', true);
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(12);
    expect(result.totalPages).toBe(3);
    expect(result.page).toBe(2);
  });

  it('returns null when promo code lookup fails', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({ data: null, error: { message: 'fail' } });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as any);

    const result = await promoService.getPromoCodeById('promo-1');

    expect(result).toBeNull();
  });

  it('rejects creating a promo code if code already exists', async () => {
    const supabase = createSupabaseMock();
    const existingQuery = createQueryMock({
      data: { id: 'promo-1' },
      error: null,
    });
    supabase.from.mockReturnValue(existingQuery);
    createClientMock.mockReturnValue(supabase as any);

    await expect(
      promoService.createPromoCode({
        code: 'SAVE10',
        discountType: 'PERCENT',
        discountValue: 10,
        expiresAt: new Date(Date.now() + 1000).toISOString(),
      })
    ).rejects.toThrow('این کد تخفیف قبلاً وجود دارد');
  });

  it('creates promo code with normalized code', async () => {
    const supabase = createSupabaseMock();
    const existingQuery = createQueryMock({ data: null, error: null });
    const insertQuery = createQueryMock({
      data: { id: 'promo-1', code: 'SAVE10' },
      error: null,
    });
    supabase.from
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(insertQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await promoService.createPromoCode({
      code: ' save10 ',
      discountType: 'PERCENT',
      discountValue: 10,
      expiresAt: new Date(Date.now() + 1000).toISOString(),
    });

    expect(result.code).toBe('SAVE10');
    expect(insertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SAVE10', discountValue: 10 })
    );
  });

  it('updates promo code with normalized code', async () => {
    const supabase = createSupabaseMock();
    const existingQuery = createQueryMock({ data: null, error: null });
    const updateQuery = createQueryMock({
      data: { id: 'promo-1', code: 'SAVE20' },
      error: null,
    });
    supabase.from
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(updateQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await promoService.updatePromoCode('promo-1', {
      code: ' save20 ',
      discountValue: 20,
    });

    expect(result.code).toBe('SAVE20');
    expect(updateQuery.update).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'SAVE20', discountValue: 20 })
    );
  });

  it('deletes promo code by id', async () => {
    const supabase = createSupabaseMock();
    const deleteQuery = createQueryMock({ data: null, error: null });
    supabase.from.mockReturnValue(deleteQuery);
    createClientMock.mockReturnValue(supabase as any);

    await promoService.deletePromoCode('promo-1');

    expect(deleteQuery.delete).toHaveBeenCalled();
    expect(deleteQuery.eq).toHaveBeenCalledWith('id', 'promo-1');
  });

  it('toggles promo code active status', async () => {
    const supabase = createSupabaseMock();
    const updateQuery = createQueryMock({
      data: { id: 'promo-1', isActive: false },
      error: null,
    });
    supabase.from.mockReturnValue(updateQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await promoService.togglePromoCodeStatus('promo-1', false);

    expect(result.isActive).toBe(false);
    expect(updateQuery.update).toHaveBeenCalledWith({ isActive: false });
  });
});
