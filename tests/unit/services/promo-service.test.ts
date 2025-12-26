import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generatePromoCode,
  createFirstTimePromoCode,
  getActivePromoCode,
  usePromoCode,
} from '@/services/promo-service';
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
    const code = await generatePromoCode();
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

    const result = await createFirstTimePromoCode('user-1');

    expect(result.userId).toBe('user-1');
    expect(result.isUsed).toBe(false);
    expect(insertQuery.insert).toHaveBeenCalled();
  });

  it('fetches active promo code or null', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({ data: null, error: null });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as any);

    const result = await getActivePromoCode('user-1');
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

    await expect(usePromoCode('WELCOME-ABCD')).rejects.toThrow(
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

    const result = await usePromoCode('WELCOME-ABCD');

    expect(result.isUsed).toBe(true);
    expect(updateQuery.update).toHaveBeenCalledWith({ isUsed: true });
  });
});
