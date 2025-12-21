import { NextRequest, NextResponse } from 'next/server';
import {
  getTransactionByDigipayTicket,
  reduceProductStock,
} from '@/services/transaction-service';
import { createUser, getUserByPhone } from '@/services/user-service';
import { verifyPayment } from '@/lib/digipay/client';
import { withLogging } from '@/lib/api/with-logging';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// GET /api/transactions/verify-digipay - Verify payment callback from Digipay
async function getHandler(req: NextRequest) {
  const startTime = Date.now();

  try {
    const searchParams = req.nextUrl.searchParams;
    const trackingCode = searchParams.get('trackingCode');
    const status = searchParams.get('status'); // Optional: Digipay may send status
    const ticket = searchParams.get('ticket'); // Ticket ID from our system

    log.info('Digipay verification attempt started', {
      trackingCode,
      status,
      ticket,
      url: req.url,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown',
      userAgent: req.headers.get('user-agent'),
    });

    if (!trackingCode) {
      log.warn('Digipay verification failed: missing trackingCode');
      return NextResponse.json(
        { error: 'کد پیگیری یافت نشد' },
        { status: 400 }
      );
    }

    if (!ticket) {
      log.warn('Digipay verification failed: missing ticket');
      return NextResponse.json(
        { error: 'شناسه تیکت یافت نشد' },
        { status: 400 }
      );
    }

    // Find transaction by Digipay ticket
    const transaction = await getTransactionByDigipayTicket(ticket);

    log.info('Transaction found', {
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      currentStatus: transaction.status,
      amount: transaction.amount,
      userId: transaction.userId || 'guest',
      ticket,
    });

    // Check if payment was cancelled by user (if status is provided)
    if (status && status !== 'success' && status !== 'OK') {
      log.warn('Digipay payment cancelled by user', {
        ticket,
        transactionId: transaction.id,
        status,
      });

      // Update transaction with tracking code but mark as failed
      const supabase = createClient();
      await supabase
        .from('transactions')
        .update({
          status: 'FAILED',
          digipayTrackingCode: trackingCode,
        })
        .eq('id', transaction.id);

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
        ticket,
        elapsedMs: Date.now() - startTime,
      });

      return NextResponse.redirect(
        new URL(
          `/payment/success?code=${transaction.transactionCode}`,
          req.url
        )
      );
    }

    // Verify payment with Digipay
    log.info('Calling Digipay verification API', {
      trackingCode,
      providerId: transaction.transactionCode,
      amount: transaction.amount,
      transactionId: transaction.id,
    });

    const verification = await verifyPayment({
      trackingCode,
      amount: Number(transaction.amount),
      providerId: transaction.transactionCode,
    });

    log.info('Digipay verification successful', {
      trackingCode: verification.trackingCode,
      fpName: verification.fpName,
      transactionId: transaction.id,
      elapsedMs: Date.now() - startTime,
    });

    // Update transaction status with Digipay tracking code
    const supabase = createClient();
    await supabase
      .from('transactions')
      .update({
        status: 'COMPLETED',
        digipayTrackingCode: verification.trackingCode,
      })
      .eq('id', transaction.id);

    // Reduce product stock
    await reduceProductStock(transaction.id);

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
          const supabaseLink = createClient();
          await supabaseLink
            .from('transactions')
            .update({
              userId: existingUser.id,
              // Keep isGuest=true to preserve history that this was a guest transaction
            })
            .eq('id', transaction.id);
        } else {
          // User doesn't exist - create new account
          log.info('Creating new user account after successful payment', {
            transactionId: transaction.id,
            phone: transaction.phone,
          });

          const newUser = await createUser({
            phone: transaction.phone,
            email: transaction.email || undefined,
            name: transaction.fullName || 'کاربر',
          });

          // Link transaction to newly created user
          const supabaseNewUser = createClient();
          await supabaseNewUser
            .from('transactions')
            .update({
              userId: newUser.id,
              // Keep isGuest=true to preserve history that this was a guest transaction
            })
            .eq('id', transaction.id);

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
        `/payment/success?code=${transaction.transactionCode}&trackingCode=${verification.trackingCode}`,
        req.url
      )
    );
  } catch (error) {
    const elapsedMs = Date.now() - startTime;

    log.error('Error verifying Digipay payment', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      elapsedMs,
      url: req.url,
    });

    console.error('Error verifying Digipay payment:', error);

    const errorMessage = error instanceof Error ? error.message : 'خطا در تأیید پرداخت';

    // Try to get transaction code for error page
    const searchParams = req.nextUrl.searchParams;
    const ticket = searchParams.get('ticket');
    const trackingCode = searchParams.get('trackingCode');

    try {
      if (ticket) {
        const transaction = await getTransactionByDigipayTicket(ticket);

        log.warn('Marking transaction as failed', {
          transactionId: transaction.id,
          ticket,
          trackingCode,
          error: errorMessage,
        });

        const supabaseFail = createClient();
        await supabaseFail
          .from('transactions')
          .update({
            status: 'FAILED',
            digipayTrackingCode: trackingCode || undefined,
          })
          .eq('id', transaction.id);

        return NextResponse.redirect(
          new URL(
            `/payment/failure?code=${transaction.transactionCode}&error=${encodeURIComponent(errorMessage)}`,
            req.url
          )
        );
      }
    } catch (nestedError) {
      log.error('Failed to mark transaction as failed', {
        ticket,
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

export const GET = withLogging(getHandler, 'GET /api/transactions/verify-digipay');
