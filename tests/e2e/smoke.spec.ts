import { test, expect } from '@playwright/test';

test.describe('E2E Infrastructure Smoke Tests', () => {
  test('should load homepage with RTL Persian layout', async ({ page }) => {
    await page.goto('/');

    // Verify page loaded with correct title
    await expect(page).toHaveTitle(/کیتیا|Kitia/);

    // Verify RTL direction is set on html element
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');
    await expect(html).toHaveAttribute('lang', 'fa');

    // Verify Persian font is loaded (BYekan is used as primary font)
    const bodyFontFamily = await page.locator('body').evaluate((el) => {
      return window.getComputedStyle(el).fontFamily;
    });
    // The font family should include a Persian font
    expect(bodyFontFamily.toLowerCase()).toMatch(/byekan|vazir|iran/);

    // Verify header is visible with logo
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Verify Persian logo text "کیتیا" is visible
    const logo = page.locator('h1:has-text("کیتیا")');
    await expect(logo).toBeVisible();
  });

  test('should navigate to products page', async ({ page }) => {
    await page.goto('/');

    // Find and click products link in navigation
    const productsLink = page.locator('a[href="/products"]').first();
    await expect(productsLink).toBeVisible();
    await productsLink.click();

    // Verify URL changed to products page
    await expect(page).toHaveURL(/\/products/);

    // Verify products page loaded with expected content
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');

    // The products page should have a heading or product grid
    const pageContent = page.locator('main, [role="main"]').first();
    await expect(pageContent).toBeVisible();
  });

  test('should open cart drawer when cart icon is clicked', async ({
    page,
  }) => {
    await page.goto('/');

    // Wait for page to load completely
    await page.waitForLoadState('networkidle');

    // Find cart icon button by its aria-label
    const cartIcon = page.locator('button[aria-label="سبد خرید"]').first();
    await expect(cartIcon).toBeVisible();

    // Click cart icon
    await cartIcon.click();

    // Verify cart drawer opens - it should show "سبد خرید" title
    const cartTitle = page.locator('text=سبد خرید').first();
    await expect(cartTitle).toBeVisible();

    // Verify drawer panel is visible (Dialog.Panel)
    const drawerPanel = page.locator('[role="dialog"]');
    await expect(drawerPanel).toBeVisible();

    // Close the drawer by clicking the close button
    const closeButton = page.locator('[role="dialog"] button').first();
    await closeButton.click();

    // Verify drawer is closed (dialog should not be visible)
    await expect(drawerPanel).not.toBeVisible();
  });
});
