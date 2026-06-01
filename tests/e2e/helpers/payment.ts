import { createHmac } from 'crypto';
import type { APIResponse, Page } from '@playwright/test';
import { createE2ESupabaseClient } from '../utils/database';

type SupportedGateway = 'stripe' | 'paypal';

const PAYPAL_APPROVAL_URL_PATTERN = /https?:\/\/(?:[^/]+\.)?paypal\.com\/.*/;
const ZERO_DECIMAL_CURRENCIES = new Set([
  'bif',
  'clp',
  'djf',
  'gnf',
  'jpy',
  'kmf',
  'krw',
  'mga',
  'pyg',
  'rwf',
  'ugx',
  'vnd',
  'vuv',
  'xaf',
  'xof',
  'xpf',
]);

interface PaymentCapture {
  transactionId?: string;
  transactionCode?: string;
  checkoutSessionId?: string;
  orderId?: string;
}

interface CapturedTransaction {
  id: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  transactionCode: string;
  amount: number;
  gateway_fee: number | null;
}

const paymentCapture: PaymentCapture = {};
const captureRoutesInstalled = new WeakSet<Page>();

function getPayPalE2EWebhookBypassSecret(): string {
  const secret = process.env.E2E_PAYPAL_WEBHOOK_BYPASS_SECRET;
  if (!secret) {
    throw new Error(
      'E2E_PAYPAL_WEBHOOK_BYPASS_SECRET is required for E2E PayPal mocks'
    );
  }

  return secret;
}

function resetPaymentCapture(): void {
  Object.keys(paymentCapture).forEach((key) => {
    delete paymentCapture[key as keyof PaymentCapture];
  });
}

async function captureTransactionCreateResponse(page: Page): Promise<void> {
  if (captureRoutesInstalled.has(page)) {
    return;
  }

  captureRoutesInstalled.add(page);

  await page.route('**/api/transactions/create', async (route) => {
    const response = await route.fetch();
    const body = await response.text();

    try {
      const data = JSON.parse(body) as PaymentCapture;
      paymentCapture.transactionId = data.transactionId;
      paymentCapture.transactionCode = data.transactionCode;
      paymentCapture.checkoutSessionId = data.checkoutSessionId;
      paymentCapture.orderId = data.orderId;
    } catch {
      // Preserve the original response even if it is not JSON.
    }

    await route.fulfill({
      response,
      body,
    });
  });
}

async function getCapturedTransaction(): Promise<CapturedTransaction> {
  const supabase = createE2ESupabaseClient();

  let query = supabase
    .from('transactions')
    .select('id, status, transactionCode, amount, gateway_fee')
    .limit(1);

  query = paymentCapture.transactionId
    ? query.eq('id', paymentCapture.transactionId)
    : query.eq('transactionCode', paymentCapture.transactionCode || '');

  const { data: transactions, error } = await query;

  if (error) {
    throw new Error(`Failed to load E2E payment transaction: ${error.message}`);
  }

  const transaction = transactions?.[0] as CapturedTransaction | undefined;

  if (!transaction) {
    throw new Error('E2E payment transaction was not captured');
  }

  return transaction;
}

function stripeMinorUnits(amount: number): number {
  const currency = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();
  return ZERO_DECIMAL_CURRENCIES.has(currency)
    ? Math.round(amount)
    : Math.round(amount * 100);
}

function paypalAmountValue(amount: number): string {
  const currency = (process.env.PAYPAL_CURRENCY || 'USD').toLowerCase();
  return ZERO_DECIMAL_CURRENCIES.has(currency)
    ? String(Math.round(amount))
    : amount.toFixed(2);
}

function createStripeSignature(payload: string): string {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is required for E2E Stripe mocks');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHmac('sha256', webhookSecret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

async function assertWebhookHandled(
  response: APIResponse,
  provider: SupportedGateway
): Promise<void> {
  const body = await response.json().catch(async () => ({
    error: await response.text(),
  }));

  if (!response.ok() || body.handled !== true) {
    throw new Error(
      `E2E ${provider} webhook did not complete transaction: ${JSON.stringify(
        body
      )}`
    );
  }
}

async function completeCapturedPayment(
  page: Page,
  provider: SupportedGateway
): Promise<void> {
  const transaction = await getCapturedTransaction();
  if (transaction.status === 'COMPLETED') {
    return;
  }

  const amount = Number(transaction.amount) + Number(transaction.gateway_fee || 0);

  if (provider === 'stripe') {
    const sessionId = paymentCapture.checkoutSessionId || 'cs_test_e2e';
    const currency = (process.env.STRIPE_CURRENCY || 'usd').toLowerCase();
    const event = {
      id: `evt_e2e_${Date.now()}`,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: sessionId,
          object: 'checkout.session',
          client_reference_id: transaction.id,
          metadata: {
            transactionId: transaction.id,
            transactionCode: transaction.transactionCode,
          },
          amount_total: stripeMinorUnits(amount),
          currency,
          payment_status: 'paid',
          payment_intent: `pi_e2e_${transaction.id.replace(/-/g, '')}`,
        },
      },
    };
    const payload = JSON.stringify(event);
    const response = await page.request.post('/api/transactions/webhook-stripe', {
      data: payload,
      headers: {
        'content-type': 'application/json',
        'stripe-signature': createStripeSignature(payload),
        'x-e2e-test': 'true',
      },
    });

    await assertWebhookHandled(response, provider);
    return;
  }

  const orderId = paymentCapture.orderId || 'ORDER-E2E';
  const currency = (process.env.PAYPAL_CURRENCY || 'USD').toUpperCase();
  const captureId = `${orderId}-capture`;
  const amountValue = paypalAmountValue(amount);
  const response = await page.request.post('/api/transactions/webhook-paypal', {
    data: {
      id: `WH-E2E-${Date.now()}`,
      event_type: 'CHECKOUT.ORDER.COMPLETED',
      resource: {
        id: orderId,
        purchase_units: [
          {
            custom_id: transaction.id,
            invoice_id: transaction.transactionCode,
            amount: {
              currency_code: currency,
              value: amountValue,
            },
            payments: {
              captures: [
                {
                  id: captureId,
                  status: 'COMPLETED',
                  amount: {
                    currency_code: currency,
                    value: amountValue,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    headers: {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api-m.sandbox.paypal.com/certs/e2e',
      'paypal-transmission-id': `e2e-${Date.now()}`,
      'paypal-transmission-sig': 'e2e-signature',
      'paypal-transmission-time': new Date().toISOString(),
      'x-e2e-test': 'true',
      'x-e2e-paypal-webhook-secret': getPayPalE2EWebhookBypassSecret(),
    },
  });

  await assertWebhookHandled(response, provider);
}

async function failCapturedPayment(
  page: Page,
  provider: SupportedGateway
): Promise<void> {
  const transaction = await getCapturedTransaction();

  if (provider === 'stripe') {
    const sessionId = paymentCapture.checkoutSessionId || 'cs_test_e2e';
    const event = {
      id: `evt_e2e_failed_${Date.now()}`,
      type: 'checkout.session.expired',
      data: {
        object: {
          id: sessionId,
          object: 'checkout.session',
          client_reference_id: transaction.id,
          metadata: {
            transactionId: transaction.id,
            transactionCode: transaction.transactionCode,
          },
          payment_intent: `pi_e2e_${transaction.id.replace(/-/g, '')}`,
        },
      },
    };
    const payload = JSON.stringify(event);
    const response = await page.request.post('/api/transactions/webhook-stripe', {
      data: payload,
      headers: {
        'content-type': 'application/json',
        'stripe-signature': createStripeSignature(payload),
        'x-e2e-test': 'true',
      },
    });

    await assertWebhookHandled(response, provider);
    return;
  }

  const orderId = paymentCapture.orderId || 'ORDER-E2E';
  const response = await page.request.post('/api/transactions/webhook-paypal', {
    data: {
      id: `WH-E2E-FAILED-${Date.now()}`,
      event_type: 'CHECKOUT.ORDER.VOIDED',
      resource: {
        id: orderId,
      },
    },
    headers: {
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api-m.sandbox.paypal.com/certs/e2e',
      'paypal-transmission-id': `e2e-failed-${Date.now()}`,
      'paypal-transmission-sig': 'e2e-signature',
      'paypal-transmission-time': new Date().toISOString(),
      'x-e2e-test': 'true',
      'x-e2e-paypal-webhook-secret': getPayPalE2EWebhookBypassSecret(),
    },
  });

  await assertWebhookHandled(response, provider);
}

/**
 * Mock Stripe Checkout browser redirects.
 */
export async function mockStripeSuccess(page: Page): Promise<void> {
  await captureTransactionCreateResponse(page);

  await page.route('**/checkout.stripe.com/**', async (route) => {
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
    const code = paymentCapture.transactionCode || 'E2E-PENDING';
    const sessionId = paymentCapture.checkoutSessionId || 'cs_test_e2e';

    await completeCapturedPayment(page, 'stripe');

    await route.fulfill({
      status: 302,
      headers: {
        Location: `${baseURL}/payment/success?code=${encodeURIComponent(code)}&provider=stripe&session_id=${encodeURIComponent(sessionId)}`,
      },
    });
  });
}

/**
 * Mock PayPal approval browser redirects.
 */
export async function mockPayPalSuccess(page: Page): Promise<void> {
  await captureTransactionCreateResponse(page);

  await page.route(PAYPAL_APPROVAL_URL_PATTERN, async (route) => {
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
    const code = paymentCapture.transactionCode || 'E2E-PENDING';
    const orderId = paymentCapture.orderId || 'ORDER-E2E';

    await completeCapturedPayment(page, 'paypal');

    await route.fulfill({
      status: 302,
      headers: {
        Location: `${baseURL}/payment/success?code=${encodeURIComponent(code)}&provider=paypal&captureId=${encodeURIComponent(orderId)}`,
      },
    });
  });
}

/**
 * Mock payment gateway failure for supported active gateways.
 */
export async function mockPaymentFailure(
  page: Page,
  gateway: SupportedGateway
): Promise<void> {
  await captureTransactionCreateResponse(page);

  const pattern =
    gateway === 'stripe'
      ? '**/checkout.stripe.com/**'
      : PAYPAL_APPROVAL_URL_PATTERN;

  await page.route(pattern, async (route) => {
    const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';
    const code = paymentCapture.transactionCode || 'E2E-PENDING';

    await failCapturedPayment(page, gateway);

    await route.fulfill({
      status: 302,
      headers: {
        Location: `${baseURL}/payment/failure?code=${encodeURIComponent(code)}&provider=${gateway}&error=mock_failed`,
      },
    });
  });
}

/**
 * Mock all active payment gateways for success.
 */
export async function mockAllPaymentGatewaysSuccess(page: Page): Promise<void> {
  await mockStripeSuccess(page);
  await mockPayPalSuccess(page);
}

/**
 * Clear all payment gateway mocks.
 */
export async function clearPaymentMocks(page: Page): Promise<void> {
  resetPaymentCapture();
  captureRoutesInstalled.delete(page);
  await page.unrouteAll();
}
