/**
 * Format price in Persian format with Toman currency
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fa-IR').format(price) + ' تومان';
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
