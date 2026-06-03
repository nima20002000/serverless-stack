import { test, expect } from '@playwright/test';
import { createTestUser } from '../fixtures/users';
import { createE2ESupabaseClient, createTestUserInDB } from '../utils/database';

/**
 * Admin Promo Codes E2E Tests
 *
 * Covers:
 * - Admin login
 * - Promo code list loading
 * - Create + update promo code
 * - Verify changes via DB + UI reload
 * - Promo code visibility on admin user detail page
 */

test.describe.configure({ mode: 'serial' });

test.describe('Admin Promo Codes', () => {
  const promoCodePrefix = 'E2E-ADMIN-PROMO';
  const promoCode = `${promoCodePrefix}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;

  const adminUserData = {
    id: 'e2e-user-admin-promo-codes',
    uid: 'e2e-uid-admin-promo-codes',
    email: 'e2e-admin-promo@example.com',
    phone: '+12025555555',
    name: 'Promo code',
    password: 'Test1234!@#$',
  };

  const profileUserData = {
    id: 'e2e-user-promo-profile',
    uid: 'e2e-uid-promo-profile',
    email: 'e2e-promo-profile@example.com',
    phone: '+12025556666',
    name: 'User Promo code',
    password: 'Test1234!@#$',
  };

  let adminUser: ReturnType<typeof createTestUser>;
  let profileUser: ReturnType<typeof createTestUser>;
  let promoId: string | null = null;

  const formatDateTimeLocal = (date: Date) => {
    const localDate = new Date(
      date.getTime() - date.getTimezoneOffset() * 60000
    );
    return localDate.toISOString().slice(0, 16);
  };

  const loginAsAdmin = async (page: import('@playwright/test').Page) => {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');

    await page.locator('input[name="identifier"]').fill(adminUser.email);
    await page.locator('input[name="password"]').fill(adminUser.password);

    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/', { timeout: 20000 });
  };

  test.beforeAll(async () => {
    const supabase = createE2ESupabaseClient();

    await supabase
      .from('promo_codes')
      .delete()
      .like('code', `${promoCodePrefix}%`);
    await supabase.from('users').delete().eq('id', adminUserData.id);
    await supabase.from('users').delete().eq('id', profileUserData.id);

    adminUser = {
      ...createTestUser(),
      ...adminUserData,
      isVerified: true,
      role: 'ADMIN' as const,
    };

    profileUser = {
      ...createTestUser(),
      ...profileUserData,
      isVerified: true,
      role: 'USER' as const,
    };

    await createTestUserInDB({
      id: adminUser.id,
      uid: adminUser.uid,
      email: adminUser.email,
      phone: adminUser.phone,
      name: adminUser.name,
      password: adminUser.password,
      isVerified: true,
      role: 'ADMIN',
    });

    await createTestUserInDB({
      id: profileUser.id,
      uid: profileUser.uid,
      email: profileUser.email,
      phone: profileUser.phone,
      name: profileUser.name,
      password: profileUser.password,
      isVerified: true,
      role: 'USER',
    });
  });

  test.afterAll(async () => {
    const supabase = createE2ESupabaseClient();
    await supabase
      .from('promo_codes')
      .delete()
      .like('code', `${promoCodePrefix}%`);
    await supabase.from('users').delete().eq('id', adminUserData.id);
    await supabase.from('users').delete().eq('id', profileUserData.id);
  });

  test('should load promo list and create a promo code', async ({ page }) => {
    await loginAsAdmin(page);

    const listResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/admin/promo-codes') &&
        response.request().method() === 'GET'
    );

    await page.goto('/admin/promo-codes');
    const listResponse = await listResponsePromise;
    if (!listResponse.ok()) {
      const payload = await listResponse.json().catch(() => null);
      throw new Error(
        `Promo list failed: ${listResponse.status()} ${JSON.stringify(payload)}`
      );
    }

    await expect(page.getByRole('table')).toBeVisible();

    await page.getByRole('button', { name: 'Add Promo code new' }).click();

    await page.getByPlaceholder('SUMMER2024').fill(promoCode);
    await page
      .locator('label:has-text("Discount type")')
      .locator('..')
      .locator('select')
      .selectOption('PERCENT');
    await page.getByPlaceholder('10').fill('15');

    const expiresAt = formatDateTimeLocal(
      new Date(Date.now() + 24 * 60 * 60 * 1000)
    );
    await page.locator('input[type="datetime-local"]').fill(expiresAt);

    await page.getByPlaceholder('Namedetails').fill('2');
    await page.getByPlaceholder(/No limit/i).fill('100000');
    await page.getByPlaceholder(/No limit/i).fill('50000');
    await page
      .getByPlaceholder(/Promo code description/i)
      .fill('Create details Test E2E');

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/admin/promo-codes') &&
        response.request().method() === 'POST'
    );

    await page.getByRole('button', { name: 'Create Promo code' }).click();
    const createResponse = await createResponsePromise;
    if (!createResponse.ok()) {
      const payload = await createResponse.json().catch(() => null);
      throw new Error(
        `Promo create failed: ${createResponse.status()} ${JSON.stringify(payload)}`
      );
    }

    const supabase = createE2ESupabaseClient();
    const { data: createdPromo, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode)
      .single();

    expect(error).toBeNull();
    expect(createdPromo).toBeTruthy();
    promoId = createdPromo!.id;

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const promoRow = page.locator('tr', {
      has: page.getByText(promoCode),
    });
    await expect(promoRow).toBeVisible();
  });

  test('should update promo code and show it on user detail page', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/promo-codes');
    await page.waitForLoadState('domcontentloaded');

    const promoRow = page.locator('tr', {
      has: page.getByText(promoCode),
    });
    await expect(promoRow).toBeVisible();

    await promoRow.getByRole('button', { name: 'Edit' }).click();

    const discountValueInput = page.locator('input[type="number"]').first();
    await discountValueInput.fill('25');

    const updatedDescription = 'to day details Test E2E';
    await page
      .getByPlaceholder(/Promo code description/i)
      .fill(updatedDescription);

    const updateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/admin/promo-codes/') &&
        response.request().method() === 'PUT'
    );

    await page.getByRole('button', { name: 'Save changes' }).click();
    const updateResponse = await updateResponsePromise;
    if (!updateResponse.ok()) {
      const payload = await updateResponse.json().catch(() => null);
      throw new Error(
        `Promo update failed: ${updateResponse.status()} ${JSON.stringify(payload)}`
      );
    }

    const supabase = createE2ESupabaseClient();
    const { data: updatedPromo, error: updatedError } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode)
      .single();

    expect(updatedError).toBeNull();
    expect(updatedPromo).toBeTruthy();
    expect(updatedPromo!.discountValue).toBe(25);
    expect(updatedPromo!.description).toBe(updatedDescription);

    promoId = promoId || updatedPromo!.id;
    await supabase
      .from('promo_codes')
      .update({ userId: profileUser.id })
      .eq('id', promoId);

    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const updatedRow = page.locator('tr', {
      has: page.getByText(promoCode),
    });
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow).toContainText('25');

    await page.goto(`/admin/users/${profileUser.id}`);
    await page.waitForLoadState('domcontentloaded');

    const promoCodeInProfile = page.getByText(promoCode);
    await expect(promoCodeInProfile).toBeVisible();
  });
});
