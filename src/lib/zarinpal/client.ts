/**
 * Zarinpal Payment Gateway Client
 * Direct axios implementation to bypass proxy issues with the SDK
 */

import 'server-only';
import axios from 'axios';
import { log } from '@/lib/logger';

// Configuration
function getConfig() {
  const merchantId = process.env.ZARINPAL_MERCHANT_ID || 'test';
  const sandbox = process.env.ZARINPAL_SANDBOX === 'true';
  const baseURL = sandbox
    ? 'https://sandbox.zarinpal.com'
    : 'https://payment.zarinpal.com';

  return { merchantId, sandbox, baseURL };
}

// Create axios client with proxy disabled to avoid system proxy interference
function createHttpClient(baseURL: string) {
  return axios.create({
    baseURL,
    proxy: false, // Disable proxy to avoid HTTP/HTTPS mismatch issues
    headers: {
      'User-Agent': 'ZarinPalClient/v1 (Node.js)',
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
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
  const config = getConfig();

  // Convert Tomans to Rials (1 Toman = 10 Rials)
  const amountInRials = request.amount * 10;

  log.info('Creating Zarinpal payment request', {
    amountInTomans: request.amount,
    amountInRials: amountInRials,
    mobile: request.mobile,
    email: request.email,
    callbackUrl: request.callbackUrl,
    sandbox: config.sandbox,
  });

  try {
    const httpClient = createHttpClient(config.baseURL);
    const response = await httpClient.post('/pg/v4/payment/request.json', {
      merchant_id: config.merchantId,
      amount: amountInRials, // Zarinpal expects Rials
      callback_url: request.callbackUrl,
      description: request.description,
      email: request.email,
      mobile: request.mobile,
    });

    log.info('Zarinpal payment request response', {
      responseData: response.data?.data,
      responseErrors: response.data?.errors,
      elapsedMs: Date.now() - startTime,
    });

    if (response.data?.data?.authority) {
      const authority = response.data.data.authority;
      const url = `${config.baseURL}/pg/StartPay/${authority}`;

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
      response: response.data,
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
  const config = getConfig();

  // E2E Test Mode: Skip actual Zarinpal API call and return mock success
  // This allows E2E tests to verify the full checkout flow without hitting real payment APIs
  if (process.env.E2E_MOCK_PAYMENTS === 'true') {
    log.info('E2E Mock Mode: Simulating successful payment verification', {
      authority,
      amount,
    });
    return {
      status: 100,
      refId: Date.now(), // Mock reference ID
    };
  }

  // Convert Tomans to Rials (1 Toman = 10 Rials)
  const amountInRials = amount * 10;

  log.info('Calling Zarinpal verify API', {
    authority,
    amountInTomans: amount,
    amountInRials: amountInRials,
    sandbox: config.sandbox,
    merchantId: config.merchantId,
  });

  try {
    const httpClient = createHttpClient(config.baseURL);
    const response = await httpClient.post('/pg/v4/payment/verify.json', {
      merchant_id: config.merchantId,
      amount: amountInRials, // Must match original amount in Rials
      authority: authority,
    });

    log.info('Zarinpal verify API response received', {
      authority,
      responseData: response.data?.data,
      responseErrors: response.data?.errors,
      elapsedMs: Date.now() - startTime,
    });

    if (response.data?.data?.ref_id) {
      log.info('Payment verification successful', {
        authority,
        refId: response.data.data.ref_id,
        elapsedMs: Date.now() - startTime,
      });

      return {
        status: 100,
        refId: response.data.data.ref_id,
      };
    }

    log.error('Zarinpal verification failed - no ref_id returned', {
      authority,
      response: response.data,
      elapsedMs: Date.now() - startTime,
    });

    throw new Error('تراکنش ناموفق بود');
  } catch (error) {
    log.error('Zarinpal payment verification error', {
      authority,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
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
 * Prioritizes environment variables over request URL to handle reverse proxy scenarios
 * (e.g., Nginx proxying to localhost:3001 on VPS)
 */
export function getCallbackUrl(_requestUrl?: string): string {
  // Use environment variables as primary source (handles VPS reverse proxy correctly)
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || getAppUrl();
  return `${baseUrl}/api/transactions/verify`;
}
