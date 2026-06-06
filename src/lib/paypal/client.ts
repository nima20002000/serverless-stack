import 'server-only';
import axios, { AxiosError } from 'axios';
import { log } from '@/lib/logger';
import { getPaymentOrderDescription } from '@/lib/payments/provider-labels';
import { siteLocale } from '@/config/site';
import { toProviderAmountValue } from '@/lib/utils/money';

type PayPalEnvironment = 'sandbox' | 'live';

interface PayPalConfig {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  environment: PayPalEnvironment;
  baseUrl: string;
}

interface CachedToken {
  token: string;
  expiresAt: number;
}

interface PayPalLink {
  href: string;
  rel: string;
  method: string;
}

export interface PayPalOrderRequest {
  transactionId: string;
  transactionCode: string;
  amount: number;
  currency?: string;
  returnUrl: string;
  cancelUrl: string;
  description?: string;
}

export interface PayPalOrderResponse {
  id: string;
  status: string;
  approvalUrl: string;
}

export interface PayPalCaptureResponse {
  id: string;
  status: string;
  purchase_units?: Array<{
    custom_id?: string;
    invoice_id?: string;
    amount?: {
      currency_code: string;
      value: string;
    };
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount?: {
          currency_code: string;
          value: string;
        };
      }>;
    };
  }>;
}

export interface PayPalOrderDetails {
  id: string;
  status: string;
  purchase_units?: Array<{
    custom_id?: string;
    invoice_id?: string;
    amount?: {
      currency_code: string;
      value: string;
    };
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount?: {
          currency_code: string;
          value: string;
        };
      }>;
    };
  }>;
}

let cachedToken: CachedToken | null = null;

function getPayPalConfig(): PayPalConfig {
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET || '';
  const webhookId = process.env.PAYPAL_WEBHOOK_ID || '';
  const environment = process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox';
  const baseUrl =
    environment === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials are not configured');
  }

  return {
    clientId,
    clientSecret,
    webhookId,
    environment,
    baseUrl,
  };
}

function createHttpClient(baseUrl: string, accessToken?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  return axios.create({
    baseURL: baseUrl,
    proxy: false,
    headers,
  });
}

export function getPayPalCurrency(): string {
  return (process.env.PAYPAL_CURRENCY || siteLocale.currency).toUpperCase();
}

export function toPayPalAmountValue(amount: number, currency: string): string {
  return toProviderAmountValue(amount, currency);
}

export function parsePayPalAmountValue(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error('Invalid PayPal amount value');
  }
  return parsed;
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt > now + 60_000) {
    return cachedToken.token;
  }

  const config = getPayPalConfig();
  const encodedCredentials = Buffer.from(
    `${config.clientId}:${config.clientSecret}`
  ).toString('base64');

  const httpClient = createHttpClient(config.baseUrl);

  try {
    const response = await httpClient.post(
      '/v1/oauth2/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${encodedCredentials}`,
        },
      }
    );

    const accessToken = response.data?.access_token as string | undefined;
    const expiresIn = Number(response.data?.expires_in || 0);

    if (!accessToken || !expiresIn) {
      throw new Error('PayPal OAuth response is missing access token');
    }

    cachedToken = {
      token: accessToken,
      expiresAt: now + expiresIn * 1000,
    };

    return accessToken;
  } catch (error) {
    const axiosError = error as AxiosError<{ error_description?: string }>;
    const details =
      axiosError.response?.data?.error_description ||
      (error instanceof Error ? error.message : 'Unknown error');
    throw new Error(`PayPal OAuth failed: ${details}`);
  }
}

function getApprovalLink(links: PayPalLink[] = []): string {
  const approvalLink = links.find((link) => link.rel === 'approve')?.href;
  if (!approvalLink) {
    throw new Error('PayPal order response missing approval link');
  }
  return approvalLink;
}

export async function createPayPalOrder(
  request: PayPalOrderRequest
): Promise<PayPalOrderResponse> {
  const startTime = Date.now();
  const config = getPayPalConfig();
  const accessToken = await getAccessToken();
  const httpClient = createHttpClient(config.baseUrl, accessToken);
  const currency = (request.currency || getPayPalCurrency()).toUpperCase();
  const amountValue = toPayPalAmountValue(request.amount, currency);

  try {
    const response = await httpClient.post('/v2/checkout/orders', {
      intent: 'CAPTURE',
      purchase_units: [
        {
          custom_id: request.transactionId,
          invoice_id: request.transactionCode,
          reference_id: request.transactionCode,
          description:
            request.description ||
            getPaymentOrderDescription(request.transactionCode),
          amount: {
            currency_code: currency,
            value: amountValue,
          },
        },
      ],
      application_context: {
        user_action: 'PAY_NOW',
        return_url: request.returnUrl,
        cancel_url: request.cancelUrl,
      },
    });

    const orderId = response.data?.id as string | undefined;
    const status = response.data?.status as string | undefined;
    const links = (response.data?.links || []) as PayPalLink[];
    const approvalUrl = getApprovalLink(links);

    if (!orderId || !status) {
      throw new Error('PayPal order response missing id/status');
    }

    log.info('PayPal order created', {
      transactionId: request.transactionId,
      transactionCode: request.transactionCode,
      orderId,
      status,
      currency,
      amountValue,
      environment: config.environment,
      elapsedMs: Date.now() - startTime,
    });

    return {
      id: orderId,
      status,
      approvalUrl,
    };
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const details =
      axiosError.response?.data?.message ||
      (error instanceof Error ? error.message : 'Unknown error');

    log.error('PayPal order creation failed', {
      transactionId: request.transactionId,
      transactionCode: request.transactionCode,
      error: details,
      elapsedMs: Date.now() - startTime,
    });

    throw new Error(`PayPal order creation failed: ${details}`);
  }
}

export async function capturePayPalOrder(
  orderId: string
): Promise<PayPalCaptureResponse> {
  const config = getPayPalConfig();
  const accessToken = await getAccessToken();
  const httpClient = createHttpClient(config.baseUrl, accessToken);

  try {
    const response = await httpClient.post(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`
    );
    return response.data as PayPalCaptureResponse;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const details =
      axiosError.response?.data?.message ||
      (error instanceof Error ? error.message : 'Unknown error');
    throw new Error(`PayPal capture failed: ${details}`);
  }
}

export async function getPayPalOrder(
  orderId: string
): Promise<PayPalOrderDetails> {
  const config = getPayPalConfig();
  const accessToken = await getAccessToken();
  const httpClient = createHttpClient(config.baseUrl, accessToken);

  try {
    const response = await httpClient.get(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}`
    );
    return response.data as PayPalOrderDetails;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const details =
      axiosError.response?.data?.message ||
      (error instanceof Error ? error.message : 'Unknown error');
    throw new Error(`PayPal order lookup failed: ${details}`);
  }
}

export async function verifyPayPalWebhookSignature(options: {
  event: Record<string, unknown>;
  headers: {
    authAlgo: string;
    certUrl: string;
    transmissionId: string;
    transmissionSig: string;
    transmissionTime: string;
  };
}): Promise<boolean> {
  const config = getPayPalConfig();

  if (!config.webhookId) {
    throw new Error('PAYPAL_WEBHOOK_ID is not configured');
  }

  const accessToken = await getAccessToken();
  const httpClient = createHttpClient(config.baseUrl, accessToken);

  try {
    const response = await httpClient.post(
      '/v1/notifications/verify-webhook-signature',
      {
        auth_algo: options.headers.authAlgo,
        cert_url: options.headers.certUrl,
        transmission_id: options.headers.transmissionId,
        transmission_sig: options.headers.transmissionSig,
        transmission_time: options.headers.transmissionTime,
        webhook_id: config.webhookId,
        webhook_event: options.event,
      }
    );

    return response.data?.verification_status === 'SUCCESS';
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    const details =
      axiosError.response?.data?.message ||
      (error instanceof Error ? error.message : 'Unknown error');
    throw new Error(`PayPal webhook verification failed: ${details}`);
  }
}
