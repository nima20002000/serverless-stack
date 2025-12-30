import { test, expect } from '@playwright/test';
import { createTestUser } from '../fixtures/users';
import { createE2ESupabaseClient, createTestUserInDB } from '../utils/database';
import { cleanupE2ETestData } from '../fixtures/cleanup';
import { randomUUID } from 'crypto';

/**
 * Promo Code E2E Tests
 *
 * Tests for the promo code system:
 * - Active promo codes visible on profile
 * - Expired promo codes handling
 * - Used promo codes display
 *
 * Note: The actual promo code system is user-specific welcome codes
 * generated on registration, not checkout discount codes.
 */

// Ensure tests run sequentially
test.describe.configure({ mode: 'serial' });

test.describe('Promo Code Journey', () => {
  // Fixed test user data
  const testUserData = {
    id: 'e2e-user-promo-test',
    uid: 'e2e-uid-promo-test',
    email: 'e2e-promo-user@example.com',
    phone: '09183333333',
    name: 'کاربر کد تخفیف',
    password: 'Test1234!@#$',
  };

  let testUser: ReturnType<typeof createTestUser>;
  let testPromoCode: string;

  test.beforeAll(async () => {
    const supabase = createE2ESupabaseClient();

    // Clean up any previous test data first
    await supabase.from('promo_codes').delete().eq('userId', testUserData.id);
    await supabase.from('users').delete().eq('id', testUserData.id);

    // Create test user fixture with fixed data
    testUser = {
      ...createTestUser(),
      ...testUserData,
      isVerified: true,
      role: 'USER' as const,
    };

    // Insert user into database
    await createTestUserInDB({
      id: testUser.id,
      uid: testUser.uid,
      email: testUser.email,
      phone: testUser.phone,
      name: testUser.name,
      password: testUser.password,
      isVerified: true,
      role: 'USER',
    });
    console.log(`Created promo test user: ${testUser.email}`);

    // Generate promo code for user
    testPromoCode = `E2E-TEST-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    // Insert promo code into database
    await supabase.from('promo_codes').insert({
      id: `e2e-promo-${randomUUID()}`,
      code: testPromoCode,
      userId: testUser.id,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
      isUsed: false,
    });
    console.log(`Created promo code: ${testPromoCode}`);
  });

  test.afterAll(async () => {
    // Clean up only our test data
    const supabase = createE2ESupabaseClient();
    await supabase.from('promo_codes').delete().eq('userId', testUserData.id);
    await supabase.from('users').delete().eq('id', testUserData.id);
  });

  test('should display active promo code on profile page', async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="identifier"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill(testUser.password);

    await page.locator('button[type="submit"]').click();

    // Wait for successful login (to home page)
    await page.waitForURL('/', { timeout: 20000 });

    // Navigate to profile
    await page.goto('/profile');

    // Wait for promo code to load
    await page.waitForLoadState('networkidle');

    // Look for promo code on profile page
    const promoCodeElement = page.getByText(testPromoCode);
    await expect(promoCodeElement).toBeVisible({ timeout: 10000 });

    // Verify promo code section heading
    const promoHeading = page.getByText(/کد تخفیف ویژه/i);
    await expect(promoHeading).toBeVisible();

    console.log(`Promo code ${testPromoCode} visible on profile page`);
  });

  test('should show countdown timer for active promo code', async ({
    page,
  }) => {
    // Login as test user
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="identifier"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill(testUser.password);

    await page.locator('button[type="submit"]').click();

    // Wait for successful login (to home page)
    await page.waitForURL('/', { timeout: 20000 });

    // Navigate to profile
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Look for countdown timer text
    const timerText = page.getByText(/زمان باقی‌مانده/i);
    await expect(timerText).toBeVisible({ timeout: 10000 });

    console.log('Promo code countdown timer visible');
  });

  test('should mark promo code as used in database', async () => {
    const supabase = createE2ESupabaseClient();

    // Mark promo code as used
    const { data, error } = await supabase
      .from('promo_codes')
      .update({ isUsed: true })
      .eq('code', testPromoCode)
      .select()
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data!.isUsed).toBe(true);

    console.log(`Promo code ${testPromoCode} marked as used in database`);
  });

  test('should show used promo code message on profile', async ({ page }) => {
    // Login as test user
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="identifier"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill(testUser.password);

    await page.locator('button[type="submit"]').click();

    // Wait for successful login (to home page)
    await page.waitForURL('/', { timeout: 20000 });

    // Navigate to profile
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Look for "used" message
    const usedMessage = page.getByText(/استفاده کرده‌اید/i);
    await expect(usedMessage).toBeVisible({ timeout: 10000 });

    console.log('Used promo code message visible on profile');
  });
});

test.describe('Promo Code Database Validation', () => {
  // Fixed test user data for database tests
  const dbTestUserData = {
    id: 'e2e-user-promo-db-test',
    uid: 'e2e-uid-promo-db-test',
    email: 'e2e-promo-db@example.com',
    phone: '09184444444',
    name: 'کاربر تست دیتابیس',
    password: 'Test1234!@#$',
  };

  let testUserId: string;

  test.beforeAll(async () => {
    const supabase = createE2ESupabaseClient();

    // Clean up any previous test data
    await supabase.from('promo_codes').delete().eq('userId', dbTestUserData.id);
    await supabase.from('users').delete().eq('id', dbTestUserData.id);

    testUserId = dbTestUserData.id;

    await createTestUserInDB({
      id: dbTestUserData.id,
      uid: dbTestUserData.uid,
      email: dbTestUserData.email,
      phone: dbTestUserData.phone,
      name: dbTestUserData.name,
      password: dbTestUserData.password,
      isVerified: true,
    });
    console.log(`Created promo DB test user: ${dbTestUserData.email}`);
  });

  test.afterAll(async () => {
    // Clean up only our test data
    const supabase = createE2ESupabaseClient();
    await supabase.from('promo_codes').delete().eq('userId', dbTestUserData.id);
    await supabase.from('users').delete().eq('id', dbTestUserData.id);
  });

  test('should validate promo code uniqueness', async () => {
    const supabase = createE2ESupabaseClient();
    const uniqueCode = `UNIQUE-${Date.now()}`;

    // First insert should succeed
    const { error: firstError } = await supabase.from('promo_codes').insert({
      id: `e2e-promo-${randomUUID()}`,
      code: uniqueCode,
      userId: testUserId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isUsed: false,
    });

    expect(firstError).toBeNull();

    // Second insert with same code should fail (unique constraint)
    const { error: secondError } = await supabase.from('promo_codes').insert({
      id: `e2e-promo-${randomUUID()}`,
      code: uniqueCode,
      userId: testUserId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isUsed: false,
    });

    // Should get a unique constraint error
    expect(secondError).toBeTruthy();
    console.log(
      'Promo code uniqueness constraint validated:',
      secondError?.message
    );
  });

  test('should validate promo code expiration logic', async () => {
    const supabase = createE2ESupabaseClient();
    const expiredCode = `EXPIRED-${Date.now()}`;

    // Insert expired promo code
    await supabase.from('promo_codes').insert({
      id: `e2e-promo-${randomUUID()}`,
      code: expiredCode,
      userId: testUserId,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 24 hours ago
      isUsed: false,
    });

    // Query for non-expired promo codes
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', expiredCode)
      .gte('expiresAt', now);

    // Expired code should not be returned
    expect(data).toEqual([]);
    console.log('Expired promo code correctly filtered out');
  });

  test('should validate promo code isUsed flag', async () => {
    const supabase = createE2ESupabaseClient();
    const usedCode = `USED-${Date.now()}`;

    // Insert promo code marked as used
    await supabase.from('promo_codes').insert({
      id: `e2e-promo-${randomUUID()}`,
      code: usedCode,
      userId: testUserId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isUsed: true,
    });

    // Query for unused promo codes
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', usedCode)
      .eq('isUsed', false);

    // Used code should not be returned when filtering for unused
    expect(data).toEqual([]);
    console.log('Used promo code correctly filtered out');
  });

  test('should correctly link promo code to user', async () => {
    const supabase = createE2ESupabaseClient();
    const userCode = `USER-${Date.now()}`;

    // Insert promo code linked to test user
    await supabase.from('promo_codes').insert({
      id: `e2e-promo-${randomUUID()}`,
      code: userCode,
      userId: testUserId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      isUsed: false,
    });

    // Query promo codes for this user
    const { data } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('userId', testUserId)
      .eq('code', userCode)
      .single();

    expect(data).toBeTruthy();
    expect(data!.userId).toBe(testUserId);
    console.log(`Promo code correctly linked to user ${testUserId}`);
  });
});
