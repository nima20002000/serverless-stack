import { NextRequest, NextResponse } from 'next/server';
import {
  getTransactionByDigipayTicket,
  reduceProductStock,
  getTransactionWithVariants,
  linkTransactionToUser,
} from '@/services/transaction-service';
import { createUser, getUserByPhone } from '@/services/user-service';
import { verifyPayment } from '@/lib/digipay/client';
import { withLogging } from '@/lib/api/with-logging';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { sendAdminOrderConfirmation, sendBuyerOrderConfirmation } from '@/lib/email/client';
import { sendOrderConfirmation } from '@/services/sms-service';

export const dynamic = 'force-dynamic';

// GET/POST /api/transactions/verify-digipay - Verify payment callback from Digipay
// Digipay sends POST requests with form-encoded data (application/x-www-form-urlencoded)
async function getHandler(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Digipay sends POST with form-encoded body (application/x-www-form-urlencoded)
    // Format: result=SUCCESS&trackingCode=xxx&providerId=xxx&amount=xxx
    // Also support GET with query params for manual testing
    let trackingCode: string | null = null;
    let status: string | null = null;
    let ticket: string | null = null;
    let providerId: string | null = null;

    if (req.method === 'POST') {
      // Parse form-encoded POST body from Digipay
      const contentType = req.headers.get('content-type') || '';

      let body: Record<string, string> = {};

      if (contentType.includes('application/x-www-form-urlencoded')) {
        // Parse form data
        const formData = await req.formData();
        formData.forEach((value, key) => {
          body[key] = value.toString();
        });
      } else if (contentType.includes('application/json')) {
        // Fallback: try JSON parsing (in case Digipay changes format)
        body = await req.json();
      } else {
        // Unknown content type - try to read as text and parse as form data
        const text = await req.text();
        const params = new URLSearchParams(text);
        params.forEach((value, key) => {
          body[key] = value;
        });
      }

      trackingCode = body.trackingCode || null;
      providerId = body.providerId || null;
      status = body.result || null; // 'SUCCESS' or 'FAILURE'

      // Ticket is our transaction ID, passed in callback URL query param
      ticket = req.nextUrl.searchParams.get('ticket');

      log.info('Digipay POST callback received', {
        trackingCode,
        providerId,
        status,
        ticket,
        contentType,
        bodyKeys: Object.keys(body),
      });
    } else {
      // GET fallback (for manual testing or if Digipay changes behavior)
      const searchParams = req.nextUrl.searchParams;
      trackingCode = searchParams.get('trackingCode');
      status = searchParams.get('status');
      ticket = searchParams.get('ticket');
      providerId = searchParams.get('providerId');
    }

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

    // Check if payment was cancelled/failed by user
    // Digipay sends result='SUCCESS' or result='FAILURE'
    if (status && status.toUpperCase() !== 'SUCCESS') {
      log.warn('Digipay payment failed or cancelled by user', {
        ticket,
        transactionId: transaction.id,
        status,
      });

      // Update transaction with tracking code but mark as failed
      const supabase = createClient();
      const now = new Date().toISOString();
      await supabase
        .from('transactions')
        .update({
          status: 'FAILED',
          digipayTrackingCode: trackingCode || undefined,
          updatedAt: now,
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
    const now = new Date().toISOString();
    await supabase
      .from('transactions')
      .update({
        status: 'COMPLETED',
        digipayTrackingCode: verification.trackingCode,
        updatedAt: now,
      })
      .eq('id', transaction.id);

    // Reduce product stock
    await reduceProductStock(transaction.id);

    // Fetch full transaction data with variants for email notifications
    const fullTransaction = await getTransactionWithVariants(transaction.id);

    // Send admin confirmation email (await to ensure it completes in serverless)
    // Note: Digipay trackingCode is a string, so we don't pass it as refId (which expects number)
    if (fullTransaction) {
      try {
        const emailResult = await sendAdminOrderConfirmation(fullTransaction);

        if (!emailResult.success) {
          log.warn('Admin confirmation email not sent', {
            transactionId: transaction.id,
            trackingCode: verification.trackingCode,
            error: emailResult.error
          });
        } else {
          log.info('Admin confirmation email sent successfully', {
            transactionId: transaction.id,
            trackingCode: verification.trackingCode,
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

    // Send order confirmation SMS to buyer (await to ensure it completes in serverless)
    if (transaction.phone) {
      try {
        log.info('Attempting to send order confirmation SMS to buyer', {
          transactionId: transaction.id,
          phone: transaction.phone,
          transactionCode: transaction.transactionCode,
          trackingCode: verification.trackingCode
        });

        // Digipay trackingCode is a string, but SMS service expects number
        // Try to parse it, fallback to 0 if not numeric
        const trackingCodeNum = parseInt(verification.trackingCode, 10) || 0;

        const smsResult = await sendOrderConfirmation(
          transaction.phone,
          transaction.transactionCode,
          trackingCodeNum
        );

        if (!smsResult.success) {
          log.warn('Order confirmation SMS not sent', {
            transactionId: transaction.id,
            phone: transaction.phone,
            error: smsResult.error
          });
        } else {
          log.info('Order confirmation SMS sent successfully', {
            transactionId: transaction.id,
            phone: transaction.phone,
            messageId: smsResult.messageId
          });
        }
      } catch (error) {
        // Don't fail the payment if SMS fails
        log.error('Failed to send order confirmation SMS', {
          transactionId: transaction.id,
          phone: transaction.phone,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      log.warn('No phone number available for order confirmation SMS', {
        transactionId: transaction.id
      });
    }

    // Send order confirmation email to buyer (if email is provided during checkout)
    if (fullTransaction && fullTransaction.email) {
      try {
        log.info('Attempting to send order confirmation email to buyer', {
          transactionId: transaction.id,
          email: fullTransaction.email,
          transactionCode: transaction.transactionCode,
          trackingCode: verification.trackingCode
        });

        const emailResult = await sendBuyerOrderConfirmation(fullTransaction);

        if (!emailResult.success) {
          log.warn('Buyer confirmation email not sent', {
            transactionId: transaction.id,
            email: fullTransaction.email,
            error: emailResult.error
          });
        } else {
          log.info('Buyer confirmation email sent successfully', {
            transactionId: transaction.id,
            email: fullTransaction.email,
            messageId: emailResult.messageId
          });
        }
      } catch (error) {
        // Don't fail the payment if email fails
        log.error('Failed to send buyer confirmation email', {
          transactionId: transaction.id,
          email: fullTransaction.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    } else {
      log.info('No buyer email provided, skipping buyer confirmation email', {
        transactionId: transaction.id,
        hasEmail: !!fullTransaction?.email
      });
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
          await linkTransactionToUser(transaction.id, existingUser.id);
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
          // createUser() already links orphaned transactions, but we need to update this specific one
          await linkTransactionToUser(transaction.id, newUser.id);

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

// POST handler for Digipay callback (Digipay may use POST instead of GET for callbacks)
// Use the same handler logic as GET since both handle the callback flow
async function postHandler(req: NextRequest) {
  return getHandler(req);
}

export const POST = withLogging(postHandler, 'POST /api/transactions/verify-digipay');
