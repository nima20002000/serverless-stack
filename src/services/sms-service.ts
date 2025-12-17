import { sendOrderConfirmationSMS } from '@/lib/kavenegar/client';
import { log } from '@/lib/logger';

export interface SendOrderConfirmationSMSResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Send order confirmation SMS to buyer after successful payment
 *
 * This function sends an SMS notification to the buyer's phone number containing:
 * - Transaction code (tracking number)
 * - Payment reference ID (Zarinpal refId)
 *
 * The SMS is sent via Kavenegar's template-based API (VerifyLookup).
 * Template name is configured via KAVENEGAR_ORDER_CONFIRMATION_TEMPLATE_NAME env variable.
 *
 * @param phone - Buyer's phone number (format: 09xxxxxxxxx)
 * @param transactionCode - Unique transaction code (e.g., KT-A1B2C3)
 * @param refId - Zarinpal payment reference ID
 * @returns Promise with success status and optional messageId or error
 */
export async function sendOrderConfirmation(
  phone: string,
  transactionCode: string,
  refId: number
): Promise<SendOrderConfirmationSMSResult> {
  try {
    log.info('Sending order confirmation SMS', {
      phone,
      transactionCode,
      refId
    });

    // Validate phone number format (Iranian mobile numbers)
    if (!phone.match(/^09\d{9}$/)) {
      log.warn('Invalid phone number format for order confirmation SMS', {
        phone,
        transactionCode
      });
      return {
        success: false,
        error: 'فرمت شماره تلفن نامعتبر است'
      };
    }

    // Send SMS via Kavenegar
    const result = await sendOrderConfirmationSMS(phone, transactionCode, refId);

    if (result.success) {
      log.info('Order confirmation SMS sent successfully', {
        phone,
        transactionCode,
        refId,
        messageId: result.messageId
      });
    } else {
      log.error('Failed to send order confirmation SMS', {
        phone,
        transactionCode,
        refId,
        error: result.error
      });
    }

    return result;
  } catch (error) {
    log.error('Error sending order confirmation SMS', {
      phone,
      transactionCode,
      refId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'خطا در ارسال پیامک تایید سفارش'
    };
  }
}
