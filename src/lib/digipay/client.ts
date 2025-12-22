/**
 * Digipay Payment Gateway Client
 * High-level wrapper for Digipay payment operations
 */

import {
  obtainAccessToken,
  createTicket as createDigipayTicket,
  verifyPurchase as verifyDigipayPurchase,
  reversePurchase as reverseDigipayPurchase,
  isSandboxMode,
} from './shell-client';
import { log } from '@/lib/logger';

/**
 * OAuth token cache
 */
let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get a valid OAuth token (uses cache if available and not expired)
 */
async function getValidToken(): Promise<string> {
  const now = Date.now();

  // Check if cached token is still valid (with 5-minute buffer)
  if (cachedToken && cachedToken.expiresAt > now + 5 * 60 * 1000) {
    log.info('Using cached Digipay OAuth token');
    return cachedToken.token;
  }

  // Obtain new token
  log.info('Obtaining new Digipay OAuth token');
  const tokenResponse = await obtainAccessToken();

  // Cache the token
  cachedToken = {
    token: tokenResponse.access_token,
    expiresAt: now + tokenResponse.expires_in * 1000,
  };

  return tokenResponse.access_token;
}

/**
 * Payment request parameters
 */
export interface PaymentRequest {
  amount: number; // Amount in Tomans (will be converted to Rials internally)
  description: string;
  cellNumber: string;
  callbackUrl: string;
  providerId: string; // Unique transaction identifier (e.g., transactionCode)
  preferredGateway?: 'IPG' | 'WALLET'; // IPG (card) or WALLET (Digipay balance)
}

/**
 * Payment request response
 */
export interface PaymentRequestResponse {
  ticket: string;
  redirectUrl: string;
  status: number;
}

/**
 * Payment verification parameters
 */
export interface PaymentVerification {
  trackingCode: string;
  amount: number; // Original amount in Tomans
  providerId: string; // Must match the providerId from payment request
}

/**
 * Payment verification response
 */
export interface PaymentVerificationResponse {
  trackingCode: string;
  providerId: string;
  amount: number; // Amount in Rials
  fpName: string;
  paymentGateway: number;
  status: number;
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

  // Map preferred gateway to Digipay gateway code
  // 0: Wallet, 2: IPG
  let gatewayCode: number | undefined;
  if (request.preferredGateway === 'WALLET') {
    gatewayCode = 0;
  } else if (request.preferredGateway === 'IPG') {
    gatewayCode = 2;
  }

  log.info('Creating Digipay payment request', {
    amountInTomans: request.amount,
    amountInRials: amountInRials,
    cellNumber: request.cellNumber,
    callbackUrl: request.callbackUrl,
    providerId: request.providerId,
    preferredGateway: request.preferredGateway,
    gatewayCode,
    sandbox: isSandboxMode(),
  });

  try {
    // Get OAuth token
    const accessToken = await getValidToken();

    // Create ticket
    const ticketResponse = await createDigipayTicket(accessToken, {
      cellNumber: request.cellNumber,
      amount: amountInRials,
      providerId: request.providerId,
      callbackUrl: request.callbackUrl,
      preferredGateway: gatewayCode,
    });

    log.info('Digipay payment request created successfully', {
      ticket: ticketResponse.ticket,
      redirectUrl: ticketResponse.redirectUrl,
      elapsedMs: Date.now() - startTime,
    });

    return {
      ticket: ticketResponse.ticket,
      redirectUrl: ticketResponse.redirectUrl,
      status: 100, // Success status matching Zarinpal
    };
  } catch (error) {
    log.error('Digipay payment request error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      elapsedMs: Date.now() - startTime,
    });

    throw new Error(
      error instanceof Error ? error.message : 'خطا در اتصال به درگاه پرداخت'
    );
  }
}

/**
 * Verify a payment after user returns from Digipay
 */
export async function verifyPayment(
  verification: PaymentVerification
): Promise<PaymentVerificationResponse> {
  const { trackingCode, amount, providerId } = verification;
  const startTime = Date.now();

  // Convert Tomans to Rials for validation
  const amountInRials = amount * 10;

  log.info('Verifying Digipay payment', {
    trackingCode,
    providerId,
    amountInTomans: amount,
    amountInRials: amountInRials,
    sandbox: isSandboxMode(),
  });

  try {
    // Get OAuth token
    const accessToken = await getValidToken();

    // Verify purchase
    const verificationResponse = await verifyDigipayPurchase(accessToken, {
      trackingCode,
      providerId,
    });

    // Validate amount matches
    if (verificationResponse.amount !== amountInRials) {
      log.error('Digipay verification amount mismatch', {
        expected: amountInRials,
        received: verificationResponse.amount,
        trackingCode,
      });

      throw new Error('مبلغ پرداخت شده با مبلغ تراکنش مطابقت ندارد');
    }

    // Validate providerId matches (security check as per Digipay documentation)
    if (verificationResponse.providerId !== providerId) {
      log.error('Digipay verification providerId mismatch', {
        expected: providerId,
        received: verificationResponse.providerId,
        trackingCode,
      });

      throw new Error('شناسه تراکنش مطابقت ندارد');
    }

    log.info('Digipay payment verified successfully', {
      trackingCode: verificationResponse.trackingCode,
      amount: verificationResponse.amount,
      fpName: verificationResponse.fpName,
      elapsedMs: Date.now() - startTime,
    });

    return {
      trackingCode: verificationResponse.trackingCode,
      providerId: verificationResponse.providerId,
      amount: verificationResponse.amount,
      fpName: verificationResponse.fpName,
      paymentGateway: verificationResponse.paymentGateway,
      status: 100, // Success status matching Zarinpal
    };
  } catch (error) {
    log.error('Digipay payment verification error', {
      trackingCode,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      elapsedMs: Date.now() - startTime,
    });

    throw new Error(
      error instanceof Error ? error.message : 'خطا در تأیید پرداخت'
    );
  }
}

/**
 * Reverse/refund a payment
 * @param trackingCode - Digipay tracking code of the purchase to reverse
 * @param providerId - Original providerId used in payment request
 */
export async function reversePayment(
  trackingCode: string,
  providerId: string
): Promise<void> {
  const startTime = Date.now();

  log.info('Reversing Digipay payment', {
    trackingCode,
    providerId,
    sandbox: isSandboxMode(),
  });

  try {
    // Get OAuth token
    const accessToken = await getValidToken();

    // Reverse purchase
    await reverseDigipayPurchase(accessToken, {
      purchaseTrackingCode: trackingCode,
      providerId,
    });

    log.info('Digipay payment reversed successfully', {
      trackingCode,
      elapsedMs: Date.now() - startTime,
    });
  } catch (error) {
    log.error('Digipay payment reversal error', {
      trackingCode,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      elapsedMs: Date.now() - startTime,
    });

    throw new Error(
      error instanceof Error ? error.message : 'خطا در برگشت تراکنش'
    );
  }
}

/**
 * Get callback URL for payment verification
 * @param requestUrl Optional request URL to extract origin from (for Vercel preview deployments)
 */
export function getCallbackUrl(requestUrl?: string): string {
  // Runtime detection: use request origin for preview deployments
  if (requestUrl) {
    const origin = new URL(requestUrl).origin;
    return `${origin}/api/transactions/verify-digipay`;
  }

  // Fallback to NEXTAUTH_URL (Vercel sets this automatically for previews)
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000';
  return `${baseUrl}/api/transactions/verify-digipay`;
}
