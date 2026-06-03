/**
 * Tag Test Fixtures
 */

export const testTags = {
  popularTag: {
    name: 'Popular',
    slug: 'test-popular-tag',
  },
  newTag: {
    name: 'New',
    slug: 'test-new-tag',
  },
  saleTag: {
    name: 'Sale',
    slug: 'test-sale-tag',
  },
} as const;

export function generateUniqueTestTag(prefix = 'test') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    name: `Tag ${prefix} ${random}`,
    slug: `${prefix}-tag-${timestamp}-${random}`,
  };
}

export function generateTestTagBatch(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    name: `Batch Tag ${i + 1}`,
    slug: `test-batch-tag-${i}-${Date.now()}`,
  }));
}
