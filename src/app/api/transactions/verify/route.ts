import { NextRequest, NextResponse } from 'next/server';
import {
  getTransactionByAuthority,
  updateTransactionStatus,
  reduceProductStock,
} from '@/services/transaction-service';
import { verifyPayment } from '@/lib/zarinpal/client';

// GET /api/transactions/verify - Verify payment callback from Zarinpal
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const authority = searchParams.get('Authority');
    const status = searchParams.get('Status');

    if (!authority) {
      return NextResponse.json(
        { error: 'کد Authority یافت نشد' },
        { status: 400 }
      );
    }

    // Find transaction by authority
    const transaction = await getTransactionByAuthority(authority);

    // Check if payment was cancelled by user
    if (status !== 'OK') {
      await updateTransactionStatus(transaction.id, 'FAILED', authority);

      return NextResponse.redirect(
        new URL(
          `/payment/failure?code=${transaction.transactionCode}`,
          req.url
        )
      );
    }

    // Check if transaction is already completed
    if (transaction.status === 'COMPLETED') {
      return NextResponse.redirect(
        new URL(
          `/payment/success?code=${transaction.transactionCode}`,
          req.url
        )
      );
    }

    // Verify payment with Zarinpal
    const verification = await verifyPayment(
      authority,
      Number(transaction.amount)
    );

    // Update transaction status
    await updateTransactionStatus(
      transaction.id,
      'COMPLETED',
      authority,
      verification.refId
    );

    // Reduce product stock
    await reduceProductStock(transaction.id);

    // Redirect to success page
    return NextResponse.redirect(
      new URL(
        `/payment/success?code=${transaction.transactionCode}&refId=${verification.refId}`,
        req.url
      )
    );
  } catch (error) {
    console.error('Error verifying payment:', error);

    const errorMessage = error instanceof Error ? error.message : 'خطا در تأیید پرداخت';

    // Try to get transaction code for error page
    const searchParams = req.nextUrl.searchParams;
    const authority = searchParams.get('Authority');

    try {
      if (authority) {
        const transaction = await getTransactionByAuthority(authority);
        await updateTransactionStatus(transaction.id, 'FAILED', authority);

        return NextResponse.redirect(
          new URL(
            `/payment/failure?code=${transaction.transactionCode}&error=${encodeURIComponent(errorMessage)}`,
            req.url
          )
        );
      }
    } catch {
      // Ignore error
    }

    return NextResponse.redirect(
      new URL(
        `/payment/failure?error=${encodeURIComponent(errorMessage)}`,
        req.url
      )
    );
  }
}
