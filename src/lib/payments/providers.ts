export const SUPPORTED_PAYMENT_PROVIDERS = ['STRIPE', 'PAYPAL'] as const;

export type PaymentProvider = (typeof SUPPORTED_PAYMENT_PROVIDERS)[number];

export function normalizePaymentProvider(
  paymentMethod: unknown
): PaymentProvider | null {
  if (paymentMethod === undefined || paymentMethod === null) {
    return 'STRIPE';
  }

  if (typeof paymentMethod !== 'string') {
    return null;
  }

  const normalized = paymentMethod.trim().toUpperCase();

  return SUPPORTED_PAYMENT_PROVIDERS.includes(normalized as PaymentProvider)
    ? (normalized as PaymentProvider)
    : null;
}
