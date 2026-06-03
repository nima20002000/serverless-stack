/**
 * Product Test Fixtures
 */

export const testProducts = {
  simpleProduct: {
    name: 'TEST-Simple Product',
    slug: 'test-simple-product',
    description: 'A simple test product',
    price: 100,
    stock: 10,
    isActive: true,
    isFeatured: false,
    discountPercent: 0,
  },
  featuredProduct: {
    name: 'TEST-Featured Product',
    slug: 'test-featured-product',
    description: 'A featured test product',
    price: 250,
    stock: 5,
    isActive: true,
    isFeatured: true,
    discountPercent: 0,
  },
  discountedProduct: {
    name: 'TEST-Discounted Product',
    slug: 'test-discounted-product',
    description: 'A discounted test product',
    price: 300,
    stock: 20,
    isActive: true,
    isFeatured: false,
    discountPercent: 15,
  },
  outOfStockProduct: {
    name: 'TEST-Out Of Stock Product',
    slug: 'test-out-of-stock',
    description: 'A test product without inventory',
    price: 150,
    stock: 0,
    isActive: true,
    isFeatured: false,
    discountPercent: 0,
  },
  inactiveProduct: {
    name: 'TEST-Inactive Product',
    slug: 'test-inactive-product',
    description: 'An inactive test product',
    price: 200,
    stock: 100,
    isActive: false,
    isFeatured: false,
    discountPercent: 0,
  },
} as const;

export const testProductVariants = {
  sizeVariants: [
    {
      name: 'Small',
      value: 'small',
      stock: 10,
      priceAdjustment: -10,
    },
    {
      name: 'Medium',
      value: 'medium',
      stock: 15,
      priceAdjustment: 0,
    },
    {
      name: 'Large',
      value: 'large',
      stock: 8,
      priceAdjustment: 15,
    },
  ],
  colorVariants: [
    {
      name: 'Red',
      value: 'red',
      stock: 12,
      priceAdjustment: 0,
    },
    {
      name: 'Blue',
      value: 'blue',
      stock: 20,
      priceAdjustment: 5,
    },
    {
      name: 'Green',
      value: 'green',
      stock: 5,
      priceAdjustment: 0,
    },
  ],
} as const;

export function generateUniqueTestProduct(prefix = 'TEST') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    name: `${prefix}-Product-${timestamp}-${random}`,
    slug: `${prefix.toLowerCase()}-product-${timestamp}-${random}`,
    description: `Test product description ${random}`,
    price: Math.floor(Math.random() * 1000) + 50,
    stock: Math.floor(Math.random() * 100) + 1,
    isActive: true,
    isFeatured: false,
    discountPercent: 0,
  };
}

export function generateTestProductBatch(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    name: `TEST-Batch-Product-${i}-${Date.now()}`,
    slug: `test-batch-product-${i}-${Date.now()}`,
    description: `Batch product description ${i + 1}`,
    price: (i + 1) * 50,
    stock: (i + 1) * 10,
    isActive: true,
    isFeatured: i % 3 === 0, // Every 3rd product is featured
    discountPercent: i % 2 === 0 ? 10 : 0, // Every other product has discount
  }));
}

export const testProductMedia = {
  images: [
    {
      url: '/test-assets/products/image1.jpg',
      alt: 'Test image 1',
      type: 'IMAGE' as const,
      isDefault: true,
    },
    {
      url: '/test-assets/products/image2.jpg',
      alt: 'Test image 2',
      type: 'IMAGE' as const,
      isDefault: false,
    },
  ],
  video: {
    url: '/test-assets/products/video.mp4',
    alt: 'Test video',
    type: 'VIDEO' as const,
    isDefault: false,
  },
} as const;
