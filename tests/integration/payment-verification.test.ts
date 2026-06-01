import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

type MockTransaction = {
  id: string;
  transactionCode: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  amount: number;
  gateway_fee: number;
  paymentProviderRef: string | null;
  paypalCaptureId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
};

const transactionStore = new Map<string, MockTransaction>();

vi.mock('@/lib/api/with-logging', () => ({
  withLogging: (fn: Function) => fn,
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripeCurrency: vi.fn(() => 'usd'),
  toStripeMinorUnits: vi.fn((amount: number) => Math.round(amount * 100)),
  verifyStripeWebhookEvent: vi.fn(),
}));

vi.mock('@/lib/paypal/client', () => ({
  getPayPalOrder: vi.fn(),
  getPayPalCurrency: vi.fn(() => 'USD'),
  parsePayPalAmountValue: vi.fn((value: string) => Number(value)),
  toPayPalAmountValue: vi.fn((amount: number, currency: string) =>
    currency === 'JPY' ? String(Math.round(amount)) : amount.toFixed(2)
  ),
  verifyPayPalWebhookSignature: vi.fn(),
}));

vi.mock('@/services/transaction-service', () => ({
  getTransactionById: vi.fn(),
  getTransactionByProviderRef: vi.fn(),
  updateTransactionStatus: vi.fn(),
}));

vi.mock('@/lib/payments/finalize-successful-transaction', () => ({
  finalizeSuccessfulTransaction: vi.fn(),
}));

import { verifyStripeWebhookEvent } from '@/lib/stripe/client';
import {
  getPayPalOrder,
  verifyPayPalWebhookSignature,
} from '@/lib/paypal/client';
import {
  getTransactionById,
  getTransactionByProviderRef,
  updateTransactionStatus,
} from '@/services/transaction-service';
import { finalizeSuccessfulTransaction } from '@/lib/payments/finalize-successful-transaction';

function createStripeWebhookRequest(event: Record<string, unknown>) {
  return new NextRequest(
    'http://localhost:3000/api/transactions/webhook-stripe',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 't=1,v1=sig',
      },
      body: JSON.stringify(event),
    }
  );
}

function createPayPalWebhookRequest(event: Record<string, unknown>) {
  return new NextRequest(
    'http://localhost:3000/api/transactions/webhook-paypal',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'paypal-auth-algo': 'SHA256withRSA',
        'paypal-cert-url': 'https://api-m.sandbox.paypal.com/certs',
        'paypal-transmission-id': 'transmission-1',
        'paypal-transmission-sig': 'sig',
        'paypal-transmission-time': new Date().toISOString(),
      },
      body: JSON.stringify(event),
    }
  );
}

describe('Payment Webhook Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    transactionStore.clear();

    vi.mocked(getTransactionById).mockImplementation(async (id: string) => {
      const transaction = transactionStore.get(id);
      if (!transaction) {
        throw new Error('Transaction not found');
      }
      return { ...transaction } as any;
    });

    vi.mocked(getTransactionByProviderRef).mockImplementation(
      async (providerRef: string) => {
        const transaction = Array.from(transactionStore.values()).find(
          (tx) => tx.paymentProviderRef === providerRef
        );
        if (!transaction) {
          throw new Error('Transaction not found');
        }
        return { ...transaction } as any;
      }
    );

    vi.mocked(updateTransactionStatus).mockImplementation(
      async (
        id: string,
        status: 'PENDING' | 'COMPLETED' | 'FAILED',
        paymentProviderRef?: string,
        _providerReferenceId?: number,
        providerFields?: {
          stripePaymentIntentId?: string;
          stripeCheckoutSessionId?: string;
          stripeChargeId?: string;
          paypalOrderId?: string;
          paypalCaptureId?: string;
        }
      ) => {
        const transaction = transactionStore.get(id);
        if (!transaction) {
          throw new Error('Transaction not found');
        }

        let statusChanged = true;
        if (status === 'COMPLETED' && transaction.status === 'COMPLETED') {
          statusChanged = false;
        }
        if (status === 'FAILED' && transaction.status !== 'PENDING') {
          statusChanged = false;
        }

        if (statusChanged) {
          transaction.status = status;
        }

        if (paymentProviderRef) {
          transaction.paymentProviderRef = paymentProviderRef;
        }
        if (providerFields?.paypalCaptureId) {
          transaction.paypalCaptureId = providerFields.paypalCaptureId;
        }
        if (providerFields?.stripePaymentIntentId) {
          transaction.stripePaymentIntentId =
            providerFields.stripePaymentIntentId;
        }
        if (providerFields?.stripeCheckoutSessionId) {
          transaction.stripeCheckoutSessionId =
            providerFields.stripeCheckoutSessionId;
        }

        transactionStore.set(id, transaction);

        return {
          ...transaction,
          statusChanged,
        } as any;
      }
    );
  });

  it('handles repeated Stripe completion callbacks idempotently', async () => {
    const { POST } =
      await import('@/app/api/transactions/webhook-stripe/route');

    transactionStore.set('tx-stripe-1', {
      id: 'tx-stripe-1',
      transactionCode: 'TX-STRIPE1',
      status: 'PENDING',
      amount: 10,
      gateway_fee: 0,
      paymentProviderRef: null,
    });

    vi.mocked(verifyStripeWebhookEvent).mockReturnValue({
      id: 'evt-stripe-1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_1',
          metadata: { transactionId: 'tx-stripe-1' },
          amount_total: 1000,
          currency: 'usd',
          payment_status: 'paid',
          payment_intent: 'pi_test_1',
        },
      },
    } as any);

    const requestPayload = { mocked: true };
    const firstResponse = await POST(
      createStripeWebhookRequest(requestPayload)
    );
    const secondResponse = await POST(
      createStripeWebhookRequest(requestPayload)
    );

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(await firstResponse.json()).toEqual(
      expect.objectContaining({
        handled: true,
        reason: 'completed',
      })
    );
    expect(await secondResponse.json()).toEqual(
      expect.objectContaining({
        handled: true,
        reason: 'already_completed',
      })
    );
    expect(finalizeSuccessfulTransaction).toHaveBeenCalledTimes(1);
    expect(transactionStore.get('tx-stripe-1')?.status).toBe('COMPLETED');
  });

  it('handles repeated PayPal completion callbacks idempotently', async () => {
    const { POST } =
      await import('@/app/api/transactions/webhook-paypal/route');

    transactionStore.set('tx-paypal-1', {
      id: 'tx-paypal-1',
      transactionCode: 'TX-PAYPAL1',
      status: 'PENDING',
      amount: 15,
      gateway_fee: 0,
      paymentProviderRef: 'ORDER-PP-1',
    });

    vi.mocked(verifyPayPalWebhookSignature).mockResolvedValue(true);
    vi.mocked(getPayPalOrder).mockResolvedValue({
      id: 'ORDER-PP-1',
      purchase_units: [
        {
          custom_id: 'tx-paypal-1',
          invoice_id: 'TX-PAYPAL1',
          amount: {
            currency_code: 'USD',
            value: '15.00',
          },
        },
      ],
    } as any);

    const eventPayload = {
      id: 'WH-PP-1',
      event_type: 'PAYMENT.CAPTURE.COMPLETED',
      resource: {
        id: 'CAP-PP-1',
        amount: {
          currency_code: 'USD',
          value: '15.00',
        },
        supplementary_data: {
          related_ids: {
            order_id: 'ORDER-PP-1',
          },
        },
      },
    };

    const firstResponse = await POST(createPayPalWebhookRequest(eventPayload));
    const secondResponse = await POST(createPayPalWebhookRequest(eventPayload));

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(await firstResponse.json()).toEqual(
      expect.objectContaining({
        handled: true,
        reason: 'completed',
      })
    );
    expect(await secondResponse.json()).toEqual(
      expect.objectContaining({
        handled: true,
        reason: 'already_completed',
      })
    );
    expect(finalizeSuccessfulTransaction).toHaveBeenCalledTimes(1);
    expect(transactionStore.get('tx-paypal-1')?.status).toBe('COMPLETED');
  });
});
