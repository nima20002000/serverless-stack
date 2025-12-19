/**
 * Product Test Fixtures
 */

export const testProducts = {
  simpleProduct: {
    name: 'TEST-محصول ساده',
    slug: 'test-simple-product',
    description: 'این یک محصول تستی ساده است',
    price: 100000,
    stock: 10,
    isActive: true,
    isFeatured: false,
    discountPercent: 0,
  },
  featuredProduct: {
    name: 'TEST-محصول ویژه',
    slug: 'test-featured-product',
    description: 'این یک محصول ویژه تستی است',
    price: 250000,
    stock: 5,
    isActive: true,
    isFeatured: true,
    discountPercent: 0,
  },
  discountedProduct: {
    name: 'TEST-محصول تخفیف‌دار',
    slug: 'test-discounted-product',
    description: 'این یک محصول با تخفیف تستی است',
    price: 300000,
    stock: 20,
    isActive: true,
    isFeatured: false,
    discountPercent: 15,
  },
  outOfStockProduct: {
    name: 'TEST-محصول ناموجود',
    slug: 'test-out-of-stock',
    description: 'این محصول در انبار موجود نیست',
    price: 150000,
    stock: 0,
    isActive: true,
    isFeatured: false,
    discountPercent: 0,
  },
  inactiveProduct: {
    name: 'TEST-محصول غیرفعال',
    slug: 'test-inactive-product',
    description: 'این محصول غیرفعال است',
    price: 200000,
    stock: 100,
    isActive: false,
    isFeatured: false,
    discountPercent: 0,
  },
} as const;

export const testProductVariants = {
  sizeVariants: [
    {
      name: 'کوچک',
      value: 'small',
      stock: 10,
      priceAdjustment: -10000,
    },
    {
      name: 'متوسط',
      value: 'medium',
      stock: 15,
      priceAdjustment: 0,
    },
    {
      name: 'بزرگ',
      value: 'large',
      stock: 8,
      priceAdjustment: 15000,
    },
  ],
  colorVariants: [
    {
      name: 'قرمز',
      value: 'red',
      stock: 12,
      priceAdjustment: 0,
    },
    {
      name: 'آبی',
      value: 'blue',
      stock: 20,
      priceAdjustment: 5000,
    },
    {
      name: 'سبز',
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
    name: `${prefix}-محصول-${timestamp}-${random}`,
    slug: `${prefix.toLowerCase()}-product-${timestamp}-${random}`,
    description: `توضیحات محصول تستی ${random}`,
    price: Math.floor(Math.random() * 1000000) + 50000,
    stock: Math.floor(Math.random() * 100) + 1,
    isActive: true,
    isFeatured: false,
    discountPercent: 0,
  };
}

export function generateTestProductBatch(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    name: `TEST-محصول-دسته‌ای-${i}-${Date.now()}`,
    slug: `test-batch-product-${i}-${Date.now()}`,
    description: `توضیحات محصول دسته‌ای ${i + 1}`,
    price: (i + 1) * 50000,
    stock: (i + 1) * 10,
    isActive: true,
    isFeatured: i % 3 === 0, // Every 3rd product is featured
    discountPercent: i % 2 === 0 ? 10 : 0, // Every other product has discount
  }));
}

export const testProductMedia = {
  images: [
    {
      url: 'https://cdn.kitia.ir/test/image1.jpg',
      alt: 'تصویر تست ۱',
      type: 'IMAGE' as const,
      isDefault: true,
    },
    {
      url: 'https://cdn.kitia.ir/test/image2.jpg',
      alt: 'تصویر تست ۲',
      type: 'IMAGE' as const,
      isDefault: false,
    },
  ],
  video: {
    url: 'https://cdn.kitia.ir/test/video.mp4',
    alt: 'ویدیو تست',
    type: 'VIDEO' as const,
    isDefault: false,
  },
} as const;
