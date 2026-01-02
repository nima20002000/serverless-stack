import { test, expect } from '@playwright/test';
import { createTestUser } from '../fixtures/users';
import { createE2ESupabaseClient, createTestUserInDB } from '../utils/database';

/**
 * Admin Settings E2E Tests
 *
 * Tests for:
 * - Admin access to settings page
 * - Settings list load
 * - Updating and persisting settings
 */

test.describe.configure({ mode: 'serial' });

test.describe('Admin Settings Journey', () => {
  const adminUserData = {
    id: 'e2e-user-admin-settings-test',
    uid: 'e2e-uid-admin-settings-test',
    email: 'e2e-admin-settings@example.com',
    phone: '09185555555',
    name: 'ادمین تنظیمات',
    password: 'Test1234!@#$',
  };

  let adminUser: ReturnType<typeof createTestUser>;
  let originalSiteName: string | null = null;
  let hadSiteName = false;

  test.beforeAll(async () => {
    const supabase = createE2ESupabaseClient();

    await supabase.from('users').delete().eq('id', adminUserData.id);

    adminUser = {
      ...createTestUser(),
      ...adminUserData,
      isVerified: true,
      role: 'ADMIN' as const,
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

    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'site_name')
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch site_name setting: ${error.message}`);
    }

    if (data) {
      originalSiteName = data.value;
      hadSiteName = true;
    }
  });

  test.afterAll(async () => {
    const supabase = createE2ESupabaseClient();

    if (hadSiteName) {
      await supabase
        .from('site_settings')
        .update({ value: originalSiteName })
        .eq('key', 'site_name');
    } else {
      await supabase.from('site_settings').delete().eq('key', 'site_name');
    }

    await supabase.from('users').delete().eq('id', adminUserData.id);
  });

  const loginAsAdmin = async (page: import('@playwright/test').Page) => {
    // Use UI-based login like admin-panel.spec.ts
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill login form
    await page.locator('input[name="identifier"]').fill(adminUser.email);
    await page.locator('input[name="password"]').fill(adminUser.password);

    // Submit login
    await page.locator('button[type="submit"]').click();

    // Wait for successful login redirect (to home page)
    await page.waitForURL('/', { timeout: 20000 });

    // Verify we're logged in by checking session
    await page.waitForLoadState('networkidle');
  };

  test('should load and persist admin settings', async ({ page }) => {
    const supabase = createE2ESupabaseClient();
    const newSiteName = `E2E-Site-${Date.now()}`;

    await loginAsAdmin(page);

    // Navigate to admin settings
    await page.goto('/admin/settings');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/admin\/settings$/, { timeout: 10000 });

    const pageHeading = page.getByRole('heading', { name: /تنظیمات سایت/i });
    await expect(pageHeading).toBeVisible({ timeout: 30000 });

    const siteNameInput = page.getByPlaceholder('کیتیا');
    await expect(siteNameInput).toBeVisible();
    if (hadSiteName && originalSiteName) {
      await expect(siteNameInput).toHaveValue(originalSiteName);
    } else {
      await expect(siteNameInput).toHaveValue(/.+/);
    }

    await siteNameInput.fill(newSiteName);

    const saveButton = page.getByRole('button', {
      name: /ذخیره تنظیمات/i,
    });

    const saveResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/admin/settings') &&
        response.request().method() === 'POST'
    );

    await saveButton.click();

    const saveResponse = await saveResponsePromise;
    if (!saveResponse.ok()) {
      const payload = await saveResponse.json().catch(() => null);
      throw new Error(
        `Settings save failed: ${saveResponse.status()} ${JSON.stringify(payload)}`
      );
    }

    const successAlert = page.getByText(/تنظیمات با موفقیت ذخیره شد/i);
    await expect(successAlert).toBeVisible({ timeout: 10000 });

    await page.reload();
    await page.waitForLoadState('networkidle');

    const siteNameAfterReload = page.getByRole('textbox');
    await expect(siteNameAfterReload).toHaveValue(newSiteName);

    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'site_name')
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.value).toBe(newSiteName);
  });
});
