import { test, expect } from '@playwright/test';
import { createTestUser } from '../fixtures/users';
import { createTestProduct } from '../fixtures/products';
import { createE2ESupabaseClient, createTestUserInDB } from '../utils/database';
import { cleanupE2ETestData } from '../fixtures/cleanup';

/**
 * Admin Panel Journey E2E Tests
 *
 * Tests for:
 * - Role-based access control (ADMIN vs USER)
 * - Admin panel access verification
 * - Product management by admins
 * - Transaction viewing capabilities
 */

// Ensure tests run sequentially to maintain login session across tests
test.describe.configure({ mode: 'serial' });

test.describe('Admin Panel Journey', () => {
  // Fixed test user data - uses deterministic ID for reliable cleanup
  const adminUserData = {
    id: 'e2e-user-admin-panel-test',
    uid: 'e2e-uid-admin-panel-test',
    email: 'e2e-admin-panel@example.com',
    phone: '09181111111',
    name: 'ادمین تست',
    password: 'Test1234!@#$',
  };

  const regularUserData = {
    id: 'e2e-user-regular-panel-test',
    uid: 'e2e-uid-regular-panel-test',
    email: 'e2e-regular-panel@example.com',
    phone: '09182222222',
    name: 'کاربر عادی',
    password: 'Test1234!@#$',
  };

  let adminUser: ReturnType<typeof createTestUser>;
  let regularUser: ReturnType<typeof createTestUser>;

  test.beforeAll(async () => {
    // Create admin user fixture with fixed data
    adminUser = {
      ...createTestUser(),
      ...adminUserData,
      isVerified: true,
      role: 'ADMIN' as const,
    };

    // Create regular user fixture with fixed data
    regularUser = {
      ...createTestUser(),
      ...regularUserData,
      isVerified: true,
      role: 'USER' as const,
    };

    // Clean up any previous test users first
    const supabase = createE2ESupabaseClient();
    await supabase.from('users').delete().eq('id', adminUserData.id);
    await supabase.from('users').delete().eq('id', regularUserData.id);

    // Insert admin user into database
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
    console.log(`Created admin user: ${adminUser.email}`);

    // Insert regular user into database
    await createTestUserInDB({
      id: regularUser.id,
      uid: regularUser.uid,
      email: regularUser.email,
      phone: regularUser.phone,
      name: regularUser.name,
      password: regularUser.password,
      isVerified: true,
      role: 'USER',
    });
    console.log(`Created regular user: ${regularUser.email}`);
  });

  test.afterAll(async () => {
    // Clean up only the users we created
    const supabase = createE2ESupabaseClient();
    await supabase.from('users').delete().eq('id', adminUserData.id);
    await supabase.from('users').delete().eq('id', regularUserData.id);
  });

  test('should allow admin to access admin panel', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Fill login form with email
    await page.locator('input[name="identifier"]').fill(adminUser.email);
    await page.locator('input[name="password"]').fill(adminUser.password);

    // Submit login
    await page.locator('button[type="submit"]').click();

    // Wait for successful login redirect (to home page)
    await page.waitForURL('/', { timeout: 20000 });

    // Verify we're logged in by accessing profile
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL('/profile');

    // Navigate to admin panel
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Should NOT redirect away from admin (admin user has ADMIN role)
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });

    // Verify admin panel loaded - look for dashboard heading
    const dashboardHeading = page.getByRole('heading', {
      name: /داشبورد مدیریت/i,
    });
    await expect(dashboardHeading).toBeVisible({ timeout: 10000 });

    // Verify admin sidebar navigation items are present
    // Look for the admin sidebar specifically
    const adminSidebar = page.getByRole('complementary');
    const productsLink = adminSidebar.getByRole('link', { name: /محصولات/i });
    await expect(productsLink).toBeVisible();

    console.log('Admin successfully accessed admin panel');
  });

  test('should prevent regular user from accessing admin panel', async ({
    page,
  }) => {
    // Login as regular user
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="identifier"]').fill(regularUser.email);
    await page.locator('input[name="password"]').fill(regularUser.password);

    await page.locator('button[type="submit"]').click();

    // Wait for successful login (to home page)
    await page.waitForURL('/', { timeout: 20000 });

    // Try to access admin panel
    await page.goto('/admin');

    // Wait for redirect or error
    await page.waitForTimeout(3000);

    // Should be redirected away from admin or show unauthorized
    const currentUrl = page.url();

    if (currentUrl.includes('/admin')) {
      // If still on admin URL, the layout should not render (redirects to home/login)
      // Wait for redirect
      await page.waitForURL(/^\/(login)?$/, { timeout: 5000 }).catch(() => {
        // If no redirect, verify admin panel is NOT visible
      });
    }

    // Re-check URL after potential redirect
    const finalUrl = page.url();

    // Verify user is NOT in admin panel (either redirected or showing nothing)
    // The admin layout returns null for non-admin users
    const dashboardHeading = page.getByRole('heading', {
      name: /داشبورد مدیریت/i,
    });
    await expect(dashboardHeading).not.toBeVisible({ timeout: 3000 });

    console.log(
      `Regular user correctly denied admin access. Final URL: ${finalUrl}`
    );
  });

  test('should redirect unauthenticated user from admin panel to login', async ({
    page,
  }) => {
    // Clear any session
    await page.context().clearCookies();

    // Try to access admin panel directly
    await page.goto('/admin');

    // Should redirect to login
    await page.waitForURL(/\/login/, { timeout: 10000 });

    // Verify on login page
    await expect(page).toHaveURL(/\/login/);

    const loginHeading = page.getByRole('heading', { name: /ورود/i });
    await expect(loginHeading).toBeVisible();

    console.log('Unauthenticated user correctly redirected to login');
  });

  test('should allow admin to navigate to products management', async ({
    page,
  }) => {
    // Login as admin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="identifier"]').fill(adminUser.email);
    await page.locator('input[name="password"]').fill(adminUser.password);

    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/', { timeout: 20000 });

    // Go to admin products
    await page.goto('/admin/products');
    await page.waitForLoadState('networkidle');

    // Should be on products page
    await expect(page).toHaveURL(/\/admin\/products/);

    // Verify products page content
    const productsHeading = page.getByRole('heading', { name: /محصولات/i });
    await expect(productsHeading).toBeVisible({ timeout: 10000 });

    console.log('Admin can access products management');
  });

  test('should allow admin to navigate to transactions', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="identifier"]').fill(adminUser.email);
    await page.locator('input[name="password"]').fill(adminUser.password);

    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/', { timeout: 20000 });

    // Go to admin transactions
    await page.goto('/admin/transactions');
    await page.waitForLoadState('networkidle');

    // Should be on transactions page
    await expect(page).toHaveURL(/\/admin\/transactions/);

    // Verify transactions page content
    const transactionsHeading = page.getByRole('heading', {
      name: /تراکنش/i,
    });
    await expect(transactionsHeading).toBeVisible({ timeout: 10000 });

    console.log('Admin can access transactions management');
  });

  test('should allow admin to navigate to users management', async ({
    page,
  }) => {
    // Login as admin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="identifier"]').fill(adminUser.email);
    await page.locator('input[name="password"]').fill(adminUser.password);

    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/', { timeout: 20000 });

    // Go to admin users
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Should be on users page
    await expect(page).toHaveURL(/\/admin\/users/);

    // Verify users page content
    const usersHeading = page.getByRole('heading', { name: /کاربران/i });
    await expect(usersHeading).toBeVisible({ timeout: 10000 });

    console.log('Admin can access users management');
  });

  test('should verify admin role in database after login', async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="identifier"]').fill(adminUser.email);
    await page.locator('input[name="password"]').fill(adminUser.password);

    await page.locator('button[type="submit"]').click();
    await page.waitForURL('/', { timeout: 20000 });

    // Verify admin role in database
    const supabase = createE2ESupabaseClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('role, isVerified, email')
      .eq('email', adminUser.email)
      .single();

    expect(error).toBeNull();
    expect(user).toBeTruthy();
    expect(user!.role).toBe('ADMIN');
    expect(user!.isVerified).toBe(true);

    console.log(`Database verification: User ${user!.email} has ADMIN role`);
  });

  test('should verify regular user role in database', async ({ page }) => {
    // Verify regular user role in database
    const supabase = createE2ESupabaseClient();
    const { data: user, error } = await supabase
      .from('users')
      .select('role, isVerified, email')
      .eq('email', regularUser.email)
      .single();

    expect(error).toBeNull();
    expect(user).toBeTruthy();
    expect(user!.role).toBe('USER');
    expect(user!.isVerified).toBe(true);

    console.log(`Database verification: User ${user!.email} has USER role`);
  });
});
