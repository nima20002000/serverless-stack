import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const {
  createTransactionMock,
  verifyStockAvailabilityMock,
  getTransactionByCodeMock,
  createStripeCheckoutSessionMock,
  getStripeCurrencyMock,
  createPayPalOrderMock,
  getPayPalCurrencyMock,
  transactionUpdateMock,
} = vi.hoisted(() => ({
  createTransactionMock: vi.fn(),
  verifyStockAvailabilityMock: vi.fn(),
  getTransactionByCodeMock: vi.fn(),
  createStripeCheckoutSessionMock: vi.fn(),
  getStripeCurrencyMock: vi.fn(),
  createPayPalOrderMock: vi.fn(),
  getPayPalCurrencyMock: vi.fn(),
  transactionUpdateMock: vi.fn(),
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => null),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/lib/api/with-logging', () => ({
  withLogging: (fn: Function) => fn,
}));

vi.mock('@/lib/api/with-rate-limit', () => ({
  withRateLimit: (fn: Function) => fn,
}));

vi.mock('@/lib/rate-limit', () => ({
  apiLimiter: {},
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/request-utils', () => ({
  getClientInfo: vi.fn(() => ({
    ipAddress: '127.0.0.1',
    userAgent: 'vitest',
  })),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn(() => ({
            in: vi.fn(async () => ({
              data: [
                {
                  id: 'prod_1',
                  name: 'Test Product',
                  price: 10,
                  discountPercent: 0,
                  isActive: true,
                  hasVariants: false,
                },
              ],
              error: null,
            })),
          })),
        };
      }

      return {
        update: transactionUpdateMock.mockImplementation(() => ({
          eq: vi.fn(async () => ({ error: null })),
        })),
      };
    }),
  })),
}));

vi.mock('@/services/transaction-service', () => ({
  createTransaction: createTransactionMock,
  verifyStockAvailability: verifyStockAvailabilityMock,
  getTransactionByCode: getTransactionByCodeMock,
}));

vi.mock('@/services/user-service', () => ({
  updateUserShippingInfo: vi.fn(),
}));

vi.mock('@/services/promo-service', () => ({
  validatePromoCode: vi.fn(),
}));

vi.mock('@/lib/stripe/client', () => ({
  createStripeCheckoutSession: createStripeCheckoutSessionMock,
  getStripeCurrency: getStripeCurrencyMock,
}));

vi.mock('@/lib/paypal/client', () => ({
  createPayPalOrder: createPayPalOrderMock,
  getPayPalCurrency: getPayPalCurrencyMock,
}));

vi.mock('@/lib/utils/url', () => ({
  getAppBaseUrl: vi.fn(() => 'http://localhost:3000'),
}));

function createTransactionRequest(
  paymentMethod: unknown,
  headers: Record<string, string> = {}
) {
  return new NextRequest('http://localhost:3000/api/transactions/create', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({
      paymentMethod,
      items: [{ productId: 'prod_1', quantity: 1 }],
      shippingInfo: {
        fullName: 'Test Buyer',
        phone: '+12125551234',
        email: 'buyer@example.com',
        shippingCountry: 'Germany',
        shippingRegion: 'Berlin',
        shippingCity: 'Berlin',
        shippingAddressLine1: 'Invalidenstrasse 117',
        shippingAddressLine2: 'Floor 2',
        postalCode: '10115',
      },
    }),
  });
}

describe('POST /api/transactions/create payment provider contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createTransactionMock.mockResolvedValue({
      id: 'tx_1',
      transactionCode: 'TX-CURRENCY',
    });
    verifyStockAvailabilityMock.mockResolvedValue({
      available: true,
      errors: [],
      unavailableProductIds: [],
    });
    getStripeCurrencyMock.mockReturnValue('usd');
    getPayPalCurrencyMock.mockReturnValue('USD');
    createStripeCheckoutSessionMock.mockResolvedValue({
      id: 'cs_1',
      url: 'https://checkout.stripe.test/session',
      payment_intent: 'pi_1',
    });
    createPayPalOrderMock.mockResolvedValue({
      id: 'paypal_order_1',
      status: 'CREATED',
      approvalUrl: 'https://paypal.test/approve',
    });
    transactionUpdateMock.mockImplementation(() => ({
      eq: vi.fn(async () => ({ error: null })),
    }));
  });

  it('rejects unsupported payment providers before transaction creation', async () => {
    const { POST } = await import('@/app/api/transactions/create/route');

    const response = await POST(createTransactionRequest('BANK_TRANSFER'));

    expect(response.status).toBe(400);
    expect(createTransactionMock).not.toHaveBeenCalled();
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Invalid payment method.',
      })
    );
  });

  it('passes configured Stripe currency and amount to checkout creation', async () => {
    getStripeCurrencyMock.mockReturnValue('jpy');
    const { POST } = await import('@/app/api/transactions/create/route');

    const response = await POST(createTransactionRequest('STRIPE'));

    expect(response.status).toBe(200);
    expect(createTransactionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        shippingInfo: expect.objectContaining({
          shippingCountry: 'Germany',
          shippingRegion: 'Berlin',
          shippingCity: 'Berlin',
          shippingAddressLine1: 'Invalidenstrasse 117',
          shippingAddressLine2: 'Floor 2',
          postalCode: '10115',
          shippingAddress:
            'Invalidenstrasse 117\nFloor 2\nBerlin, Berlin, 10115\nGermany',
        }),
      })
    );
    expect(createStripeCheckoutSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'tx_1',
        transactionCode: 'TX-CURRENCY',
        amount: 10,
        currency: 'jpy',
        customerEmail: 'buyer@example.com',
      })
    );
    expect(await response.json()).toEqual(
      expect.objectContaining({
        success: true,
        paymentMethod: 'STRIPE',
        paymentUrl: 'https://checkout.stripe.test/session',
        amount: 10,
      })
    );
  });

  it('persists checkout locale in provider metadata for localized buyer emails', async () => {
    const { POST } = await import('@/app/api/transactions/create/route');

    const response = await POST(
      createTransactionRequest('STRIPE', { 'x-site-locale': 'de' })
    );

    expect(response.status).toBe(200);
    expect(transactionUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMetadata: expect.objectContaining({
          provider: 'STRIPE',
          locale: 'de',
        }),
      })
    );
  });

  it('passes configured PayPal currency and amount to order creation', async () => {
    getPayPalCurrencyMock.mockReturnValue('EUR');
    const { POST } = await import('@/app/api/transactions/create/route');

    const response = await POST(createTransactionRequest('PAYPAL'));

    expect(response.status).toBe(200);
    expect(createPayPalOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        transactionId: 'tx_1',
        transactionCode: 'TX-CURRENCY',
        amount: 10,
        currency: 'EUR',
      })
    );
    expect(await response.json()).toEqual(
      expect.objectContaining({
        success: true,
        paymentMethod: 'PAYPAL',
        paymentUrl: 'https://paypal.test/approve',
        amount: 10,
      })
    );
  });
});

describe('GET /api/transactions/status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns pending transaction data for checkout status polling', async () => {
    const { GET } = await import('@/app/api/transactions/status/route');

    getTransactionByCodeMock.mockResolvedValue({
      transactionCode: 'TX-PENDING',
      status: 'PENDING',
      paymentMethod: 'STRIPE',
      paymentProviderRef: 'cs_pending',
      stripePaymentIntentId: null,
      paypalOrderId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:01:00.000Z',
    });

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/transactions/status?code=TX-PENDING'
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      transactionCode: 'TX-PENDING',
      status: 'PENDING',
      paymentMethod: 'STRIPE',
      paymentProviderRef: 'cs_pending',
      stripePaymentIntentId: null,
      paypalOrderId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:01:00.000Z',
    });
  });
});
