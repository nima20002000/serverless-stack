/**
 * Tag Test Fixtures
 */

export const testTags = {
  popularTag: {
    name: 'برچسب محبوب',
    slug: 'test-popular-tag',
  },
  newTag: {
    name: 'برچسب جدید',
    slug: 'test-new-tag',
  },
  saleTag: {
    name: 'برچسب فروش',
    slug: 'test-sale-tag',
  },
} as const;

export function generateUniqueTestTag(prefix = 'test') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    name: `برچسب ${prefix} ${random}`,
    slug: `${prefix}-tag-${timestamp}-${random}`,
  };
}

export function generateTestTagBatch(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    name: `برچسب دسته‌ای ${i + 1}`,
    slug: `test-batch-tag-${i}-${Date.now()}`,
  }));
}
