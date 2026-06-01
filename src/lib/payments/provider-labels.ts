const DEFAULT_PAYMENT_SITE_NAME = 'Commerce Boilerplate';

export function getPaymentSiteName(): string {
  const configuredName =
    process.env.PAYMENT_SITE_NAME ||
    process.env.NEXT_PUBLIC_SITE_NAME ||
    process.env.SITE_NAME ||
    DEFAULT_PAYMENT_SITE_NAME;

  const normalizedName = configuredName.trim();
  return normalizedName || DEFAULT_PAYMENT_SITE_NAME;
}

export function getPaymentOrderLabel(transactionCode: string): string {
  return `${getPaymentSiteName()} order ${transactionCode}`;
}

export function getPaymentOrderDescription(transactionCode: string): string {
  return `${getPaymentOrderLabel(transactionCode)} payment`;
}
