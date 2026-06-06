import { expect, test, type Page } from '@playwright/test';
import dotenv from 'dotenv';
import { encode } from 'next-auth/jwt';

dotenv.config({ path: new URL('../../../.env', import.meta.url).pathname });

const themeStorageKey = 'serverless-stack-theme';
const nextAuthSecret = process.env.NEXTAUTH_SECRET || 'test-secret';

async function expectResolvedTheme(
  page: Page,
  theme: string,
  resolved: string
) {
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await expect(page.locator('html')).toHaveAttribute(
    'data-resolved-theme',
    resolved
  );

  const hasDarkClass = await page.locator('html').evaluate((root) => {
    return root.classList.contains('dark');
  });
  expect(hasDarkClass).toBe(resolved === 'dark');

  const colorScheme = await page.locator('html').evaluate((root) => {
    return getComputedStyle(root).colorScheme;
  });
  expect(colorScheme).toContain(resolved);
}

async function expectStoredTheme(page: Page, theme: string) {
  await expect
    .poll(() =>
      page.evaluate((key) => localStorage.getItem(key), themeStorageKey)
    )
    .toBe(theme);
}

test.describe('theme toggle', () => {
  test('uses system dark on first load, then persists explicit choices across reload and navigation', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      colorScheme: 'dark',
      extraHTTPHeaders: { 'x-e2e-test': 'true' },
    });
    const page = await context.newPage();

    await page.goto('/en');
    await expectResolvedTheme(page, 'system', 'dark');

    await page.getByTestId('theme-toggle-light').first().click();
    await expectStoredTheme(page, 'light');
    await expectResolvedTheme(page, 'light', 'light');

    await page.reload();
    await expectResolvedTheme(page, 'light', 'light');

    await page.getByTestId('theme-toggle-dark').first().click();
    await expectStoredTheme(page, 'dark');
    await expectResolvedTheme(page, 'dark', 'dark');

    await page.getByRole('button', { name: 'Cart', exact: true }).click();
    const drawer = page.getByTestId('cart-drawer-panel');
    await expect(drawer).toBeVisible();
    const drawerSurface = drawer.locator('div').first();
    await expect
      .poll(() =>
        drawerSurface.evaluate((node) => getComputedStyle(node).backgroundColor)
      )
      .toBe('rgb(2, 6, 23)');
    await expect(
      drawer.getByRole('heading', { name: 'Your cart is empty' })
    ).toBeVisible();

    const adminSessionToken = await encode({
      secret: nextAuthSecret,
      token: {
        sub: 'e2e-theme-admin',
        id: 'e2e-theme-admin',
        uid: 'e2e-theme-admin',
        name: 'Theme Admin',
        email: 'theme-admin@example.com',
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

    await page.goto('/admin');
    await expectResolvedTheme(page, 'dark', 'dark');
    await expect(page.getByText('Admin console')).toBeVisible();

    await context.close();
  });
});
