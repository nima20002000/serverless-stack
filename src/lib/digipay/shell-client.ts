/**
 * Digipay API Client
 * Uses axios for HTTP requests with proxy disabled
 */

import 'server-only';
import axios from 'axios';
import FormData from 'form-data';
import { log } from '@/lib/logger';

/**
 * Digipay API credentials and configuration
 */
interface DigipayConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  username: string;
  password: string;
}

/**
 * OAuth token response
 */
interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  jti: string;
}

/**
 * Ticket request parameters
 */
interface TicketRequest {
  cellNumber: string;
  amount: number; // Amount in Rials
  providerId: string;
  callbackUrl: string;
  preferredGateway?: number; // 0: Wallet, 2: IPG
}

/**
 * Ticket response
 */
interface TicketResponse {
  result: {
    title: string;
    status: number;
    message: string;
    level: string;
  };
  ticket: string;
  redirectUrl: string;
}

/**
 * Verification request parameters
 */
interface VerificationRequest {
  trackingCode: string;
  providerId: string;
}

/**
 * Verification response
 */
interface VerificationResponse {
  result: {
    status: number;
    message: string;
    level: string;
  };
  trackingCode: string;
  providerId: string;
  fpCode: string;
  fpName: string;
  amount: number;
  paymentGateway: number;
  additionalInfo?: {
    prepaymentAmount: number;
    cashAmount: number;
    creditAmount: number;
    instantFinalization: boolean;
    generateInvoice: boolean;
  };
}

/**
 * Reverse/refund request parameters
 */
interface ReverseRequest {
  purchaseTrackingCode: string;
  providerId: string;
}

/**
 * Reverse/refund response
 */
interface ReverseResponse {
  result: {
    status: number;
    message: string;
    level: string;
  };
  providerId: string;
  trackingCode: string;
  rrn?: string;
  maskedPan?: string;
  amount: number;
  paymentGateway: number;
}

/**
 * Check if running in sandbox/UAT mode
 */
export function isSandboxMode(): boolean {
  return process.env.DIGIPAY_SANDBOX === 'true';
}

/**
 * Get Digipay configuration from environment
 * Uses correct API URLs based on sandbox mode:
 * - Sandbox: https://uat.mydigipay.info
 * - Production: https://api.mydigipay.com
 */
function getDigipayConfig(): DigipayConfig {
  const sandbox = isSandboxMode();
  const baseUrl = sandbox
    ? 'https://uat.mydigipay.info'
    : 'https://api.mydigipay.com';

  const clientId = process.env.DIGIPAY_CLIENT_ID || '';
  const clientSecret = process.env.DIGIPAY_CLIENT_SECRET || '';
  const username = process.env.DIGIPAY_USERNAME || '';
  const password = process.env.DIGIPAY_PASSWORD || '';

  if (!clientId || !clientSecret || !username || !password) {
    throw new Error('Digipay credentials not configured');
  }

  return {
    baseUrl,
    clientId,
    clientSecret,
    username,
    password,
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
      'User-Agent': 'DigipayClient/v1 (Node.js)',
    },
  });
}

/**
 * Create OAuth Basic Authentication header
 */
function getBasicAuthHeader(clientId: string, clientSecret: string): string {
  const credentials = `${clientId}:${clientSecret}`;
  return Buffer.from(credentials).toString('base64');
}

/**
 * Obtain OAuth access token from Digipay
 */
export async function obtainAccessToken(): Promise<OAuthTokenResponse> {
  const startTime = Date.now();
  const config = getDigipayConfig();

  log.info('Obtaining Digipay OAuth token', {
    baseUrl: config.baseUrl,
    username: config.username,
  });

  try {
    const httpClient = createHttpClient(config.baseUrl);
    const basicAuth = getBasicAuthHeader(config.clientId, config.clientSecret);

    // Create form data for OAuth token request
    const formData = new FormData();
    formData.append('username', config.username);
    formData.append('password', config.password);
    formData.append('grant_type', 'password');

    const response = await httpClient.post(
      '/digipay/api/oauth/token',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    const tokenResponse: OAuthTokenResponse = response.data;

    log.info('Digipay OAuth token obtained successfully', {
      tokenType: tokenResponse.token_type,
      expiresIn: tokenResponse.expires_in,
      elapsedMs: Date.now() - startTime,
    });

    return tokenResponse;
  } catch (error) {
    log.error('Failed to obtain Digipay OAuth token', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      elapsedMs: Date.now() - startTime,
    });

    throw new Error('خطا در دریافت توکن احراز هویت از دیجی‌پی');
  }
}

/**
 * Create payment ticket (initiate payment)
 */
export async function createTicket(
  accessToken: string,
  request: TicketRequest
): Promise<TicketResponse> {
  const startTime = Date.now();
  const config = getDigipayConfig();

  log.info('Creating Digipay ticket', {
    amount: request.amount,
    cellNumber: request.cellNumber,
    providerId: request.providerId,
    preferredGateway: request.preferredGateway,
  });

  try {
    const httpClient = createHttpClient(config.baseUrl);

    const requestBody = {
      cellNumber: request.cellNumber,
      amount: request.amount,
      providerId: request.providerId,
      callbackUrl: request.callbackUrl,
      ...(request.preferredGateway !== undefined && {
        additionalInfo: {
          preferredGateway: request.preferredGateway,
        },
      }),
    };

    const response = await httpClient.post(
      '/digipay/api/tickets/business?type=11',
      requestBody,
      {
        headers: {
          Agent: 'WEB',
          'Digipay-Version': '2022-02-02',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const ticketResponse: TicketResponse = response.data;

    if (ticketResponse.result.status !== 0) {
      log.error('Digipay ticket creation failed', {
        status: ticketResponse.result.status,
        message: ticketResponse.result.message,
        elapsedMs: Date.now() - startTime,
      });

      throw new Error(
        ticketResponse.result.message || 'خطا در ایجاد تیکت پرداخت'
      );
    }

    log.info('Digipay ticket created successfully', {
      ticket: ticketResponse.ticket,
      redirectUrl: ticketResponse.redirectUrl,
      elapsedMs: Date.now() - startTime,
    });

    return ticketResponse;
  } catch (error) {
    log.error('Failed to create Digipay ticket', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      elapsedMs: Date.now() - startTime,
    });

    if (error instanceof Error && error.message.includes('خطا در ایجاد تیکت')) {
      throw error;
    }

    throw new Error('خطا در اتصال به درگاه پرداخت دیجی‌پی');
  }
}

/**
 * Verify payment (after user completes payment)
 */
export async function verifyPurchase(
  accessToken: string,
  request: VerificationRequest
): Promise<VerificationResponse> {
  const startTime = Date.now();
  const config = getDigipayConfig();

  log.info('Verifying Digipay purchase', {
    trackingCode: request.trackingCode,
    providerId: request.providerId,
  });

  try {
    const httpClient = createHttpClient(config.baseUrl);

    const response = await httpClient.post(
      '/digipay/api/purchases/verify?type=5',
      request,
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const verificationResponse: VerificationResponse = response.data;

    if (verificationResponse.result.status !== 0) {
      log.error('Digipay verification failed', {
        status: verificationResponse.result.status,
        message: verificationResponse.result.message,
        trackingCode: request.trackingCode,
        elapsedMs: Date.now() - startTime,
      });

      throw new Error(
        verificationResponse.result.message || 'تراکنش ناموفق بود'
      );
    }

    log.info('Digipay purchase verified successfully', {
      trackingCode: verificationResponse.trackingCode,
      amount: verificationResponse.amount,
      fpName: verificationResponse.fpName,
      elapsedMs: Date.now() - startTime,
    });

    return verificationResponse;
  } catch (error) {
    log.error('Failed to verify Digipay purchase', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      trackingCode: request.trackingCode,
      elapsedMs: Date.now() - startTime,
    });

    if (error instanceof Error && error.message.includes('تراکنش ناموفق')) {
      throw error;
    }

    throw new Error('خطا در تأیید پرداخت');
  }
}

/**
 * Reverse/refund a payment
 */
export async function reversePurchase(
  accessToken: string,
  request: ReverseRequest
): Promise<ReverseResponse> {
  const startTime = Date.now();
  const config = getDigipayConfig();

  log.info('Reversing Digipay purchase', {
    purchaseTrackingCode: request.purchaseTrackingCode,
    providerId: request.providerId,
  });

  try {
    const httpClient = createHttpClient(config.baseUrl);

    const response = await httpClient.post('/digipay/api/reverse', request, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const reverseResponse: ReverseResponse = response.data;

    if (reverseResponse.result.status !== 0) {
      log.error('Digipay reverse failed', {
        status: reverseResponse.result.status,
        message: reverseResponse.result.message,
        purchaseTrackingCode: request.purchaseTrackingCode,
        elapsedMs: Date.now() - startTime,
      });

      throw new Error(reverseResponse.result.message || 'خطا در برگشت تراکنش');
    }

    log.info('Digipay purchase reversed successfully', {
      trackingCode: reverseResponse.trackingCode,
      amount: reverseResponse.amount,
      elapsedMs: Date.now() - startTime,
    });

    return reverseResponse;
  } catch (error) {
    log.error('Failed to reverse Digipay purchase', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      purchaseTrackingCode: request.purchaseTrackingCode,
      elapsedMs: Date.now() - startTime,
    });

    if (error instanceof Error && error.message.includes('خطا در برگشت')) {
      throw error;
    }

    throw new Error('خطا در برگشت تراکنش');
  }
}
