import { NextRequest, NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { withLogging } from '@/lib/api/with-logging';
import { log } from '@/lib/logger';
import {
  getStripeCurrency,
  toStripeMinorUnits,
  verifyStripeWebhookEvent,
} from '@/lib/stripe/client';
import {
  getTransactionById,
  updateTransactionStatus,
} from '@/services/transaction-service';
import { finalizeSuccessfulTransaction } from '@/lib/payments/finalize-successful-transaction';

export const dynamic = 'force-dynamic';

function getMetadataTransactionId(
  metadata: Stripe.Metadata | null | undefined
): string | null {
  const transactionId = metadata?.transactionId;
  if (!transactionId || typeof transactionId !== 'string') {
    return null;
  }

  return transactionId;
}

async function safelyGetTransaction(transactionId: string) {
  try {
    return await getTransactionById(transactionId);
  } catch (error) {
    log.warn('Stripe webhook referenced unknown transaction', {
      transactionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

function amountMatchesTransaction(
  transactionAmount: number,
  gatewayFee: number | null,
  amountMinorUnits: number | null,
  currency: string | null
): boolean {
  if (amountMinorUnits === null || !currency) {
    return false;
  }

  const expectedCurrency = getStripeCurrency();
  const expectedMinorUnits = toStripeMinorUnits(
    Number(transactionAmount) + Number(gatewayFee || 0),
    expectedCurrency
  );

  return (
    expectedCurrency === currency.toLowerCase() &&
    expectedMinorUnits === amountMinorUnits
  );
}

async function handleSuccessfulEvent(options: {
  transactionId: string;
  providerRef: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  adminRefId?: number;
  eventId: string;
  eventType: string;
  isE2E: boolean;
}) {
  const transaction = await safelyGetTransaction(options.transactionId);
  if (!transaction) {
    return {
      handled: false,
      reason: 'unknown_transaction',
    };
  }

  const statusUpdate = await updateTransactionStatus(
    transaction.id,
    'COMPLETED',
    options.providerRef,
    undefined,
    {
      stripeCheckoutSessionId: options.stripeCheckoutSessionId,
      stripePaymentIntentId: options.stripePaymentIntentId,
      stripeChargeId: options.stripeChargeId,
    }
  );

  if (!statusUpdate.statusChanged) {
    log.info('Stripe webhook completion was idempotent no-op', {
      eventId: options.eventId,
      eventType: options.eventType,
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
    });

    return {
      handled: true,
      reason: 'already_completed',
    };
  }

  await finalizeSuccessfulTransaction({
    source: 'stripe-webhook',
    transaction,
    adminRefId: options.adminRefId,
    skipNotifications: options.isE2E,
  });

  return {
    handled: true,
    reason: 'completed',
  };
}

async function handleFailedEvent(options: {
  transactionId: string;
  providerRef: string;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  stripeChargeId?: string;
  eventId: string;
  eventType: string;
}) {
  const transaction = await safelyGetTransaction(options.transactionId);
  if (!transaction) {
    return {
      handled: false,
      reason: 'unknown_transaction',
    };
  }

  const statusUpdate = await updateTransactionStatus(
    transaction.id,
    'FAILED',
    options.providerRef,
    undefined,
    {
      stripeCheckoutSessionId: options.stripeCheckoutSessionId,
      stripePaymentIntentId: options.stripePaymentIntentId,
      stripeChargeId: options.stripeChargeId,
    }
  );

  if (!statusUpdate.statusChanged) {
    log.info('Stripe webhook failed-status update was idempotent no-op', {
      eventId: options.eventId,
      eventType: options.eventType,
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      currentStatus: statusUpdate.status,
    });
  }

  return {
    handled: true,
    reason: 'failed',
  };
}

async function postHandler(req: NextRequest) {
  const startTime = Date.now();
  const signature = req.headers.get('stripe-signature');
  const isE2E =
    process.env.E2E_TEST === 'true' || req.headers.get('x-e2e-test') === 'true';

  if (!signature) {
    log.warn('Stripe webhook rejected: missing signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  const payload = await req.text();
  let event: Stripe.Event;

  try {
    event = verifyStripeWebhookEvent(payload, signature);
  } catch (error) {
    log.warn('Stripe webhook rejected: signature verification failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { error: 'Invalid Stripe webhook signature' },
      { status: 400 }
    );
  }

  log.info('Stripe webhook received', {
    eventId: event.id,
    eventType: event.type,
  });

  const eventType: string = event.type;
  let result: { handled: boolean; reason: string } = {
    handled: false,
    reason: 'ignored',
  };

  switch (eventType) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadataTxId = getMetadataTransactionId(session.metadata);
      const transactionId =
        metadataTxId ||
        (typeof session.client_reference_id === 'string'
          ? session.client_reference_id
          : null);

      if (!transactionId || !session.id) {
        result = {
          handled: false,
          reason: 'missing_transaction_reference',
        };
        break;
      }

      const transaction = await safelyGetTransaction(transactionId);
      if (!transaction) {
        result = {
          handled: false,
          reason: 'unknown_transaction',
        };
        break;
      }

      if (
        !amountMatchesTransaction(
          Number(transaction.amount),
          transaction.gateway_fee,
          session.amount_total,
          session.currency
        )
      ) {
        log.error('Stripe webhook amount/currency mismatch', {
          eventId: event.id,
          eventType: event.type,
          transactionId: transaction.id,
          transactionCode: transaction.transactionCode,
          expectedCurrency: getStripeCurrency(),
          receivedCurrency: session.currency,
          receivedAmountMinor: session.amount_total,
        });
        result = {
          handled: false,
          reason: 'amount_or_currency_mismatch',
        };
        break;
      }

      if (session.payment_status !== 'paid') {
        log.info(
          'Stripe session event is not paid yet, keeping pending state',
          {
            eventId: event.id,
            eventType: event.type,
            transactionId: transaction.id,
            transactionCode: transaction.transactionCode,
            paymentStatus: session.payment_status,
          }
        );
        result = {
          handled: false,
          reason: 'session_not_paid',
        };
        break;
      }

      const paymentIntentId =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : undefined;

      result = await handleSuccessfulEvent({
        transactionId: transaction.id,
        providerRef: session.id,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        eventId: event.id,
        eventType: event.type,
        isE2E,
      });
      break;
    }

    case 'payment_intent.succeeded': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const transactionId = getMetadataTransactionId(intent.metadata);

      if (!transactionId) {
        result = {
          handled: false,
          reason: 'missing_transaction_metadata',
        };
        break;
      }

      const transaction = await safelyGetTransaction(transactionId);
      if (!transaction) {
        result = {
          handled: false,
          reason: 'unknown_transaction',
        };
        break;
      }

      if (
        !amountMatchesTransaction(
          Number(transaction.amount),
          transaction.gateway_fee,
          intent.amount_received || intent.amount || null,
          intent.currency
        )
      ) {
        log.error('Stripe payment_intent amount/currency mismatch', {
          eventId: event.id,
          transactionId: transaction.id,
          transactionCode: transaction.transactionCode,
          expectedCurrency: getStripeCurrency(),
          receivedCurrency: intent.currency,
          receivedAmountMinor: intent.amount_received || intent.amount,
        });
        result = {
          handled: false,
          reason: 'amount_or_currency_mismatch',
        };
        break;
      }

      const latestChargeId =
        typeof intent.latest_charge === 'string'
          ? intent.latest_charge
          : undefined;

      result = await handleSuccessfulEvent({
        transactionId: transaction.id,
        providerRef: transaction.paymentProviderRef || intent.id,
        stripePaymentIntentId: intent.id,
        stripeChargeId: latestChargeId,
        eventId: event.id,
        eventType: event.type,
        isE2E,
      });
      break;
    }

    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadataTxId = getMetadataTransactionId(session.metadata);
      const transactionId =
        metadataTxId ||
        (typeof session.client_reference_id === 'string'
          ? session.client_reference_id
          : null);

      if (!transactionId || !session.id) {
        result = {
          handled: false,
          reason: 'missing_transaction_reference',
        };
        break;
      }

      result = await handleFailedEvent({
        transactionId,
        providerRef: session.id,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : undefined,
        eventId: event.id,
        eventType: event.type,
      });
      break;
    }

    case 'payment_intent.payment_failed':
    case 'payment_intent.canceled': {
      const intent = event.data.object as Stripe.PaymentIntent;
      const transactionId = getMetadataTransactionId(intent.metadata);

      if (!transactionId) {
        result = {
          handled: false,
          reason: 'missing_transaction_metadata',
        };
        break;
      }

      result = await handleFailedEvent({
        transactionId,
        providerRef: intent.id,
        stripePaymentIntentId: intent.id,
        stripeChargeId:
          typeof intent.latest_charge === 'string'
            ? intent.latest_charge
            : undefined,
        eventId: event.id,
        eventType: event.type,
      });
      break;
    }

    case 'charge.refunded':
    case 'charge.refund.updated': {
      const charge = event.data.object as Stripe.Charge;
      log.warn('Stripe refund lifecycle event received', {
        eventId: event.id,
        eventType: event.type,
        chargeId: charge.id,
        paymentIntentId:
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : null,
        refunded: charge.refunded,
        amountRefunded: charge.amount_refunded,
      });
      result = {
        handled: true,
        reason: 'refund_event_logged',
      };
      break;
    }

    default: {
      log.info('Stripe webhook event ignored', {
        eventId: event.id,
        eventType: event.type,
      });
      result = {
        handled: false,
        reason: 'event_not_mapped',
      };
    }
  }

  return NextResponse.json({
    received: true,
    eventId: event.id,
    eventType: event.type,
    handled: result.handled,
    reason: result.reason,
    elapsedMs: Date.now() - startTime,
  });
}

export const POST = withLogging(
  postHandler,
  'POST /api/transactions/webhook-stripe'
);
