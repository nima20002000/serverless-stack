import { describe, it, expect, vi } from 'vitest';
import { formatPrice, calculateDiscountedPrice } from '@/lib/utils/format';
import {
  formatCurrencyAmount,
  getCurrencyFractionDigits,
  normalizeCurrencyCode,
  roundCurrencyAmount,
  toCurrencyMinorUnits,
  toProviderAmountValue,
} from '@/lib/utils/money';

describe('format utils', () => {
  it('formats price with the configured currency', () => {
    const result = formatPrice(1234);
    expect(result).toBe('$1,234.00');
  });

  it('formats explicit currencies and display modes', () => {
    expect(formatPrice(1234.5, { currency: 'EUR', locale: 'de-DE' })).toBe(
      new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
      }).format(1234.5)
    );

    expect(
      formatCurrencyAmount(1234.5, {
        currency: 'USD',
        locale: 'en-US',
        currencyDisplay: 'code',
      })
    ).toBe('USD 1,234.50');
  });

  it('normalizes and validates currency codes', () => {
    expect(normalizeCurrencyCode('usd')).toBe('USD');
    expect(() => normalizeCurrencyCode('US')).toThrow('Invalid currency code');
    expect(() => normalizeCurrencyCode('FOO')).toThrow(
      'Unsupported currency code'
    );
  });

  it('rejects invalid currency display configuration', async () => {
    const previousDisplay = process.env.NEXT_PUBLIC_SITE_CURRENCY_DISPLAY;
    vi.resetModules();
    process.env.NEXT_PUBLIC_SITE_CURRENCY_DISPLAY = 'cod';

    await expect(import('@/config/site')).rejects.toThrow(
      'Invalid NEXT_PUBLIC_SITE_CURRENCY_DISPLAY value'
    );

    if (previousDisplay === undefined) {
      delete process.env.NEXT_PUBLIC_SITE_CURRENCY_DISPLAY;
    } else {
      process.env.NEXT_PUBLIC_SITE_CURRENCY_DISPLAY = previousDisplay;
    }
    vi.resetModules();
  });

  it('detects fraction digits for decimal and zero-decimal currencies', () => {
    expect(getCurrencyFractionDigits('USD')).toBe(2);
    expect(getCurrencyFractionDigits('JPY')).toBe(0);
  });

  it('rounds display amounts using configured currency precision', () => {
    expect(roundCurrencyAmount(10.235, 'USD')).toBe(10.24);
    expect(roundCurrencyAmount(10.075, 'USD')).toBe(10.08);
    expect(roundCurrencyAmount(10.6, 'JPY')).toBe(11);
  });

  it('converts provider amounts for decimal and zero-decimal currencies', () => {
    expect(toCurrencyMinorUnits(1234.56, 'USD')).toBe(123456);
    expect(toCurrencyMinorUnits(1.005, 'USD')).toBe(101);
    expect(toCurrencyMinorUnits(10.075, 'USD')).toBe(1008);
    expect(toCurrencyMinorUnits(1234.56, 'JPY')).toBe(1235);
    expect(toProviderAmountValue(1234.56, 'USD')).toBe('1234.56');
    expect(toProviderAmountValue(1.005, 'USD')).toBe('1.01');
    expect(toProviderAmountValue(10.075, 'USD')).toBe('10.08');
    expect(toProviderAmountValue(1234.56, 'JPY')).toBe('1235');
  });

  it('rejects non-positive provider amounts', () => {
    expect(() => toCurrencyMinorUnits(0, 'USD')).toThrow(
      'Currency amount must be a positive number'
    );
    expect(() => toProviderAmountValue(-1, 'USD')).toThrow(
      'Currency amount must be a positive number'
    );
  });

  it('calculates discounted price', () => {
    expect(calculateDiscountedPrice(100, 20)).toBe(80);
    expect(calculateDiscountedPrice(100, 0)).toBe(100);
    expect(calculateDiscountedPrice(100, null)).toBe(100);
  });
});
