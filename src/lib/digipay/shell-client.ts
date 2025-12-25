/**
 * Digipay Shell Command Wrapper
 * Executes Digipay API calls via curl shell commands
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { log } from '@/lib/logger';

const execAsync = promisify(exec);

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
    const basicAuth = getBasicAuthHeader(config.clientId, config.clientSecret);

    const curlCommand = `curl --location --request POST '${config.baseUrl}/digipay/api/oauth/token' \
--header 'Authorization: Basic ${basicAuth}' \
--form 'username="${config.username}"' \
--form 'password="${config.password}"' \
--form 'grant_type=password'`;

    const { stdout, stderr } = await execAsync(curlCommand);

    if (stderr) {
      log.warn('Digipay OAuth stderr output', { stderr });
    }

    const response: OAuthTokenResponse = JSON.parse(stdout);

    log.info('Digipay OAuth token obtained successfully', {
      tokenType: response.token_type,
      expiresIn: response.expires_in,
      elapsedMs: Date.now() - startTime,
    });

    return response;
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

    const curlCommand = `curl --location '${config.baseUrl}/digipay/api/tickets/business?type=11' \
--header 'Agent: WEB' \
--header 'Digipay-Version: 2022-02-02' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer ${accessToken}' \
--data '${JSON.stringify(requestBody).replace(/'/g, "'\\''")}'`;

    const { stdout, stderr } = await execAsync(curlCommand);

    if (stderr) {
      log.warn('Digipay ticket creation stderr output', { stderr });
    }

    const response: TicketResponse = JSON.parse(stdout);

    if (response.result.status !== 0) {
      log.error('Digipay ticket creation failed', {
        status: response.result.status,
        message: response.result.message,
        elapsedMs: Date.now() - startTime,
      });

      throw new Error(response.result.message || 'خطا در ایجاد تیکت پرداخت');
    }

    log.info('Digipay ticket created successfully', {
      ticket: response.ticket,
      redirectUrl: response.redirectUrl,
      elapsedMs: Date.now() - startTime,
    });

    return response;
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
    const curlCommand = `curl --location --request POST '${config.baseUrl}/digipay/api/purchases/verify?type=5' \
--header 'Authorization: Bearer ${accessToken}' \
--header 'Content-Type: application/json' \
--data-raw '${JSON.stringify(request).replace(/'/g, "'\\''")}'`;

    const { stdout, stderr } = await execAsync(curlCommand);

    if (stderr) {
      log.warn('Digipay verification stderr output', { stderr });
    }

    const response: VerificationResponse = JSON.parse(stdout);

    if (response.result.status !== 0) {
      log.error('Digipay verification failed', {
        status: response.result.status,
        message: response.result.message,
        trackingCode: request.trackingCode,
        elapsedMs: Date.now() - startTime,
      });

      throw new Error(response.result.message || 'تراکنش ناموفق بود');
    }

    log.info('Digipay purchase verified successfully', {
      trackingCode: response.trackingCode,
      amount: response.amount,
      fpName: response.fpName,
      elapsedMs: Date.now() - startTime,
    });

    return response;
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
    const curlCommand = `curl --location --request POST '${config.baseUrl}/digipay/api/reverse' \
--header 'Authorization: Bearer ${accessToken}' \
--header 'Content-Type: application/json' \
--data '${JSON.stringify(request).replace(/'/g, "'\\''")}'`;

    const { stdout, stderr } = await execAsync(curlCommand);

    if (stderr) {
      log.warn('Digipay reverse stderr output', { stderr });
    }

    const response: ReverseResponse = JSON.parse(stdout);

    if (response.result.status !== 0) {
      log.error('Digipay reverse failed', {
        status: response.result.status,
        message: response.result.message,
        purchaseTrackingCode: request.purchaseTrackingCode,
        elapsedMs: Date.now() - startTime,
      });

      throw new Error(response.result.message || 'خطا در برگشت تراکنش');
    }

    log.info('Digipay purchase reversed successfully', {
      trackingCode: response.trackingCode,
      amount: response.amount,
      elapsedMs: Date.now() - startTime,
    });

    return response;
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
