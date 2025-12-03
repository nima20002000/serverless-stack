import { NextRequest, NextResponse } from 'next/server';
import {
  getTransactionByAuthority,
  updateTransactionStatus,
  reduceProductStock,
} from '@/services/transaction-service';
import { createUser } from '@/services/user-service';
import { verifyPayment } from '@/lib/zarinpal/client';
import { withLogging } from '@/lib/api/with-logging';
import prisma from '@/lib/prisma/client';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/transactions/verify - Verify payment callback from Zarinpal
async function getHandler(req: NextRequest) {
  const startTime = Date.now();

  try {
    const searchParams = req.nextUrl.searchParams;
    const authority = searchParams.get('Authority');
    const status = searchParams.get('Status');

    log.info('Verification attempt started', {
      authority,
      status,
      url: req.url,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent'),
    });

    if (!authority) {
      log.warn('Verification failed: missing authority');
      return NextResponse.json(
        { error: 'کد Authority یافت نشد' },
        { status: 400 }
      );
    }

    // Find transaction by authority
    const transaction = await getTransactionByAuthority(authority);

    log.info('Transaction found', {
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      currentStatus: transaction.status,
      amount: transaction.amount,
      userId: transaction.userId || 'guest',
      authority,
    });

    // Check if payment was cancelled by user
    if (status !== 'OK') {
      log.warn('Payment cancelled by user', {
        authority,
        transactionId: transaction.id,
        status,
      });

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
      log.info('Transaction already completed, skipping verification', {
        transactionId: transaction.id,
        authority,
        elapsedMs: Date.now() - startTime,
      });

      return NextResponse.redirect(
        new URL(
          `/payment/success?code=${transaction.transactionCode}`,
          req.url
        )
      );
    }

    // Verify payment with Zarinpal
    log.info('Calling Zarinpal verification API', {
      authority,
      amount: transaction.amount,
      transactionId: transaction.id,
    });

    const verification = await verifyPayment(
      authority,
      Number(transaction.amount)
    );

    log.info('Zarinpal verification successful', {
      authority,
      refId: verification.refId,
      transactionId: transaction.id,
      elapsedMs: Date.now() - startTime,
    });

    // Update transaction status
    await updateTransactionStatus(
      transaction.id,
      'COMPLETED',
      authority,
      verification.refId
    );

    // Reduce product stock
    await reduceProductStock(transaction.id);

    // Create user account if requested (for guest checkouts)
    if (!transaction.userId && transaction.createAccount) {
      try {
        log.info('Creating user account after successful payment', {
          transactionId: transaction.id,
          phone: transaction.phone,
          email: transaction.email,
        });

        const newUser = await createUser({
          phone: transaction.phone,
          email: transaction.email || undefined,
          name: transaction.fullName,
        });

        // Link transaction to newly created user
        await prisma.transaction.update({
          where: { id: transaction.id },
          data: { userId: newUser.id },
        });

        log.info('User account created and linked to transaction', {
          userId: newUser.id,
          transactionId: transaction.id,
        });
      } catch (error) {
        log.error('Failed to create user account after payment', {
          transactionId: transaction.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Don't fail the payment if account creation fails
      }
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL(
        `/payment/success?code=${transaction.transactionCode}&refId=${verification.refId}`,
        req.url
      )
    );
  } catch (error) {
    const elapsedMs = Date.now() - startTime;

    log.error('Error verifying payment', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      elapsedMs,
      url: req.url,
    });

    console.error('Error verifying payment:', error);

    const errorMessage = error instanceof Error ? error.message : 'خطا در تأیید پرداخت';

    // Try to get transaction code for error page
    const searchParams = req.nextUrl.searchParams;
    const authority = searchParams.get('Authority');

    try {
      if (authority) {
        const transaction = await getTransactionByAuthority(authority);

        log.warn('Marking transaction as failed', {
          transactionId: transaction.id,
          authority,
          error: errorMessage,
        });

        await updateTransactionStatus(transaction.id, 'FAILED', authority);

        return NextResponse.redirect(
          new URL(
            `/payment/failure?code=${transaction.transactionCode}&error=${encodeURIComponent(errorMessage)}`,
            req.url
          )
        );
      }
    } catch (nestedError) {
      log.error('Failed to mark transaction as failed', {
        authority,
        error: nestedError instanceof Error ? nestedError.message : 'Unknown error',
      });
    }

    return NextResponse.redirect(
      new URL(
        `/payment/failure?error=${encodeURIComponent(errorMessage)}`,
        req.url
      )
    );
  }
}

export const GET = withLogging(getHandler, 'GET /api/transactions/verify');
