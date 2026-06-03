import { test, expect } from '@playwright/test';
import { createTestUser, E2ETestUser } from '../fixtures/users';
import {
  createTestUserInDB,
  deleteTestUserById,
  getTestProduct,
  createE2ESupabaseClient,
} from '../utils/database';
import { cleanupE2ETestData } from '../fixtures/cleanup';

/**
 * Wishlist Journey E2E Tests
 *
 * Tests the complete wishlist functionality:
 * - Guest wishlist support (local storage)
 * - Adding products to wishlist
 * - Viewing wishlist page
 * - Removing products from wishlist
 * - Adding wishlist items to cart
 * - Wishlist button toggle on product pages
 * - Wishlist persistence across sessions
 * - Wishlist merge on login
 */

// Make tests in this file run serially on a single worker
test.describe.configure({ mode: 'serial' });

test.describe('Wishlist Journey', () => {
  // Fixed test user data - uses deterministic ID for reliable cleanup
  const testUserData = {
    id: 'e2e-user-wishlist-test-fixed',
    uid: 'e2e-uid-wishlist-test-fixed',
    email: 'e2e-wishlist-test@example.com',
    phone: '+12025555432', // Unique phone number for wishlist tests
    name: 'Test User text',
    password: 'Test1234!@#$',
  };

  let testProduct: { id: string; name: string; price: number; stock: number };

  test.beforeAll(async () => {
    const supabase = createE2ESupabaseClient();

    // Clean up any existing test user first by ID
    try {
      await deleteTestUserById(testUserData.id);
    } catch {
      // User doesn't exist, that's fine
    }

    // Also try to delete by email in case of previous run failures
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', testUserData.email)
      .single();

    if (existingUser) {
      // Clean up wishlists first
      await supabase.from('wishlists').delete().eq('user_id', existingUser.id);
      // Delete the user if it's an e2e user
      if (existingUser.id.startsWith('e2e-user-')) {
        await supabase.from('users').delete().eq('id', existingUser.id);
      }
    }

    // Clean up by phone as well
    const { data: existingByPhone } = await supabase
      .from('users')
      .select('id')
      .eq('phone', testUserData.phone)
      .single();

    if (existingByPhone) {
      await supabase
        .from('wishlists')
        .delete()
        .eq('user_id', existingByPhone.id);
      if (existingByPhone.id.startsWith('e2e-user-')) {
        await supabase.from('users').delete().eq('id', existingByPhone.id);
      }
    }

    // Clean up any existing wishlist items for this user
    await supabase.from('wishlists').delete().eq('user_id', testUserData.id);

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

    // Get a test product
    testProduct = await getTestProduct();
    console.log(`Using test product: ${testProduct.name}`);
  });

  test.afterAll(async () => {
    // Clean up wishlist items first
    const supabase = createE2ESupabaseClient();
    await supabase.from('wishlists').delete().eq('user_id', testUserData.id);

    try {
      await deleteTestUserById(testUserData.id);
    } catch (e) {
      console.log(`Cleanup warning: ${e}`);
    }
    // Note: Don't call cleanupE2ETestData() here as it would delete all e2e users
    // and interfere with other test files running in parallel
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

  // Helper function to login
  async function loginUser(page: import('@playwright/test').Page) {
    const user = getTestUser();

    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.getByRole('heading', { name: /Sign in/i })).toBeVisible();

    await page.locator('input[name="identifier"]').fill(user.email);
    await page.locator('input[name="password"]').fill(user.password);
    await page.locator('button[type="submit"]').click();

    await page.waitForURL('/', { timeout: 30000 });
    await expect(page.locator('header')).toBeVisible();
  }

  test('should allow guests to view wishlist page with info banner', async ({
    page,
  }) => {
    // Visit wishlist page without authentication
    await page.goto('/wishlist');
    await page.waitForLoadState('networkidle');

    // Should show empty wishlist or info banner (depending on if guest has items)
    // Clear local storage first to ensure clean state
    await page.evaluate(() => {
      localStorage.removeItem('wishlist-storage');
    });
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should show empty wishlist message for new guest
    await expect(page.getByRole('heading', { name: /empty/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('should allow guests to add products to wishlist', async ({ page }) => {
    // Clear wishlist storage to start fresh
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('wishlist-storage');
    });

    // Navigate to a product page as guest
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    // Find and click the wishlist button (heart icon)
    const wishlistButton = page
      .locator('[data-testid="wishlist-button"]')
      .first();
    await expect(wishlistButton).toBeVisible({ timeout: 10000 });
    await expect(wishlistButton).toBeEnabled({ timeout: 5000 });

    // Click to add to wishlist
    await wishlistButton.click();

    // Wait for the button state to change (should be pressed/filled)
    await expect(wishlistButton).toHaveAttribute('aria-pressed', 'true', {
      timeout: 10000,
    });

    // Navigate to wishlist page
    await page.goto('/wishlist');
    await page.waitForLoadState('networkidle');

    // Should show the product in wishlist
    await expect(
      page.locator('[data-testid="wishlist-item"]').first()
    ).toBeVisible({ timeout: 10000 });

    // Should show guest info banner
    await expect(page.locator('text=Save for later')).toBeVisible({
      timeout: 10000,
    });

    // Clean up - clear the wishlist storage
    await page.evaluate(() => {
      localStorage.removeItem('wishlist-storage');
    });
  });

  test('should show empty wishlist for new user', async ({ page }) => {
    await loginUser(page);

    // Navigate to wishlist page
    await page.goto('/wishlist');
    await page.waitForLoadState('networkidle');

    // Should show empty wishlist message
    await expect(page.getByRole('heading', { name: /empty/i })).toBeVisible({
      timeout: 10000,
    });

    // Should show "View Products" button
    await expect(
      page.getByRole('link', { name: /View Products/i })
    ).toBeVisible();
  });

  test('should add product to wishlist from product page', async ({ page }) => {
    await loginUser(page);

    // Navigate to a product page
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    // Find and click the wishlist button (heart icon) - use first() as there may be related product buttons
    const wishlistButton = page
      .locator('[data-testid="wishlist-button"]')
      .first();
    await expect(wishlistButton).toBeVisible({ timeout: 10000 });

    // Wait for button to be enabled (not loading)
    await expect(wishlistButton).not.toHaveAttribute('disabled', '', {
      timeout: 5000,
    });

    // Click to add to wishlist
    await wishlistButton.click();

    // Wait for the button state to change (should be pressed/filled)
    // Increase timeout as API call might take time
    await expect(wishlistButton).toHaveAttribute('aria-pressed', 'true', {
      timeout: 10000,
    });

    // Navigate to wishlist page
    await page.goto('/wishlist');
    await page.waitForLoadState('networkidle');

    // Should show the product in wishlist - just verify the item card is there
    await expect(
      page.locator('[data-testid="wishlist-item"]').first()
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test('should remove product from wishlist via wishlist page', async ({
    page,
  }) => {
    await loginUser(page);

    // First ensure product is in wishlist
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    const wishlistButton = page
      .locator('[data-testid="wishlist-button"]')
      .first();
    await expect(wishlistButton).toBeVisible({ timeout: 10000 });

    // Wait for button to be enabled (not loading)
    await expect(wishlistButton).toBeEnabled({ timeout: 10000 });

    // Check if already added - if not, add it
    const isPressed = await wishlistButton.getAttribute('aria-pressed');
    if (isPressed !== 'true') {
      await wishlistButton.click();
      // Wait for API call to complete with longer timeout
      await expect(wishlistButton).toHaveAttribute('aria-pressed', 'true', {
        timeout: 15000,
      });
    }

    // Navigate to wishlist page
    await page.goto('/wishlist');
    await page.waitForLoadState('networkidle');

    // Wait for wishlist to load
    await expect(
      page.locator('[data-testid="wishlist-item"]').first()
    ).toBeVisible({
      timeout: 10000,
    });

    // Click the remove button (trash icon)
    const removeButton = page
      .locator(
        '[data-testid="wishlist-item"]'
      )
      .getByRole('button', { name: /Remove from wishlist/i })
      .first();
    await removeButton.click();

    // Wait for item to be removed
    await expect(page.locator('[data-testid="wishlist-item"]')).not.toBeVisible(
      { timeout: 10000 }
    );

    // Should show empty wishlist message
    await expect(page.getByRole('heading', { name: /empty/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('should toggle wishlist button on product page', async ({ page }) => {
    await loginUser(page);

    // Navigate to product page
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    const wishlistButton = page
      .locator('[data-testid="wishlist-button"]')
      .first();
    await expect(wishlistButton).toBeVisible({ timeout: 10000 });
    await expect(wishlistButton).toBeEnabled({ timeout: 10000 });

    // Get initial state
    const initialState = await wishlistButton.getAttribute('aria-pressed');

    // Click to toggle
    await wishlistButton.click();

    // Wait for button to complete API call and be enabled again
    await expect(wishlistButton).toBeEnabled({ timeout: 15000 });

    // State should change
    const newState = await wishlistButton.getAttribute('aria-pressed');
    expect(newState).not.toBe(initialState);

    // Click again to toggle back
    await wishlistButton.click();
    await expect(wishlistButton).toBeEnabled({ timeout: 15000 });

    // State should be back to initial
    const finalState = await wishlistButton.getAttribute('aria-pressed');
    expect(finalState).toBe(initialState);
  });

  test('should add wishlist item to cart', async ({ page }) => {
    await loginUser(page);

    // Add product to wishlist first
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    const wishlistButton = page
      .locator('[data-testid="wishlist-button"]')
      .first();
    await expect(wishlistButton).toBeVisible({ timeout: 10000 });
    await expect(wishlistButton).toBeEnabled({ timeout: 10000 });

    // Ensure product is in wishlist
    const isPressed = await wishlistButton.getAttribute('aria-pressed');
    if (isPressed !== 'true') {
      await wishlistButton.click();
      await expect(wishlistButton).toHaveAttribute('aria-pressed', 'true', {
        timeout: 15000,
      });
    }

    // Navigate to wishlist page
    await page.goto('/wishlist');
    await page.waitForLoadState('networkidle');

    // Wait for wishlist to load
    await expect(
      page.locator('[data-testid="wishlist-item"]').first()
    ).toBeVisible({
      timeout: 10000,
    });

    // Click "Add to Cart" button
    const addToCartButton = page
      .locator('[data-testid="add-to-cart-from-wishlist"]')
      .first();
    await expect(addToCartButton).toBeVisible();

    // Only click if not out of stock
    const buttonText = await addToCartButton.textContent();
    if (!buttonText?.includes('Out of stock')) {
      await addToCartButton.click();

      await expect(page.getByText(/Added to cart/i)).toBeVisible({
        timeout: 10000,
      });
    }

    // Clean up wishlist for next tests
    const removeButton = page
      .locator(
        '[data-testid="wishlist-item"]'
      )
      .getByRole('button', { name: /Remove from wishlist/i })
      .first();
    if (await removeButton.isVisible()) {
      await removeButton.click();
    }
  });

  test('should persist wishlist across page reloads', async ({ page }) => {
    await loginUser(page);

    // Add product to wishlist
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    const wishlistButton = page
      .locator('[data-testid="wishlist-button"]')
      .first();
    await expect(wishlistButton).toBeVisible({ timeout: 10000 });
    await expect(wishlistButton).toBeEnabled({ timeout: 10000 });

    // Add to wishlist
    const isPressed = await wishlistButton.getAttribute('aria-pressed');
    if (isPressed !== 'true') {
      await wishlistButton.click();
      await expect(wishlistButton).toHaveAttribute('aria-pressed', 'true', {
        timeout: 15000,
      });
    }

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Re-select the button after reload
    const wishlistButtonAfterReload = page
      .locator('[data-testid="wishlist-button"]')
      .first();

    // Wishlist button should still show as pressed
    await expect(wishlistButtonAfterReload).toHaveAttribute(
      'aria-pressed',
      'true',
      {
        timeout: 10000,
      }
    );

    // Navigate to wishlist page and verify item is still there
    await page.goto('/wishlist');
    await page.waitForLoadState('networkidle');

    await expect(
      page.locator('[data-testid="wishlist-item"]').first()
    ).toBeVisible({
      timeout: 10000,
    });
  });

  test('should clear all wishlist items', async ({ page }) => {
    await loginUser(page);

    // Ensure product is in wishlist
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    const wishlistButton = page
      .locator('[data-testid="wishlist-button"]')
      .first();
    await expect(wishlistButton).toBeVisible({ timeout: 10000 });
    await expect(wishlistButton).toBeEnabled({ timeout: 10000 });

    const isPressed = await wishlistButton.getAttribute('aria-pressed');
    if (isPressed !== 'true') {
      await wishlistButton.click();
      await expect(wishlistButton).toHaveAttribute('aria-pressed', 'true', {
        timeout: 15000,
      });
    }

    // Navigate to wishlist page
    await page.goto('/wishlist');
    await page.waitForLoadState('networkidle');

    // Wait for wishlist to load
    await expect(
      page.locator('[data-testid="wishlist-item"]').first()
    ).toBeVisible({
      timeout: 10000,
    });

    // Set up dialog handler BEFORE clicking
    page.on('dialog', (dialog) => dialog.accept());

    // Click "Delete All" button
    const clearButton = page.getByRole('button', {
      name: /Delete all|Clear all/i,
    });
    await expect(clearButton).toBeVisible();
    await clearButton.click();

    // Wait for items to be cleared
    await expect(page.locator('[data-testid="wishlist-item"]')).not.toBeVisible(
      { timeout: 10000 }
    );

    // Should show empty wishlist message
    await expect(page.getByRole('heading', { name: /empty/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('should remove item from wishlist via product page toggle', async ({
    page,
  }) => {
    await loginUser(page);

    // Add product to wishlist
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    const wishlistButton = page
      .locator('[data-testid="wishlist-button"]')
      .first();
    await expect(wishlistButton).toBeVisible({ timeout: 10000 });
    await expect(wishlistButton).toBeEnabled({ timeout: 10000 });

    // Add to wishlist
    const isPressed = await wishlistButton.getAttribute('aria-pressed');
    if (isPressed !== 'true') {
      await wishlistButton.click();
      await expect(wishlistButton).toHaveAttribute('aria-pressed', 'true', {
        timeout: 15000,
      });
    }

    // Wait for button to be enabled again
    await expect(wishlistButton).toBeEnabled({ timeout: 10000 });

    // Remove from wishlist by clicking again
    await wishlistButton.click();
    await expect(wishlistButton).toHaveAttribute('aria-pressed', 'false', {
      timeout: 15000,
    });

    // Verify wishlist is empty
    await page.goto('/wishlist');
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { name: /empty/i })).toBeVisible({
      timeout: 10000,
    });
  });

  test('should show wishlist count correctly', async ({ page }) => {
    await loginUser(page);

    // Navigate to wishlist to check it's empty
    await page.goto('/wishlist');
    await page.waitForLoadState('networkidle');

    // Add product to wishlist
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    const wishlistButton = page
      .locator('[data-testid="wishlist-button"]')
      .first();
    await expect(wishlistButton).toBeVisible({ timeout: 10000 });
    await expect(wishlistButton).toBeEnabled({ timeout: 10000 });

    // Add to wishlist
    const isPressed = await wishlistButton.getAttribute('aria-pressed');
    if (isPressed !== 'true') {
      await wishlistButton.click();
      await expect(wishlistButton).toHaveAttribute('aria-pressed', 'true', {
        timeout: 15000,
      });
    }

    // Navigate to wishlist page and check count
    await page.goto('/wishlist');
    await page.waitForLoadState('networkidle');

    // The title should show the count
    await expect(
      page.getByRole('heading', { name: /Wishlist/i })
    ).toContainText(/\(1\)/, { timeout: 10000 });

    // Clean up
    const removeButton = page
      .locator(
        '[data-testid="wishlist-item"]'
      )
      .getByRole('button', { name: /Remove from wishlist/i })
      .first();
    if (await removeButton.isVisible()) {
      await removeButton.click();
    }
  });
});
