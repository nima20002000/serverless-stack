import { NextRequest, NextResponse } from 'next/server';
import {
  getTransactionByAuthority,
  updateTransactionStatus,
  reduceProductStock,
  getTransactionWithVariants,
  linkTransactionToUser,
} from '@/services/transaction-service';
import { createUser, getUserByPhone } from '@/services/user-service';
import { recordPromoUsage } from '@/services/promo-service';
import { verifyPayment } from '@/lib/zarinpal/client';
import { withLogging } from '@/lib/api/with-logging';
import { log } from '@/lib/logger';
import {
  sendAdminOrderConfirmation,
  sendBuyerOrderConfirmation,
} from '@/lib/email/client';
import { sendOrderConfirmation } from '@/services/sms-service';
import { createRedirectUrl } from '@/lib/utils/url';

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
      ip:
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        'unknown',
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

    // IMPORTANT: Check idempotency FIRST - before processing any callback status
    // This prevents duplicate callbacks from overwriting transaction state
    // (e.g., when Zarinpal sends multiple callbacks due to timeout/retry)

    // If transaction is already completed, redirect to success (regardless of callback status)
    if (transaction.status === 'COMPLETED') {
      log.info('Transaction already completed, skipping verification', {
        transactionId: transaction.id,
        authority,
        callbackStatus: status,
        elapsedMs: Date.now() - startTime,
      });

      return NextResponse.redirect(
        createRedirectUrl(
          `/payment/success?code=${transaction.transactionCode}`
        )
      );
    }

    // If transaction is already failed, redirect to failure (regardless of callback status)
    if (transaction.status === 'FAILED') {
      log.info('Transaction already failed, skipping verification', {
        transactionId: transaction.id,
        authority,
        callbackStatus: status,
        elapsedMs: Date.now() - startTime,
      });

      return NextResponse.redirect(
        createRedirectUrl(
          `/payment/failure?code=${transaction.transactionCode}`
        )
      );
    }

    // Now safe to process callback status - transaction is still PENDING
    // Check if payment was cancelled by user
    if (status !== 'OK') {
      log.warn('Payment cancelled by user', {
        authority,
        transactionId: transaction.id,
        status,
      });

      await updateTransactionStatus(transaction.id, 'FAILED', authority);

      return NextResponse.redirect(
        createRedirectUrl(
          `/payment/failure?code=${transaction.transactionCode}`
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

    // Fetch full transaction data with variants for admin email
    const fullTransaction = await getTransactionWithVariants(transaction.id);

    // Send admin confirmation email (await to ensure it completes in serverless)
    if (fullTransaction) {
      try {
        const emailResult = await sendAdminOrderConfirmation(
          fullTransaction,
          verification.refId
        );

        if (!emailResult.success) {
          log.warn('Admin confirmation email not sent', {
            transactionId: transaction.id,
            error: emailResult.error,
          });
        } else {
          log.info('Admin confirmation email sent successfully', {
            transactionId: transaction.id,
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
    return NextResponse.redirect(
      createRedirectUrl(
        `/payment/success?code=${transaction.transactionCode}&refId=${verification.refId}`
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

    const errorMessage =
      error instanceof Error ? error.message : 'خطا در تأیید پرداخت';

    // Try to get transaction code for error page
    const searchParams = req.nextUrl.searchParams;
    const authority = searchParams.get('Authority');

    try {
      if (authority) {
        const transaction = await getTransactionByAuthority(authority);

        // IMPORTANT: Don't mark as FAILED if already COMPLETED
        // This protects completed transactions from being incorrectly marked failed due to errors
        if (transaction.status === 'COMPLETED') {
          log.info(
            'Transaction already completed, not marking as failed despite error',
            {
              transactionId: transaction.id,
              authority,
              error: errorMessage,
            }
          );

          // Redirect to success page since payment was already successful
          return NextResponse.redirect(
            createRedirectUrl(
              `/payment/success?code=${transaction.transactionCode}`
            )
          );
        }

        log.warn('Marking transaction as failed', {
          transactionId: transaction.id,
          authority,
          error: errorMessage,
        });

        await updateTransactionStatus(transaction.id, 'FAILED', authority);

        return NextResponse.redirect(
          createRedirectUrl(
            `/payment/failure?code=${transaction.transactionCode}&error=${encodeURIComponent(errorMessage)}`
          )
        );
      }
    } catch (nestedError) {
      log.error('Failed to mark transaction as failed', {
        authority,
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

export const GET = withLogging(getHandler, 'GET /api/transactions/verify');
