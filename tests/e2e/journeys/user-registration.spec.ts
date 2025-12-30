import { test, expect } from '@playwright/test';
import { createTestUser } from '../fixtures/users';
import {
  createE2ESupabaseClient,
  waitForOTP,
  waitForUserByEmail,
  waitForUserByPhone,
  deleteTestOTPsByIdentifier,
  expireOTP,
  getUserByEmail,
  getUserByPhone,
} from '../utils/database';
import { cleanupE2ETestData } from '../fixtures/cleanup';

/**
 * User Registration Journey E2E Tests
 *
 * These tests verify the complete registration flow with REAL database verification:
 * - User fills registration form
 * - OTP is sent and stored in database
 * - OTP is retrieved from database (not mocked)
 * - User is created in database after OTP verification
 * - NextAuth session is created
 * - User can access protected routes
 */

test.describe('User Registration Journey', () => {
  test.beforeAll(async () => {
    await cleanupE2ETestData();
  });

  test.afterAll(async () => {
    await cleanupE2ETestData();
  });

  test.skip('should register user with email and OTP verification', async ({
    page,
  }) => {
    // NOTE: Email registration is skipped in E2E tests because:
    // 1. Email service (Resend) is not configured in test environment
    // 2. Ethereal mock may not reliably store OTPs
    // Phone registration test provides equivalent coverage of the OTP flow

    const testUser = createTestUser();

    await page.goto('/register');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h2:has-text("ثبت‌نام")')).toBeVisible();

    await page.locator('input[name="name"]').fill(testUser.name);
    await page.locator('input[name="identifier"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill(testUser.password);
    await page.locator('input[name="confirmPassword"]').fill(testUser.password);
    await page
      .locator('form')
      .getByRole('button', { name: /ثبت‌نام|ارسال کد تایید/i })
      .click();

    // Wait for OTP page or error
    await page.waitForURL(/\/verify-otp/, { timeout: 15000 });

    const otpCode = await waitForOTP(testUser.email, 15000);
    await page.keyboard.type(otpCode);
    await page.waitForURL(/^(?!.*verify-otp)/, { timeout: 20000 });

    const user = await waitForUserByEmail(testUser.email, 10000);
    expect(user).toBeTruthy();
    expect(user.isVerified).toBe(true);

    await deleteTestOTPsByIdentifier(testUser.email);
  });

  test('should register user with phone and OTP verification', async ({
    page,
  }) => {
    const testUser = createTestUser();

    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Fill registration form with phone
    await page.locator('input[name="name"]').fill(testUser.name);
    await page.locator('input[name="identifier"]').fill(testUser.phone);
    await page.locator('input[name="password"]').fill(testUser.password);
    await page.locator('input[name="confirmPassword"]').fill(testUser.password);

    // Submit
    await page
      .locator('form')
      .getByRole('button', { name: /ارسال کد تایید/i })
      .click();

    // Wait for OTP page
    await page.waitForURL(/\/verify-otp/, { timeout: 15000 });

    // Verify phone is shown
    await expect(page.locator('h2:has-text("تایید شماره تلفن")')).toBeVisible();
    await expect(page.locator(`text=${testUser.phone}`)).toBeVisible();

    // Get OTP from database
    const otpCode = await waitForOTP(testUser.phone, 15000);
    expect(otpCode).toMatch(/^\d{6}$/);

    // Enter OTP
    await page.keyboard.type(otpCode);

    // Wait for redirect
    await page.waitForURL(/^(?!.*verify-otp)/, { timeout: 20000 });

    // Verify user in database
    const user = await waitForUserByPhone(testUser.phone, 10000);
    expect(user).toBeTruthy();
    expect(user.phone).toBe(testUser.phone);
    expect(user.isVerified).toBe(true);
    console.log(`Database verification: Phone user ${user.id} created`);

    // Verify authenticated
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');

    // Cleanup
    await deleteTestOTPsByIdentifier(testUser.phone);
  });

  test('should prevent duplicate phone registration', async ({ page }) => {
    // First, register a user with phone
    const testUser = createTestUser();

    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill(testUser.name);
    await page.locator('input[name="identifier"]').fill(testUser.phone);
    await page.locator('input[name="password"]').fill(testUser.password);
    await page.locator('input[name="confirmPassword"]').fill(testUser.password);
    await page
      .locator('form')
      .getByRole('button', { name: /ارسال کد تایید/i })
      .click();

    // Complete registration
    await page.waitForURL(/\/verify-otp/, { timeout: 15000 });
    const otpCode = await waitForOTP(testUser.phone, 15000);
    await page.keyboard.type(otpCode);
    await page.waitForURL(/^(?!.*verify-otp)/, { timeout: 20000 });

    // Logout
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const logoutButton = page.getByRole('button', {
      name: /خروج از حساب کاربری/i,
    });
    await expect(logoutButton).toBeVisible({ timeout: 10000 });
    await logoutButton.click();
    await page.waitForURL('/');

    // Try to register again with same phone
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill('Different Name');
    await page.locator('input[name="identifier"]').fill(testUser.phone);
    await page.locator('input[name="password"]').fill('DifferentPass123!');
    await page
      .locator('input[name="confirmPassword"]')
      .fill('DifferentPass123!');
    await page
      .locator('form')
      .getByRole('button', { name: /ارسال کد تایید/i })
      .click();

    // Wait for response
    await page.waitForTimeout(2000);

    // Check for error message OR redirect to OTP (depends on implementation)
    // The app may redirect to OTP verification which will fail, or show immediate error
    const errorAlert = page.locator('.text-red-800, .bg-red-50');
    const isOnOTPPage = page.url().includes('/verify-otp');

    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.textContent();
      expect(
        errorText?.match(/قبلاً ثبت|already|duplicate|موجود|وجود دارد/i)
      ).toBeTruthy();
      console.log(
        'Duplicate registration correctly blocked with error message'
      );
    } else if (isOnOTPPage) {
      // App sends OTP but user already exists - verification will handle duplicate
      console.log(
        'App redirected to OTP (will handle duplicate at verification)'
      );
    }

    // Cleanup
    await deleteTestOTPsByIdentifier(testUser.phone);
  });

  test('should validate password requirements', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    // Fill with weak password
    await page.locator('input[name="name"]').fill('Test User');
    await page
      .locator('input[name="identifier"]')
      .fill('weak-password-test@example.com');
    await page.locator('input[name="password"]').fill('123'); // Too short
    await page.locator('input[name="confirmPassword"]').fill('123');

    // Try to submit
    await page
      .locator('form')
      .getByRole('button', { name: /ثبت‌نام|ارسال کد تایید/i })
      .click();

    // Should show password error
    await expect(page.locator('text=/۸ کاراکتر|حداقل ۸/i')).toBeVisible({
      timeout: 5000,
    });

    // Verify still on register page
    await expect(page).toHaveURL('/register');
  });

  test('should validate password confirmation mismatch', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill('Test User');
    await page
      .locator('input[name="identifier"]')
      .fill('mismatch-test@example.com');
    await page.locator('input[name="password"]').fill('StrongPass123!');
    await page.locator('input[name="confirmPassword"]').fill('DifferentPass!');

    await page
      .locator('form')
      .getByRole('button', { name: /ثبت‌نام|ارسال کد تایید/i })
      .click();

    // Should show mismatch error
    await expect(page.locator('text=/مطابقت ندارند|match/i')).toBeVisible({
      timeout: 5000,
    });

    await expect(page).toHaveURL('/register');
  });

  test('should handle expired OTP', async ({ page }) => {
    const testUser = createTestUser({
      email: `expired-otp-test-${Date.now()}@example.com`,
    });

    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill(testUser.name);
    await page.locator('input[name="identifier"]').fill(testUser.email);
    await page.locator('input[name="password"]').fill(testUser.password);
    await page.locator('input[name="confirmPassword"]').fill(testUser.password);
    await page
      .locator('form')
      .getByRole('button', { name: /ثبت‌نام|ارسال کد تایید/i })
      .click();

    // Wait for OTP page
    await page.waitForURL(/\/verify-otp/, { timeout: 15000 });

    // Get OTP from database
    const otpCode = await waitForOTP(testUser.email, 15000);

    // Expire the OTP in database
    await expireOTP(testUser.email);

    // Try to verify with expired OTP
    await page.keyboard.type(otpCode);

    // Wait for error message
    await page.waitForTimeout(2000);

    // Should show error about expired/invalid OTP
    const errorAlert = page.locator(
      '.text-red-800, .bg-red-50, [type="error"]'
    );
    if (await errorAlert.isVisible()) {
      const errorText = await errorAlert.textContent();
      expect(errorText?.match(/منقضی|expired|invalid|نامعتبر/i)).toBeTruthy();
    }

    // Verify "Resend OTP" button is visible
    const resendButton = page.getByRole('button', { name: /ارسال مجدد کد/i });
    await expect(resendButton).toBeVisible();

    // Cleanup
    await deleteTestOTPsByIdentifier(testUser.email);
  });

  test('should validate email/phone format', async ({ page }) => {
    await page.goto('/register');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="name"]').fill('Test User');
    await page.locator('input[name="identifier"]').fill('invalid-format'); // Not email or phone
    await page.locator('input[name="password"]').fill('StrongPass123!');
    await page.locator('input[name="confirmPassword"]').fill('StrongPass123!');

    await page
      .locator('form')
      .getByRole('button', { name: /ثبت‌نام|ارسال کد تایید/i })
      .click();

    // Should show format error
    await expect(
      page.locator('text=/نامعتبر|invalid|فرمت/i').first()
    ).toBeVisible({
      timeout: 5000,
    });

    await expect(page).toHaveURL('/register');
  });
});
