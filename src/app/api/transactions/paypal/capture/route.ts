import { NextRequest, NextResponse } from 'next/server';
import {
  capturePayPalOrder,
  getPayPalCurrency,
  parsePayPalAmountValue,
  PayPalCaptureResponse,
} from '@/lib/paypal/client';
import { withLogging } from '@/lib/api/with-logging';
import { log } from '@/lib/logger';
import { createRedirectUrl } from '@/lib/utils/url';
import {
  getTransactionById,
  getTransactionByProviderRef,
  updateTransactionStatus,
} from '@/services/transaction-service';
import { finalizeSuccessfulTransaction } from '@/lib/payments/finalize-successful-transaction';

export const dynamic = 'force-dynamic';

interface CaptureProcessingResult {
  captureId: string;
  transactionCode: string;
  transactionId: string;
  alreadyCompleted: boolean;
}

function amountMatchesTransaction(
  transactionAmount: number,
  gatewayFee: number | null,
  amountValue: string | undefined,
  currencyCode: string | undefined
): boolean {
  if (!amountValue || !currencyCode) {
    return false;
  }

  const expectedCurrency = getPayPalCurrency();
  const expectedAmount = Number(
    (Number(transactionAmount) + Number(gatewayFee || 0)).toFixed(2)
  );
  const receivedAmount = parsePayPalAmountValue(amountValue);

  return (
    expectedCurrency === currencyCode.toUpperCase() &&
    Math.abs(expectedAmount - receivedAmount) < 0.000001
  );
}

function getPrimaryPurchaseUnit(capture: PayPalCaptureResponse) {
  return capture.purchase_units?.[0];
}

function getPrimaryCapture(capture: PayPalCaptureResponse) {
  return capture.purchase_units?.[0]?.payments?.captures?.[0];
}

async function findTransaction(options: {
  orderId: string;
  transactionId?: string | null;
}) {
  if (options.transactionId) {
    return getTransactionById(options.transactionId);
  }

  return getTransactionByProviderRef(options.orderId);
}

async function processCapture(options: {
  orderId: string;
  transactionId?: string | null;
  isE2E: boolean;
}) {
  const transaction = await findTransaction(options);

  if (
    transaction.paymentProviderRef &&
    transaction.paymentProviderRef !== options.orderId
  ) {
    throw new Error('شناسه سفارش پی‌پال با تراکنش مطابقت ندارد');
  }

  if (transaction.status === 'COMPLETED') {
    return {
      captureId: transaction.paypalCaptureId || 'already-captured',
      transactionCode: transaction.transactionCode,
      transactionId: transaction.id,
      alreadyCompleted: true,
    } as CaptureProcessingResult;
  }

  const captureResponse = await capturePayPalOrder(options.orderId);
  const purchaseUnit = getPrimaryPurchaseUnit(captureResponse);
  const capture = getPrimaryCapture(captureResponse);

  if (!purchaseUnit || !capture) {
    throw new Error('پاسخ نامعتبر از پی‌پال دریافت شد');
  }

  if (capture.status !== 'COMPLETED') {
    throw new Error('پرداخت پی‌پال تکمیل نشده است');
  }

  if (purchaseUnit.custom_id && purchaseUnit.custom_id !== transaction.id) {
    throw new Error('شناسه متادیتای پی‌پال با تراکنش مطابقت ندارد');
  }

  if (
    purchaseUnit.invoice_id &&
    purchaseUnit.invoice_id !== transaction.transactionCode
  ) {
    throw new Error('کد سفارش پی‌پال با تراکنش مطابقت ندارد');
  }

  const amountSource = capture.amount || purchaseUnit.amount;
  const isAmountValid = amountMatchesTransaction(
    Number(transaction.amount),
    transaction.gateway_fee,
    amountSource?.value,
    amountSource?.currency_code
  );

  if (!isAmountValid) {
    throw new Error('مبلغ یا ارز پرداخت پی‌پال با تراکنش مطابقت ندارد');
  }

  const statusUpdate = await updateTransactionStatus(
    transaction.id,
    'COMPLETED',
    options.orderId,
    undefined,
    {
      paypalOrderId: options.orderId,
      paypalCaptureId: capture.id,
    }
  );

  if (statusUpdate.statusChanged) {
    await finalizeSuccessfulTransaction({
      source: 'paypal-capture',
      transaction,
      skipNotifications: options.isE2E,
    });
  } else {
    log.info('PayPal capture status update was idempotent no-op', {
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      orderId: options.orderId,
      captureId: capture.id,
      currentStatus: statusUpdate.status,
    });
  }

  return {
    captureId: capture.id,
    transactionCode: transaction.transactionCode,
    transactionId: transaction.id,
    alreadyCompleted: !statusUpdate.statusChanged,
  } as CaptureProcessingResult;
}

async function getHandler(req: NextRequest) {
  const isE2E =
    process.env.E2E_TEST === 'true' || req.headers.get('x-e2e-test') === 'true';
  const searchParams = req.nextUrl.searchParams;
  const orderId = searchParams.get('token') || searchParams.get('orderId');
  const transactionId = searchParams.get('transactionId');

  if (!orderId) {
    return NextResponse.redirect(
      createRedirectUrl('/payment/failure?error=missing_paypal_order_id')
    );
  }

  try {
    const result = await processCapture({
      orderId,
      transactionId,
      isE2E,
    });

    return NextResponse.redirect(
      createRedirectUrl(
        `/payment/success?code=${result.transactionCode}&provider=paypal&captureId=${result.captureId}`
      )
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'PayPal capture failed';

    log.error('PayPal capture redirect flow failed', {
      orderId,
      transactionId,
      error: errorMessage,
    });

    try {
      const transaction = await findTransaction({ orderId, transactionId });

      if (transaction.status === 'COMPLETED') {
        return NextResponse.redirect(
          createRedirectUrl(
            `/payment/success?code=${transaction.transactionCode}&provider=paypal`
          )
        );
      }

      return NextResponse.redirect(
        createRedirectUrl(
          `/payment/failure?code=${transaction.transactionCode}&provider=paypal&error=${encodeURIComponent(errorMessage)}`
        )
      );
    } catch {
      return NextResponse.redirect(
        createRedirectUrl(
          `/payment/failure?provider=paypal&error=${encodeURIComponent(errorMessage)}`
        )
      );
    }
  }
}

async function postHandler(req: NextRequest) {
  const isE2E =
    process.env.E2E_TEST === 'true' || req.headers.get('x-e2e-test') === 'true';
  const body = await req.json();
  const orderId =
    typeof body?.orderId === 'string' ? body.orderId.trim() : undefined;
  const transactionId =
    typeof body?.transactionId === 'string'
      ? body.transactionId.trim()
      : undefined;

  if (!orderId) {
    return NextResponse.json(
      { error: 'PayPal orderId is required' },
      { status: 400 }
    );
  }

  try {
    const result = await processCapture({
      orderId,
      transactionId,
      isE2E,
    });

    return NextResponse.json({
      success: true,
      orderId,
      captureId: result.captureId,
      transactionId: result.transactionId,
      transactionCode: result.transactionCode,
      alreadyCompleted: result.alreadyCompleted,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'PayPal capture failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export const GET = withLogging(
  getHandler,
  'GET /api/transactions/paypal/capture'
);
export const POST = withLogging(
  postHandler,
  'POST /api/transactions/paypal/capture'
);
