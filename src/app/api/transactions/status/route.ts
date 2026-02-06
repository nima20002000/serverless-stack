import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/lib/api/with-logging';
import { getTransactionByCode } from '@/services/transaction-service';

export const dynamic = 'force-dynamic';

const MAX_CODE_LENGTH = 64;

async function getHandler(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')?.trim();

  if (!code || code.length > MAX_CODE_LENGTH) {
    return NextResponse.json(
      { error: 'کد تراکنش نامعتبر است' },
      { status: 400 }
    );
  }

  try {
    const transaction = await getTransactionByCode(code);

    return NextResponse.json({
      transactionCode: transaction.transactionCode,
      status: transaction.status,
      paymentMethod: transaction.paymentMethod,
      paymentProviderRef: transaction.paymentProviderRef || null,
      stripePaymentIntentId: transaction.stripePaymentIntentId || null,
      paypalOrderId: transaction.paypalOrderId || null,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'تراکنش یافت نشد',
      },
      { status: 404 }
    );
  }
}

export const GET = withLogging(getHandler, 'GET /api/transactions/status');
