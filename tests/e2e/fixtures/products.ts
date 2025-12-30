import { randomUUID } from 'crypto';

export interface E2ETestProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  discountPercent: number | null;
  hasVariants: boolean;
  updatedAt: string;
}

/**
 * Create a test product with random ID and optional overrides
 * All test products use 'e2e-product-' prefix for easy cleanup
 */
export function createTestProduct(
  overrides?: Partial<E2ETestProduct>
): E2ETestProduct {
  const now = new Date().toISOString();
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  return {
    id: `e2e-product-${randomUUID()}`,
    name: `محصول تست ${randomSuffix}`,
    description: 'توضیحات محصول تست برای آزمون E2E',
    price: 100000,
    stock: 10,
    isActive: true,
    isFeatured: false,
    discountPercent: null,
    hasVariants: false,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Pre-defined test products for common test scenarios
 * Note: IDs are regenerated on each import for idempotent tests
 */
export function getTestProducts() {
  return {
    SIMPLE_PRODUCT: createTestProduct({
      name: 'محصول ساده تست',
      price: 50000,
      stock: 5,
    }),

    DISCOUNTED_PRODUCT: createTestProduct({
      name: 'محصول تخفیف‌دار',
      price: 100000,
      discountPercent: 20,
      stock: 3,
    }),

    OUT_OF_STOCK: createTestProduct({
      name: 'محصول ناموجود',
      price: 75000,
      stock: 0,
    }),

    FEATURED_PRODUCT: createTestProduct({
      name: 'محصول ویژه',
      price: 200000,
      stock: 15,
      isFeatured: true,
    }),

    EXPENSIVE_PRODUCT: createTestProduct({
      name: 'محصول گران‌قیمت',
      price: 5000000,
      stock: 2,
    }),
  };
}
