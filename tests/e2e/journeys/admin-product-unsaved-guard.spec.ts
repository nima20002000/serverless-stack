import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import { encode } from 'next-auth/jwt';

dotenv.config({ path: new URL('../../../.env', import.meta.url).pathname });

const nextAuthSecret = process.env.NEXTAUTH_SECRET || 'test-secret';

async function addAdminSession(context: BrowserContext) {
  const adminSessionToken = await encode({
    secret: nextAuthSecret,
    token: {
      sub: 'e2e-unsaved-admin',
      id: 'e2e-unsaved-admin',
      uid: 'e2e-unsaved-admin',
      name: 'Unsaved Guard Admin',
      email: 'unsaved-admin@example.com',
      role: 'ADMIN',
    },
  });

  await context.addCookies([
    {
      name: 'next-auth.session-token',
      value: adminSessionToken,
      url: 'http://localhost:3000',
    },
  ]);
}

async function mockProductApis(page: Page) {
  await page.route('**/api/categories**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ categories: [] }),
    });
  });

  await page.route('**/api/products', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ product: { id: 'e2e-unsaved-product' } }),
      });
      return;
    }

    await route.continue();
  });

  await page.route('**/api/admin/products**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [],
        total: 0,
        page: 1,
        perPage: 20,
        totalPages: 0,
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
    });
  });
}

async function goToNewProductFromProductsList(page: Page) {
  await page.goto('/admin/products');
  await expect(page.getByRole('button', { name: 'Add product' })).toBeVisible();
  await page.getByRole('link', { name: 'Add product' }).click();
  await expect(
    page.getByRole('heading', { name: 'Add product' })
  ).toBeVisible();
}

async function goToNewProduct(page: Page) {
  await page.goto('/admin/products/new');
  await expect(
    page.getByRole('heading', { name: 'Add product' })
  ).toBeVisible();
}

async function clickBreadcrumbProducts(page: Page) {
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Products' })
    .click();
}

async function expectDiscardDialog(page: Page) {
  await expect(
    page.getByRole('heading', { name: 'Discard unsaved changes?' })
  ).toBeVisible();
}

test.describe('admin product unsaved changes guard', () => {
  test.beforeEach(async ({ context, page }) => {
    await addAdminSession(context);
    await mockProductApis(page);
  });

  test('blocks breadcrumb navigation after a real field change, then allows explicit discard', async ({
    page,
  }) => {
    await goToNewProduct(page);

    await page.getByLabel('Product name').fill('Unsaved field product');
    await clickBreadcrumbProducts(page);

    await expectDiscardDialog(page);
    await page.getByRole('button', { name: 'Stay on page' }).click();
    await expect(page).toHaveURL(/\/admin\/products\/new$/);
    await expect(
      page.getByRole('heading', { name: 'Discard unsaved changes?' })
    ).toBeHidden();

    await clickBreadcrumbProducts(page);
    await expectDiscardDialog(page);
    await page.getByRole('button', { name: 'Discard changes' }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
  });

  test('blocks browser back navigation after unsaved form changes', async ({
    page,
  }) => {
    await goToNewProductFromProductsList(page);

    await page.getByLabel('Product name').fill('Unsaved browser back product');
    await page.goBack();

    await expectDiscardDialog(page);
    await expect(page).toHaveURL(/\/admin\/products\/new$/);

    await page.getByRole('button', { name: 'Discard changes' }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
  });

  test('confirmed cancel skips the dirty-history sentinel', async ({
    page,
  }) => {
    await goToNewProductFromProductsList(page);

    await page.getByLabel('Product name').fill('Cancel discard product');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expectDiscardDialog(page);
    await page.getByRole('button', { name: 'Discard changes' }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
  });

  test('reverted changes remove the dirty-history sentinel before cancel', async ({
    page,
  }) => {
    await goToNewProductFromProductsList(page);

    await page.getByLabel('Product name').fill('Reverted product');
    await page.getByLabel('Product name').fill('');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expect(
      page.getByRole('heading', { name: 'Discard unsaved changes?' })
    ).toBeHidden();
    await expect(page).toHaveURL(/\/admin\/products$/);
  });

  test('stale forward sentinel is skipped after reverted changes', async ({
    page,
  }) => {
    await goToNewProductFromProductsList(page);

    await page.getByLabel('Product name').fill('Forward sentinel product');
    await page.getByLabel('Product name').fill('');
    await page.waitForFunction(
      () => !window.history.state?.__unsavedChangesGuardSentinel
    );
    await page.goForward();
    await page.waitForFunction(
      () => !window.history.state?.__unsavedChangesGuardSentinel
    );

    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(
      page.getByRole('heading', { name: 'Discard unsaved changes?' })
    ).toBeHidden();
    await expect(page).toHaveURL(/\/admin\/products$/);
  });

  test('immediate re-dirty after reverting still prompts before cancel', async ({
    page,
  }) => {
    await goToNewProductFromProductsList(page);

    await page.getByLabel('Product name').fill('Temporarily dirty product');
    await page.getByLabel('Product name').fill('');
    await page.getByLabel('Product name').fill('Dirty again product');
    await page.getByRole('button', { name: 'Cancel' }).click();

    await expectDiscardDialog(page);
    await page.getByRole('button', { name: 'Discard changes' }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
  });

  test('allowed breadcrumb discard does not leave stale form history behind', async ({
    page,
  }) => {
    await goToNewProductFromProductsList(page);

    await page.getByLabel('Product name').fill('Discard through breadcrumb');
    await clickBreadcrumbProducts(page);
    await expectDiscardDialog(page);
    await page.getByRole('button', { name: 'Discard changes' }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);

    await page.goBack();
    await expect(
      page.getByRole('heading', { name: 'Add product' })
    ).toBeVisible();

    await page.getByLabel('Product name').fill('Second dirty edit');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expectDiscardDialog(page);
    await page.getByRole('button', { name: 'Discard changes' }).click();
    await expect(page).toHaveURL(/\/admin\/products$/);
  });

  test('blocks navigation after a variant draft change and bypasses the guard after successful save', async ({
    page,
  }) => {
    await goToNewProduct(page);

    await page.getByLabel('Product name').fill('Saved product');
    await page
      .locator('textarea[name="description"]')
      .fill('A product with enough details to save.');
    await page.getByLabel(/Price/).fill('49');
    await page.getByLabel(/^Stock$/).fill('12');

    await page.getByRole('button', { name: '+ Add variant' }).click();
    await page.getByLabel('Variant name').fill('Blue');
    await clickBreadcrumbProducts(page);

    await expectDiscardDialog(page);
    await page.getByRole('button', { name: 'Stay on page' }).click();
    await expect(page).toHaveURL(/\/admin\/products\/new$/);

    await page.getByRole('button', { name: 'Create Product' }).click();
    await expect(
      page.getByRole('heading', { name: 'Discard unsaved changes?' })
    ).toBeHidden();
    await expect(page).toHaveURL(/\/admin\/products$/);
  });
});
