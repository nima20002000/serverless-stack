import { describe, it, expect } from 'vitest';
import { formatPrice, calculateDiscountedPrice } from '@/lib/utils/format';

describe('format utils', () => {
  it('formats price with toman suffix', () => {
    const result = formatPrice(1234);
    expect(result.endsWith(' تومان')).toBe(true);
    expect(result).toContain('۱');
  });

  it('calculates discounted price', () => {
    expect(calculateDiscountedPrice(100, 20)).toBe(80);
    expect(calculateDiscountedPrice(100, 0)).toBe(100);
    expect(calculateDiscountedPrice(100, null)).toBe(100);
  });
});
