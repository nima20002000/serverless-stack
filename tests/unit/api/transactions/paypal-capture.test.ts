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

vi.mock('@/lib/utils/url', () => ({
  createRedirectUrl: vi.fn((path: string) => new URL(path, 'http://localhost')),
}));

vi.mock('@/lib/paypal/client', () => ({
  capturePayPalOrder: vi.fn(),
  getPayPalCurrency: vi.fn(() => 'USD'),
  parsePayPalAmountValue: vi.fn((value: string) => Number(value)),
  toPayPalAmountValue: vi.fn((amount: number, currency: string) =>
    currency === 'JPY' ? String(Math.round(amount)) : amount.toFixed(2)
  ),
}));

vi.mock('@/services/transaction-service', () => ({
  getTransactionById: vi.fn(),
  getTransactionByProviderRef: vi.fn(),
  updateTransactionStatus: vi.fn(),
}));

vi.mock('@/lib/payments/finalize-successful-transaction', () => ({
  finalizeSuccessfulTransaction: vi.fn(),
}));

import { capturePayPalOrder } from '@/lib/paypal/client';
import {
  getTransactionByProviderRef,
  updateTransactionStatus,
} from '@/services/transaction-service';
import { finalizeSuccessfulTransaction } from '@/lib/payments/finalize-successful-transaction';

function createCaptureRequest(body: Record<string, unknown>) {
  return new NextRequest(
    'http://localhost:3000/api/transactions/paypal/capture',
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

describe('POST /api/transactions/paypal/capture', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns idempotent success for duplicate capture requests', async () => {
    const { POST } =
      await import('@/app/api/transactions/paypal/capture/route');

    vi.mocked(getTransactionByProviderRef).mockResolvedValue({
      id: 'tx_1',
      transactionCode: 'TX-DUPCAP',
      status: 'COMPLETED',
      amount: 10,
      gateway_fee: 0,
      paymentProviderRef: 'ORDER-1',
      paypalOrderId: 'ORDER-1',
      paypalCaptureId: 'CAP-1',
    } as any);

    const response = await POST(createCaptureRequest({ orderId: 'ORDER-1' }));

    expect(capturePayPalOrder).not.toHaveBeenCalled();
    expect(updateTransactionStatus).not.toHaveBeenCalled();
    expect(finalizeSuccessfulTransaction).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        success: true,
        orderId: 'ORDER-1',
        captureId: 'CAP-1',
        transactionId: 'tx_1',
        transactionCode: 'TX-DUPCAP',
        alreadyCompleted: true,
      })
    );
  });

  it('rejects capture when PayPal amount does not match the transaction', async () => {
    const { POST } =
      await import('@/app/api/transactions/paypal/capture/route');

    vi.mocked(getTransactionByProviderRef).mockResolvedValue({
      id: 'tx_2',
      transactionCode: 'TX-AMTCAP',
      status: 'PENDING',
      amount: 10,
      gateway_fee: 0,
      paymentProviderRef: 'ORDER-2',
      paypalOrderId: 'ORDER-2',
    } as any);
    vi.mocked(capturePayPalOrder).mockResolvedValue({
      id: 'ORDER-2',
      status: 'COMPLETED',
      purchase_units: [
        {
          custom_id: 'tx_2',
          invoice_id: 'TX-AMTCAP',
          amount: { currency_code: 'USD', value: '10.00' },
          payments: {
            captures: [
              {
                id: 'CAP-2',
                status: 'COMPLETED',
                amount: { currency_code: 'USD', value: '9.99' },
              },
            ],
          },
        },
      ],
    } as any);

    const response = await POST(createCaptureRequest({ orderId: 'ORDER-2' }));

    expect(updateTransactionStatus).not.toHaveBeenCalled();
    expect(finalizeSuccessfulTransaction).not.toHaveBeenCalled();
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'PayPal amount or currency does not match the transaction',
      })
    );
  });
});
