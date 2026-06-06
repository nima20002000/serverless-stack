import { siteLocale } from '@/config/site';
import type { SiteCurrencyDisplay } from '@/config/site';

type CurrencyFormatOptions = {
  currency?: string;
  locale?: string;
  currencyDisplay?: SiteCurrencyDisplay;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

const FALLBACK_SUPPORTED_CURRENCIES = new Set([
  'AUD',
  'BRL',
  'CAD',
  'CHF',
  'CZK',
  'DKK',
  'EUR',
  'GBP',
  'HKD',
  'JPY',
  'MXN',
  'NOK',
  'NZD',
  'PLN',
  'SEK',
  'SGD',
  'USD',
]);

function getSupportedCurrencies(): Set<string> {
  const supportedValuesOf = (
    Intl as typeof Intl & {
      supportedValuesOf?: (key: 'currency') => string[];
    }
  ).supportedValuesOf;

  if (typeof supportedValuesOf === 'function') {
    return new Set(supportedValuesOf('currency'));
  }

  return FALLBACK_SUPPORTED_CURRENCIES;
}

function assertFiniteAmount(amount: number, label: string): void {
  if (!Number.isFinite(amount)) {
    throw new Error(`${label} must be a finite number`);
  }
}

function roundToFractionDigits(amount: number, fractionDigits: number): number {
  return Number(
    `${Math.round(Number(`${amount}e${fractionDigits}`))}e-${fractionDigits}`
  );
}

export function normalizeCurrencyCode(currency = siteLocale.currency): string {
  const normalized = currency.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw new Error(`Invalid currency code: ${currency}`);
  }

  if (!getSupportedCurrencies().has(normalized)) {
    throw new Error(`Unsupported currency code: ${currency}`);
  }

  return normalized;
}

export function getCurrencyFractionDigits(
  currency = siteLocale.currency,
  locale = siteLocale.locale
): number {
  const normalizedCurrency = normalizeCurrencyCode(currency);
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: normalizedCurrency,
  }).resolvedOptions().maximumFractionDigits;
}

export function roundCurrencyAmount(
  amount: number,
  currency = siteLocale.currency
): number {
  assertFiniteAmount(amount, 'Currency amount');

  const fractionDigits = getCurrencyFractionDigits(currency);
  return roundToFractionDigits(amount, fractionDigits);
}

export function toCurrencyMinorUnits(
  amount: number,
  currency = siteLocale.currency,
  options: { fractionDigits?: number } = {}
): number {
  assertFiniteAmount(amount, 'Currency amount');

  if (amount <= 0) {
    throw new Error('Currency amount must be a positive number');
  }

  normalizeCurrencyCode(currency);
  const fractionDigits =
    options.fractionDigits ?? getCurrencyFractionDigits(currency);
  return Math.round(
    roundToFractionDigits(amount, fractionDigits) * 10 ** fractionDigits
  );
}

export function toProviderAmountValue(
  amount: number,
  currency = siteLocale.currency
): string {
  assertFiniteAmount(amount, 'Currency amount');

  if (amount <= 0) {
    throw new Error('Currency amount must be a positive number');
  }

  const fractionDigits = getCurrencyFractionDigits(currency);
  return roundCurrencyAmount(amount, currency).toFixed(fractionDigits);
}

export function formatCurrencyAmount(
  amount: number,
  options: CurrencyFormatOptions = {}
): string {
  assertFiniteAmount(amount, 'Currency amount');

  const currency = normalizeCurrencyCode(options.currency);
  const locale = options.locale || siteLocale.locale;
  const currencyDisplay =
    options.currencyDisplay || siteLocale.currencyDisplay || 'symbol';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay,
    minimumFractionDigits: options.minimumFractionDigits,
    maximumFractionDigits: options.maximumFractionDigits,
  }).format(amount);
}
