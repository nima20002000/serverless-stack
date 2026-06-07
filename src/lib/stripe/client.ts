import 'server-only';
import Stripe from 'stripe';
import { log } from '@/lib/logger';
import { getAppBaseUrl } from '@/lib/utils/url';
import { getPaymentOrderLabel } from '@/lib/payments/provider-labels';
import { siteLocale } from '@/config/site';
import {
  normalizeCurrencyCode,
  roundCurrencyAmount,
  toCurrencyMinorUnits,
} from '@/lib/utils/money';

const STRIPE_TWO_DECIMAL_API_CURRENCIES = new Set(['huf', 'isk']);

let stripeClient: Stripe | null = null;

interface StripeCheckoutSessionRequest {
  transactionId: string;
  transactionCode: string;
  amount: number;
  currency?: string;
  customerEmail?: string;
}

function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is not configured');
  }

  return secretKey;
}

function getStripeWebhookSecret(): string {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }

  return webhookSecret;
}

function getNormalizedBaseUrl(): string {
  const baseUrl = getAppBaseUrl();
  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

export function getStripeCurrency(): string {
  return (process.env.STRIPE_CURRENCY || siteLocale.currency).toLowerCase();
}

export function toStripeMinorUnits(amount: number, currency: string): number {
  const normalizedCurrency = normalizeCurrencyCode(currency).toLowerCase();

  if (normalizedCurrency === 'isk') {
    return toCurrencyMinorUnits(
      roundCurrencyAmount(amount, currency),
      currency,
      {
        fractionDigits: 2,
      }
    );
  }

  if (STRIPE_TWO_DECIMAL_API_CURRENCIES.has(normalizedCurrency)) {
    return toCurrencyMinorUnits(amount, currency, { fractionDigits: 2 });
  }

  return toCurrencyMinorUnits(amount, currency);
}

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeSecretKey(), {
      typescript: true,
    });
  }

  return stripeClient;
}

export async function createStripeCheckoutSession(
  request: StripeCheckoutSessionRequest
): Promise<Stripe.Checkout.Session> {
  const startTime = Date.now();
  const stripe = getStripeClient();
  const currency = (request.currency || getStripeCurrency()).toLowerCase();
  const amountMinorUnits = toStripeMinorUnits(request.amount, currency);

  const baseUrl = getNormalizedBaseUrl();
  const successUrl = `${baseUrl}/payment/success?code=${encodeURIComponent(request.transactionCode)}&provider=stripe&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${baseUrl}/payment/failure?code=${encodeURIComponent(request.transactionCode)}&provider=stripe`;

  log.info('Creating Stripe Checkout session', {
    transactionId: request.transactionId,
    transactionCode: request.transactionCode,
    amount: request.amount,
    amountMinorUnits,
    currency,
    hasCustomerEmail: !!request.customerEmail,
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: request.transactionId,
      customer_email: request.customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amountMinorUnits,
            product_data: {
              name: getPaymentOrderLabel(request.transactionCode),
              description: 'Online checkout payment',
            },
          },
        },
      ],
      metadata: {
        transactionId: request.transactionId,
        transactionCode: request.transactionCode,
        amount: String(request.amount),
        currency: currency.toUpperCase(),
      },
      payment_intent_data: {
        metadata: {
          transactionId: request.transactionId,
          transactionCode: request.transactionCode,
          amount: String(request.amount),
          currency: currency.toUpperCase(),
        },
      },
    });

    log.info('Stripe Checkout session created', {
      transactionId: request.transactionId,
      transactionCode: request.transactionCode,
      sessionId: session.id,
      paymentIntent:
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : null,
      elapsedMs: Date.now() - startTime,
    });

    return session;
  } catch (error) {
    log.error('Stripe Checkout session creation failed', {
      transactionId: request.transactionId,
      transactionCode: request.transactionCode,
      error: error instanceof Error ? error.message : 'Unknown error',
      elapsedMs: Date.now() - startTime,
    });
    throw new Error(
      error instanceof Error ? error.message : 'Failed to create Stripe session'
    );
  }
}

export function verifyStripeWebhookEvent(
  payload: string,
  signature: string
): Stripe.Event {
  const stripe = getStripeClient();
  const webhookSecret = getStripeWebhookSecret();

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
