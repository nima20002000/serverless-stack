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
    name: `E2E Test Product ${randomSuffix}`,
    description: 'Test product description for E2E journeys',
    price: 100,
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
      name: 'Simple Test Product',
      price: 50,
      stock: 5,
    }),

    DISCOUNTED_PRODUCT: createTestProduct({
      name: 'Discounted Product',
      price: 100,
      discountPercent: 20,
      stock: 3,
    }),

    OUT_OF_STOCK: createTestProduct({
      name: 'Out Of Stock Product',
      price: 75,
      stock: 0,
    }),

    FEATURED_PRODUCT: createTestProduct({
      name: 'Featured Product',
      price: 200,
      stock: 15,
      isFeatured: true,
    }),

    EXPENSIVE_PRODUCT: createTestProduct({
      name: 'Premium Product',
      price: 500,
      stock: 2,
    }),
  };
}
