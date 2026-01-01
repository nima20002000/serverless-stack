import { NextRequest, NextResponse } from 'next/server';
import {
  getTransactionByZibalTrackId,
  reduceProductStock,
  getTransactionWithVariants,
  linkTransactionToUser,
} from '@/services/transaction-service';
import { createUser, getUserByPhone } from '@/services/user-service';
import { verifyPayment } from '@/lib/zibal/client';
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

// GET /api/transactions/verify-zibal - Verify payment callback from Zibal
// Zibal redirects user's browser via GET with query params:
// Format: ?success=1&trackId=xxx&orderId=xxx&status=xxx
async function getHandler(req: NextRequest) {
  const startTime = Date.now();

  // Declare variables at function scope so they're accessible in catch block
  let trackId: string | null = null;
  let success: string | null = null;
  let status: string | null = null;

  try {
    const searchParams = req.nextUrl.searchParams;
    trackId = searchParams.get('trackId');
    success = searchParams.get('success');
    status = searchParams.get('status');

    log.info('Zibal verification attempt started', {
      trackId,
      success,
      status,
      url: req.url,
      ip:
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        'unknown',
      userAgent: req.headers.get('user-agent'),
    });

    if (!trackId) {
      log.warn('Zibal verification failed: missing trackId');
      return NextResponse.json(
        { error: 'کد پیگیری یافت نشد' },
        { status: 400 }
      );
    }

    // Find transaction by Zibal trackId
    const transaction = await getTransactionByZibalTrackId(trackId);

    log.info('Transaction found', {
      transactionId: transaction.id,
      transactionCode: transaction.transactionCode,
      currentStatus: transaction.status,
      amount: transaction.amount,
      userId: transaction.userId || 'guest',
      trackId,
    });

    // IMPORTANT: Check idempotency FIRST - before processing any callback status
    // This prevents duplicate callbacks from overwriting transaction state

    // If transaction is already completed, redirect to success (regardless of callback status)
    if (transaction.status === 'COMPLETED') {
      log.info('Transaction already completed, skipping verification', {
        transactionId: transaction.id,
        trackId,
        callbackSuccess: success,
        elapsedMs: Date.now() - startTime,
      });

      return NextResponse.redirect(
        createRedirectUrl(
          `/payment/success?code=${transaction.transactionCode}`
        )
      );
    }

    // If transaction is already failed, only re-verify if callback indicates success
    if (transaction.status === 'FAILED') {
      if (success !== '1') {
        log.info('Transaction already failed, skipping verification', {
          transactionId: transaction.id,
          trackId,
          callbackSuccess: success,
          elapsedMs: Date.now() - startTime,
        });

        return NextResponse.redirect(
          createRedirectUrl(
            `/payment/failure?code=${transaction.transactionCode}`
          )
        );
      }

      log.info('Failed transaction received success callback, re-verifying', {
        transactionId: transaction.id,
        trackId,
        callbackSuccess: success,
        elapsedMs: Date.now() - startTime,
      });
    }

    // Now safe to process callback status - transaction is still PENDING or failed-with-success-callback
    // Check if payment was cancelled/failed by user
    // Zibal sends success=1 for successful payments
    if (success !== '1') {
      log.warn('Zibal payment failed or cancelled by user', {
        trackId,
        transactionId: transaction.id,
        success,
        status,
      });

      return NextResponse.redirect(
        createRedirectUrl(
          `/payment/failure?code=${transaction.transactionCode}`
        )
      );
    }

    // Verify payment with Zibal
    log.info('Calling Zibal verification API', {
      trackId: parseInt(trackId),
      amount: transaction.amount,
      transactionId: transaction.id,
    });

    const verification = await verifyPayment({
      trackId: parseInt(trackId),
      amount: Number(transaction.amount),
    });

    log.info('Zibal verification successful', {
      trackId: verification.trackId,
      refNumber: verification.refNumber,
      transactionId: transaction.id,
      elapsedMs: Date.now() - startTime,
    });

    // Update transaction status with Zibal tracking info
    const supabase = createClient();
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('transactions')
      .update({
        status: 'COMPLETED',
        zibalRefNumber: String(verification.refNumber),
        updatedAt: now,
      })
      .eq('id', transaction.id);

    if (updateError) {
      log.error('Failed to update transaction status to COMPLETED', {
        transactionId: transaction.id,
        trackId,
        refNumber: verification.refNumber,
        error: updateError.message,
      });
      // Don't throw - the payment was verified successfully by Zibal
      // Log the error but proceed with notifications since payment is confirmed
      log.warn(
        'Proceeding with notifications despite DB update error - payment was verified',
        {
          transactionId: transaction.id,
          trackId,
          refNumber: verification.refNumber,
        }
      );
    } else {
      log.info('Transaction status updated to COMPLETED', {
        transactionId: transaction.id,
        trackId,
        refNumber: verification.refNumber,
      });
    }

    // Reduce product stock
    await reduceProductStock(transaction.id);

    // Fetch full transaction data with variants for email notifications
    const fullTransaction = await getTransactionWithVariants(transaction.id);

    // Send admin confirmation email
    if (fullTransaction) {
      try {
        const emailResult = await sendAdminOrderConfirmation(fullTransaction);

        if (!emailResult.success) {
          log.warn('Admin confirmation email not sent', {
            transactionId: transaction.id,
            trackId,
            error: emailResult.error,
          });
        } else {
          log.info('Admin confirmation email sent successfully', {
            transactionId: transaction.id,
            trackId,
            messageId: emailResult.messageId,
          });
        }
      } catch (error) {
        log.error('Failed to send admin confirmation email', {
          transactionId: transaction.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Send order confirmation SMS to buyer
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

    // Send order confirmation email to buyer (if email is provided)
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

        // First, check if user already exists with this phone
        const existingUser = await getUserByPhone(transaction.phone);

        if (existingUser) {
          log.info('User already exists with this phone, linking transaction', {
            userId: existingUser.id,
            transactionId: transaction.id,
            phone: transaction.phone,
          });

          await linkTransactionToUser(transaction.id, existingUser.id);
        } else {
          log.info('Creating new user account after successful payment', {
            transactionId: transaction.id,
            phone: transaction.phone,
          });

          const newUser = await createUser({
            phone: transaction.phone,
            email: transaction.email || undefined,
            name: transaction.fullName || 'کاربر',
          });

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
      }
    }

    // Redirect to success page
    return NextResponse.redirect(
      createRedirectUrl(
        `/payment/success?code=${transaction.transactionCode}&refId=${verification.refNumber}`
      )
    );
  } catch (error) {
    const elapsedMs = Date.now() - startTime;

    log.error('Error verifying Zibal payment', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      elapsedMs,
      url: req.url,
    });

    console.error('Error verifying Zibal payment:', error);

    const errorMessage =
      error instanceof Error ? error.message : 'خطا در تأیید پرداخت';

    const failTrackId = trackId || req.nextUrl.searchParams.get('trackId');

    try {
      if (failTrackId) {
        const failedTransaction =
          await getTransactionByZibalTrackId(failTrackId);

        // IMPORTANT: Don't mark as FAILED if already COMPLETED
        if (failedTransaction.status === 'COMPLETED') {
          log.info(
            'Transaction already completed, not marking as failed despite error',
            {
              transactionId: failedTransaction.id,
              trackId: failTrackId,
              error: errorMessage,
            }
          );

          return NextResponse.redirect(
            createRedirectUrl(
              `/payment/success?code=${failedTransaction.transactionCode}`
            )
          );
        }

        log.warn(
          'Verification error encountered, leaving transaction pending',
          {
            transactionId: failedTransaction.id,
            trackId: failTrackId,
            error: errorMessage,
          }
        );

        return NextResponse.redirect(
          createRedirectUrl(
            `/payment/failure?code=${failedTransaction.transactionCode}&error=${encodeURIComponent(errorMessage)}`
          )
        );
      }
    } catch (nestedError) {
      log.error('Failed to handle verification error', {
        trackId: failTrackId,
        error:
          nestedError instanceof Error ? nestedError.message : 'Unknown error',
      });
    }

    return NextResponse.redirect(
      createRedirectUrl(
        `/payment/failure?error=${encodeURIComponent(errorMessage)}`
      )
    );
  }
}

export const GET = withLogging(
  getHandler,
  'GET /api/transactions/verify-zibal'
);
