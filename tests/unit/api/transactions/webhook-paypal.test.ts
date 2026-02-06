import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

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

vi.mock('@/lib/paypal/client', () => ({
  getPayPalOrder: vi.fn(),
  getPayPalCurrency: vi.fn(() => 'USD'),
  parsePayPalAmountValue: vi.fn((value: string) => Number(value)),
  verifyPayPalWebhookSignature: vi.fn(),
}));

vi.mock('@/services/transaction-service', () => ({
  getTransactionByProviderRef: vi.fn(),
  updateTransactionStatus: vi.fn(),
}));

vi.mock('@/lib/payments/finalize-successful-transaction', () => ({
  finalizeSuccessfulTransaction: vi.fn(),
}));

import {
  getPayPalOrder,
  verifyPayPalWebhookSignature,
} from '@/lib/paypal/client';
import {
  getTransactionByProviderRef,
  updateTransactionStatus,
} from '@/services/transaction-service';
import { finalizeSuccessfulTransaction } from '@/lib/payments/finalize-successful-transaction';

function createPayPalHeaders() {
  return {
    'content-type': 'application/json',
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'https://api-m.paypal.com/cert',
    'paypal-transmission-id': 'transmission-id-1',
    'paypal-transmission-sig': 'sig',
    'paypal-transmission-time': new Date().toISOString(),
  };
}

function createPayPalRequest(payload: Record<string, unknown>) {
  return new NextRequest(
    'http://localhost:3000/api/transactions/webhook-paypal',
    {
      method: 'POST',
      headers: createPayPalHeaders(),
      body: JSON.stringify(payload),
    }
  );
}

describe('POST /api/transactions/webhook-paypal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects webhook when required headers are missing', async () => {
    const { POST } =
      await import('@/app/api/transactions/webhook-paypal/route');

    const req = new NextRequest(
      'http://localhost:3000/api/transactions/webhook-paypal',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      }
    );

    const response = await POST(req);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Missing required PayPal webhook headers',
      })
    );
  });

  it('completes transaction on PAYMENT.CAPTURE.COMPLETED', async () => {
    const { POST } =
      await import('@/app/api/transactions/webhook-paypal/route');

    vi.mocked(verifyPayPalWebhookSignature).mockResolvedValue(true);
    vi.mocked(getTransactionByProviderRef).mockResolvedValue({
      id: 'tx_1',
      transactionCode: 'KT-ABC123',
      amount: 10,
      gateway_fee: 0,
      paymentProviderRef: 'ORDER-1',
    } as any);
    vi.mocked(getPayPalOrder).mockResolvedValue({
      id: 'ORDER-1',
      purchase_units: [
        {
          custom_id: 'tx_1',
          invoice_id: 'KT-ABC123',
          amount: { currency_code: 'USD', value: '10.00' },
        },
      ],
    } as any);
    vi.mocked(updateTransactionStatus).mockResolvedValue({
      id: 'tx_1',
      status: 'COMPLETED',
      statusChanged: true,
    } as any);

    const response = await POST(
      createPayPalRequest({
        id: 'WH-1',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAP-1',
          amount: { currency_code: 'USD', value: '10.00' },
          supplementary_data: {
            related_ids: {
              order_id: 'ORDER-1',
            },
          },
        },
      })
    );

    expect(updateTransactionStatus).toHaveBeenCalledWith(
      'tx_1',
      'COMPLETED',
      'ORDER-1',
      undefined,
      {
        paypalOrderId: 'ORDER-1',
        paypalCaptureId: 'CAP-1',
      }
    );
    expect(finalizeSuccessfulTransaction).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        handled: true,
        reason: 'completed',
      })
    );
  });

  it('keeps idempotent no-op behavior when completion already applied', async () => {
    const { POST } =
      await import('@/app/api/transactions/webhook-paypal/route');

    vi.mocked(verifyPayPalWebhookSignature).mockResolvedValue(true);
    vi.mocked(getTransactionByProviderRef).mockResolvedValue({
      id: 'tx_2',
      transactionCode: 'KT-DEF456',
      amount: 20,
      gateway_fee: 0,
      paymentProviderRef: 'ORDER-2',
    } as any);
    vi.mocked(getPayPalOrder).mockResolvedValue({
      id: 'ORDER-2',
      purchase_units: [
        {
          custom_id: 'tx_2',
          invoice_id: 'KT-DEF456',
          amount: { currency_code: 'USD', value: '20.00' },
        },
      ],
    } as any);
    vi.mocked(updateTransactionStatus).mockResolvedValue({
      id: 'tx_2',
      status: 'COMPLETED',
      statusChanged: false,
    } as any);

    const response = await POST(
      createPayPalRequest({
        id: 'WH-2',
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: 'CAP-2',
          amount: { currency_code: 'USD', value: '20.00' },
          supplementary_data: {
            related_ids: {
              order_id: 'ORDER-2',
            },
          },
        },
      })
    );

    expect(finalizeSuccessfulTransaction).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        handled: true,
        reason: 'already_completed',
      })
    );
  });
});
