import { expect, test, type Page } from '@playwright/test';
import type { PostgrestError } from '@supabase/supabase-js';
import { createE2ESupabaseClient, createTestUserInDB } from '../utils/database';

const password = 'Test1234!@#$';

const users = {
  admin: {
    id: 'e2e-user-nim155-admin',
    uid: 'zz-e2e-nim155-admin',
    email: 'e2e-nim155-admin@example.com',
    phone: '+12025551551',
    name: 'NIM155 Current Admin',
    password,
  },
  secondAdmin: {
    id: 'e2e-user-nim155-second-admin',
    uid: 'zz-e2e-nim155-second-admin',
    email: 'e2e-nim155-second-admin@example.com',
    phone: '+12025551552',
    name: 'NIM155 Second Admin',
    password,
  },
  customer: {
    id: 'e2e-user-nim155-customer',
    uid: 'zz-e2e-nim155-customer',
    email: 'e2e-nim155-customer@example.com',
    phone: '+12025551553',
    name: 'NIM155 Regular User',
    password,
  },
  deleteTarget: {
    id: 'e2e-user-nim155-delete-target',
    uid: 'zz-e2e-nim155-delete-target',
    email: 'e2e-nim155-delete@example.com',
    phone: '+12025551554',
    name: 'NIM155 Delete Target',
    password,
  },
};

const productId = 'e2e-product-nim155-admin-shirt';
const variantId = 'e2e-variant-nim155-admin-blue-large';
const transactionIds = [
  'e2e-tx-nim155-registered-completed',
  'e2e-tx-nim155-guest-pending',
  'e2e-tx-nim155-failed',
];

const transactionCodes = {
  registered: 'TX-E2E-NIM155-REGISTERED',
  guest: 'TX-E2E-NIM155-GUEST',
  failed: 'TX-E2E-NIM155-FAILED',
};

type DashboardStats = {
  totalUsers: number;
  newUsers: number;
  totalProducts: number;
  activeProducts: number;
  totalTransactions: number;
  completedTransactions: number;
  pendingTransactions: number;
  failedTransactions: number;
  totalRevenue: number;
  monthlyRevenue: number;
};

let dashboardBaseline: DashboardStats | null = null;

function formatNumber(value: number): string {
  return new Intl.NumberFormat(
    process.env.E2E_SITE_LOCALE ||
      process.env.NEXT_PUBLIC_SITE_LOCALE ||
      'en-US'
  ).format(value);
}

function formatPrice(amount: number): string {
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

async function loginAsAdmin(page: Page) {
  const priorLoginActivityCount = await countLoginActivityLogs(users.admin.id);

  await page.goto('/login');
  await page.locator('input[name="identifier"]').fill(users.admin.email);
  await page.locator('input[name="password"]').fill(users.admin.password);
  await page
    .locator('form')
    .getByRole('button', { name: /sign in/i })
    .click();
  await page.waitForURL(
    (url) => /^\/(?:[a-z]{2}\/?)?$/.test(new URL(url).pathname),
    { timeout: 10000 }
  );
  await expect
    .poll(() => countLoginActivityLogs(users.admin.id), {
      message: 'seeded admin login activity should be persisted before cleanup',
      timeout: 10000,
    })
    .toBeGreaterThan(priorLoginActivityCount);
}

async function countLoginActivityLogs(userId: string) {
  const supabase = createE2ESupabaseClient();
  const { count, error } = await supabase
    .from('user_activity_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('activity_type', 'LOGIN_SUCCESS');

  if (error) {
    throw new Error(`Failed to count login activity logs: ${error.message}`);
  }

  return count || 0;
}

async function cleanupNim155Data() {
  const supabase = createE2ESupabaseClient();
  const userIds = Object.values(users).map((user) => user.id);

  await expectNoSupabaseError(
    'cleanup NIM155 invoices',
    supabase.from('invoices').delete().in('transactionId', transactionIds)
  );
  await expectNoSupabaseError(
    'cleanup NIM155 transaction items',
    supabase
      .from('transaction_items')
      .delete()
      .in('transactionId', transactionIds)
  );
  await expectNoSupabaseError(
    'cleanup NIM155 transactions',
    supabase.from('transactions').delete().in('id', transactionIds)
  );
  await expectNoSupabaseError(
    'cleanup NIM155 product variants',
    supabase.from('product_variants').delete().eq('id', variantId)
  );
  await expectNoSupabaseError(
    'cleanup NIM155 products',
    supabase.from('products').delete().eq('id', productId)
  );
  await expectNoSupabaseError(
    'cleanup NIM155 user activity logs',
    supabase.from('user_activity_logs').delete().in('user_id', userIds)
  );
  await expectNoSupabaseError(
    'cleanup NIM155 users',
    supabase.from('users').delete().in('id', userIds)
  );
}

async function expectNoSupabaseError(
  label: string,
  request: PromiseLike<{ error: PostgrestError | null }>
) {
  const { error } = await request;

  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

async function seedNim155Data() {
  const supabase = createE2ESupabaseClient();
  const now = new Date().toISOString();
  const completedCreatedAt = now;
  const guestCreatedAt = new Date(Date.now() - 1000).toISOString();
  const failedCreatedAt = new Date(Date.now() - 2000).toISOString();

  await cleanupNim155Data();
  dashboardBaseline = await getDashboardExpectations();

  await Promise.all([
    createTestUserInDB({
      ...users.admin,
      isVerified: true,
      role: 'ADMIN',
    }),
    createTestUserInDB({
      ...users.secondAdmin,
      isVerified: true,
      role: 'ADMIN',
    }),
    createTestUserInDB({
      ...users.customer,
      isVerified: true,
      role: 'USER',
    }),
    createTestUserInDB({
      ...users.deleteTarget,
      isVerified: true,
      role: 'USER',
    }),
  ]);

  const { error: productError } = await supabase.from('products').insert({
    id: productId,
    name: 'NIM155 Admin Shirt',
    description: 'Seeded admin management product.',
    price: 64,
    stock: 20,
    images: [],
    isActive: true,
    isFeatured: false,
    hasVariants: true,
    updatedAt: now,
  });

  if (productError) {
    throw new Error(`Failed to seed NIM155 product: ${productError.message}`);
  }

  const { error: variantError } = await supabase
    .from('product_variants')
    .insert({
      id: variantId,
      productId,
      name: 'Blue Large',
      size: 'Large',
      color: 'Blue',
      material: 'Cotton',
      sku: 'NIM155-BLUE-LARGE',
      stock: 10,
      priceAdjust: 0,
      isActive: true,
      order: 0,
      updatedAt: now,
    });

  if (variantError) {
    throw new Error(`Failed to seed NIM155 variant: ${variantError.message}`);
  }

  const { error: transactionsError } = await supabase
    .from('transactions')
    .insert([
      {
        id: transactionIds[0],
        userId: users.customer.id,
        amount: 128,
        subtotal: 128,
        discountAmount: 0,
        status: 'COMPLETED',
        transactionCode: transactionCodes.registered,
        phone: users.customer.phone,
        fullName: users.customer.name,
        email: users.customer.email,
        shippingAddress: '155 Registered Street',
        shippingCountry: 'US',
        shippingRegion: 'CA',
        shippingCity: 'San Francisco',
        shippingAddressLine1: '155 Registered Street',
        shippingAddressLine2: 'Suite 10',
        postalCode: '94105',
        paymentMethod: 'STRIPE',
        paymentProviderRef: 'nim155-provider-ref',
        stripePaymentIntentId: 'pi_nim155_registered',
        isGuest: false,
        createAccount: false,
        createdAt: completedCreatedAt,
        updatedAt: now,
      },
      {
        id: transactionIds[1],
        userId: null,
        amount: 64,
        subtotal: 64,
        discountAmount: 0,
        status: 'PENDING',
        transactionCode: transactionCodes.guest,
        phone: '+12025551555',
        fullName: 'NIM155 Guest Buyer',
        email: 'e2e-nim155-guest@example.com',
        shippingAddress: '155 Guest Avenue',
        shippingCountry: 'US',
        shippingRegion: 'NY',
        shippingCity: 'New York',
        shippingAddressLine1: '155 Guest Avenue',
        shippingAddressLine2: 'Floor 2',
        postalCode: '10001',
        paymentMethod: 'PAYPAL',
        paymentProviderRef: 'nim155-paypal-provider-ref',
        paypalOrderId: 'PAYPAL-NIM155-ORDER',
        isGuest: true,
        createAccount: true,
        createdAt: guestCreatedAt,
        updatedAt: now,
      },
      {
        id: transactionIds[2],
        userId: null,
        amount: 32,
        subtotal: 32,
        discountAmount: 0,
        status: 'FAILED',
        transactionCode: transactionCodes.failed,
        phone: '+12025551556',
        fullName: 'NIM155 Failed Buyer',
        email: 'e2e-nim155-failed@example.com',
        shippingAddress: '155 Failed Road',
        postalCode: '10002',
        paymentMethod: 'STRIPE',
        stripePaymentIntentId: 'pi_nim155_failed',
        isGuest: true,
        createAccount: false,
        createdAt: failedCreatedAt,
        updatedAt: now,
      },
    ]);

  if (transactionsError) {
    throw new Error(
      `Failed to seed NIM155 transactions: ${transactionsError.message}`
    );
  }

  const { error: itemsError } = await supabase
    .from('transaction_items')
    .insert([
      {
        id: 'e2e-item-nim155-registered',
        transactionId: transactionIds[0],
        productId,
        variantId,
        quantity: 2,
        price: 64,
      },
      {
        id: 'e2e-item-nim155-guest',
        transactionId: transactionIds[1],
        productId,
        variantId,
        quantity: 1,
        price: 64,
      },
      {
        id: 'e2e-item-nim155-failed',
        transactionId: transactionIds[2],
        productId,
        variantId,
        quantity: 1,
        price: 32,
      },
    ]);

  if (itemsError) {
    throw new Error(`Failed to seed NIM155 items: ${itemsError.message}`);
  }

  const { error: invoiceError } = await supabase.from('invoices').insert({
    id: 'e2e-invoice-nim155-registered',
    transactionId: transactionIds[0],
    invoiceNumber: 'INV-E2E-NIM155-001',
    generatedAt: completedCreatedAt,
  });

  if (invoiceError) {
    throw new Error(`Failed to seed NIM155 invoice: ${invoiceError.message}`);
  }
}

async function getRevenue(rpc: 'get_total_revenue' | 'get_monthly_revenue') {
  const supabase = createE2ESupabaseClient();
  const thisMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );
  const request =
    rpc === 'get_monthly_revenue'
      ? supabase.rpc(rpc, { month_start: thisMonth.toISOString() })
      : supabase.rpc(rpc);

  const { data, error } = await request;

  if (error) {
    throw new Error(`Failed to load ${rpc}: ${error.message}`);
  }

  return Number(data) || 0;
}

function getDashboardExpectationAfterUserDelete(): DashboardStats {
  if (!dashboardBaseline) {
    throw new Error('Dashboard baseline was not captured before seeding.');
  }

  return {
    totalUsers: dashboardBaseline.totalUsers + 3,
    newUsers: dashboardBaseline.newUsers + 3,
    totalProducts: dashboardBaseline.totalProducts + 1,
    activeProducts: dashboardBaseline.activeProducts + 1,
    totalTransactions: dashboardBaseline.totalTransactions + 3,
    completedTransactions: dashboardBaseline.completedTransactions + 1,
    pendingTransactions: dashboardBaseline.pendingTransactions + 1,
    failedTransactions: dashboardBaseline.failedTransactions + 1,
    totalRevenue: dashboardBaseline.totalRevenue + 128,
    monthlyRevenue: dashboardBaseline.monthlyRevenue + 128,
  };
}

async function ensureDeleteTargetAbsent() {
  const supabase = createE2ESupabaseClient();

  await expectNoSupabaseError(
    'delete NIM155 dashboard user-count target',
    supabase.from('users').delete().eq('id', users.deleteTarget.id)
  );
}

async function getDashboardExpectations(): Promise<DashboardStats> {
  const supabase = createE2ESupabaseClient();
  const thisMonth = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  );

  const [
    totalUsersResult,
    newUsersResult,
    totalProductsResult,
    activeProductsResult,
    totalTransactionsResult,
    completedTransactionsResult,
    pendingTransactionsResult,
    failedTransactionsResult,
    totalRevenue,
    monthlyRevenue,
  ] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('createdAt', thisMonth.toISOString()),
    supabase.from('products').select('id', { count: 'exact', head: true }),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('isActive', true),
    supabase.from('transactions').select('id', { count: 'exact', head: true }),
    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'COMPLETED'),
    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'PENDING'),
    supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'FAILED'),
    getRevenue('get_total_revenue'),
    getRevenue('get_monthly_revenue'),
  ]);

  const countOrThrow = (
    label: string,
    result: { count: number | null; error: { message: string } | null }
  ) => {
    if (result.error) {
      throw new Error(`Failed to count ${label}: ${result.error.message}`);
    }

    return result.count || 0;
  };

  const expectations = {
    totalUsers: countOrThrow('users', totalUsersResult),
    newUsers: countOrThrow('new users', newUsersResult),
    totalProducts: countOrThrow('products', totalProductsResult),
    activeProducts: countOrThrow('active products', activeProductsResult),
    totalTransactions: countOrThrow('transactions', totalTransactionsResult),
    completedTransactions: countOrThrow(
      'completed transactions',
      completedTransactionsResult
    ),
    pendingTransactions: countOrThrow(
      'pending transactions',
      pendingTransactionsResult
    ),
    failedTransactions: countOrThrow(
      'failed transactions',
      failedTransactionsResult
    ),
    totalRevenue,
    monthlyRevenue,
  };

  return expectations;
}

async function expectStatCard(
  page: Page,
  title: string,
  value: string,
  subtitle?: string
) {
  const card = page
    .locator('.rounded-lg')
    .filter({ hasText: title })
    .filter({ hasText: value })
    .first();

  await expect(card).toBeVisible();
  if (subtitle) {
    await expect(card).toContainText(subtitle);
  }
}

function waitForAdminApiResponse(
  page: Page,
  path: '/api/admin/users' | '/api/admin/transactions',
  matches: (url: URL) => boolean
) {
  return page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === path && response.ok() && matches(url);
  });
}

async function selectRoleFilter(page: Page, role: 'USER' | 'ADMIN') {
  const responsePromise = waitForAdminApiResponse(
    page,
    '/api/admin/users',
    (url) => url.searchParams.get('role') === role
  );
  await page.locator('select').selectOption(role);
  await responsePromise;
}

async function selectStatusFilter(
  page: Page,
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
) {
  const responsePromise = waitForAdminApiResponse(
    page,
    '/api/admin/transactions',
    (url) => url.searchParams.get('status') === status
  );
  await page.locator('select').selectOption(status);
  await responsePromise;
}

async function searchUsers(page: Page, search: string) {
  const responsePromise = waitForAdminApiResponse(
    page,
    '/api/admin/users',
    (url) => url.searchParams.get('search') === search
  );
  await page.getByPlaceholder('Search by name or email...').fill(search);
  await page.getByRole('button', { name: 'Search' }).click();
  await responsePromise;
}

async function searchTransactions(page: Page, search: string) {
  const responsePromise = waitForAdminApiResponse(
    page,
    '/api/admin/transactions',
    (url) => url.searchParams.get('search') === search
  );
  await page
    .getByPlaceholder('Search transaction code, customer name, or email...')
    .fill(search);
  await page.getByRole('button', { name: 'Search' }).click();
  await responsePromise;
}

test.describe
  .serial('admin users, transactions, and dashboard coverage', () => {
  test.beforeAll(seedNim155Data);
  test.afterAll(cleanupNim155Data);

  test('manages users with search, role filters, and role/delete guardrails', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();

    await searchUsers(page, users.customer.email);
    const customerRow = page.locator('tr', { hasText: users.customer.name });
    await expect(customerRow).toBeVisible();
    await expect(customerRow).toContainText(users.customer.email);
    await expect(customerRow).toContainText('1 Transaction');
    await expect(
      page.locator('tr', { hasText: users.secondAdmin.name })
    ).toHaveCount(0);

    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    await selectRoleFilter(page, 'ADMIN');
    const adminRow = page.locator('tr', { hasText: users.admin.name });
    await expect(adminRow).toBeVisible();
    await expect(
      page.locator('tr', { hasText: users.customer.name })
    ).toHaveCount(0);
    await expect(
      adminRow.getByRole('button', { name: 'Delete' })
    ).toBeDisabled();

    page.once('dialog', (dialog) => dialog.accept());
    await adminRow.getByRole('button', { name: 'Demote' }).click();
    await expect(page.getByText('Unable to update user role')).toBeVisible();

    const supabase = createE2ESupabaseClient();
    const { data: persistedAdmin, error: adminError } = await supabase
      .from('users')
      .select('role')
      .eq('id', users.admin.id)
      .single();

    expect(adminError).toBeNull();
    expect(persistedAdmin?.role).toBe('ADMIN');

    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible();
    await selectRoleFilter(page, 'USER');
    await expect(
      page.locator('tr', { hasText: users.customer.name })
    ).toBeVisible();
    await expect(
      page.locator('tr', { hasText: users.secondAdmin.name })
    ).toHaveCount(0);

    await searchUsers(page, users.deleteTarget.email);
    const deleteTargetRow = page.locator('tr', {
      hasText: users.deleteTarget.name,
    });
    await expect(deleteTargetRow).toBeVisible();
    await expect(
      deleteTargetRow.getByRole('button', { name: 'Delete' })
    ).toBeEnabled();

    page.once('dialog', (dialog) => dialog.accept());
    await deleteTargetRow.getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('User deleted.')).toBeVisible();
    await expect(deleteTargetRow).toHaveCount(0);

    const { data: deletedUser, error: deletedUserError } = await supabase
      .from('users')
      .select('id')
      .eq('id', users.deleteTarget.id)
      .maybeSingle();

    expect(deletedUserError).toBeNull();
    expect(deletedUser).toBeNull();
  });

  test('filters transactions and opens detail records for registered and guest orders', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/transactions');
    await expect(
      page.getByRole('heading', { name: 'Transactions' })
    ).toBeVisible();

    await selectStatusFilter(page, 'COMPLETED');
    const registeredRow = page.locator('tr', {
      hasText: transactionCodes.registered,
    });
    await expect(registeredRow).toBeVisible();
    await expect(registeredRow).toContainText('Stripe');
    await expect(registeredRow).toContainText('Completed');
    await expect(registeredRow).toContainText(users.customer.name);
    await expect(registeredRow).toContainText('pi_nim155_registered');
    await expect(
      page.locator('tr', { hasText: transactionCodes.guest })
    ).toHaveCount(0);

    await searchTransactions(page, transactionCodes.registered);
    await registeredRow.click();
    const registeredDialog = page.getByRole('dialog');
    await expect(
      registeredDialog.getByRole('heading', { name: 'Transaction details' })
    ).toBeVisible();
    await expect(registeredDialog).toContainText('Provider:');
    await expect(registeredDialog).toContainText('Stripe');
    await expect(registeredDialog).toContainText('Provider reference:');
    await expect(registeredDialog).toContainText('nim155-provider-ref');
    await expect(registeredDialog).toContainText('Stripe Intent:');
    await expect(registeredDialog).toContainText('pi_nim155_registered');
    await expect(registeredDialog).toContainText(users.customer.uid);
    await expect(registeredDialog).toContainText('NIM155 Admin Shirt');
    await expect(registeredDialog).toContainText(
      'Blue Large - Color: Blue - Size: Large - Material: Cotton'
    );
    await expect(registeredDialog).toContainText('INV-E2E-NIM155-001');
    await page.getByRole('button', { name: 'Close dialog' }).click();

    await page.goto('/admin/transactions');
    await expect(
      page.getByRole('heading', { name: 'Transactions' })
    ).toBeVisible();
    await selectStatusFilter(page, 'PENDING');
    await searchTransactions(page, 'NIM155 Guest Buyer');
    const guestRow = page.locator('tr', { hasText: transactionCodes.guest });
    await expect(guestRow).toBeVisible();
    await expect(guestRow).toContainText('PayPal');
    await expect(guestRow).toContainText('Pending');
    await expect(guestRow).toContainText('Guest');
    await expect(guestRow).toContainText('PAYPAL-NIM155-ORDER');
    await expect(
      page.locator('tr', { hasText: transactionCodes.failed })
    ).toHaveCount(0);

    await guestRow.click();
    const guestDialog = page.getByRole('dialog');
    await expect(
      guestDialog.getByRole('heading', { name: 'Transaction details' })
    ).toBeVisible();
    await expect(guestDialog).toContainText('Provider:');
    await expect(guestDialog).toContainText('PayPal');
    await expect(guestDialog).toContainText('PayPal Order:');
    await expect(guestDialog).toContainText('PAYPAL-NIM155-ORDER');
    await expect(guestDialog).toContainText('NIM155 Guest Buyer');
    await expect(guestDialog).toContainText('Guest');
    await expect(guestDialog).toContainText(
      'Customer requested account creation.'
    );
    await expect(guestDialog).toContainText('155 Guest Avenue');
    await expect(guestDialog).toContainText('NIM155 Admin Shirt');
  });

  test('shows dashboard stats and recent transactions from seeded database state', async ({
    page,
  }) => {
    await ensureDeleteTargetAbsent();
    const expectedStats = getDashboardExpectationAfterUserDelete();

    await loginAsAdmin(page);
    await page.goto('/admin');
    await expect(
      page.getByRole('heading', { name: 'Dashboard' })
    ).toBeVisible();

    await expectStatCard(
      page,
      'Total users',
      formatNumber(expectedStats.totalUsers),
      `${formatNumber(expectedStats.newUsers)} new this month`
    );
    await expectStatCard(
      page,
      'Products',
      formatNumber(expectedStats.totalProducts),
      `${formatNumber(expectedStats.activeProducts)} Product Active`
    );
    await expectStatCard(
      page,
      'Total transactions',
      formatNumber(expectedStats.totalTransactions),
      `${formatNumber(expectedStats.completedTransactions)} completed, ${formatNumber(
        expectedStats.failedTransactions
      )} failed`
    );
    await expectStatCard(
      page,
      'Revenue',
      formatPrice(expectedStats.totalRevenue),
      `${formatPrice(expectedStats.monthlyRevenue)} this month`
    );
    await expectStatCard(
      page,
      'Pending transactions',
      formatNumber(expectedStats.pendingTransactions)
    );
    await expectStatCard(
      page,
      'Completed transactions',
      formatNumber(expectedStats.completedTransactions)
    );
    await expectStatCard(
      page,
      'Failed transactions',
      formatNumber(expectedStats.failedTransactions)
    );

    const recentRow = page.locator('tr', {
      hasText: transactionCodes.registered,
    });
    await expect(
      page.getByRole('heading', { name: 'Recent transactions' })
    ).toBeVisible();
    await expect(recentRow).toBeVisible();
    await expect(recentRow).toContainText('Completed');
    await expect(recentRow).toContainText(formatPrice(128));
    await expect(recentRow).toContainText(users.customer.name);
  });
});
