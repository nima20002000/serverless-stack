import { test, expect, type Page } from '@playwright/test';

type PersistedCartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  stock: number;
  variantId?: string;
  variantName?: string;
};

const configuredCurrency =
  process.env.E2E_SITE_CURRENCY ||
  process.env.NEXT_PUBLIC_SITE_CURRENCY ||
  'USD';
const configuredLocale =
  process.env.E2E_SITE_LOCALE || process.env.NEXT_PUBLIC_SITE_LOCALE || 'en-US';
const configuredCurrencyDisplay =
  process.env.E2E_SITE_CURRENCY_DISPLAY ||
  process.env.NEXT_PUBLIC_SITE_CURRENCY_DISPLAY ||
  'symbol';

const cartItems: PersistedCartItem[] = [
  {
    productId: 'e2e-currency-product-1',
    name: 'Configured Currency Jacket',
    price: 1234,
    quantity: 2,
    image: '',
    stock: 5,
  },
  {
    productId: 'e2e-currency-product-2',
    name: 'Configured Currency Scarf',
    price: 567,
    quantity: 1,
    image: '',
    stock: 4,
    variantId: 'e2e-currency-variant-2',
    variantName: 'Blue',
  },
];

function formatConfiguredCurrency(amount: number): string {
  return new Intl.NumberFormat(configuredLocale, {
    style: 'currency',
    currency: configuredCurrency,
    currencyDisplay: configuredCurrencyDisplay as
      | 'symbol'
      | 'narrowSymbol'
      | 'code'
      | 'name',
  }).format(amount);
}

function escapedTextPattern(value: string): RegExp {
  return new RegExp(
    value
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/[\u00a0\s]+/g, '[\\s\\u00a0]+')
  );
}

async function expectVisibleCurrencyRow(
  page: Page,
  label: string,
  amountPattern: RegExp
): Promise<void> {
  await expect
    .poll(async () =>
      page.locator('main').evaluate(
        (root, options) => {
          const amount = new RegExp(options.amountSource, options.amountFlags);
          const isVisible = (element: Element) => {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              rect.width > 0 &&
              rect.height > 0
            );
          };

          return Array.from(root.querySelectorAll('*')).some((element) => {
            if (
              !isVisible(element) ||
              element.textContent?.trim() !== options.label
            ) {
              return false;
            }

            const siblings = Array.from(element.parentElement?.children ?? []);
            return siblings.some(
              (sibling) =>
                sibling !== element &&
                isVisible(sibling) &&
                amount.test(sibling.textContent ?? '')
            );
          });
        },
        {
          label,
          amountSource: amountPattern.source,
          amountFlags: amountPattern.flags,
        }
      )
    )
    .toBe(true);
}

async function expectVisibleButtonText(
  page: Page,
  labelPattern: RegExp
): Promise<void> {
  await expect
    .poll(async () =>
      page.locator('button').evaluateAll(
        (buttons, options) => {
          const label = new RegExp(options.source, options.flags);
          const isVisible = (element: Element) => {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();

            return (
              style.display !== 'none' &&
              style.visibility !== 'hidden' &&
              rect.width > 0 &&
              rect.height > 0
            );
          };

          return buttons.some(
            (button) =>
              isVisible(button) && label.test(button.textContent ?? '')
          );
        },
        { source: labelPattern.source, flags: labelPattern.flags }
      )
    )
    .toBe(true);
}

async function seedPersistedCart(page: Page): Promise<void> {
  await page.addInitScript((items) => {
    window.localStorage.setItem(
      'cart-storage',
      JSON.stringify({
        state: { items },
        version: 0,
      })
    );
  }, cartItems);
}

test.describe('Configured currency display', () => {
  test('renders the configured store currency through cart and checkout totals', async ({
    page,
  }) => {
    test.skip(
      !process.env.E2E_SITE_CURRENCY,
      'Run with E2E_SITE_CURRENCY, E2E_SITE_LOCALE, and E2E_SITE_CURRENCY_DISPLAY to prove non-default configured currency display.'
    );

    await seedPersistedCart(page);

    const firstLineTotal = cartItems[0].price * cartItems[0].quantity;
    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    const firstLinePrice = escapedTextPattern(
      formatConfiguredCurrency(firstLineTotal)
    );
    const subtotalPrice = escapedTextPattern(
      formatConfiguredCurrency(subtotal)
    );

    await page.goto('/cart');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: 'Cart', exact: true })
    ).toBeVisible();
    await expect(page.getByText('Configured Currency Jacket')).toBeVisible();
    await expect(page.getByText(firstLinePrice).first()).toBeVisible();
    await expect(page.getByText(subtotalPrice).first()).toBeVisible();

    await page.goto('/checkout');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: 'Order summary' })
    ).toBeVisible();
    await expect(page.getByText('Configured Currency Jacket')).toBeVisible();
    await expectVisibleCurrencyRow(
      page,
      'Configured Currency Jacket',
      firstLinePrice
    );
    await expectVisibleCurrencyRow(page, '3 items', subtotalPrice);
    await expectVisibleCurrencyRow(page, 'Total', subtotalPrice);
    await expectVisibleButtonText(
      page,
      escapedTextPattern(`Pay ${formatConfiguredCurrency(subtotal)}`)
    );
  });
});
