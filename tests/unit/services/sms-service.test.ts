import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendOrderConfirmation } from '@/services/sms-service';
import { sendOrderConfirmationSMS } from '@/lib/kavenegar/client';

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/kavenegar/client', () => ({
  sendOrderConfirmationSMS: vi.fn(),
}));

describe('sms-service', () => {
  const sendMock = vi.mocked(sendOrderConfirmationSMS);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid phone numbers before sending', async () => {
    const result = await sendOrderConfirmation('90123456789', 'KT-ABC123');

    expect(result).toEqual({
      success: false,
      error: 'فرمت شماره تلفن نامعتبر است',
    });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('returns provider result for valid phone numbers', async () => {
    sendMock.mockResolvedValue({ success: true, messageId: 123 });

    const result = await sendOrderConfirmation('09123456789', 'KT-ABC123');

    expect(result).toEqual({ success: true, messageId: 123 });
    expect(sendMock).toHaveBeenCalledWith('09123456789', 'KT-ABC123');
  });

  it('returns generic error when provider throws', async () => {
    sendMock.mockRejectedValue(new Error('boom'));

    const result = await sendOrderConfirmation('09123456789', 'KT-ABC123');

    expect(result).toEqual({
      success: false,
      error: 'خطا در ارسال پیامک تایید سفارش',
    });
  });
});
