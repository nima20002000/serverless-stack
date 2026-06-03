import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import {
  getPayPalOrder,
  getPayPalCurrency,
  parsePayPalAmountValue,
  toPayPalAmountValue,
  verifyPayPalWebhookSignature,
} from '@/lib/paypal/client';
import { withLogging } from '@/lib/api/with-logging';
import { log } from '@/lib/logger';
import {
  getTransactionByProviderRef,
  updateTransactionStatus,
} from '@/services/transaction-service';
import { finalizeSuccessfulTransaction } from '@/lib/payments/finalize-successful-transaction';
import { isServerE2EMode } from '@/lib/e2e-mode';

export const dynamic = 'force-dynamic';

interface PayPalAmount {
  currency_code?: string;
  value?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }
  return null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function hasValidE2EWebhookBypass(req: NextRequest): boolean {
  const expectedSecret = process.env.E2E_PAYPAL_WEBHOOK_BYPASS_SECRET;
  const providedSecret = req.headers.get('x-e2e-paypal-webhook-secret');

  if (process.env.E2E_TEST !== 'true' || !expectedSecret || !providedSecret) {
    return false;
  }

  const expected = Buffer.from(expectedSecret);
  const provided = Buffer.from(providedSecret);

  return (
    expected.length === provided.length && timingSafeEqual(expected, provided)
  );
}

function amountMatchesTransaction(
  transactionAmount: number,
  gatewayFee: number | null,
  amount: PayPalAmount | null
): boolean {
  if (!amount?.value || !amount.currency_code) {
    return false;
  }

  const expectedCurrency = getPayPalCurrency();
  const expectedAmount = parsePayPalAmountValue(
    toPayPalAmountValue(
      Number(transactionAmount) + Number(gatewayFee || 0),
      expectedCurrency
    )
  );
  const receivedAmount = parsePayPalAmountValue(amount.value);

  return (
    expectedCurrency === amount.currency_code.toUpperCase() &&
    Math.abs(expectedAmount - receivedAmount) < 0.000001
  );
}

function getWebhookHeaders(req: NextRequest) {
  const authAlgo = req.headers.get('paypal-auth-algo');
  const certUrl = req.headers.get('paypal-cert-url');
  const transmissionId = req.headers.get('paypal-transmission-id');
  const transmissionSig = req.headers.get('paypal-transmission-sig');
  const transmissionTime = req.headers.get('paypal-transmission-time');

  if (
    !authAlgo ||
    !certUrl ||
    !transmissionId ||
    !transmissionSig ||
    !transmissionTime
  ) {
    return null;
  }

  return {
    authAlgo,
    certUrl,
    transmissionId,
    transmissionSig,
    transmissionTime,
  };
}

async function safelyGetTransaction(orderId: string) {
  try {
    return await getTransactionByProviderRef(orderId);
  } catch (error) {
    log.warn('PayPal webhook referenced unknown order', {
      orderId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

function getMetadataMismatchReason(options: {
  transactionId: string;
  transactionCode: string;
  customId?: string | null;
  invoiceId?: string | null;
}): string | null {
  if (options.customId && options.customId !== options.transactionId) {
    return 'custom_id_mismatch';
  }

  if (options.invoiceId && options.invoiceId !== options.transactionCode) {
    return 'invoice_id_mismatch';
  }

  return null;
}

async function completePayPalTransaction(options: {
  orderId: string;
  captureId?: string | null;
  amount: PayPalAmount | null;
  customId?: string | null;
  invoiceId?: string | null;
  isE2E: boolean;
  eventId?: string | null;
  eventType: string;
}) {
  const transaction = await safelyGetTransaction(options.orderId);
  if (!transaction) {
    return {
      handled: false,
      reason: 'unknown_order_id',
    };
  }

  const metadataMismatchReason = getMetadataMismatchReason({
    transactionId: transaction.id,
    transactionCode: transaction.transactionCode,
    customId: options.customId,
    invoiceId: options.invoiceId,
  });

  if (metadataMismatchReason) {
    log.error('PayPal webhook metadata mismatch', {
      eventId: options.eventId,
      eventType: options.eventType,
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      orderId: options.orderId,
      customId: options.customId,
      invoiceId: options.invoiceId,
      reason: metadataMismatchReason,
    });

    return {
      handled: false,
      reason: metadataMismatchReason,
    };
  }

  if (
    !amountMatchesTransaction(
      Number(transaction.amount),
      transaction.gateway_fee,
      options.amount
    )
  ) {
    log.error('PayPal webhook amount/currency mismatch', {
      eventId: options.eventId,
      eventType: options.eventType,
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      orderId: options.orderId,
      expectedCurrency: getPayPalCurrency(),
      receivedCurrency: options.amount?.currency_code,
      receivedAmount: options.amount?.value,
    });

    return {
      handled: false,
      reason: 'amount_or_currency_mismatch',
    };
  }

  const statusUpdate = await updateTransactionStatus(
    transaction.id,
    'COMPLETED',
    options.orderId,
    undefined,
    {
      paypalOrderId: options.orderId,
      paypalCaptureId: options.captureId || undefined,
    }
  );

  if (!statusUpdate.statusChanged) {
    log.info('PayPal completion event was idempotent no-op', {
      eventId: options.eventId,
      eventType: options.eventType,
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      orderId: options.orderId,
      captureId: options.captureId,
    });

    return {
      handled: true,
      reason: 'already_completed',
    };
  }

  await finalizeSuccessfulTransaction({
    source: 'paypal-webhook',
    transaction,
    skipNotifications: options.isE2E,
  });

  return {
    handled: true,
    reason: 'completed',
  };
}

async function failPayPalTransaction(options: {
  orderId: string;
  captureId?: string | null;
  eventType: string;
  eventId?: string | null;
}) {
  const transaction = await safelyGetTransaction(options.orderId);
  if (!transaction) {
    return {
      handled: false,
      reason: 'unknown_order_id',
    };
  }

  const statusUpdate = await updateTransactionStatus(
    transaction.id,
    'FAILED',
    options.orderId,
    undefined,
    {
      paypalOrderId: options.orderId,
      paypalCaptureId: options.captureId || undefined,
    }
  );

  if (!statusUpdate.statusChanged) {
    log.info('PayPal failed event was idempotent no-op', {
      eventId: options.eventId,
      eventType: options.eventType,
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      orderId: options.orderId,
    });
  }

  return {
    handled: true,
    reason: 'failed',
  };
}

async function postHandler(req: NextRequest) {
  const isE2E = isServerE2EMode();

  const headers = getWebhookHeaders(req);
  if (!headers) {
    return NextResponse.json(
      { error: 'Missing required PayPal webhook headers' },
      { status: 400 }
    );
  }

  const event = (await req.json()) as Record<string, unknown>;
  const eventType = asString(event.event_type);
  const eventId = asString(event.id);
  const resource = asRecord(event.resource);

  if (!eventType || !resource) {
    return NextResponse.json(
      {
        received: true,
        handled: false,
        reason: 'invalid_payload',
      },
      { status: 200 }
    );
  }

  const bypassSignatureForE2E = hasValidE2EWebhookBypass(req);
  let signatureIsValid = bypassSignatureForE2E;

  if (!bypassSignatureForE2E) {
    try {
      signatureIsValid = await verifyPayPalWebhookSignature({
        event,
        headers,
      });
    } catch (error) {
      log.error('PayPal webhook signature verification failed', {
        eventId,
        eventType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return NextResponse.json(
        { error: 'PayPal webhook verification failed' },
        { status: 400 }
      );
    }
  }

  if (!signatureIsValid) {
    return NextResponse.json(
      { error: 'Invalid PayPal webhook signature' },
      { status: 400 }
    );
  }

  log.info('PayPal webhook received', {
    eventId,
    eventType,
  });

  let result: { handled: boolean; reason: string } = {
    handled: false,
    reason: 'ignored',
  };

  if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
    const relatedIds = asRecord(resource.supplementary_data)?.related_ids;
    const relatedIdsRecord = asRecord(relatedIds);
    const orderId = asString(relatedIdsRecord?.order_id);
    const captureId = asString(resource.id);
    const amount = asRecord(resource.amount) as PayPalAmount | null;

    if (!orderId) {
      result = {
        handled: false,
        reason: 'missing_order_id',
      };
    } else {
      const orderDetails = await getPayPalOrder(orderId);
      const purchaseUnit = orderDetails.purchase_units?.[0];
      const purchaseAmount = purchaseUnit?.amount || null;

      result = await completePayPalTransaction({
        orderId,
        captureId,
        amount: amount || purchaseAmount,
        customId: purchaseUnit?.custom_id || null,
        invoiceId: purchaseUnit?.invoice_id || null,
        isE2E,
        eventId,
        eventType,
      });
    }
  } else if (eventType === 'CHECKOUT.ORDER.COMPLETED') {
    const orderId = asString(resource.id);
    const purchaseUnits = resource.purchase_units;
    const firstPurchaseUnit =
      Array.isArray(purchaseUnits) && purchaseUnits.length > 0
        ? asRecord(purchaseUnits[0])
        : null;
    const captures = asRecord(firstPurchaseUnit?.payments)?.captures;
    const firstCapture =
      Array.isArray(captures) && captures.length > 0
        ? asRecord(captures[0])
        : null;

    if (!orderId || !firstPurchaseUnit) {
      result = {
        handled: false,
        reason: 'missing_order_payload',
      };
    } else {
      result = await completePayPalTransaction({
        orderId,
        captureId: asString(firstCapture?.id),
        amount: (asRecord(firstCapture?.amount) ||
          asRecord(firstPurchaseUnit.amount)) as PayPalAmount | null,
        customId: asString(firstPurchaseUnit.custom_id),
        invoiceId: asString(firstPurchaseUnit.invoice_id),
        isE2E,
        eventId,
        eventType,
      });
    }
  } else if (
    eventType === 'PAYMENT.CAPTURE.DENIED' ||
    eventType === 'PAYMENT.CAPTURE.DECLINED' ||
    eventType === 'CHECKOUT.ORDER.EXPIRED' ||
    eventType === 'CHECKOUT.ORDER.VOIDED'
  ) {
    const relatedIds = asRecord(resource.supplementary_data)?.related_ids;
    const relatedIdsRecord = asRecord(relatedIds);
    const orderId =
      asString(relatedIdsRecord?.order_id) || asString(resource.id);

    result = orderId
      ? await failPayPalTransaction({
          orderId,
          captureId: asString(resource.id),
          eventType,
          eventId,
        })
      : {
          handled: false,
          reason: 'missing_order_id',
        };
  } else if (
    eventType === 'PAYMENT.CAPTURE.REFUNDED' ||
    eventType === 'PAYMENT.CAPTURE.REVERSED'
  ) {
    log.warn('PayPal refund/reversal event received', {
      eventId,
      eventType,
      resourceId: asString(resource.id),
    });
    result = {
      handled: true,
      reason: 'refund_or_reversal_logged',
    };
  } else {
    result = {
      handled: false,
      reason: 'event_not_mapped',
    };
  }

  return NextResponse.json({
    received: true,
    eventId,
    eventType,
    handled: result.handled,
    reason: result.reason,
  });
}

export const POST = withLogging(
  postHandler,
  'POST /api/transactions/webhook-paypal'
);
