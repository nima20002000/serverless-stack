/**
 * Zibal Payment Gateway Client
 * Direct axios implementation following the same patterns as Zarinpal and Digipay
 */

import 'server-only';
import axios from 'axios';
import { log } from '@/lib/logger';

/**
 * Zibal API configuration
 */
interface ZibalConfig {
  merchant: string;
  baseUrl: string;
}

/**
 * Zibal request response
 */
interface ZibalRequestResponse {
  result: number;
  message: string;
  trackId: number;
}

/**
 * Zibal verify response
 */
interface ZibalVerifyResponse {
  result: number;
  message: string;
  paidAt?: string;
  amount?: number;
  status?: number;
  refNumber?: number;
  description?: string;
  cardNumber?: string;
  orderId?: string;
}

/**
 * Zibal result codes
 */
const ZIBAL_RESULT_CODES: Record<number, string> = {
  100: 'با موفقیت تایید شد.',
  102: 'merchant یافت نشد.',
  103: 'merchant غیرفعال',
  104: 'merchant نامعتبر',
  105: 'amount بایستی بزرگتر از 1,000 ریال باشد.',
  106: 'callbackUrl نامعتبر می‌باشد. (شروع با http و یا https)',
  113: 'amount بیشتر از سقف مجاز است.',
  201: 'قبلا تایید شده.',
  202: 'سفارش پرداخت نشده یا ناموفق بوده است.',
  203: 'trackId نامعتبر می‌باشد.',
};

/**
 * Check if running in sandbox mode
 */
export function isSandboxMode(): boolean {
  return process.env.ZIBAL_SANDBOX === 'true';
}

/**
 * Get Zibal configuration from environment
 */
function getZibalConfig(): ZibalConfig {
  const merchant = process.env.ZIBAL_MERCHANT || '';
  const baseUrl = 'https://gateway.zibal.ir/v1';

  if (!merchant) {
    throw new Error('Zibal merchant not configured');
  }

  return {
    merchant,
    baseUrl,
  };
}

/**
 * Create axios client with proxy disabled
 */
function createHttpClient(baseUrl: string) {
  return axios.create({
    baseURL: baseUrl,
    proxy: false, // Disable proxy to avoid HTTP/HTTPS mismatch issues
    headers: {
      'User-Agent': 'ZibalClient/v1 (Node.js)',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });
}

/**
 * Get status message for Zibal result code
 */
function getStatusMessage(resultCode: number): string {
  return ZIBAL_RESULT_CODES[resultCode] || 'خطای نامشخص';
}

/**
 * Payment request parameters
 */
export interface PaymentRequest {
  amount: number; // Amount in Tomans (will be converted to Rials internally)
  description?: string;
  mobile?: string;
  callbackUrl: string;
  orderId?: string; // Optional order ID for tracking
}

/**
 * Payment request response
 */
export interface PaymentRequestResponse {
  trackId: number;
  redirectUrl: string;
  status: number;
}

/**
 * Payment verification parameters
 */
export interface PaymentVerification {
  trackId: number;
  amount: number; // Original amount in Tomans
}

/**
 * Payment verification response
 */
export interface PaymentVerificationResponse {
  trackId: number;
  refNumber: number;
  amount: number; // Amount in Rials
  paidAt: string;
  cardNumber?: string;
  status: number;
}

/**
 * Create a payment request and get payment URL
 */
export async function createPaymentRequest(
  request: PaymentRequest
): Promise<PaymentRequestResponse> {
  const startTime = Date.now();
  const config = getZibalConfig();

  // Convert Tomans to Rials (1 Toman = 10 Rials)
  const amountInRials = request.amount * 10;

  log.info('Creating Zibal payment request', {
    amountInTomans: request.amount,
    amountInRials: amountInRials,
    mobile: request.mobile,
    callbackUrl: request.callbackUrl,
    orderId: request.orderId,
    sandbox: isSandboxMode(),
  });

  try {
    const httpClient = createHttpClient(config.baseUrl);

    const requestBody = {
      merchant: config.merchant,
      amount: amountInRials, // Zibal expects Rials
      callbackUrl: request.callbackUrl,
      ...(request.description && { description: request.description }),
      ...(request.mobile && { mobile: request.mobile }),
      ...(request.orderId && { orderId: request.orderId }),
    };

    const response = await httpClient.post('/request', requestBody);

    const zibalResponse: ZibalRequestResponse = response.data;

    log.info('Zibal payment request response', {
      result: zibalResponse.result,
      message: zibalResponse.message,
      trackId: zibalResponse.trackId,
      elapsedMs: Date.now() - startTime,
    });

    if (zibalResponse.result !== 100) {
      const errorMessage = getStatusMessage(zibalResponse.result);
      log.error('Zibal payment request failed', {
        result: zibalResponse.result,
        message: errorMessage,
        elapsedMs: Date.now() - startTime,
      });
      throw new Error(errorMessage);
    }

    const redirectUrl = `${config.baseUrl}/start/${zibalResponse.trackId}`;

    log.info('Zibal payment request created successfully', {
      trackId: zibalResponse.trackId,
      redirectUrl,
      elapsedMs: Date.now() - startTime,
    });

    return {
      trackId: zibalResponse.trackId,
      redirectUrl,
      status: 100,
    };
  } catch (error) {
    log.error('Zibal payment request error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      elapsedMs: Date.now() - startTime,
    });

    if (
      error instanceof Error &&
      Object.values(ZIBAL_RESULT_CODES).includes(error.message)
    ) {
      throw error;
    }

    throw new Error(
      error instanceof Error
        ? error.message
        : 'خطا در اتصال به درگاه پرداخت زیبال'
    );
  }
}

/**
 * Verify a payment after user returns from Zibal
 */
export async function verifyPayment(
  verification: PaymentVerification
): Promise<PaymentVerificationResponse> {
  const { trackId, amount } = verification;
  const startTime = Date.now();
  const config = getZibalConfig();

  // Convert Tomans to Rials for validation
  const amountInRials = amount * 10;

  log.info('Verifying Zibal payment', {
    trackId,
    amountInTomans: amount,
    amountInRials: amountInRials,
    sandbox: isSandboxMode(),
  });

  try {
    const httpClient = createHttpClient(config.baseUrl);

    const response = await httpClient.post('/verify', {
      merchant: config.merchant,
      trackId,
    });

    const zibalResponse: ZibalVerifyResponse = response.data;

    log.info('Zibal verify API response', {
      trackId,
      result: zibalResponse.result,
      message: zibalResponse.message,
      amount: zibalResponse.amount,
      refNumber: zibalResponse.refNumber,
      elapsedMs: Date.now() - startTime,
    });

    // Check verification result
    if (zibalResponse.result !== 100) {
      const errorMessage = getStatusMessage(zibalResponse.result);
      log.error('Zibal verification failed', {
        trackId,
        result: zibalResponse.result,
        message: errorMessage,
        elapsedMs: Date.now() - startTime,
      });
      throw new Error(errorMessage);
    }

    // Validate amount matches
    if (zibalResponse.amount !== amountInRials) {
      log.error('Zibal verification amount mismatch', {
        expected: amountInRials,
        received: zibalResponse.amount,
        trackId,
      });
      throw new Error('مبلغ پرداخت شده با مبلغ تراکنش مطابقت ندارد');
    }

    log.info('Zibal payment verified successfully', {
      trackId,
      refNumber: zibalResponse.refNumber,
      amount: zibalResponse.amount,
      paidAt: zibalResponse.paidAt,
      elapsedMs: Date.now() - startTime,
    });

    return {
      trackId,
      refNumber: zibalResponse.refNumber || 0,
      amount: zibalResponse.amount || amountInRials,
      paidAt: zibalResponse.paidAt || new Date().toISOString(),
      cardNumber: zibalResponse.cardNumber,
      status: 100,
    };
  } catch (error) {
    log.error('Zibal payment verification error', {
      trackId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      elapsedMs: Date.now() - startTime,
    });

    if (
      error instanceof Error &&
      Object.values(ZIBAL_RESULT_CODES).includes(error.message)
    ) {
      throw error;
    }

    throw new Error(
      error instanceof Error ? error.message : 'خطا در تأیید پرداخت'
    );
  }
}

/**
 * Get callback URL for payment verification
 * Prioritizes environment variables over request URL to handle reverse proxy scenarios
 */
export function getCallbackUrl(_requestUrl?: string): string {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'http://localhost:3000';
  return `${baseUrl}/api/transactions/verify-zibal`;
}
