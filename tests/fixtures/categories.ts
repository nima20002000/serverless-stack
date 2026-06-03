/**
 * Category Test Fixtures
 */

export const testCategories = {
  rootCategory: {
    name: 'Test Root Category',
    slug: 'test-root-category',
    description: 'Primary category for test data',
  },
  childCategory: {
    name: 'Test Child Category',
    slug: 'test-child-category',
    description: 'Child category for test data',
  },
  anotherRootCategory: {
    name: 'Another Test Root',
    slug: 'test-another-root',
    description: 'Another primary test category',
  },
} as const;

export function generateUniqueTestCategory(prefix = 'test') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    name: `Category ${prefix} ${random}`,
    slug: `${prefix}-category-${timestamp}-${random}`,
    description: `Description for category ${prefix} ${random}`,
  };
}

export function generateTestCategoryHierarchy() {
  const timestamp = Date.now();

  return {
    parent: {
      name: `Parent Category ${timestamp}`,
      slug: `test-parent-${timestamp}`,
      description: 'Parent category',
    },
    children: [
      {
        name: `Child Category 1 ${timestamp}`,
        slug: `test-child-1-${timestamp}`,
        description: 'First child category',
      },
      {
        name: `Child Category 2 ${timestamp}`,
        slug: `test-child-2-${timestamp}`,
        description: 'Second child category',
      },
    ],
  };
}
