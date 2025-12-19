/**
 * Category Test Fixtures
 */

export const testCategories = {
  rootCategory: {
    name: 'دسته‌بندی ریشه تست',
    slug: 'test-root-category',
    description: 'دسته‌بندی اصلی برای تست',
  },
  childCategory: {
    name: 'دسته‌بندی فرعی تست',
    slug: 'test-child-category',
    description: 'دسته‌بندی فرعی برای تست',
  },
  anotherRootCategory: {
    name: 'دسته‌بندی ریشه دیگر',
    slug: 'test-another-root',
    description: 'دسته‌بندی اصلی دیگر',
  },
} as const;

export function generateUniqueTestCategory(prefix = 'test') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    name: `دسته‌بندی ${prefix} ${random}`,
    slug: `${prefix}-category-${timestamp}-${random}`,
    description: `توضیحات دسته‌بندی ${prefix} ${random}`,
  };
}

export function generateTestCategoryHierarchy() {
  const timestamp = Date.now();

  return {
    parent: {
      name: `دسته‌بندی والد ${timestamp}`,
      slug: `test-parent-${timestamp}`,
      description: 'دسته‌بندی والد',
    },
    children: [
      {
        name: `دسته‌بندی فرزند ۱ ${timestamp}`,
        slug: `test-child-1-${timestamp}`,
        description: 'دسته‌بندی فرزند اول',
      },
      {
        name: `دسته‌بندی فرزند ۲ ${timestamp}`,
        slug: `test-child-2-${timestamp}`,
        description: 'دسته‌بندی فرزند دوم',
      },
    ],
  };
}
