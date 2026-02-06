import 'server-only';
import {
  getTransactionWithVariants,
  linkTransactionToUser,
  reduceProductStock,
} from '@/services/transaction-service';
import { recordPromoUsage } from '@/services/promo-service';
import { createUser, getUserByPhone } from '@/services/user-service';
import {
  sendAdminOrderConfirmation,
  sendBuyerOrderConfirmation,
} from '@/lib/email/client';
import { log } from '@/lib/logger';

interface SuccessfulTransactionContext {
  id: string;
  transactionCode: string;
  promoCodeId: string | null;
  userId: string | null;
  createAccount: boolean | null;
  phone: string | null;
  email: string | null;
  fullName: string | null;
}

interface FinalizeSuccessfulTransactionOptions {
  transaction: SuccessfulTransactionContext;
  source: string;
  adminRefId?: number;
  skipNotifications?: boolean;
}

/**
 * Runs post-payment actions exactly once after a transaction is marked COMPLETED.
 */
export async function finalizeSuccessfulTransaction(
  options: FinalizeSuccessfulTransactionOptions
): Promise<void> {
  const {
    transaction,
    source,
    adminRefId,
    skipNotifications = false,
  } = options;

  log.info('Running post-payment finalization', {
    source,
    transactionId: transaction.id,
    transactionCode: transaction.transactionCode,
  });

  await reduceProductStock(transaction.id);

  if (transaction.promoCodeId) {
    try {
      await recordPromoUsage(
        transaction.promoCodeId,
        transaction.id,
        transaction.userId || undefined
      );
      log.info('Promo code usage recorded', {
        source,
        promoCodeId: transaction.promoCodeId,
        transactionId: transaction.id,
      });
    } catch (promoError) {
      log.error('Failed to record promo code usage', {
        source,
        promoCodeId: transaction.promoCodeId,
        transactionId: transaction.id,
        error:
          promoError instanceof Error ? promoError.message : 'Unknown error',
      });
    }
  }

  const fullTransaction = await getTransactionWithVariants(transaction.id);

  if (skipNotifications) {
    log.info('Skipping order notifications in finalization', {
      source,
      transactionId: transaction.id,
    });
  } else {
    try {
      const adminEmailResult = await sendAdminOrderConfirmation(
        fullTransaction,
        adminRefId
      );

      if (!adminEmailResult.success) {
        log.warn('Admin confirmation email not sent', {
          source,
          transactionId: transaction.id,
          error: adminEmailResult.error,
        });
      } else {
        log.info('Admin confirmation email sent successfully', {
          source,
          transactionId: transaction.id,
          messageId: adminEmailResult.messageId,
        });
      }
    } catch (error) {
      log.error('Failed to send admin confirmation email', {
        source,
        transactionId: transaction.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    if (fullTransaction.email) {
      try {
        const buyerEmailResult =
          await sendBuyerOrderConfirmation(fullTransaction);

        if (!buyerEmailResult.success) {
          log.warn('Buyer confirmation email not sent', {
            source,
            transactionId: transaction.id,
            email: fullTransaction.email,
            error: buyerEmailResult.error,
          });
        } else {
          log.info('Buyer confirmation email sent successfully', {
            source,
            transactionId: transaction.id,
            email: fullTransaction.email,
            messageId: buyerEmailResult.messageId,
          });
        }
      } catch (error) {
        log.error('Failed to send buyer confirmation email', {
          source,
          transactionId: transaction.id,
          email: fullTransaction.email,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    } else {
      log.info('No buyer email provided, skipping buyer confirmation email', {
        source,
        transactionId: transaction.id,
      });
    }
  }

  if (!transaction.userId && transaction.createAccount && transaction.phone) {
    try {
      const existingUser = await getUserByPhone(transaction.phone);

      if (existingUser) {
        await linkTransactionToUser(transaction.id, existingUser.id);

        log.info('Linked transaction to existing user after payment', {
          source,
          transactionId: transaction.id,
          userId: existingUser.id,
        });
      } else {
        const newUser = await createUser({
          phone: transaction.phone,
          email: transaction.email || undefined,
          name: transaction.fullName || 'کاربر',
        });

        await linkTransactionToUser(transaction.id, newUser.id);

        log.info('Created and linked user account after payment', {
          source,
          transactionId: transaction.id,
          userId: newUser.id,
        });
      }
    } catch (error) {
      log.error('Failed to create/link user account after payment', {
        source,
        transactionId: transaction.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  log.info('Post-payment finalization completed', {
    source,
    transactionId: transaction.id,
    transactionCode: transaction.transactionCode,
  });
}
