import { test, expect, type Page } from '@playwright/test';

type PersistedCartItem = {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  stock: number;
};

const cartItems: PersistedCartItem[] = [
  {
    productId: 'e2e-shipping-product-1',
    name: 'International Address Item',
    price: 49,
    quantity: 1,
    image: '',
    stock: 5,
  },
];

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

test.describe('International shipping address checkout', () => {
  test('submits expanded address fields from checkout', async ({ page }) => {
    await seedPersistedCart(page);

    let submittedBody: unknown;
    await page.route('**/api/transactions/create', async (route) => {
      submittedBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          paymentMethod: 'STRIPE',
          paymentUrl: '/payment/success?code=TX-E2E-SHIP&provider=stripe',
          transactionId: 'tx-e2e-shipping',
          transactionCode: 'TX-E2E-SHIP',
          amount: 49,
        }),
      });
    });

    await page.goto('/checkout');
    await page.waitForLoadState('domcontentloaded');

    await page.getByLabel('Full name *').fill('International Buyer');
    await page.getByLabel('Phone number *').fill('+12025550199');
    await page.getByLabel('Email (optional)').fill('buyer@example.com');
    await page.getByLabel('Country *').fill('Germany');
    await page.getByLabel('City').fill('Berlin');
    await page.getByLabel('State, region, or province').fill('Berlin');
    await page.getByLabel('Address line 1 *').fill('Invalidenstrasse 117');
    await page.getByLabel('Address line 2').fill('Floor 2');
    await page.getByLabel('Postal or ZIP code (optional)').fill('10115');

    await page.getByRole('button', { name: /Pay/ }).click();
    await expect(page).toHaveURL(/\/payment\/success/);

    expect(submittedBody).toEqual(
      expect.objectContaining({
        shippingInfo: expect.objectContaining({
          fullName: 'International Buyer',
          phone: '+12025550199',
          email: 'buyer@example.com',
          shippingCountry: 'Germany',
          shippingRegion: 'Berlin',
          shippingCity: 'Berlin',
          shippingAddressLine1: 'Invalidenstrasse 117',
          shippingAddressLine2: 'Floor 2',
          postalCode: '10115',
        }),
      })
    );
  });
});
