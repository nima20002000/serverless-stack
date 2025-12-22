import Kavenegar from 'kavenegar';
import { log } from '@/lib/logger';

const apiKey = process.env.KAVENEGAR_API_KEY;
if (!apiKey) {
  throw new Error('KAVENEGAR_API_KEY environment variable is required');
}

const api = Kavenegar.KavenegarApi({
  apikey: apiKey,
});

export interface SendOTPResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

export interface SendOrderConfirmationResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Send OTP via Kavenegar VerifyLookup (template-based)
 * Uses template defined in KAVENEGAR_TEMPLATE_NAME env variable
 */
export async function sendOTPSMS(
  phone: string,
  otp: string
): Promise<SendOTPResult> {
  return new Promise((resolve) => {
    api.VerifyLookup(
      {
        receptor: phone,
        token: otp,
        template: process.env.KAVENEGAR_TEMPLATE_NAME || 'kitia-otp-sms',
      },
      function (response, status, message) {
        if (status === 200) {
          log.info('OTP sent successfully via Kavenegar', {
            phone,
            messageId: response[0]?.messageid,
            template: process.env.KAVENEGAR_TEMPLATE_NAME || 'kitia-otp-sms',
          });
          resolve({ success: true, messageId: response[0]?.messageid });
        } else {
          log.error('Failed to send OTP via Kavenegar', {
            phone,
            status,
            message,
            template: process.env.KAVENEGAR_TEMPLATE_NAME || 'kitia-otp-sms',
          });
          resolve({ success: false, error: message || `خطا ${status}` });
        }
      }
    );
  });
}

/**
 * Send order confirmation SMS via Kavenegar VerifyLookup (template-based)
 * Uses template defined in KAVENEGAR_ORDER_CONFIRMATION_TEMPLATE_NAME env variable
 *
 * @param phone - Buyer's phone number (format: 09xxxxxxxxx)
 * @param transactionCode - Unique transaction code (tracking number)
 * @param refId - Zarinpal reference ID (payment confirmation)
 */
export async function sendOrderConfirmationSMS(
  phone: string,
  transactionCode: string,
  refId: number
): Promise<SendOrderConfirmationResult> {
  return new Promise((resolve) => {
    const templateName =
      process.env.KAVENEGAR_ORDER_CONFIRMATION_TEMPLATE_NAME ||
      'kitia-order-confirmation';

    api.VerifyLookup(
      {
        receptor: phone,
        token: transactionCode, // token1: tracking number
        token2: refId.toString(), // token2: payment reference ID
        template: templateName,
      },
      function (response, status, message) {
        if (status === 200) {
          log.info('Order confirmation SMS sent successfully via Kavenegar', {
            phone,
            transactionCode,
            refId,
            messageId: response[0]?.messageid,
            template: templateName,
          });
          resolve({ success: true, messageId: response[0]?.messageid });
        } else {
          log.error('Failed to send order confirmation SMS via Kavenegar', {
            phone,
            transactionCode,
            refId,
            status,
            message,
            template: templateName,
          });
          resolve({ success: false, error: message || `خطا ${status}` });
        }
      }
    );
  });
}
