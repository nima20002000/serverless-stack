import { expect, test, type Page } from '@playwright/test';
import type { PostgrestError } from '@supabase/supabase-js';
import { createE2ESupabaseClient, createTestUserInDB } from '../utils/database';

const initialPassword = 'Test1234!@#$';
const updatedPassword = 'Updated1234!@#$';

const user = {
  id: 'e2e-user-nim156-profile',
  uid: 'zz-e2e-nim156-profile',
  email: 'e2e-nim156-profile@example.com',
  updatedEmail: 'e2e-nim156-profile-updated@example.com',
  phone: '+12025551601',
  updatedPhone: '+12025551602',
  name: 'NIM156 Profile User',
  updatedName: 'Profile Test User',
  password: initialPassword,
};

const productId = 'e2e-product-nim156-profile-order';
const variantId = 'e2e-variant-nim156-profile-order';
const mediaId = 'e2e-media-nim156-profile-order';
const transactionId = 'e2e-tx-nim156-profile-order';
const transactionCode = 'TX-E2E-NIM156-PROFILE';
const invoiceId = 'e2e-invoice-nim156-profile-order';
const invoiceNumber = 'INV-E2E-NIM156-001';

async function expectNoSupabaseError(
  label: string,
  request: PromiseLike<{ error: PostgrestError | null }>
) {
  const { error } = await request;

  if (error) {
    throw new Error(`${label}: ${error.message}`);
  }
}

async function countActivityLogs(
  userId: string,
  activityType: 'LOGIN_SUCCESS' | 'PROFILE_UPDATE' | 'PASSWORD_CHANGE'
) {
  const supabase = createE2ESupabaseClient();
  const { count, error } = await supabase
    .from('user_activity_logs')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('activity_type', activityType);

  if (error) {
    throw new Error(
      `Failed to count ${activityType} activity logs: ${error.message}`
    );
  }

  return count || 0;
}

async function login(page: Page, email = user.email, password = user.password) {
  const priorLoginActivityCount = await countActivityLogs(
    user.id,
    'LOGIN_SUCCESS'
  );

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await page.locator('input[name="identifier"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.locator('form').getByRole('button', { name: 'Sign in' }).click();
  await page.waitForURL(
    (url) => /^\/(?:[a-z]{2}\/?)?$/.test(new URL(url).pathname),
    { timeout: 10000 }
  );
  await expect
    .poll(() => countActivityLogs(user.id, 'LOGIN_SUCCESS'), {
      message: 'seeded user login activity should be persisted before cleanup',
      timeout: 10000,
    })
    .toBeGreaterThan(priorLoginActivityCount);
}

async function cleanupNim156Data() {
  const supabase = createE2ESupabaseClient();

  await expectNoSupabaseError(
    'cleanup NIM156 invoices',
    supabase.from('invoices').delete().eq('id', invoiceId)
  );
  await expectNoSupabaseError(
    'cleanup NIM156 transaction items',
    supabase
      .from('transaction_items')
      .delete()
      .eq('transactionId', transactionId)
  );
  await expectNoSupabaseError(
    'cleanup NIM156 transactions',
    supabase.from('transactions').delete().eq('id', transactionId)
  );
  await expectNoSupabaseError(
    'cleanup NIM156 product media',
    supabase.from('product_media').delete().eq('id', mediaId)
  );
  await expectNoSupabaseError(
    'cleanup NIM156 product variants',
    supabase.from('product_variants').delete().eq('id', variantId)
  );
  await expectNoSupabaseError(
    'cleanup NIM156 products',
    supabase.from('products').delete().eq('id', productId)
  );
  await expectNoSupabaseError(
    'cleanup NIM156 user activity logs',
    supabase.from('user_activity_logs').delete().eq('user_id', user.id)
  );
  await expectNoSupabaseError(
    'cleanup NIM156 users',
    supabase.from('users').delete().eq('id', user.id)
  );
}

async function seedNim156Data() {
  const supabase = createE2ESupabaseClient();
  const now = new Date().toISOString();

  await cleanupNim156Data();

  await createTestUserInDB({
    id: user.id,
    uid: user.uid,
    email: user.email,
    phone: user.phone,
    name: user.name,
    password: user.password,
    isVerified: true,
    role: 'USER',
    shippingAddress: '156 Initial Street',
    postalCode: '15600',
  });

  await expectNoSupabaseError(
    'seed NIM156 product',
    supabase.from('products').insert({
      id: productId,
      name: 'NIM156 Profile Jacket',
      description: 'Seeded profile transaction product.',
      price: 88,
      stock: 12,
      images: [],
      isActive: true,
      isFeatured: false,
      hasVariants: true,
      updatedAt: now,
    })
  );

  await expectNoSupabaseError(
    'seed NIM156 product media',
    supabase.from('product_media').insert({
      id: mediaId,
      productId,
      variantId: null,
      type: 'IMAGE',
      url: 'https://example.com/nim156-profile-jacket.jpg',
      alt: 'NIM156 profile jacket',
      isDefault: true,
      order: 0,
    })
  );

  await expectNoSupabaseError(
    'seed NIM156 product variant',
    supabase.from('product_variants').insert({
      id: variantId,
      productId,
      name: 'Charcoal Medium',
      size: 'Medium',
      color: 'Charcoal',
      material: 'Wool',
      sku: 'NIM156-CHARCOAL-M',
      stock: 8,
      priceAdjust: 0,
      isActive: true,
      order: 0,
      updatedAt: now,
    })
  );

  await expectNoSupabaseError(
    'seed NIM156 transaction',
    supabase.from('transactions').insert({
      id: transactionId,
      userId: user.id,
      amount: 176,
      subtotal: 176,
      discountAmount: 0,
      status: 'COMPLETED',
      transactionCode,
      phone: user.phone,
      fullName: user.name,
      email: user.email,
      shippingAddress: '156 Order Street',
      shippingCountry: 'United States',
      shippingRegion: 'CA',
      shippingCity: 'San Francisco',
      shippingAddressLine1: '156 Order Street',
      shippingAddressLine2: 'Suite 4',
      postalCode: '94105',
      paymentMethod: 'STRIPE',
      paymentProviderRef: 'nim156-provider-ref',
      stripePaymentIntentId: 'pi_nim156_profile',
      isGuest: false,
      createAccount: false,
      createdAt: now,
      updatedAt: now,
    })
  );

  await expectNoSupabaseError(
    'seed NIM156 transaction item',
    supabase.from('transaction_items').insert({
      id: 'e2e-item-nim156-profile-order',
      transactionId,
      productId,
      variantId,
      quantity: 2,
      price: 88,
    })
  );

  await expectNoSupabaseError(
    'seed NIM156 invoice',
    supabase.from('invoices').insert({
      id: invoiceId,
      transactionId,
      invoiceNumber,
      generatedAt: now,
    })
  );
}

async function getPersistedUser() {
  const supabase = createE2ESupabaseClient();
  const { data, error } = await supabase
    .from('users')
    .select(
      'name, email, phone, shippingAddress, shippingCountry, shippingRegion, shippingCity, shippingAddressLine1, shippingAddressLine2, postalCode, password'
    )
    .eq('id', user.id)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch NIM156 user: ${error?.message}`);
  }

  return data;
}

test.describe.serial('profile account management', () => {
  test.beforeAll(seedNim156Data);
  test.afterAll(cleanupNim156Data);

  test('persists profile edits, validates password changes, and shows transaction history', async ({
    page,
  }) => {
    await login(page);
    await page.goto('/profile');
    await expect(
      page.getByRole('heading', { name: 'Account profile' })
    ).toBeVisible();

    const transactionCard = page
      .locator('.rounded-lg')
      .filter({ hasText: transactionCode })
      .first();
    await expect(transactionCard).toBeVisible();
    await expect(transactionCard).toContainText('NIM156 Profile Jacket x 2');
    await expect(transactionCard).toContainText('Charcoal Medium');
    await expect(
      transactionCard.getByText('Stripe', { exact: true })
    ).toBeVisible();
    await expect(transactionCard).toContainText('Completed');
    await expect(transactionCard).toContainText('pi_nim156_profile');
    await expect(transactionCard).toContainText(invoiceNumber);

    await page.getByRole('button', { name: 'Edit' }).click();
    const profileActivityCount = await countActivityLogs(
      user.id,
      'PROFILE_UPDATE'
    );
    await page.getByLabel('Name').fill(user.updatedName);
    await page.getByLabel('Email').fill(user.updatedEmail);
    await page.getByLabel('Phone number').fill(user.updatedPhone);
    await page.getByLabel('Country').fill('United States');
    await page.getByLabel('City').fill('Seattle');
    await page.getByLabel('State, region, or province').fill('WA');
    await page.getByLabel('Address line 1').fill('156 Updated Avenue');
    await page.getByLabel('Address line 2').fill('Unit 9');
    await page.getByLabel('Postal or ZIP code').fill('98101');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Profile updated successfully.')).toBeVisible();
    await expect
      .poll(() => countActivityLogs(user.id, 'PROFILE_UPDATE'), {
        message: 'profile update activity should be persisted before cleanup',
        timeout: 10000,
      })
      .toBeGreaterThan(profileActivityCount);
    await expect(page.getByText(user.updatedName)).toBeVisible();
    await expect(page.getByText(user.updatedEmail)).toBeVisible();
    await expect(page.getByText(user.updatedPhone)).toBeVisible();
    await expect(page.getByText('156 Updated Avenue')).toBeVisible();
    await expect(page.getByText('Unit 9')).toBeVisible();
    await expect(page.getByText('Seattle, WA, 98101')).toBeVisible();

    await page.reload();
    await expect(
      page.getByRole('heading', { name: 'Account profile' })
    ).toBeVisible();
    await expect(page.getByText(user.updatedName)).toBeVisible();
    await expect(page.getByText(user.updatedEmail)).toBeVisible();
    await expect(page.getByText(user.updatedPhone)).toBeVisible();
    await expect(page.getByText('156 Updated Avenue')).toBeVisible();

    const persistedAfterProfile = await getPersistedUser();
    expect(persistedAfterProfile.name).toBe(user.updatedName);
    expect(persistedAfterProfile.email).toBe(user.updatedEmail);
    expect(persistedAfterProfile.phone).toBe(user.updatedPhone);
    expect(persistedAfterProfile.shippingCountry).toBe('United States');
    expect(persistedAfterProfile.shippingCity).toBe('Seattle');
    expect(persistedAfterProfile.shippingRegion).toBe('WA');
    expect(persistedAfterProfile.shippingAddressLine1).toBe(
      '156 Updated Avenue'
    );
    expect(persistedAfterProfile.shippingAddressLine2).toBe('Unit 9');
    expect(persistedAfterProfile.postalCode).toBe('98101');
    expect(persistedAfterProfile.shippingAddress).toContain(
      '156 Updated Avenue'
    );

    await page.getByRole('button', { name: 'Change password' }).click();
    const failedPasswordActivityCount = await countActivityLogs(
      user.id,
      'PASSWORD_CHANGE'
    );
    await page.getByLabel('Current password').fill('WrongPassword123!');
    await page
      .getByLabel('New password', { exact: true })
      .fill(updatedPassword);
    await page.getByLabel('Confirm new password').fill(updatedPassword);
    await page.getByRole('button', { name: 'Save password' }).click();
    await expect(
      page.getByText('Current password is incorrect.')
    ).toBeVisible();
    await expect
      .poll(() => countActivityLogs(user.id, 'PASSWORD_CHANGE'), {
        message:
          'failed password-change activity should be persisted before cleanup',
        timeout: 10000,
      })
      .toBeGreaterThan(failedPasswordActivityCount);

    const successfulPasswordActivityCount = await countActivityLogs(
      user.id,
      'PASSWORD_CHANGE'
    );
    await page.getByLabel('Current password').fill(initialPassword);
    await page
      .getByLabel('New password', { exact: true })
      .fill(updatedPassword);
    await page.getByLabel('Confirm new password').fill(updatedPassword);
    await page.getByRole('button', { name: 'Save password' }).click();
    await expect(
      page.getByRole('button', { name: 'Change password' })
    ).toBeVisible();
    await expect
      .poll(() => countActivityLogs(user.id, 'PASSWORD_CHANGE'), {
        message:
          'successful password-change activity should be persisted before cleanup',
        timeout: 10000,
      })
      .toBeGreaterThan(successfulPasswordActivityCount);

    const persistedAfterPassword = await getPersistedUser();
    const bcrypt = await import('bcryptjs');
    expect(
      await bcrypt.default.compare(
        updatedPassword,
        persistedAfterPassword.password || ''
      )
    ).toBe(true);

    await page.getByRole('button', { name: 'Sign out' }).last().click();
    await login(page, user.updatedEmail, updatedPassword);
    await page.goto('/profile');
    await expect(
      page.getByRole('heading', { name: 'Account profile' })
    ).toBeVisible();
    await expect(page.getByText(user.updatedName)).toBeVisible();
    await expect(page.getByText(transactionCode)).toBeVisible();
  });
});
