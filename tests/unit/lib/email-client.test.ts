import { describe, it, expect, vi, beforeEach } from 'vitest';

const resendSendMock = vi.fn();
const nodemailerSendMock = vi.fn();
const createTransportMock = vi.fn(() => ({ sendMail: nodemailerSendMock }));

vi.mock('resend', () => ({
  Resend: vi.fn(() => ({
    emails: { send: resendSendMock },
  })),
}));

vi.mock('nodemailer', () => ({
  default: {
    createTransport: createTransportMock,
    createTestAccount: vi.fn(),
    getTestMessageUrl: vi.fn(),
  },
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('email client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_SMTP_HOST;
    delete process.env.EMAIL_SMTP_PORT;
    delete process.env.EMAIL_SMTP_SECURE;
    delete process.env.EMAIL_SMTP_USER;
    delete process.env.EMAIL_SMTP_PASS;
    vi.resetModules();
  });

  it('sends OTP email via Resend when API key is configured', async () => {
    process.env.RESEND_API_KEY = 'resend-key';

    resendSendMock.mockResolvedValue({ data: { id: 'msg-1' }, error: null });

    const { sendOTPEmail } = await import('@/lib/email/client');

    const result = await sendOTPEmail('user@example.com', '123456');

    expect(result).toEqual({ success: true, messageId: 'msg-1' });
    expect(resendSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'user@example.com',
        subject: 'کد تایید کیتیا',
      })
    );
  });

  it('sends buyer confirmation when email is present', async () => {
    process.env.RESEND_API_KEY = 'resend-key';

    resendSendMock.mockResolvedValue({ data: { id: 'msg-2' }, error: null });

    const { sendBuyerOrderConfirmation } = await import('@/lib/email/client');

    const result = await sendBuyerOrderConfirmation({
      id: 'tx-1',
      transactionCode: 'KT-ABC123',
      amount: 1000,
      paymentMethod: 'ZARINPAL',
      fullName: 'Buyer',
      phone: '09123456789',
      email: 'buyer@example.com',
      shippingAddress: 'Addr',
      postalCode: '12345',
      createdAt: '2024-01-01T00:00:00.000Z',
      isGuest: true,
      items: [
        {
          quantity: 1,
          price: 1000,
          product: { name: 'Product', price: 1000 },
        },
      ],
    });

    expect(result).toEqual({ success: true, messageId: 'msg-2' });
    expect(resendSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'buyer@example.com',
        subject: '✅ تایید سفارش KT-ABC123 - کیتیا',
      })
    );
  });

  it('skips buyer confirmation when email is missing', async () => {
    const { sendBuyerOrderConfirmation } = await import('@/lib/email/client');

    const result = await sendBuyerOrderConfirmation({
      id: 'tx-1',
      transactionCode: 'KT-ABC123',
      amount: 1000,
      paymentMethod: 'ZARINPAL',
      fullName: 'Buyer',
      phone: '09123456789',
      email: null,
      shippingAddress: 'Addr',
      postalCode: '12345',
      createdAt: '2024-01-01T00:00:00.000Z',
      isGuest: true,
      items: [
        {
          quantity: 1,
          price: 1000,
          product: { name: 'Product', price: 1000 },
        },
      ],
    });

    expect(result).toEqual({
      success: false,
      error: 'Buyer email not provided',
    });
  });

  it('sends email via SMTP when Resend is disabled', async () => {
    process.env.EMAIL_SMTP_HOST = 'smtp.test';
    process.env.EMAIL_SMTP_PORT = '587';
    process.env.EMAIL_SMTP_USER = 'user';
    process.env.EMAIL_SMTP_PASS = 'pass';

    nodemailerSendMock.mockResolvedValue({ messageId: 'smtp-1' });

    const { sendOTPEmail } = await import('@/lib/email/client');

    const result = await sendOTPEmail('user@example.com', '999999');

    expect(result).toEqual({ success: true, messageId: 'smtp-1' });
    expect(createTransportMock).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.test', port: 587 })
    );
  });

  it('skips admin confirmation when ADMIN_EMAIL is missing', async () => {
    delete process.env.ADMIN_EMAIL;

    const { sendAdminOrderConfirmation } = await import('@/lib/email/client');

    const result = await sendAdminOrderConfirmation({
      id: 'tx-1',
      transactionCode: 'KT-ABC123',
      amount: 1000,
      paymentMethod: 'ZARINPAL',
      fullName: 'Buyer',
      phone: '09123456789',
      email: 'buyer@example.com',
      shippingAddress: 'Addr',
      postalCode: '12345',
      createdAt: '2024-01-01T00:00:00.000Z',
      isGuest: true,
      items: [
        {
          quantity: 1,
          price: 1000,
          product: { name: 'Product', price: 1000 },
        },
      ],
    });

    expect(result).toEqual({
      success: false,
      error: 'ADMIN_EMAIL not configured',
    });
  });
});
