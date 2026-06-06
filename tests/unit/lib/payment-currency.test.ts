import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('payment provider currency helpers', () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.STRIPE_CURRENCY;
    delete process.env.PAYPAL_CURRENCY;
  });

  it('normalizes configured Stripe and PayPal currencies', async () => {
    process.env.STRIPE_CURRENCY = 'eur';
    process.env.PAYPAL_CURRENCY = 'gbp';

    const { getStripeCurrency } = await import('@/lib/stripe/client');
    const { getPayPalCurrency } = await import('@/lib/paypal/client');

    expect(getStripeCurrency()).toBe('eur');
    expect(getPayPalCurrency()).toBe('GBP');
  });

  it('converts Stripe decimal and zero-decimal amounts through the shared money contract', async () => {
    const { toStripeMinorUnits } = await import('@/lib/stripe/client');

    expect(toStripeMinorUnits(12.34, 'usd')).toBe(1234);
    expect(toStripeMinorUnits(12.5, 'jpy')).toBe(13);
  });

  it('preserves Stripe-specific API exponents for special-case currencies', async () => {
    const { toStripeMinorUnits } = await import('@/lib/stripe/client');

    expect(toStripeMinorUnits(10, 'huf')).toBe(1000);
    expect(toStripeMinorUnits(10, 'isk')).toBe(1000);
  });

  it('converts PayPal decimal and zero-decimal amounts through the shared money contract', async () => {
    const { toPayPalAmountValue } = await import('@/lib/paypal/client');

    expect(toPayPalAmountValue(12.34, 'USD')).toBe('12.34');
    expect(toPayPalAmountValue(12.5, 'JPY')).toBe('13');
  });

  it('rejects invalid provider amount values consistently', async () => {
    const { toStripeMinorUnits } = await import('@/lib/stripe/client');
    const { toPayPalAmountValue } = await import('@/lib/paypal/client');

    expect(() => toStripeMinorUnits(0, 'USD')).toThrow(
      'Currency amount must be a positive number'
    );
    expect(() => toPayPalAmountValue(Number.NaN, 'USD')).toThrow(
      'Currency amount must be a finite number'
    );
  });
});
