import { test, expect } from '@playwright/test';
import { createTestUser } from '../fixtures/users';
import { createE2ESupabaseClient, createTestUserInDB } from '../utils/database';

/**
 * Admin Categories + Products CRUD E2E Tests
 *
 * Validates:
 * - Admin login
 * - Category creation in admin categories page
 * - Product creation assigned to category
 * - Product edit flow
 * - UI + DB verification for created/updated records
 */

test.describe.configure({ mode: 'serial' });

test.describe('Admin Categories + Products CRUD', () => {
  const adminUserData = {
    id: 'e2e-user-admin-categories-products',
    uid: 'e2e-uid-admin-categories-products',
    email: 'e2e-admin-categories-products@example.com',
    phone: '+12025553333',
    name: 'Test User',
    password: 'Test1234!@#$',
  };

  let adminUser: ReturnType<typeof createTestUser>;
  let categoryId: string | null = null;
  let productId: string | null = null;

  test.beforeAll(async () => {
    adminUser = {
      ...createTestUser(),
      ...adminUserData,
      isVerified: true,
      role: 'ADMIN' as const,
    };

    const supabase = createE2ESupabaseClient();
    await supabase.from('users').delete().eq('id', adminUserData.id);

    await createTestUserInDB({
      id: adminUser.id,
      uid: adminUser.uid,
      email: adminUser.email,
      phone: adminUser.phone,
      name: adminUser.name,
      password: adminUser.password,
      isVerified: true,
      role: 'ADMIN',
    });
  });

  test.afterAll(async () => {
    const supabase = createE2ESupabaseClient();

    try {
      if (productId) {
        await supabase
          .from('product_media')
          .delete()
          .eq('productId', productId);
        await supabase
          .from('product_variants')
          .delete()
          .eq('productId', productId);
        await supabase.from('products').delete().eq('id', productId);
      }

      if (categoryId) {
        await supabase.from('categories').delete().eq('id', categoryId);
      }

      await supabase.from('users').delete().eq('id', adminUserData.id);
    } catch (error) {
      console.log(`Cleanup warning: ${error}`);
    }
  });

  async function loginAsAdmin(page: import('@playwright/test').Page) {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('input[name="identifier"]').fill(adminUser.email);
    await page.locator('input[name="password"]').fill(adminUser.password);

    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/', { timeout: 20000 });
  }

  async function findProductRow(
    page: import('@playwright/test').Page,
    productName: string
  ) {
    const searchResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/admin/products') &&
        response.url().includes('search=') &&
        response.request().method() === 'GET'
    );

    await page
      .locator('input[placeholder="Search products by name..."]')
      .fill(productName);
    await page.getByRole('button', { name: /Search/ }).click();

    const searchResponse = await searchResponsePromise;
    if (!searchResponse.ok()) {
      const payload = await searchResponse.json().catch(() => null);
      throw new Error(
        `Product search failed: ${searchResponse.status()} ${JSON.stringify(payload)}`
      );
    }

    const productRow = page.locator('tr', { hasText: productName });
    await expect(productRow).toBeVisible({ timeout: 10000 });
    return productRow;
  }

  test('should create category, create product, edit product, and verify UI + DB', async ({
    page,
  }) => {
    const supabase = createE2ESupabaseClient();
    const uniqueSuffix = Math.random().toString(36).slice(2, 8);

    const categoryName = `E2E Category ${uniqueSuffix}`;
    const categorySlug = `e2e-category-${uniqueSuffix}`;
    const categoryDescription = 'E2E category description';

    const productName = `E2E Product ${uniqueSuffix}`;
    const productDescription = 'E2E product description';
    const productPrice = '120000';
    const productDiscount = '10';
    const productStock = '12';

    const updatedName = `E2E Product Updated ${uniqueSuffix}`;
    const updatedDescription = 'Updated E2E product description';
    const updatedPrice = '150000';
    const updatedDiscount = '5';
    const updatedStock = '8';

    await loginAsAdmin(page);

    // ============================================================
    // STEP 1: Create category in admin categories page
    // ============================================================
    await page.goto('/admin/categories');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: /Categories/i })
    ).toBeVisible();

    await page.getByRole('button', { name: /Add category/i }).click();

    await page
      .locator('label:has-text("Category name")')
      .locator('..')
      .locator('input')
      .fill(categoryName);
    await page
      .locator('label:has-text("Slug")')
      .locator('..')
      .locator('input')
      .fill(categorySlug);
    await page
      .locator('label:has-text("Description")')
      .locator('..')
      .locator('textarea')
      .fill(categoryDescription);

    await page.getByRole('button', { name: /Create category/i }).click();

    await expect(page.getByText('Category created.')).toBeVisible();

    const categoryRow = page.locator('tr', { hasText: categoryName });
    await expect(categoryRow).toBeVisible();

    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('id, name, slug, description, isActive')
      .eq('slug', categorySlug)
      .single();

    expect(categoryError).toBeNull();
    expect(category).toBeTruthy();
    expect(category!.name).toBe(categoryName);
    expect(category!.description).toBe(categoryDescription);
    expect(category!.isActive).toBe(true);
    categoryId = category!.id;

    // ============================================================
    // STEP 2: Create product assigned to category
    // ============================================================
    await page.goto('/admin/products/new');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: /Add product/i })
    ).toBeVisible();

    await page.locator('input[name="name"]').fill(productName);
    await page.locator('textarea[name="description"]').fill(productDescription);
    await page.locator('input[name="price"]').fill(productPrice);
    await page.locator('input[name="discountPercent"]').fill(productDiscount);
    await page.locator('input[name="stock"]').fill(productStock);

    await page.getByRole('button', { name: /Select category/i }).click();
    const categoryOption = page.getByRole('button', { name: categoryName });
    await expect(categoryOption).toBeVisible();
    await categoryOption.click();

    await page.locator('input[name="isFeatured"]').check();

    const createProductResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/products') &&
        response.request().method() === 'POST'
    );

    await page.getByRole('button', { name: /Create product/i }).click();
    const createProductResponse = await createProductResponsePromise;
    if (!createProductResponse.ok()) {
      const payload = await createProductResponse.json().catch(() => null);
      throw new Error(
        `Product create failed: ${createProductResponse.status()} ${JSON.stringify(payload)}`
      );
    }
    await page.waitForURL('/admin/products', { timeout: 20000 });

    const productRow = await findProductRow(page, productName);

    const editLink = productRow
      .locator('a[href^="/admin/products/"][href$="/edit"]')
      .first();
    const editHref = await editLink.getAttribute('href');
    const editMatch = editHref?.match(/\/admin\/products\/([^/]+)\/edit/);

    expect(editMatch).toBeTruthy();
    productId = editMatch![1];

    const { data: product, error: productError } = await supabase
      .from('products')
      .select(
        'id, name, description, price, discountPercent, stock, isActive, isFeatured, categoryId'
      )
      .eq('id', productId)
      .single();

    expect(productError).toBeNull();
    expect(product).toBeTruthy();
    expect(product!.name).toBe(productName);
    expect(product!.description).toBe(productDescription);
    expect(Number(product!.price)).toBe(Number(productPrice));
    expect(product!.discountPercent).toBe(Number(productDiscount));
    expect(product!.stock).toBe(Number(productStock));
    expect(product!.isFeatured).toBe(true);
    expect(product!.categoryId).toBe(categoryId);

    await expect(productRow.getByText(/10% Discount/)).toBeVisible();
    await expect(productRow.getByText('Featured')).toBeVisible();

    // ============================================================
    // STEP 3: Edit product and verify updates
    // ============================================================
    await page.goto(`/admin/products/${productId}/edit`);
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: /Edit product/i })
    ).toBeVisible();

    await page.locator('input[name="name"]').fill(updatedName);
    await page.locator('textarea[name="description"]').fill(updatedDescription);
    await page.locator('input[name="price"]').fill(updatedPrice);
    await page.locator('input[name="discountPercent"]').fill(updatedDiscount);
    await page.locator('input[name="stock"]').fill(updatedStock);

    await page.getByRole('button', { name: /Save changes/i }).click();
    await page.waitForURL('/admin/products', { timeout: 20000 });

    const updatedRow = await findProductRow(page, updatedName);
    await expect(updatedRow.getByText(/5% Discount/)).toBeVisible();

    const { data: updatedProduct, error: updatedError } = await supabase
      .from('products')
      .select(
        'id, name, description, price, discountPercent, stock, isActive, isFeatured, categoryId'
      )
      .eq('id', productId)
      .single();

    expect(updatedError).toBeNull();
    expect(updatedProduct).toBeTruthy();
    expect(updatedProduct!.name).toBe(updatedName);
    expect(updatedProduct!.description).toBe(updatedDescription);
    expect(Number(updatedProduct!.price)).toBe(Number(updatedPrice));
    expect(updatedProduct!.discountPercent).toBe(Number(updatedDiscount));
    expect(updatedProduct!.stock).toBe(Number(updatedStock));
    expect(updatedProduct!.isFeatured).toBe(true);
    expect(updatedProduct!.categoryId).toBe(categoryId);

    // ============================================================
    // STEP 4: Verify product detail page reflects changes
    // ============================================================
    await page.goto(`/products/${productId}`);
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: updatedName })
    ).toBeVisible();
    await expect(page.getByText(updatedDescription)).toBeVisible();
    await expect(
      page.getByRole('button', { name: categoryName })
    ).toBeVisible();
  });
});
