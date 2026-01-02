import { NextRequest, NextResponse } from 'next/server';
import {
  getTransactionById,
  reduceProductStock,
  getTransactionWithVariants,
  linkTransactionToUser,
} from '@/services/transaction-service';
import { createUser, getUserByPhone } from '@/services/user-service';
import { recordPromoUsage } from '@/services/promo-service';
import { verifyPayment } from '@/lib/digipay/client';
import { withLogging } from '@/lib/api/with-logging';
import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import {
  sendAdminOrderConfirmation,
  sendBuyerOrderConfirmation,
} from '@/lib/email/client';
import { sendOrderConfirmation } from '@/services/sms-service';
import { createRedirectUrl } from '@/lib/utils/url';

export const dynamic = 'force-dynamic';

// GET/POST /api/transactions/verify-digipay - Verify payment callback from Digipay
// Digipay redirects user's browser via POST with form-encoded data (application/x-www-form-urlencoded)
// Format: result=SUCCESS&trackingCode=xxx&providerId=xxx&amount=xxx
async function getHandler(req: NextRequest) {
  const startTime = Date.now();

  // Declare variables at function scope so they're accessible in catch block
  let trackingCode: string | null = null;
  let status: string | null = null;
  let ticket: string | null = null;
  let providerId: string | null = null;

  try {
    // Digipay sends POST with form-encoded body (application/x-www-form-urlencoded)
    // Format: result=SUCCESS&trackingCode=xxx&providerId=xxx&amount=xxx
    // Also support GET with query params for manual testing

    if (req.method === 'POST') {
      // Parse form-encoded POST body from Digipay
      const contentType = req.headers.get('content-type') || '';

      let body: Record<string, string> = {};

      if (contentType.includes('application/x-www-form-urlencoded')) {
        // Parse URL-encoded form data
        // For application/x-www-form-urlencoded, we need to read as text and parse with URLSearchParams
        const text = await req.text();
        const params = new URLSearchParams(text);
        params.forEach((value, key) => {
          body[key] = value;
        });
      } else if (contentType.includes('multipart/form-data')) {
        // Parse multipart form data (unlikely for Digipay, but handle it anyway)
        const formData = await req.formData();
        formData.forEach((value, key) => {
          body[key] = value.toString();
        });
      } else if (contentType.includes('application/json')) {
        // Parse JSON (fallback if Digipay changes format)
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
      ip:
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        'unknown',
      userAgent: req.headers.get('user-agent'),
    });

    // IMPORTANT: Check ticket first (always present in callback URL)
    // trackingCode may be missing if user cancels before completing payment
    if (!ticket) {
      log.warn('Digipay verification failed: missing ticket');
      return NextResponse.json(
        { error: 'شناسه تیکت یافت نشد' },
        { status: 400 }
      );
    }

    // Find transaction by ID (ticket param = transaction.id from callback URL)
    const transaction = await getTransactionById(ticket);

    // Handle case where user cancelled before completing payment (no trackingCode)
    // This happens when user clicks "cancel" or closes the Digipay page early
    if (!trackingCode) {
      log.warn('Digipay payment cancelled by user (no trackingCode)', {
        ticket,
        transactionId: transaction.id,
        transactionCode: transaction.transactionCode,
        status,
      });

      // If transaction is already completed (shouldn't happen, but be safe)
      if (transaction.status === 'COMPLETED') {
        return NextResponse.redirect(
          createRedirectUrl(
            `/payment/success?code=${transaction.transactionCode}`
          ),
          303
        );
      }

      // If transaction is already failed, just redirect
      if (transaction.status === 'FAILED') {
        return NextResponse.redirect(
          createRedirectUrl(
            `/payment/failure?code=${transaction.transactionCode}`
          ),
          303
        );
      }

      // Redirect to failure page with transaction code
      return NextResponse.redirect(
        createRedirectUrl(
          `/payment/failure?code=${transaction.transactionCode}`
        ),
        303
      );
    }

    // Calculate total payment amount (base amount + gateway fee)
    // This is the amount that was sent to Digipay and must be verified
    const totalPaymentAmount =
      Number(transaction.amount) + Number(transaction.gateway_fee || 0);

    log.info('Transaction found', {
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      currentStatus: transaction.status,
      baseAmount: transaction.amount,
      gatewayFee: transaction.gateway_fee || 0,
      totalPaymentAmount,
      userId: transaction.userId || 'guest',
      ticket,
    });

    // IMPORTANT: Check idempotency FIRST - before processing any callback status
    // This prevents a late FAILURE callback from overwriting an already COMPLETED transaction
    // (e.g., when Digipay sends duplicate callbacks due to timeout/retry)

    // If transaction is already completed, redirect to success (regardless of callback status)
    if (transaction.status === 'COMPLETED') {
      log.info('Transaction already completed, skipping verification', {
        transactionId: transaction.id,
        ticket,
        callbackStatus: status,
        elapsedMs: Date.now() - startTime,
      });

      // Use 303 (See Other) to force browser to use GET for the redirect
      return NextResponse.redirect(
        createRedirectUrl(
          `/payment/success?code=${transaction.transactionCode}`
        ),
        303
      );
    }

    // If transaction is already failed, only re-verify if callback indicates success
    if (transaction.status === 'FAILED') {
      const isSuccessCallback = status?.toUpperCase() === 'SUCCESS';
      if (!isSuccessCallback) {
        log.info('Transaction already failed, skipping verification', {
          transactionId: transaction.id,
          ticket,
          callbackStatus: status,
          elapsedMs: Date.now() - startTime,
        });

        // Use 303 (See Other) to force browser to use GET for the redirect
        return NextResponse.redirect(
          createRedirectUrl(
            `/payment/failure?code=${transaction.transactionCode}`
          ),
          303
        );
      }

      log.info('Failed transaction received success callback, re-verifying', {
        transactionId: transaction.id,
        ticket,
        callbackStatus: status,
        elapsedMs: Date.now() - startTime,
      });
    }

    // Now safe to process callback status - transaction is still PENDING
    // Check if payment was cancelled/failed by user
    // Digipay sends result='SUCCESS' or result='FAILURE'
    if (status && status.toUpperCase() !== 'SUCCESS') {
      log.warn('Digipay payment failed or cancelled by user', {
        ticket,
        transactionId: transaction.id,
        status,
      });

      // Use 303 (See Other) to force browser to use GET for the redirect
      // 307 preserves POST method which causes 405 on page routes
      return NextResponse.redirect(
        createRedirectUrl(
          `/payment/failure?code=${transaction.transactionCode}`
        ),
        303
      );
    }

    // Verify payment with Digipay
    // Use the total payment amount (base + gateway fee) as this is what was sent to Digipay
    log.info('Calling Digipay verification API', {
      trackingCode,
      providerId: transaction.transactionCode,
      baseAmount: transaction.amount,
      gatewayFee: transaction.gateway_fee || 0,
      totalPaymentAmount,
      transactionId: transaction.id,
    });

    const verification = await verifyPayment({
      trackingCode,
      amount: totalPaymentAmount, // Use total (base + gateway fee) for Digipay verification
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
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'COMPLETED',
        digipayTrackingCode: verification.trackingCode,
        updatedAt: now,
      })
      .eq('id', transaction.id);

    if (updateError) {
      log.error('Failed to update transaction status to COMPLETED', {
        transactionId: transaction.id,
        trackingCode: verification.trackingCode,
        error: updateError.message,
      });
      // Don't throw - the payment was verified successfully by Digipay
      // Log the error but proceed with notifications since payment is confirmed
      log.warn(
        'Proceeding with notifications despite DB update error - payment was verified',
        {
          transactionId: transaction.id,
          trackingCode: verification.trackingCode,
        }
      );
    } else {
      log.info('Transaction status updated to COMPLETED', {
        transactionId: transaction.id,
        trackingCode: verification.trackingCode,
      });
    }

    // Reduce product stock
    await reduceProductStock(transaction.id);

    // Record promo code usage if a promo was applied
    if (transaction.promoCodeId) {
      try {
        await recordPromoUsage(
          transaction.promoCodeId,
          transaction.id,
          transaction.userId || undefined
        );
        log.info('Promo code usage recorded', {
          promoCodeId: transaction.promoCodeId,
          transactionId: transaction.id,
          userId: transaction.userId,
        });
      } catch (promoError) {
        // Don't fail the payment if promo tracking fails
        log.error('Failed to record promo code usage', {
          promoCodeId: transaction.promoCodeId,
          transactionId: transaction.id,
          error:
            promoError instanceof Error ? promoError.message : 'Unknown error',
        });
      }
    }

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
            error: emailResult.error,
          });
        } else {
          log.info('Admin confirmation email sent successfully', {
            transactionId: transaction.id,
            trackingCode: verification.trackingCode,
            messageId: emailResult.messageId,
          });
        }
      } catch (error) {
        // Don't fail the payment if email fails
        log.error('Failed to send admin confirmation email', {
          transactionId: transaction.id,
          error: error instanceof Error ? error.message : 'Unknown error',
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
        });

        const smsResult = await sendOrderConfirmation(
          transaction.phone,
          transaction.transactionCode
        );

        if (!smsResult.success) {
          log.warn('Order confirmation SMS not sent', {
            transactionId: transaction.id,
            phone: transaction.phone,
            error: smsResult.error,
          });
        } else {
          log.info('Order confirmation SMS sent successfully', {
            transactionId: transaction.id,
            phone: transaction.phone,
            messageId: smsResult.messageId,
          });
        }
      } catch (error) {
        // Don't fail the payment if SMS fails
        log.error('Failed to send order confirmation SMS', {
          transactionId: transaction.id,
          phone: transaction.phone,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      log.warn('No phone number available for order confirmation SMS', {
        transactionId: transaction.id,
      });
    }

    // Send order confirmation email to buyer (if email is provided during checkout)
    if (fullTransaction && fullTransaction.email) {
      try {
        log.info('Attempting to send order confirmation email to buyer', {
          transactionId: transaction.id,
          email: fullTransaction.email,
          transactionCode: transaction.transactionCode,
        });

        const emailResult = await sendBuyerOrderConfirmation(fullTransaction);

        if (!emailResult.success) {
          log.warn('Buyer confirmation email not sent', {
            transactionId: transaction.id,
            email: fullTransaction.email,
            error: emailResult.error,
          });
        } else {
          log.info('Buyer confirmation email sent successfully', {
            transactionId: transaction.id,
            email: fullTransaction.email,
            messageId: emailResult.messageId,
          });
        }
      } catch (error) {
        // Don't fail the payment if email fails
        log.error('Failed to send buyer confirmation email', {
          transactionId: transaction.id,
          email: fullTransaction.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      log.info('No buyer email provided, skipping buyer confirmation email', {
        transactionId: transaction.id,
        hasEmail: !!fullTransaction?.email,
      });
    }

    // Create user account if requested (for guest checkouts)
    if (!transaction.userId && transaction.createAccount && transaction.phone) {
      try {
        log.info(
          'Processing account creation request after successful payment',
          {
            transactionId: transaction.id,
            phone: transaction.phone,
            email: transaction.email,
          }
        );

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
    // Use 303 (See Other) to force browser to use GET for the redirect
    return NextResponse.redirect(
      createRedirectUrl(
        `/payment/success?code=${transaction.transactionCode}&trackingCode=${verification.trackingCode}`
      ),
      303
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

    const errorMessage =
      error instanceof Error ? error.message : 'خطا در تأیید پرداخت';

    // Use the already-parsed values from the try block (they're in scope here)
    // For POST: ticket comes from query params, trackingCode from body
    // For GET: both come from query params
    // The variables 'ticket' and 'trackingCode' are declared in the try block scope
    // and are accessible here
    const failTicket = ticket || req.nextUrl.searchParams.get('ticket');
    const failTrackingCode =
      trackingCode || req.nextUrl.searchParams.get('trackingCode');

    try {
      if (failTicket) {
        const failedTransaction = await getTransactionById(failTicket);

        // IMPORTANT: Don't mark as FAILED if already COMPLETED
        // This protects completed transactions from being incorrectly marked failed due to errors
        if (failedTransaction.status === 'COMPLETED') {
          log.info(
            'Transaction already completed, not marking as failed despite error',
            {
              transactionId: failedTransaction.id,
              ticket: failTicket,
              error: errorMessage,
            }
          );

          // Redirect to success page since payment was already successful
          return NextResponse.redirect(
            createRedirectUrl(
              `/payment/success?code=${failedTransaction.transactionCode}`
            ),
            303
          );
        }

        log.warn(
          'Verification error encountered, leaving transaction pending',
          {
            transactionId: failedTransaction.id,
            ticket: failTicket,
            trackingCode: failTrackingCode,
            error: errorMessage,
          }
        );

        // Use 303 (See Other) to force browser to use GET for the redirect
        return NextResponse.redirect(
          createRedirectUrl(
            `/payment/failure?code=${failedTransaction.transactionCode}&error=${encodeURIComponent(errorMessage)}`
          ),
          303
        );
      }
    } catch (nestedError) {
      log.error('Failed to handle verification error', {
        ticket: failTicket,
        error:
          nestedError instanceof Error ? nestedError.message : 'Unknown error',
      });
    }

    // Use 303 (See Other) to force browser to use GET for the redirect
    return NextResponse.redirect(
      createRedirectUrl(
        `/payment/failure?error=${encodeURIComponent(errorMessage)}`
      ),
      303
    );
  }
}

export const GET = withLogging(
  getHandler,
  'GET /api/transactions/verify-digipay'
);

// POST handler for Digipay callback (Digipay may use POST instead of GET for callbacks)
// Use the same handler logic as GET since both handle the callback flow
async function postHandler(req: NextRequest) {
  return getHandler(req);
}

export const POST = withLogging(
  postHandler,
  'POST /api/transactions/verify-digipay'
);
