/**
 * Zarinpal Payment Gateway Client
 * Wrapper for zarinpal-node-sdk
 */

import 'server-only';
import ZarinPal from 'zarinpal-node-sdk';
import { log } from '@/lib/logger';

// Create new client on every call to ensure fresh env vars
function getZarinpalClient(): ZarinPal {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID || 'test';
  const sandbox = process.env.ZARINPAL_SANDBOX === 'true';

  console.log('Creating Zarinpal client with merchant ID:', merchantId);
  console.log('Sandbox mode:', sandbox);

  return new ZarinPal({
    merchantId,
    sandbox,
  });
}

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
}

export interface PaymentRequest {
  amount: number; // Amount in Tomans (will be converted to Rials internally)
  description: string;
  email?: string;
  mobile?: string;
  callbackUrl: string;
}

export interface PaymentRequestResponse {
  status: number;
  authority: string;
  url: string;
}

export interface PaymentVerification {
  status: number;
  refId: number;
}

/**
 * Create a payment request and get payment URL
 */
export async function createPaymentRequest(
  request: PaymentRequest
): Promise<PaymentRequestResponse> {
  const startTime = Date.now();

  // Convert Tomans to Rials (1 Toman = 10 Rials)
  const amountInRials = request.amount * 10;

  log.info('Creating Zarinpal payment request', {
    amountInTomans: request.amount,
    amountInRials: amountInRials,
    mobile: request.mobile,
    email: request.email,
    callbackUrl: request.callbackUrl,
    sandbox: isSandboxMode(),
  });

  try {
    const client = getZarinpalClient();
    const response = await client.payments.create({
      amount: amountInRials, // Zarinpal expects Rials
      callback_url: request.callbackUrl,
      description: request.description,
      email: request.email,
      mobile: request.mobile,
    });

    log.info('Zarinpal payment request response', {
      responseData: response.data,
      responseErrors: response.errors,
      elapsedMs: Date.now() - startTime,
    });

    if (response.data && response.data.authority) {
      const authority = response.data.authority;
      const url = client.payments.getRedirectUrl(authority);

      log.info('Payment request created successfully', {
        authority,
        url,
        elapsedMs: Date.now() - startTime,
      });

      return {
        status: 100,
        authority,
        url,
      };
    }

    log.error('Zarinpal payment request failed - no authority returned', {
      response,
      elapsedMs: Date.now() - startTime,
    });

    throw new Error('خطا در ایجاد درخواست پرداخت');
  } catch (error) {
    log.error('Zarinpal payment request error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      elapsedMs: Date.now() - startTime,
    });

    console.error('Zarinpal payment request error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'خطا در اتصال به درگاه پرداخت'
    );
  }
}

/**
 * Verify a payment after user returns from Zarinpal
 * @param authority - Zarinpal authority code
 * @param amount - Amount in Tomans (will be converted to Rials internally)
 */
export async function verifyPayment(
  authority: string,
  amount: number
): Promise<PaymentVerification> {
  const startTime = Date.now();

  // Convert Tomans to Rials (1 Toman = 10 Rials)
  const amountInRials = amount * 10;

  log.info('Calling Zarinpal verify API', {
    authority,
    amountInTomans: amount,
    amountInRials: amountInRials,
    sandbox: isSandboxMode(),
    merchantId: process.env.ZARINPAL_MERCHANT_ID || 'test',
  });

  try {
    const client = getZarinpalClient();
    const response = await client.verifications.verify({
      amount: amountInRials, // Must match original amount in Rials
      authority: authority,
    });

    log.info('Zarinpal verify API response received', {
      authority,
      responseData: response.data,
      responseErrors: response.errors,
      elapsedMs: Date.now() - startTime,
    });

    if (response.data && response.data.ref_id) {
      log.info('Payment verification successful', {
        authority,
        refId: response.data.ref_id,
        elapsedMs: Date.now() - startTime,
      });

      return {
        status: 100,
        refId: response.data.ref_id,
      };
    }

    log.error('Zarinpal verification failed - no ref_id returned', {
      authority,
      response,
      elapsedMs: Date.now() - startTime,
    });

    throw new Error('تراکنش ناموفق بود');
  } catch (error) {
    log.error('Zarinpal payment verification error', {
      authority,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      // Log the full error object to see Zarinpal's error details
      errorObject: error,
      elapsedMs: Date.now() - startTime,
    });

    console.error('Zarinpal payment verification error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'خطا در تأیید پرداخت'
    );
  }
}

/**
 * Check if running in sandbox mode
 */
export function isSandboxMode(): boolean {
  return process.env.ZARINPAL_SANDBOX === 'true';
}

/**
 * Get callback URL for payment verification
 * @param requestUrl Optional request URL to extract origin from (for Vercel preview deployments)
 */
export function getCallbackUrl(requestUrl?: string): string {
  // Runtime detection: use request origin for preview deployments
  if (requestUrl) {
    const origin = new URL(requestUrl).origin;
    return `${origin}/api/transactions/verify`;
  }

  // Fallback to NEXTAUTH_URL (Vercel sets this automatically for previews)
  const baseUrl = process.env.NEXTAUTH_URL || getAppUrl();
  return `${baseUrl}/api/transactions/verify`;
}
