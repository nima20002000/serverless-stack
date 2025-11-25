/**
 * Zarinpal Payment Gateway Client
 * Wrapper for zarinpal-node-sdk
 */

import ZarinPal from 'zarinpal-node-sdk';

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
  amount: number; // Amount in Tomans
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
  try {
    const client = getZarinpalClient();
    const response = await client.payments.create({
      amount: request.amount, // In Tomans
      callback_url: request.callbackUrl,
      description: request.description,
      email: request.email,
      mobile: request.mobile,
    });

    if (response.data && response.data.authority) {
      const authority = response.data.authority;
      const url = client.payments.getRedirectUrl(authority);

      return {
        status: 100,
        authority,
        url,
      };
    }

    throw new Error(`خطا در ایجاد درخواست پرداخت`);
  } catch (error) {
    console.error('Zarinpal payment request error:', error);
    throw new Error(error instanceof Error ? error.message : 'خطا در اتصال به درگاه پرداخت');
  }
}

/**
 * Verify a payment after user returns from Zarinpal
 */
export async function verifyPayment(
  authority: string,
  amount: number
): Promise<PaymentVerification> {
  try {
    const client = getZarinpalClient();
    const response = await client.verifications.verify({
      amount: amount, // Must match original amount
      authority: authority,
    });

    if (response.data && response.data.ref_id) {
      return {
        status: 100,
        refId: response.data.ref_id,
      };
    }

    throw new Error(`تراکنش ناموفق بود`);
  } catch (error) {
    console.error('Zarinpal payment verification error:', error);
    throw new Error(error instanceof Error ? error.message : 'خطا در تأیید پرداخت');
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
 */
export function getCallbackUrl(): string {
  return `${getAppUrl()}/api/transactions/verify`;
}
