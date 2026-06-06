import { describe, it, expect, vi, beforeEach } from 'vitest';
import { log } from '@/lib/logger';

const resendSendMock = vi.fn();
const nodemailerSendMock = vi.fn();
const createTransportMock = vi.fn(() => ({ sendMail: nodemailerSendMock }));
const ResendMock = vi.fn(function ResendMock() {
  return {
    emails: { send: resendSendMock },
  };
});

vi.mock('resend', () => ({
  Resend: ResendMock,
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
  const logMock = vi.mocked(log);

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_SMTP;
    delete process.env.RESEND_SMTP_HOST;
    delete process.env.RESEND_SMTP_PORT;
    delete process.env.RESEND_SMTP_SECURE;
    delete process.env.RESEND_SMTP_USER;
    delete process.env.RESEND_SMTP_PASS;
    delete process.env.EMAIL_SMTP_HOST;
    delete process.env.EMAIL_SMTP_PORT;
    delete process.env.EMAIL_SMTP_SECURE;
    delete process.env.EMAIL_SMTP_USER;
    delete process.env.EMAIL_SMTP_PASS;
    delete process.env.EMAIL_FROM;
    delete process.env.EMAIL_FROM_ADDRESS;
    delete process.env.ADMIN_EMAIL;
    delete process.env.NEXT_PUBLIC_SITE_CURRENCY;
    delete process.env.NEXT_PUBLIC_SITE_LOCALE;
    delete process.env.NEXT_PUBLIC_SITE_CURRENCY_DISPLAY;
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
        subject: 'Your Serverless Stack sign-in code',
      })
    );
    const payload = resendSendMock.mock.calls[0][0];
    expect(payload.html).toContain('Use this verification code');
    expect(payload.html).toContain('<div class="code">123456</div>');
    expect(payload.text).toContain('Code: 123456');
    expect(payload.from).toBe('Serverless Stack <noreply@example.com>');
  });

  it('sends buyer confirmation when email is present', async () => {
    process.env.RESEND_API_KEY = 'resend-key';

    resendSendMock.mockResolvedValue({ data: { id: 'msg-2' }, error: null });

    const { sendBuyerOrderConfirmation } = await import('@/lib/email/client');

    const result = await sendBuyerOrderConfirmation({
      id: 'tx-1',
      transactionCode: 'KT-ABC123',
      amount: 1000,
      paymentMethod: 'STRIPE',
      fullName: 'Buyer',
      phone: '+12025556789',
      email: 'buyer@example.com',
      shippingAddress: 'Addr <script>alert(1)</script>',
      postalCode: '12345',
      createdAt: '2024-01-01T00:00:00.000Z',
      isGuest: true,
      items: [
        {
          quantity: 1,
          price: 1000,
          product: { name: 'Product <unsafe>', price: 1000 },
          variant: { name: 'Blue <XL>' },
        },
      ],
    });

    expect(result).toEqual({ success: true, messageId: 'msg-2' });
    expect(resendSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'buyer@example.com',
        subject: 'Order KT-ABC123 confirmed - Serverless Stack',
      })
    );
    const payload = resendSendMock.mock.calls[0][0];
    expect(payload.html).toContain('Product &lt;unsafe&gt;');
    expect(payload.html).toContain('Blue &lt;XL&gt;');
    expect(payload.html).toContain(
      'Addr &lt;script&gt;alert(1)&lt;/script&gt;'
    );
    expect(payload.html).not.toContain('<unsafe>');
    expect(payload.html).not.toContain('<script>alert(1)</script>');
    expect(payload.text).toContain('Order code: KT-ABC123');
    expect(payload.text).toContain('Payment method: Stripe');
    expect(payload.text).toContain('Product <unsafe> (Blue <XL>)');
  });

  it('skips buyer confirmation when email is missing', async () => {
    const { sendBuyerOrderConfirmation } = await import('@/lib/email/client');

    const result = await sendBuyerOrderConfirmation({
      id: 'tx-1',
      transactionCode: 'KT-ABC123',
      amount: 1000,
      paymentMethod: 'STRIPE',
      fullName: 'Buyer',
      phone: '+12025556789',
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
      paymentMethod: 'STRIPE',
      fullName: 'Buyer',
      phone: '+12025556789',
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
    expect(logMock.warn).toHaveBeenCalledWith(
      'ADMIN_EMAIL not configured, skipping admin confirmation email'
    );
    expect(resendSendMock).not.toHaveBeenCalled();
    expect(nodemailerSendMock).not.toHaveBeenCalled();
  });

  it('sends admin confirmation with configured recipient, reference, and sanitized customer fields', async () => {
    process.env.RESEND_API_KEY = 'resend-key';
    process.env.ADMIN_EMAIL = 'orders@example.com';
    resendSendMock.mockResolvedValue({
      data: { id: 'admin-msg' },
      error: null,
    });

    const { sendAdminOrderConfirmation } = await import('@/lib/email/client');

    const result = await sendAdminOrderConfirmation(
      {
        id: 'tx-1',
        transactionCode: 'KT-ABC123',
        amount: 1000,
        paymentMethod: 'PAYPAL',
        fullName: 'Buyer <Name>',
        phone: '+12025556789',
        email: 'buyer@example.com',
        shippingAddress: 'Addr',
        postalCode: '12345',
        createdAt: '2024-01-01T00:00:00.000Z',
        isGuest: false,
        items: [
          {
            quantity: 2,
            price: 500,
            product: { name: 'Product', price: 500 },
          },
        ],
      },
      98765
    );

    expect(result).toEqual({ success: true, messageId: 'admin-msg' });
    expect(resendSendMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'orders@example.com',
        subject: 'New order KT-ABC123 - Buyer <Name>',
      })
    );
    const payload = resendSendMock.mock.calls[0][0];
    expect(payload.html).toContain('Payment method:</strong> PayPal');
    expect(payload.html).toContain('Payment reference:</strong> 98765');
    expect(payload.html).toContain('Buyer &lt;Name&gt;');
    expect(payload.html).not.toContain('Buyer <Name>');
    expect(payload.text).toContain('Account type: Registered user');
    expect(payload.text).toContain('Payment reference: 98765');
  });

  it('formats buyer and admin order emails with the configured store currency', async () => {
    process.env.RESEND_API_KEY = 'resend-key';
    process.env.ADMIN_EMAIL = 'orders@example.com';
    process.env.NEXT_PUBLIC_SITE_CURRENCY = 'JPY';
    process.env.NEXT_PUBLIC_SITE_LOCALE = 'ja-JP';
    process.env.NEXT_PUBLIC_SITE_CURRENCY_DISPLAY = 'code';
    resendSendMock.mockResolvedValue({
      data: { id: 'currency-msg' },
      error: null,
    });

    const { sendBuyerOrderConfirmation, sendAdminOrderConfirmation } =
      await import('@/lib/email/client');
    const total = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      currencyDisplay: 'code',
    }).format(3035);
    const unitPrice = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      currencyDisplay: 'code',
    }).format(1234);
    const lineTotal = new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      currencyDisplay: 'code',
    }).format(2468);
    const transaction = {
      id: 'tx-currency',
      transactionCode: 'KT-JPY123',
      amount: 3035,
      paymentMethod: 'STRIPE' as const,
      fullName: 'Buyer',
      phone: '+12025556789',
      email: 'buyer@example.com',
      shippingAddress: 'Addr',
      postalCode: '12345',
      createdAt: '2024-01-01T00:00:00.000Z',
      isGuest: true,
      items: [
        {
          quantity: 2,
          price: 1234,
          product: { name: 'Jacket', price: 1234 },
        },
        {
          quantity: 1,
          price: 567,
          product: { name: 'Scarf', price: 567 },
        },
      ],
    };

    await sendBuyerOrderConfirmation(transaction);
    await sendAdminOrderConfirmation(transaction, 456);

    const buyerPayload = resendSendMock.mock.calls[0][0];
    const adminPayload = resendSendMock.mock.calls[1][0];

    expect(buyerPayload.text).toContain(`Total: ${total}`);
    expect(buyerPayload.text).toContain(`Unit price: ${unitPrice}`);
    expect(buyerPayload.text).toContain(`Line total: ${lineTotal}`);
    expect(buyerPayload.html).toContain(total);
    expect(buyerPayload.html).toContain(unitPrice);
    expect(buyerPayload.html).toContain(lineTotal);
    expect(adminPayload.text).toContain(`Total: ${total}`);
    expect(adminPayload.text).toContain(`Unit price: ${unitPrice}`);
    expect(adminPayload.text).toContain(`Line total: ${lineTotal}`);
    expect(adminPayload.html).toContain(total);
    expect(adminPayload.html).toContain(unitPrice);
    expect(adminPayload.html).toContain(lineTotal);
  });

  it('returns provider failure details without logging configured secrets', async () => {
    process.env.RESEND_API_KEY = 'resend-secret-value';
    resendSendMock.mockResolvedValue({
      data: null,
      error: { message: 'provider rejected' },
    });

    const { sendOTPEmail } = await import('@/lib/email/client');

    const result = await sendOTPEmail('user@example.com', '654321');

    expect(result).toEqual({ success: false, error: 'provider rejected' });
    expect(logMock.error).toHaveBeenCalledWith('Resend API error', {
      error: 'provider rejected',
    });
    expect(JSON.stringify(logMock.error.mock.calls)).not.toContain(
      'resend-secret-value'
    );
  });
});
