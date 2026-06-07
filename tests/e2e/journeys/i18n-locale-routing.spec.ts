import { expect, test } from '@playwright/test';
import { createE2ESupabaseClient } from '../utils/database';

async function ensureGermanEnabled() {
  const supabase = createE2ESupabaseClient();
  const now = new Date().toISOString();
  await supabase.from('supported_languages').upsert(
    [
      {
        code: 'en',
        label: 'English',
        nativeLabel: 'English',
        direction: 'ltr',
        isEnabled: true,
        isDefault: true,
        sortOrder: 0,
        updatedAt: now,
      },
      {
        code: 'de',
        label: 'German',
        nativeLabel: 'Deutsch',
        direction: 'ltr',
        isEnabled: true,
        isDefault: false,
        sortOrder: 10,
        updatedAt: now,
      },
    ],
    { onConflict: 'code' }
  );
}

test.describe('i18n locale routing', () => {
  test.beforeEach(async () => {
    await ensureGermanEnabled();
  });

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

  test('renders localized SEO metadata and customer payment status copy', async ({
    page,
  }) => {
    await page.goto('/de/products');
    await expect(page).toHaveTitle(/Produkte - Serverless Stack/);

    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/de\/products$/
    );
    await expect(
      page.locator('head link[rel="alternate"][hreflang="en"]')
    ).toHaveAttribute('href', /\/en\/products$/);
    await expect(
      page.locator('head link[rel="alternate"][hreflang="de"]')
    ).toHaveAttribute('href', /\/de\/products$/);

    await page.goto(
      '/de/payment/failure?status=cancelled&provider=stripe&code=E2E-SEO'
    );
    await expect(
      page.getByRole('heading', { name: 'Zahlung abgebrochen' })
    ).toBeVisible();
    await expect(
      page.getByText(
        'Dein Warenkorb ist weiterhin verfügbar, damit du den Checkout erneut versuchen kannst.'
      )
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Zurück zum Warenkorb' })
    ).toHaveAttribute('href', '/de/cart');
  });
});
