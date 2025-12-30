import { test, expect } from '@playwright/test';

test.describe('E2E Infrastructure Smoke Tests', () => {
  test('should load homepage with RTL Persian layout', async ({
    page,
    browserName,
  }) => {
    await page.goto('/');

    // Verify page loaded with correct title
    await expect(page).toHaveTitle(/کیتیا|Kitia/);

    // Verify RTL direction is set on html element
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(html).toHaveAttribute('lang', 'fa');

    // Verify Persian font is loaded (B Yekan is used as primary font)
    const bodyFontFamily = await page.locator('body').evaluate((el) => {
      return window.getComputedStyle(el).fontFamily;
    });
    // The font family should include a Persian font (B Yekan with space or Vazirmatn)
    expect(bodyFontFamily.toLowerCase()).toMatch(/b\s*yekan|vazir|iran/);

    // Verify header is visible with logo
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Verify Persian logo text "کیتیا" is visible in header
    const logo = page.locator('header h1:has-text("کیتیا")').first();
    await expect(logo).toBeVisible();
  });

  test('should navigate to products page', async ({ page, isMobile }) => {
    await page.goto('/');

    if (isMobile) {
      // On mobile, we need to open the hamburger menu first
      const mobileMenuButton = page.locator('button[aria-label="منوی موبایل"]');
      await expect(mobileMenuButton).toBeVisible();
      await mobileMenuButton.click();

      // Wait for mobile menu to expand
      await page.waitForTimeout(400);
    }

    // Find visible products link in navigation (there are multiple, some hidden on mobile/desktop)
    const productsLink = page.locator('a[href="/products"]:visible').first();
    await expect(productsLink).toBeVisible();
    await productsLink.click();

    // Verify URL changed to products page
    await expect(page).toHaveURL(/\/products/);

    // Verify products page loaded with expected content
    // Wait for DOM content to be ready (networkidle can timeout on Next.js HMR)
    await page.waitForLoadState('domcontentloaded');

    // The products page should have a heading or product grid
    const pageContent = page.locator('main, [role="main"]').first();
    await expect(pageContent).toBeVisible();
  });

  test('should open cart drawer when cart icon is clicked', async ({
    page,
  }) => {
    await page.goto('/');

    // Wait for page to load completely
    await page.waitForLoadState('domcontentloaded');

    // Find visible cart icon button (there are 2: desktop and mobile, one is hidden based on viewport)
    const cartIcon = page
      .locator('button[aria-label="سبد خرید"]:visible')
      .first();
    await expect(cartIcon).toBeVisible();

    // Click cart icon
    await cartIcon.click();

    // Wait for the drawer panel to be visible (Dialog.Panel with content)
    // HeadlessUI Dialog uses transitions, so we wait for the panel content to appear
    const drawerTitle = page
      .locator('[role="dialog"] h2, [role="dialog"] [class*="font-bold"]')
      .filter({ hasText: 'سبد خرید' });
    await expect(drawerTitle).toBeVisible({ timeout: 5000 });

    // Verify the cart content is rendered (empty cart message showing empty state)
    const cartEmptyMessage = page
      .locator('[role="dialog"]')
      .getByText('سبد خرید خالی است');
    await expect(cartEmptyMessage).toBeVisible({ timeout: 5000 });

    // Close the drawer by clicking the close button (XMarkIcon button)
    const closeButton = page.locator('[role="dialog"] button').first();
    await closeButton.click();

    // Wait for the drawer to close - the dialog panel should be hidden
    await expect(drawerTitle).not.toBeVisible({ timeout: 5000 });
  });
});
