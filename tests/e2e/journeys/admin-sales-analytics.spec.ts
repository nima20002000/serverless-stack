import { expect, test, type Page } from '@playwright/test';
import { createE2ESupabaseClient, createTestUserInDB } from '../utils/database';

const adminUser = {
  id: 'e2e-user-sales-analytics-admin',
  uid: 'e2e-uid-sales-analytics-admin',
  email: 'e2e-sales-analytics-admin@example.com',
  phone: '+12025553331',
  name: 'Sales Analytics Admin',
  password: 'Test1234!@#$',
};

const productId = 'e2e-product-sales-analytics-jacket';
const productIdTwo = 'e2e-product-sales-analytics-socks';
const variantId = 'e2e-variant-sales-analytics-blue-xl';
const transactionIds = [
  'e2e-sales-analytics-tx-completed-1',
  'e2e-sales-analytics-tx-completed-2',
  'e2e-sales-analytics-tx-failed',
  'e2e-sales-analytics-tx-pending',
  'e2e-sales-analytics-tx-outside-range',
];

function expectedCurrency(amount: number): string {
  return new Intl.NumberFormat(
    process.env.E2E_SITE_LOCALE ||
      process.env.NEXT_PUBLIC_SITE_LOCALE ||
      'en-US',
    {
      style: 'currency',
      currency:
        process.env.E2E_SITE_CURRENCY ||
        process.env.NEXT_PUBLIC_SITE_CURRENCY ||
        'USD',
      currencyDisplay: (process.env.E2E_SITE_CURRENCY_DISPLAY ||
        process.env.NEXT_PUBLIC_SITE_CURRENCY_DISPLAY ||
        'symbol') as Intl.NumberFormatOptions['currencyDisplay'],
    }
  ).format(amount);
}

async function cleanupSalesAnalyticsData() {
  const supabase = createE2ESupabaseClient();

  await supabase
    .from('transaction_items')
    .delete()
    .in('transactionId', transactionIds);
  await supabase.from('transactions').delete().in('id', transactionIds);
  await supabase.from('product_variants').delete().eq('id', variantId);
  await supabase.from('products').delete().in('id', [productId, productIdTwo]);
  await supabase.from('users').delete().eq('id', adminUser.id);
}

async function setDateInput(page: Page, label: string, value: string) {
  const input = page.getByLabel(label);
  await input.evaluate((element, nextValue) => {
    const dateInput = element as HTMLInputElement;
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value'
    )?.set;
    valueSetter?.call(dateInput, nextValue);
    dateInput.dispatchEvent(new Event('input', { bubbles: true }));
    dateInput.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
  await expect(input).toHaveValue(value);
}

test.describe('admin sales analytics', () => {
  test.beforeAll(async () => {
    const supabase = createE2ESupabaseClient();
    await cleanupSalesAnalyticsData();

    await createTestUserInDB({
      ...adminUser,
      isVerified: true,
      role: 'ADMIN',
    });

    const now = new Date().toISOString();

    const { error: productsError } = await supabase.from('products').insert([
      {
        id: productId,
        name: 'Sales Analytics Jacket',
        description: 'Seeded E2E analytics product.',
        price: 45,
        stock: 20,
        images: [],
        isActive: true,
        isFeatured: false,
        hasVariants: true,
        updatedAt: now,
      },
      {
        id: productIdTwo,
        name: 'Sales Analytics Socks',
        description: 'Second seeded E2E analytics product.',
        price: 20,
        stock: 20,
        images: [],
        isActive: true,
        isFeatured: false,
        hasVariants: false,
        updatedAt: now,
      },
    ]);

    if (productsError) {
      throw new Error(
        `Failed to seed sales products: ${productsError.message}`
      );
    }

    const { error: variantError } = await supabase
      .from('product_variants')
      .insert({
        id: variantId,
        productId,
        name: 'Blue XL',
        size: 'XL',
        color: 'Blue',
        stock: 10,
        priceAdjust: 0,
        isActive: true,
        order: 0,
        updatedAt: now,
      });

    if (variantError) {
      throw new Error(`Failed to seed sales variant: ${variantError.message}`);
    }

    const { error: transactionsError } = await supabase
      .from('transactions')
      .insert([
        {
          id: transactionIds[0],
          userId: adminUser.id,
          amount: 90,
          subtotal: 100,
          discountAmount: 10,
          status: 'COMPLETED',
          transactionCode: 'TX-E2E-SALES-001',
          phone: '+12025553331-e2e',
          fullName: 'Registered Sales Buyer',
          email: 'buyer-one@example.com',
          shippingAddress: '1 Test Street',
          postalCode: '10001',
          paymentMethod: 'STRIPE',
          isGuest: false,
          createdAt: '2035-06-02T10:00:00.000Z',
          updatedAt: now,
        },
        {
          id: transactionIds[1],
          userId: null,
          amount: 60,
          subtotal: 75,
          discountAmount: 15,
          status: 'COMPLETED',
          transactionCode: 'TX-E2E-SALES-002',
          phone: '+12025553332-e2e',
          fullName: 'Guest Sales Buyer',
          email: 'buyer-two@example.com',
          shippingAddress: '2 Test Street',
          postalCode: '10002',
          paymentMethod: 'PAYPAL',
          isGuest: true,
          createdAt: '2035-06-03T10:00:00.000Z',
          updatedAt: now,
        },
        {
          id: transactionIds[2],
          userId: null,
          amount: 40,
          status: 'FAILED',
          transactionCode: 'TX-E2E-SALES-FAILED',
          phone: '+12025553333-e2e',
          fullName: 'Failed Sales Buyer',
          email: 'buyer-three@example.com',
          shippingAddress: '3 Test Street',
          postalCode: '10003',
          paymentMethod: 'STRIPE',
          isGuest: true,
          createdAt: '2035-06-04T10:00:00.000Z',
          updatedAt: now,
        },
        {
          id: transactionIds[3],
          userId: null,
          amount: 30,
          status: 'PENDING',
          transactionCode: 'TX-E2E-SALES-PENDING',
          phone: '+12025553334-e2e',
          fullName: 'Pending Sales Buyer',
          email: 'buyer-four@example.com',
          shippingAddress: '4 Test Street',
          postalCode: '10004',
          paymentMethod: 'PAYPAL',
          isGuest: true,
          createdAt: '2035-06-05T10:00:00.000Z',
          updatedAt: now,
        },
        {
          id: transactionIds[4],
          userId: null,
          amount: 500,
          status: 'COMPLETED',
          transactionCode: 'TX-E2E-SALES-OUTSIDE',
          phone: '+12025553335-e2e',
          fullName: 'Outside Range Buyer',
          email: 'buyer-five@example.com',
          shippingAddress: '5 Test Street',
          postalCode: '10005',
          paymentMethod: 'STRIPE',
          isGuest: true,
          createdAt: '2035-08-01T10:00:00.000Z',
          updatedAt: now,
        },
      ]);

    if (transactionsError) {
      throw new Error(
        `Failed to seed sales transactions: ${transactionsError.message}`
      );
    }

    const { error: itemsError } = await supabase
      .from('transaction_items')
      .insert([
        {
          id: 'e2e-sales-item-1',
          transactionId: transactionIds[0],
          productId,
          variantId,
          quantity: 2,
          price: 50,
        },
        {
          id: 'e2e-sales-item-2',
          transactionId: transactionIds[1],
          productId: productIdTwo,
          variantId: null,
          quantity: 3,
          price: 25,
        },
        {
          id: 'e2e-sales-item-outside',
          transactionId: transactionIds[4],
          productId,
          variantId,
          quantity: 1,
          price: 500,
        },
      ]);

    if (itemsError) {
      throw new Error(`Failed to seed sales items: ${itemsError.message}`);
    }
  });

  test.afterAll(async () => {
    await cleanupSalesAnalyticsData();
  });

  test('loads filtered sales metrics from seeded transactions', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.locator('input[name="identifier"]').fill(adminUser.email);
    await page.locator('input[name="password"]').fill(adminUser.password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL(/\/(?:en)?$/, { timeout: 20000 });

    await page.goto('/admin/sales');
    await expect(
      page.getByRole('heading', { name: 'Sales analytics' })
    ).toBeVisible();

    await setDateInput(page, 'Start date', '2035-06-01');
    await setDateInput(page, 'End date', '2035-06-07');
    await page.getByLabel('Group by').selectOption('week');

    await expect(page.getByText(expectedCurrency(150)).first()).toBeVisible();
    await expect(page.getByText('2 completed orders')).toBeVisible();
    await expect(page.getByText('50.0%')).toBeVisible();
    await expect(page.getByText('4 total attempts')).toBeVisible();
    await expect(page.getByText(expectedCurrency(25)).first()).toBeVisible();
    await expect(
      page.getByText(`Gross sales ${expectedCurrency(175)}`).first()
    ).toBeVisible();
    await expect(
      page.getByText('Sales Analytics Jacket', { exact: true }).first()
    ).toBeVisible();
    await expect(
      page.getByText('Sales Analytics Socks', { exact: true }).first()
    ).toBeVisible();
    await expect(page.getByText('Stripe').first()).toBeVisible();
    await expect(page.getByText('PayPal').first()).toBeVisible();
    await expect(page.getByText('Registered customers').first()).toBeVisible();
    await expect(page.getByText('Guest customers').first()).toBeVisible();
    await expect(page.getByText('TX-E2E-SALES-FAILED')).toBeVisible();
    await expect(page.getByText('TX-E2E-SALES-PENDING')).toBeVisible();
    await expect(page.getByText(expectedCurrency(500))).toHaveCount(0);
  });
});
