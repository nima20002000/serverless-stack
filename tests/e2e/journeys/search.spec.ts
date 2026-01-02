import { test, expect } from '@playwright/test';
import { randomUUID } from 'crypto';
import { createE2ESupabaseClient } from '../utils/database';

test.describe('Search UX', () => {
  const searchToken = `e2e-search-${Date.now().toString(36)}`;
  const now = new Date().toISOString();

  const activeCategory = {
    id: `e2e-category-${randomUUID()}`,
    name: `E2E Search Category ${searchToken} Active`,
    slug: `e2e-search-category-${searchToken}-active`,
    description: `Active category for ${searchToken}`,
    isActive: true,
    updatedAt: now,
    createdAt: now,
  };

  const inactiveCategory = {
    id: `e2e-category-${randomUUID()}`,
    name: `E2E Search Category ${searchToken} Inactive`,
    slug: `e2e-search-category-${searchToken}-inactive`,
    description: `Inactive category for ${searchToken}`,
    isActive: false,
    updatedAt: now,
    createdAt: now,
  };

  const activeProduct = {
    id: `e2e-product-${randomUUID()}`,
    name: `E2E Search Product ${searchToken} Active`,
    description: `Active product for ${searchToken}`,
    price: 123456,
    stock: 5,
    isActive: true,
    isFeatured: false,
    hasVariants: false,
    discountPercent: null,
    images: [],
    categoryId: activeCategory.id,
    updatedAt: now,
    createdAt: now,
    displayOrder: 1,
  };

  const inactiveProduct = {
    id: `e2e-product-${randomUUID()}`,
    name: `E2E Search Product ${searchToken} Inactive`,
    description: `Inactive product for ${searchToken}`,
    price: 654321,
    stock: 5,
    isActive: false,
    isFeatured: false,
    hasVariants: false,
    discountPercent: null,
    images: [],
    categoryId: inactiveCategory.id,
    updatedAt: now,
    createdAt: now,
    displayOrder: 2,
  };

  test.beforeAll(async () => {
    const supabase = createE2ESupabaseClient();

    const { error: categoryError } = await supabase
      .from('categories')
      .insert([activeCategory, inactiveCategory]);

    if (categoryError) {
      throw new Error(`Failed to seed categories: ${categoryError.message}`);
    }

    const { error: productError } = await supabase
      .from('products')
      .insert([activeProduct, inactiveProduct]);

    if (productError) {
      throw new Error(`Failed to seed products: ${productError.message}`);
    }
  });

  test.afterAll(async () => {
    const supabase = createE2ESupabaseClient();
    await supabase
      .from('products')
      .delete()
      .in('id', [activeProduct.id, inactiveProduct.id]);
    await supabase
      .from('categories')
      .delete()
      .in('id', [activeCategory.id, inactiveCategory.id]);
  });

  async function openSearchInput(
    page: import('@playwright/test').Page,
    isMobile: boolean
  ) {
    if (isMobile) {
      const mobileMenuButton = page.locator('button[aria-label="منوی موبایل"]');
      await expect(mobileMenuButton).toBeVisible();
      await mobileMenuButton.click();
    }

    const searchInput = page.locator(
      'input[placeholder="جستجوی محصولات و دسته‌بندی‌ها..."]:visible'
    );
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    return searchInput;
  }

  test('should show only active matching results and navigate by exact item', async ({
    page,
    isMobile,
  }) => {
    await page.goto('/products');
    await page.waitForLoadState('domcontentloaded');

    const searchInput = await openSearchInput(page, isMobile);
    await searchInput.fill(searchToken);

    await expect(
      page.getByRole('option', { name: activeProduct.name })
    ).toBeVisible({ timeout: 10000 });
    await expect(
      page.getByRole('option', { name: activeCategory.name })
    ).toBeVisible({ timeout: 10000 });

    await expect(
      page.getByRole('option', { name: inactiveProduct.name })
    ).toHaveCount(0);
    await expect(
      page.getByRole('option', { name: inactiveCategory.name })
    ).toHaveCount(0);

    await page.getByRole('option', { name: activeProduct.name }).click();
    await page.waitForURL(`/products/${activeProduct.id}`, {
      timeout: 10000,
    });

    await page.goto('/products');
    await page.waitForLoadState('domcontentloaded');

    const searchInputAgain = await openSearchInput(page, isMobile);
    await searchInputAgain.fill(searchToken);

    await page.getByRole('option', { name: activeCategory.name }).click();
    await page.waitForURL(
      new RegExp(`/products\\?category=${activeCategory.slug}$`),
      { timeout: 10000 }
    );
  });
});
