import { siteLocale } from '@/config/site';

export function formatPrice(price: number): string {
  return new Intl.NumberFormat(siteLocale.locale, {
    style: 'currency',
    currency: siteLocale.currency,
  }).format(price);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(siteLocale.locale).format(value);
}

export function formatDate(
  value: Date | string | number,
  options: Intl.DateTimeFormatOptions = {}
): string {
  return new Intl.DateTimeFormat(siteLocale.locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: siteLocale.timeZone,
    ...options,
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string | number): string {
  return formatDate(value, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Calculate discounted price
 */
export function calculateDiscountedPrice(
  basePrice: number,
  discountPercent: number | null | undefined
): number {
  if (!discountPercent || discountPercent <= 0) {
    return basePrice;
  }
  return basePrice * (1 - discountPercent / 100);
}
