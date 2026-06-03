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

vi.mock('@/lib/stripe/client', () => ({
  getStripeCurrency: vi.fn(() => 'usd'),
  toStripeMinorUnits: vi.fn((amount: number) => Math.round(amount * 100)),
  verifyStripeWebhookEvent: vi.fn(),
}));

vi.mock('@/services/transaction-service', () => ({
  getTransactionById: vi.fn(),
  updateTransactionStatus: vi.fn(),
}));

vi.mock('@/lib/payments/finalize-successful-transaction', () => ({
  finalizeSuccessfulTransaction: vi.fn(),
}));

import { verifyStripeWebhookEvent } from '@/lib/stripe/client';
import {
  getTransactionById,
  updateTransactionStatus,
} from '@/services/transaction-service';
import { finalizeSuccessfulTransaction } from '@/lib/payments/finalize-successful-transaction';

function createStripeRequest(
  payload: Record<string, unknown>,
  signature = 't=1,v1=sig'
) {
  return new NextRequest(
    'http://localhost:3000/api/transactions/webhook-stripe',
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': signature,
      },
      body: JSON.stringify(payload),
    }
  );
}

describe('POST /api/transactions/webhook-stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects webhook without stripe-signature header', async () => {
    const { POST } =
      await import('@/app/api/transactions/webhook-stripe/route');

    const req = new NextRequest(
      'http://localhost:3000/api/transactions/webhook-stripe',
      {
        method: 'POST',
        body: JSON.stringify({}),
      }
    );

    const response = await POST(req);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Missing stripe-signature header',
      })
    );
  });

  it('rejects webhook when Stripe signature verification fails', async () => {
    const { POST } =
      await import('@/app/api/transactions/webhook-stripe/route');

    vi.mocked(verifyStripeWebhookEvent).mockImplementation(() => {
      throw new Error('bad signature');
    });

    const response = await POST(createStripeRequest({ bad: 'payload' }));

    expect(response.status).toBe(400);
    expect(updateTransactionStatus).not.toHaveBeenCalled();
    expect(finalizeSuccessfulTransaction).not.toHaveBeenCalled();
    expect(await response.json()).toEqual(
      expect.objectContaining({
        error: 'Invalid Stripe webhook signature',
      })
    );
  });

  it('completes transaction on checkout.session.completed and finalizes once', async () => {
    const { POST } =
      await import('@/app/api/transactions/webhook-stripe/route');

    vi.mocked(verifyStripeWebhookEvent).mockReturnValue({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_1',
          metadata: { transactionId: 'tx_1' },
          amount_total: 1000,
          currency: 'usd',
          payment_status: 'paid',
          payment_intent: 'pi_1',
        },
      },
    } as any);

    vi.mocked(getTransactionById).mockResolvedValue({
      id: 'tx_1',
      transactionCode: 'TX-ABC123',
      amount: 10,
      gateway_fee: 0,
      paymentProviderRef: null,
    } as any);

    vi.mocked(updateTransactionStatus).mockResolvedValue({
      id: 'tx_1',
      status: 'COMPLETED',
      statusChanged: true,
    } as any);

    const response = await POST(createStripeRequest({ some: 'payload' }));

    expect(updateTransactionStatus).toHaveBeenCalledWith(
      'tx_1',
      'COMPLETED',
      'cs_1',
      undefined,
      {
        stripeCheckoutSessionId: 'cs_1',
        stripePaymentIntentId: 'pi_1',
        stripeChargeId: undefined,
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

  it('returns idempotent completion when transaction is already completed', async () => {
    const { POST } =
      await import('@/app/api/transactions/webhook-stripe/route');

    vi.mocked(verifyStripeWebhookEvent).mockReturnValue({
      id: 'evt_2',
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: 'pi_2',
          metadata: { transactionId: 'tx_2' },
          amount_received: 2500,
          currency: 'usd',
          latest_charge: 'ch_2',
        },
      },
    } as any);

    vi.mocked(getTransactionById).mockResolvedValue({
      id: 'tx_2',
      transactionCode: 'TX-XYZ789',
      amount: 25,
      gateway_fee: 0,
      paymentProviderRef: 'pi_2',
    } as any);

    vi.mocked(updateTransactionStatus).mockResolvedValue({
      id: 'tx_2',
      status: 'COMPLETED',
      statusChanged: false,
    } as any);

    const response = await POST(createStripeRequest({ other: 'payload' }));

    expect(finalizeSuccessfulTransaction).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        handled: true,
        reason: 'already_completed',
      })
    );
  });

  it('does not complete transaction when Stripe amount does not match', async () => {
    const { POST } =
      await import('@/app/api/transactions/webhook-stripe/route');

    vi.mocked(verifyStripeWebhookEvent).mockReturnValue({
      id: 'evt_amount_mismatch',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_amount_mismatch',
          metadata: { transactionId: 'tx_amount_mismatch' },
          amount_total: 999,
          currency: 'usd',
          payment_status: 'paid',
          payment_intent: 'pi_amount_mismatch',
        },
      },
    } as any);

    vi.mocked(getTransactionById).mockResolvedValue({
      id: 'tx_amount_mismatch',
      transactionCode: 'TX-AMOUNT',
      amount: 10,
      gateway_fee: 0,
      paymentProviderRef: 'cs_amount_mismatch',
      stripeCheckoutSessionId: 'cs_amount_mismatch',
    } as any);

    const response = await POST(createStripeRequest({ amount: 'mismatch' }));

    expect(updateTransactionStatus).not.toHaveBeenCalled();
    expect(finalizeSuccessfulTransaction).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        handled: false,
        reason: 'amount_or_currency_mismatch',
      })
    );
  });

  it('does not complete transaction when Stripe currency does not match', async () => {
    const { POST } =
      await import('@/app/api/transactions/webhook-stripe/route');

    vi.mocked(verifyStripeWebhookEvent).mockReturnValue({
      id: 'evt_currency_mismatch',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_currency_mismatch',
          metadata: { transactionId: 'tx_currency_mismatch' },
          amount_total: 1000,
          currency: 'eur',
          payment_status: 'paid',
          payment_intent: 'pi_currency_mismatch',
        },
      },
    } as any);

    vi.mocked(getTransactionById).mockResolvedValue({
      id: 'tx_currency_mismatch',
      transactionCode: 'TX-CURRENCY',
      amount: 10,
      gateway_fee: 0,
      paymentProviderRef: 'cs_currency_mismatch',
      stripeCheckoutSessionId: 'cs_currency_mismatch',
    } as any);

    const response = await POST(createStripeRequest({ currency: 'mismatch' }));

    expect(updateTransactionStatus).not.toHaveBeenCalled();
    expect(finalizeSuccessfulTransaction).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        handled: false,
        reason: 'amount_or_currency_mismatch',
      })
    );
  });

  it('does not complete transaction when Stripe provider reference mismatches', async () => {
    const { POST } =
      await import('@/app/api/transactions/webhook-stripe/route');

    vi.mocked(verifyStripeWebhookEvent).mockReturnValue({
      id: 'evt_ref_mismatch',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_wrong',
          metadata: { transactionId: 'tx_ref_mismatch' },
          amount_total: 1000,
          currency: 'usd',
          payment_status: 'paid',
          payment_intent: 'pi_ref_mismatch',
        },
      },
    } as any);

    vi.mocked(getTransactionById).mockResolvedValue({
      id: 'tx_ref_mismatch',
      transactionCode: 'TX-REFMIS',
      amount: 10,
      gateway_fee: 0,
      paymentProviderRef: 'cs_expected',
      stripeCheckoutSessionId: 'cs_expected',
    } as any);

    const response = await POST(createStripeRequest({ ref: 'mismatch' }));

    expect(updateTransactionStatus).not.toHaveBeenCalled();
    expect(finalizeSuccessfulTransaction).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(
      expect.objectContaining({
        handled: false,
        reason: 'provider_reference_mismatch',
      })
    );
  });
});
