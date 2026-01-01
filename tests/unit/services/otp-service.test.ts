import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendOTP, verifyOTP } from '@/services/otp-service';
import { createClient } from '@/lib/supabase/server';
import { sendOTPSMS } from '@/lib/kavenegar/client';
import { sendOTPEmail } from '@/lib/email/client';
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

vi.mock('@/lib/kavenegar/client', () => ({
  sendOTPSMS: vi.fn(),
}));

vi.mock('@/lib/email/client', () => ({
  sendOTPEmail: vi.fn(),
}));

describe('otp-service', () => {
  const createClientMock = vi.mocked(createClient);
  const sendSmsMock = vi.mocked(sendOTPSMS);
  const sendEmailMock = vi.mocked(sendOTPEmail);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:01:00.000Z'));
  });

  it('rate limits when recent OTP exists', async () => {
    const supabase = createSupabaseMock();

    const deleteExpired = createQueryMock({ count: 0, error: null });
    const recentOtpQuery = createQueryMock({
      data: [
        {
          id: 'otp-1',
          createdAt: '2024-01-01T00:00:30.000',
          expiresAt: '2024-01-01T00:05:00.000',
        },
        {
          id: 'otp-2',
          createdAt: '2024-01-01T00:00:20.000',
          expiresAt: '2024-01-01T00:05:00.000',
        },
        {
          id: 'otp-3',
          createdAt: '2024-01-01T00:00:10.000',
          expiresAt: '2024-01-01T00:05:00.000',
        },
      ],
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(deleteExpired)
      .mockReturnValueOnce(recentOtpQuery);

    createClientMock.mockReturnValue(supabase as unknown);

    const result = await sendOTP('09123456789', 'login');

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('RATE_LIMIT');
    expect(result.expiresAt).toBe(
      new Date('2024-01-01T00:00:30.000Z').getTime() + 120000
    );
    expect(sendSmsMock).not.toHaveBeenCalled();
  });

  it('returns SEND_FAILED for invalid identifier format', async () => {
    const supabase = createSupabaseMock();

    const deleteExpired = createQueryMock({ count: 0, error: null });
    const recentOtpQuery = createQueryMock({
      data: null,
      error: { code: 'PGRST116' },
    });
    const deleteRemaining = createQueryMock({ count: 0, error: null });
    const insertOtp = createQueryMock({
      data: {
        id: 'otp-2',
        code: '123456',
        createdAt: '2024-01-01T00:01:00.000',
      },
      error: null,
    }) as ReturnType<typeof createQueryMock> & {
      insert: ReturnType<typeof vi.fn>;
    };
    const deleteInvalid = createQueryMock({ data: null, error: null });

    supabase.from
      .mockReturnValueOnce(deleteExpired)
      .mockReturnValueOnce(recentOtpQuery)
      .mockReturnValueOnce(deleteRemaining)
      .mockReturnValueOnce(insertOtp)
      .mockReturnValueOnce(deleteInvalid);

    createClientMock.mockReturnValue(supabase as unknown);

    const result = await sendOTP('invalid-identifier', 'register');

    expect(result).toEqual({
      success: false,
      expiresAt: expect.any(Number),
      error: 'فرمت ایمیل یا شماره تلفن نامعتبر است',
      errorCode: 'SEND_FAILED',
    });
    expect(deleteInvalid.delete).toHaveBeenCalled();
  });

  it('sends OTP email successfully', async () => {
    const supabase = createSupabaseMock();

    const deleteExpired = createQueryMock({ count: 0, error: null });
    const recentOtpQuery = createQueryMock({
      data: null,
      error: { code: 'PGRST116' },
    });
    const deleteRemaining = createQueryMock({ count: 0, error: null });
    const insertOtp = createQueryMock({
      data: {
        id: 'otp-3',
        code: '654321',
        createdAt: '2024-01-01T00:01:00.000',
      },
      error: null,
    }) as ReturnType<typeof createQueryMock> & {
      insert: ReturnType<typeof vi.fn>;
    };

    supabase.from
      .mockReturnValueOnce(deleteExpired)
      .mockReturnValueOnce(recentOtpQuery)
      .mockReturnValueOnce(deleteRemaining)
      .mockReturnValueOnce(insertOtp);

    createClientMock.mockReturnValue(supabase as unknown);
    sendEmailMock.mockResolvedValue({ success: true, messageId: 'msg-1' });

    const result = await sendOTP('user@example.com', 'login');

    expect(result.success).toBe(true);
    const insertedCode = (
      insertOtp.insert.mock.calls[0]?.[0] as { code?: string }
    )?.code;
    expect(insertedCode).toMatch(/^\d{6}$/);
    expect(sendEmailMock).toHaveBeenCalledWith(
      'user@example.com',
      insertedCode
    );
  });

  it('rejects expired OTPs', async () => {
    const supabase = createSupabaseMock();

    const fetchQuery = createQueryMock({
      data: {
        id: 'otp-4',
        code: '111111',
        attempts: 0,
        maxAttempts: 3,
        expiresAt: '2023-12-31T23:59:00.000',
      },
      error: null,
    });
    const deleteQuery = createQueryMock({ data: null, error: null });

    supabase.from
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(deleteQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await verifyOTP('09123456789', '111111', 'login');

    expect(result).toEqual({
      success: false,
      error: 'کد تایید منقضی شده است. لطفاً کد جدید درخواست کنید',
    });
    expect(deleteQuery.delete).toHaveBeenCalled();
  });

  it('returns attempts left on invalid OTP', async () => {
    const supabase = createSupabaseMock();

    const fetchQuery = createQueryMock({
      data: {
        id: 'otp-5',
        code: '222222',
        attempts: 1,
        maxAttempts: 3,
        expiresAt: '2024-01-01T00:10:00.000',
      },
      error: null,
    });
    const updateQuery = createQueryMock({ data: null, error: null });

    supabase.from
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(updateQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await verifyOTP('09123456789', '000000', 'login');

    expect(result).toEqual({
      success: false,
      error: 'کد تایید اشتباه است. 1 تلاش باقی‌مانده',
      attemptsLeft: 1,
    });
    expect(updateQuery.update).toHaveBeenCalledWith({ attempts: 2 });
  });

  it('accepts valid OTP and deletes it', async () => {
    const supabase = createSupabaseMock();

    const fetchQuery = createQueryMock({
      data: {
        id: 'otp-6',
        code: '333333',
        attempts: 0,
        maxAttempts: 3,
        expiresAt: '2024-01-01T00:10:00.000',
      },
      error: null,
    });
    const updateQuery = createQueryMock({ data: null, error: null });
    const deleteQuery = createQueryMock({ data: null, error: null });

    supabase.from
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(deleteQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await verifyOTP('09123456789', '333333', 'login');

    expect(result).toEqual({ success: true });
    expect(deleteQuery.delete).toHaveBeenCalled();
  });
});
