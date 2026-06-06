import { expect, test } from '@playwright/test';

test.describe('i18n locale routing', () => {
  test('detects German visitors, renders localized routes, and switches language with cookie update', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      locale: 'de-DE',
      extraHTTPHeaders: {
        'accept-language': 'de-DE,de;q=0.9,en;q=0.7',
        'x-e2e-test': 'true',
      },
    });
    const page = await context.newPage();

    await page.goto('/');
    await expect(page).toHaveURL(/\/de$/);
    await expect(
      page.getByRole('heading', {
        name: /Ein produktionsreifer Commerce-Storefront/i,
      })
    ).toBeVisible();
    await expect(
      page.getByRole('navigation').getByRole('link', { name: 'Produkte' })
    ).toBeVisible();

    await page.goto('/de/cart');
    await expect(
      page.getByRole('heading', { name: 'Dein Warenkorb ist leer' })
    ).toBeVisible();

    await page.getByTestId('language-switcher-en').first().click();
    await expect(page).toHaveURL(/\/en\/cart$/);
    await expect(
      page.getByRole('heading', { name: 'Your cart is empty' })
    ).toBeVisible();

    const cookies = await context.cookies();
    expect(cookies.find((cookie) => cookie.name === 'site-locale')?.value).toBe(
      'en'
    );

    await context.close();
  });

  test('renders English and German storefront routes with different localized copy', async ({
    page,
  }) => {
    await page.goto('/en');
    await expect(page).toHaveURL(/\/en$/);
    await expect(
      page.getByRole('heading', {
        name: /A production-minded commerce storefront/i,
      })
    ).toBeVisible();

    await page.goto('/de/cart');
    await expect(page).toHaveURL(/\/de\/cart$/);
    await expect(
      page.getByRole('heading', { name: 'Dein Warenkorb ist leer' })
    ).toBeVisible();
  });
});
