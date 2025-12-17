import { NextRequest, NextResponse } from 'next/server';
import {
  getTransactionByAuthority,
  updateTransactionStatus,
  reduceProductStock,
} from '@/services/transaction-service';
import { createUser, getUserByPhone } from '@/services/user-service';
import { verifyPayment } from '@/lib/zarinpal/client';
import { withLogging } from '@/lib/api/with-logging';
import prisma from '@/lib/prisma/client';
import { log } from '@/lib/logger';
import { sendAdminOrderConfirmation } from '@/lib/email/client';

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

    // Fetch full transaction data with variants for admin email
    const fullTransaction = await prisma.transaction.findUnique({
      where: { id: transaction.id },
      include: {
        items: {
          include: {
            product: true,
            variant: true
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true
          }
        }
      }
    });

    // Send admin confirmation email (await to ensure it completes in serverless)
    if (fullTransaction) {
      try {
        const emailResult = await sendAdminOrderConfirmation(fullTransaction, verification.refId);

        if (!emailResult.success) {
          log.warn('Admin confirmation email not sent', {
            transactionId: transaction.id,
            error: emailResult.error
          });
        } else {
          log.info('Admin confirmation email sent successfully', {
            transactionId: transaction.id,
            messageId: emailResult.messageId
          });
        }
      } catch (error) {
        // Don't fail the payment if email fails
        log.error('Failed to send admin confirmation email', {
          transactionId: transaction.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Create user account if requested (for guest checkouts)
    if (!transaction.userId && transaction.createAccount && transaction.phone) {
      try {
        log.info('Processing account creation request after successful payment', {
          transactionId: transaction.id,
          phone: transaction.phone,
          email: transaction.email,
        });

        // First, check if user already exists with this phone (from OTP registration)
        const existingUser = await getUserByPhone(transaction.phone);

        if (existingUser) {
          // User already exists - just link the transaction
          log.info('User already exists with this phone, linking transaction', {
            userId: existingUser.id,
            transactionId: transaction.id,
            phone: transaction.phone,
          });

          // Link this transaction to the existing user
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              userId: existingUser.id,
              // Keep isGuest=true to preserve history that this was a guest transaction
            },
          });
        } else {
          // User doesn't exist - create new account
          log.info('Creating new user account after successful payment', {
            transactionId: transaction.id,
            phone: transaction.phone,
          });

          const newUser = await createUser({
            phone: transaction.phone,
            email: transaction.email || undefined,
            name: transaction.fullName,
          });

          // Link transaction to newly created user
          // createUser() already links orphaned transactions, but we need to update this specific one
          await prisma.transaction.update({
            where: { id: transaction.id },
            data: {
              userId: newUser.id,
              // Keep isGuest=true to preserve history that this was a guest transaction
            },
          });

          log.info('User account created and linked to transaction', {
            userId: newUser.id,
            transactionId: transaction.id,
          });
        }
      } catch (error) {
        log.error('Failed to create/link user account after payment', {
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
