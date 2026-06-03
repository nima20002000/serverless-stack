import { test, expect } from '@playwright/test';
import { createTestUser, E2ETestUser } from '../fixtures/users';
import {
  createTestUserInDB,
  deleteTestUserById,
  waitForOTP,
  deleteTestOTPsByIdentifier,
} from '../utils/database';
import { cleanupE2ETestData } from '../fixtures/cleanup';

/**
 * User Login Journey E2E Tests
 *
 * These tests verify login flows with REAL database verification:
 * - Password-based login with email
 * - Password-based login with phone
 * - OTP-based login (passwordless)
 * - Session persistence across page reloads
 * - Logout and session cleanup
 * - Error handling for wrong credentials
 */

// Make tests in this file run serially on a single worker
test.describe.configure({ mode: 'serial' });

test.describe('User Login Journey', () => {
  // Fixed test user data - uses deterministic ID for reliable cleanup
  const testUserData = {
    id: 'e2e-user-login-test-fixed',
    uid: 'e2e-uid-login-test-fixed',
    email: 'e2e-login-test@example.com',
    phone: '+12025554321',
    name: 'User Sign in Test',
    password: 'Test1234!@#$',
  };

  test.beforeAll(async () => {
    // Clean up any existing test user first
    try {
      await deleteTestUserById(testUserData.id);
    } catch {
      // User doesn't exist, that's fine
    }

    // Create the test user
    await createTestUserInDB({
      id: testUserData.id,
      uid: testUserData.uid,
      email: testUserData.email,
      phone: testUserData.phone,
      name: testUserData.name,
      password: testUserData.password,
      isVerified: true,
      role: 'USER',
    });
    console.log(`Created test user: ${testUserData.email}`);
  });

  test.afterAll(async () => {
    try {
      await deleteTestUserById(testUserData.id);
    } catch (e) {
      console.log(`Cleanup warning: ${e}`);
    }
    await cleanupE2ETestData();
  });

  function getTestUser(): E2ETestUser {
    return {
      ...testUserData,
      firstName: 'User',
      lastName: 'Test',
      isVerified: true,
      role: 'USER',
      updatedAt: new Date().toISOString(),
    };
  }

  test('should login with email and password', async ({ page }) => {
    const registeredUser = getTestUser();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Verify login form loaded
    await expect(page.getByRole('heading', { name: /Sign in/i })).toBeVisible();

    // Fill login form
    await page.locator('input[name="identifier"]').fill(registeredUser.email);
    await page.locator('input[name="password"]').fill(registeredUser.password);

    // Submit - use the submit button with type="submit"
    await page.locator('button[type="submit"]').click();

    // Wait for redirect (successful login redirects to home)
    await page.waitForURL('/', { timeout: 20000 });

    // ============================================================
    // VERIFY AUTHENTICATION: Can access protected route
    // ============================================================
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Should stay on profile (not redirected to login)
    await expect(page).toHaveURL('/profile');

    // Verify profile page content
    await expect(page.getByRole('heading', { name: /Profile/i })).toBeVisible({
      timeout: 10000,
    });

    // Verify user email is shown
    const profileContent = await page.content();
    expect(profileContent).toContain(registeredUser.email);
  });

  test('should login with phone and password', async ({ page }) => {
    const registeredUser = getTestUser();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Use phone number as identifier
    await page.locator('input[name="identifier"]').fill(registeredUser.phone);
    await page.locator('input[name="password"]').fill(registeredUser.password);

    await page.locator('button[type="submit"]').click();

    // Wait for successful login
    await page.waitForURL('/', { timeout: 20000 });

    // Verify can access protected route
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');
  });

  test('should login with OTP (passwordless)', async ({ page }) => {
    const registeredUser = getTestUser();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Enter phone number
    await page.locator('input[name="identifier"]').fill(registeredUser.phone);

    // Click "Login with OTP" link
    const otpLoginLink = page.locator(
      'button:has-text("Sign in with code")'
    );
    await expect(otpLoginLink).toBeVisible();
    await otpLoginLink.click();

    // Password field should be hidden now
    await expect(page.locator('input[name="password"]')).not.toBeVisible();

    // Submit to send OTP
    await page.getByRole('button', { name: /Send code|Shipping Code/i }).click();

    // Wait for redirect to OTP verification page
    await page.waitForURL(/\/verify-otp/, { timeout: 15000 });

    // Get OTP from database
    const otpCode = await waitForOTP(registeredUser.phone, 15000);
    expect(otpCode).toMatch(/^\d{6}$/);
    console.log(`Retrieved OTP for login: ${otpCode}`);

    // Enter OTP
    await page.keyboard.type(otpCode);

    // Wait for redirect after successful verification
    await page.waitForURL(/^(?!.*verify-otp)/, { timeout: 20000 });

    // Verify authenticated
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');

    // Cleanup
    await deleteTestOTPsByIdentifier(registeredUser.phone);
  });

  test('should login with email OTP (passwordless)', async ({ page }) => {
    const registeredUser = getTestUser();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Enter email
    await page.locator('input[name="identifier"]').fill(registeredUser.email);

    // Click "Login with OTP" link
    const otpLoginLink = page.locator(
      'button:has-text("Sign in with code")'
    );
    await expect(otpLoginLink).toBeVisible();
    await otpLoginLink.click();

    // Submit to send OTP
    await page.getByRole('button', { name: /Send code|Shipping Code/i }).click();

    // Wait for redirect to OTP verification page
    await page.waitForURL(/\/verify-otp/, { timeout: 15000 });

    // Get OTP from database
    const otpCode = await waitForOTP(registeredUser.email, 15000);
    expect(otpCode).toMatch(/^\d{6}$/);

    // Enter OTP
    await page.keyboard.type(otpCode);

    // Wait for redirect
    await page.waitForURL(/^(?!.*verify-otp)/, { timeout: 20000 });

    // Verify authenticated
    await page.goto('/profile');
    await expect(page).toHaveURL('/profile');

    // Cleanup
    await deleteTestOTPsByIdentifier(registeredUser.email);
  });

  test('should show error for wrong password', async ({ page }) => {
    const registeredUser = getTestUser();

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="identifier"]').fill(registeredUser.email);
    await page.locator('input[name="password"]').fill('WrongPassword123!');

    await page.locator('button[type="submit"]').click();

    // Wait for error message
    await page.waitForTimeout(2000);

    // Should show error
    const errorAlert = page.locator('[role="alert"]', {
      hasText: 'Invalid email/phone or password.',
    });
    await expect(errorAlert).toContainText('Invalid email/phone or password.', {
      timeout: 5000,
    });

    // Verify still on login page
    await expect(page).toHaveURL('/login');

    // Verify NOT authenticated - can't access profile
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should show error for non-existent user', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page
      .locator('input[name="identifier"]')
      .fill('nonexistent-user@example.com');
    await page.locator('input[name="password"]').fill('SomePassword123!');

    await page.locator('button[type="submit"]').click();

    // Wait for error
    await page.waitForTimeout(2000);

    const errorAlert = page.locator('[role="alert"]', {
      hasText: 'User not found',
    });
    await expect(errorAlert).toContainText('User not found', {
      timeout: 5000,
    });

    await expect(page).toHaveURL('/login');
  });

  test('should persist session across page reloads', async ({ page }) => {
    const registeredUser = getTestUser();

    // Login first
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="identifier"]').fill(registeredUser.email);
    await page.locator('input[name="password"]').fill(registeredUser.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('/', { timeout: 20000 });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // User should still be logged in - can access protected route
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL('/profile');
    await expect(page.getByRole('heading', { name: /Profile/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('should logout and clear session', async ({ page }) => {
    const registeredUser = getTestUser();

    // Login first
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="identifier"]').fill(registeredUser.email);
    await page.locator('input[name="password"]').fill(registeredUser.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('/', { timeout: 20000 });

    // Go to profile
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { name: /Profile/i })).toBeVisible({
      timeout: 10000,
    });

    // Click logout button
    const logoutButton = page.getByRole('button', {
      name: /Sign out of Account/i,
    });
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // Wait for redirect to home
    await page.waitForURL('/');

    // Try to access protected route - should redirect to login
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/login/);
  });

  test('should validate required fields in login form', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Try to submit without identifier
    await page.locator('button[type="submit"]').click();

    // Should show validation error
    await expect(page.locator('text=/required|required/i').first()).toBeVisible(
      {
        timeout: 5000,
      }
    );

    // Fill identifier but not password (use a valid email format)
    await page.locator('input[name="identifier"]').fill('test@example.com');
    await page.locator('button[type="submit"]').click();

    // Should show password error
    await expect(page.locator('text=/required|required/i').first()).toBeVisible(
      {
        timeout: 5000,
      }
    );

    // Still on login page
    await expect(page).toHaveURL('/login');
  });

  test('should validate identifier format', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    await page.locator('input[name="identifier"]').fill('invalid-format');
    await page.locator('input[name="password"]').fill('SomePassword123!');
    await page.locator('button[type="submit"]').click();

    // Should show format error
    await expect(
      page.locator('text=/Invalid|invalid/i').first()
    ).toBeVisible({
      timeout: 5000,
    });

    await expect(page).toHaveURL('/login');
  });

  test('should navigate to register page from login', async ({ page }) => {
    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    // Click register link
    await page.getByRole('link', { name: /Create account/i }).click();

    await expect(page).toHaveURL('/register');
    await expect(page.getByRole('heading', { name: /Create account/i })).toBeVisible();
  });
});
