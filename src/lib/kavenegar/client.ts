import Kavenegar from 'kavenegar';
import { log } from '@/lib/logger';

const api = Kavenegar.KavenegarApi({
  apikey: process.env.KAVENEGAR_API_KEY!
});

export interface SendOTPResult {
  success: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Send OTP via Kavenegar VerifyLookup (template-based)
 * Uses template defined in KAVENEGAR_TEMPLATE_NAME env variable
 */
export async function sendOTPSMS(phone: string, otp: string): Promise<SendOTPResult> {
  return new Promise((resolve) => {
    api.VerifyLookup({
      receptor: phone,
      token: otp,
      template: process.env.KAVENEGAR_TEMPLATE_NAME || 'otp-test'
    }, function(response, status, message) {
      if (status === 200) {
        log.info('OTP sent successfully via Kavenegar', {
          phone,
          messageId: response[0]?.messageid,
          template: process.env.KAVENEGAR_TEMPLATE_NAME || 'otp-test'
        });
        resolve({ success: true, messageId: response[0]?.messageid });
      } else {
        log.error('Failed to send OTP via Kavenegar', {
          phone,
          status,
          message,
          template: process.env.KAVENEGAR_TEMPLATE_NAME || 'otp-test'
        });
        resolve({ success: false, error: message || `خطا ${status}` });
      }
    });
  });
}
