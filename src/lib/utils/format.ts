import { siteLocale } from '@/config/site';
import { formatCurrencyAmount } from '@/lib/utils/money';
import type { SiteCurrencyDisplay } from '@/config/site';

type FormatPriceOptions = {
  currency?: string;
  locale?: string;
  currencyDisplay?: SiteCurrencyDisplay;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

type FormatNumberOptions = {
  locale?: string;
};

type FormatDateOptions = Intl.DateTimeFormatOptions & {
  locale?: string;
};

export function formatPrice(
  price: number,
  options: FormatPriceOptions = {}
): string {
  return formatCurrencyAmount(price, options);
}

export function formatNumber(
  value: number,
  options: FormatNumberOptions = {}
): string {
  return new Intl.NumberFormat(options.locale || siteLocale.locale).format(
    value
  );
}

export function formatDate(
  value: Date | string | number,
  options: FormatDateOptions = {}
): string {
  const { locale, ...dateOptions } = options;

  return new Intl.DateTimeFormat(locale || siteLocale.locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: siteLocale.timeZone,
    ...dateOptions,
  }).format(new Date(value));
}

export function formatDateTime(
  value: Date | string | number,
  options: FormatDateOptions = {}
): string {
  return formatDate(value, {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
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
