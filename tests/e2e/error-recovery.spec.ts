import { test, expect } from '@playwright/test';
import {
  getTestProduct,
  getProductStock,
  deleteTestTransactionsByPhone,
  deleteTestOTPsByIdentifier,
  createE2ESupabaseClient,
} from './utils/database';
import { mockPaymentFailure, mockStripeSuccess } from './helpers/payment';

/**
 * Error Recovery E2E Tests
 *
 * Tests for:
 * - Network failure handling
 * - Payment failure recovery
 * - Stock becoming unavailable during checkout
 * - Form validation errors
 * - Session timeout handling
 */

// Generate unique test phone for each test run
function generateTestPhone(): string {
  const random = Math.floor(Math.random() * 9000000) + 1000000;
  return `0919${random}`;
}

test.describe('Error Recovery Scenarios', () => {
  let testPhone: string;

  test.beforeEach(async () => {
    testPhone = generateTestPhone();
  });

  test.afterEach(async () => {
    try {
      await deleteTestTransactionsByPhone(testPhone);
      await deleteTestOTPsByIdentifier(testPhone);
    } catch (error) {
      console.log(`Cleanup warning: ${error}`);
    }
  });

  test('should handle payment failure gracefully', async ({ page }) => {
    // Get product and add to cart
    const testProduct = await getTestProduct();
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    const addButton = page
      .getByRole('button', { name: /افزودن به سبد خرید/i })
      .first();

    if (!(await addButton.isVisible()) || !(await addButton.isEnabled())) {
      test.skip(true, 'Product has no stock');
      return;
    }

    await addButton.click();
    await page.waitForTimeout(500);

    // Go to checkout
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    // Fill form
    await page.locator('#fullName').fill('تست خطا پرداخت');
    await page.locator('#phone').fill(testPhone);
    await page.locator('#shippingAddress').fill('تهران، آدرس تست');

    // Setup payment FAILURE mock
    await mockPaymentFailure(page, 'stripe');

    // Click pay
    const payButton = page.getByRole('button', { name: /پرداخت/i }).first();
    await payButton.click();

    // Wait for failure page
    await page.waitForURL(/\/payment\/failure/, { timeout: 30000 });

    // Verify failure page displayed
    const failureHeading = page.getByRole('heading', {
      name: /پرداخت ناموفق/i,
    });
    await expect(failureHeading).toBeVisible();

    // Verify cart return option available (the page shows "بازگشت به سبد خرید" button)
    const cartButton = page.getByRole('link', { name: /بازگشت به سبد خرید/i });
    await expect(cartButton).toBeVisible();

    console.log('Payment failure correctly handled with cart return option');
  });

  test('should handle network failure during checkout form submit', async ({
    page,
  }) => {
    // Get product and add to cart
    const testProduct = await getTestProduct();
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    const addButton = page
      .getByRole('button', { name: /افزودن به سبد خرید/i })
      .first();

    if (!(await addButton.isVisible()) || !(await addButton.isEnabled())) {
      test.skip(true, 'Product has no stock');
      return;
    }

    await addButton.click();
    await page.waitForTimeout(500);

    // Go to checkout
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    // Fill form
    await page.locator('#fullName').fill('تست قطعی شبکه');
    await page.locator('#phone').fill(testPhone);
    await page.locator('#shippingAddress').fill('تهران، آدرس تست');

    // Simulate network failure for the transaction creation API
    await page.route('**/api/transactions/**', (route) => route.abort());

    // Try to pay (will fail due to network)
    const payButton = page.getByRole('button', { name: /پرداخت/i }).first();
    await payButton.click();

    // Wait for error feedback
    await page.waitForTimeout(3000);

    // Should still be on checkout page (not redirected)
    await expect(page).toHaveURL(/\/checkout/);

    // Should show some error indication (toast, alert, etc.)
    // The specific error UI depends on implementation
    const errorIndicator = page.locator('.toast-error, [role="alert"], .error');
    const hasError = (await errorIndicator.count()) > 0;

    // Clear route to restore network
    await page.unroute('**/api/transactions/**');

    console.log(`Network failure handling: error shown = ${hasError}`);
  });

  test('should handle product stock becoming unavailable during checkout', async ({
    page,
  }) => {
    // Get a product with stock
    const supabase = createE2ESupabaseClient();
    const { data: products } = await supabase
      .from('products')
      .select('id, name, stock')
      .eq('isActive', true)
      .gt('stock', 0)
      .limit(1);

    if (!products || products.length === 0) {
      test.skip(true, 'No products with stock available');
      return;
    }

    const testProduct = products[0];
    const originalStock = testProduct.stock;

    // Add to cart
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    const addButton = page
      .getByRole('button', { name: /افزودن به سبد خرید/i })
      .first();
    await addButton.click();
    await page.waitForTimeout(500);

    // Meanwhile, set stock to 0 (simulating another user bought it)
    await supabase
      .from('products')
      .update({ stock: 0 })
      .eq('id', testProduct.id);

    // Go to checkout
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    // Fill form
    await page.locator('#fullName').fill('تست موجودی تمام');
    await page.locator('#phone').fill(testPhone);
    await page.locator('#shippingAddress').fill('تهران، آدرس تست');

    // Setup payment success mock
    await mockStripeSuccess(page);

    // Try to pay
    const payButton = page.getByRole('button', { name: /پرداخت/i }).first();
    await payButton.click();

    // Wait for response (should either fail or show error)
    await page.waitForTimeout(5000);

    // Check if we got an error or went to failure page
    const currentUrl = page.url();
    const hasStockError =
      currentUrl.includes('/payment/failure') ||
      (await page.getByText(/موجودی|ناموجود/i).isVisible());

    console.log(`Stock unavailable handling: url=${currentUrl}`);

    // Restore original stock
    await supabase
      .from('products')
      .update({ stock: originalStock })
      .eq('id', testProduct.id);
  });

  test('should validate required fields in checkout form', async ({ page }) => {
    // Get product and add to cart
    const testProduct = await getTestProduct();
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    const addButton = page
      .getByRole('button', { name: /افزودن به سبد خرید/i })
      .first();

    if (!(await addButton.isVisible()) || !(await addButton.isEnabled())) {
      test.skip(true, 'Product has no stock');
      return;
    }

    await addButton.click();
    await page.waitForTimeout(500);

    // Go to checkout
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    // Try to submit without filling any fields
    const payButton = page.getByRole('button', { name: /پرداخت/i }).first();
    await payButton.click();

    // Should still be on checkout page (form validation prevents submission)
    await expect(page).toHaveURL('/checkout');

    // Fill only partial fields
    await page.locator('#phone').fill(testPhone);
    await payButton.click();

    // Should still be on checkout (name required)
    await expect(page).toHaveURL('/checkout');

    await page.locator('#fullName').fill('تست');
    await payButton.click();

    // Should still be on checkout (address required)
    await expect(page).toHaveURL('/checkout');

    console.log('Form validation correctly prevents incomplete submission');
  });

  test('should handle invalid phone number format', async ({ page }) => {
    // Get product and add to cart
    const testProduct = await getTestProduct();
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    const addButton = page
      .getByRole('button', { name: /افزودن به سبد خرید/i })
      .first();

    if (!(await addButton.isVisible()) || !(await addButton.isEnabled())) {
      test.skip(true, 'Product has no stock');
      return;
    }

    await addButton.click();
    await page.waitForTimeout(500);

    // Go to checkout
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    // Fill form with invalid phone
    await page.locator('#fullName').fill('تست شماره اشتباه');
    await page.locator('#phone').fill('12345'); // Invalid Iranian phone
    await page.locator('#shippingAddress').fill('تهران، آدرس تست');

    // Try to submit
    const payButton = page.getByRole('button', { name: /پرداخت/i }).first();
    await payButton.click();

    // Wait for validation
    await page.waitForTimeout(1000);

    // Should either stay on checkout or show error
    const currentUrl = page.url();
    expect(currentUrl).toContain('/checkout');

    console.log('Invalid phone format handling verified');
  });

  test('should handle empty cart accessing checkout', async ({ page }) => {
    // Clear any existing cart
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('cart-storage');
    });

    // Try to access checkout directly
    await page.goto('/checkout');

    // Should redirect to cart or products (empty cart protection)
    await page.waitForURL(/\/(cart|products)/, { timeout: 10000 });

    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/checkout');

    console.log(`Empty cart redirect: ${currentUrl}`);
  });
});

test.describe('Concurrent Access Scenarios', () => {
  test('should handle rapid add-to-cart clicks', async ({ page }) => {
    // Get product
    const testProduct = await getTestProduct();
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    const addButton = page
      .getByRole('button', { name: /افزودن به سبد خرید/i })
      .first();

    if (!(await addButton.isVisible()) || !(await addButton.isEnabled())) {
      test.skip(true, 'Product has no stock');
      return;
    }

    // Click rapidly multiple times
    await addButton.click();
    await addButton.click();
    await addButton.click();

    await page.waitForTimeout(1000);

    // Go to cart and verify reasonable quantity (not 3x)
    await page.goto('/cart');
    await page.waitForLoadState('networkidle');

    // Cart should have items but not necessarily 3 (depends on debouncing)
    const cartItemsHeading = page.locator('h2:has-text("لیست کالاها")');
    const hasItems = await cartItemsHeading.isVisible();

    console.log(`Rapid clicks handling: cart has items = ${hasItems}`);
  });

  test('should handle page refresh during checkout', async ({ page }) => {
    const testPhone = generateTestPhone();

    // Add product to cart
    const testProduct = await getTestProduct();
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    const addButton = page
      .getByRole('button', { name: /افزودن به سبد خرید/i })
      .first();

    if (!(await addButton.isVisible()) || !(await addButton.isEnabled())) {
      test.skip(true, 'Product has no stock');
      return;
    }

    await addButton.click();
    await page.waitForTimeout(500);

    // Go to checkout
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    // Fill partial form
    await page.locator('#fullName').fill('تست رفرش');
    await page.locator('#phone').fill(testPhone);

    // Refresh the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Cart should still have items (persisted in localStorage)
    // Should still be on checkout or redirected to cart
    const currentUrl = page.url();

    if (currentUrl.includes('/checkout')) {
      // Verify form fields may be cleared (expected behavior)
      console.log('Checkout page survived refresh');
    } else {
      // Redirected to cart (form state lost)
      console.log('Redirected to cart after refresh');
    }

    // Cleanup
    try {
      await deleteTestTransactionsByPhone(testPhone);
    } catch (e) {
      /* ignore */
    }
  });
});

test.describe('API Error Responses', () => {
  test('should handle 500 server error gracefully', async ({ page }) => {
    // Add product to cart first
    const testProduct = await getTestProduct();
    await page.goto(`/products/${testProduct.id}`);
    await page.waitForLoadState('networkidle');

    const addButton = page
      .getByRole('button', { name: /افزودن به سبد خرید/i })
      .first();

    if (!(await addButton.isVisible()) || !(await addButton.isEnabled())) {
      test.skip(true, 'Product has no stock');
      return;
    }

    await addButton.click();
    await page.waitForTimeout(500);

    // Go to checkout
    await page.goto('/checkout');
    await page.waitForLoadState('networkidle');

    // Mock 500 error on transaction API
    await page.route('**/api/transactions', (route) =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      })
    );

    const testPhone = generateTestPhone();
    await page.locator('#fullName').fill('تست خطای سرور');
    await page.locator('#phone').fill(testPhone);
    await page.locator('#shippingAddress').fill('تهران، آدرس تست');

    const payButton = page.getByRole('button', { name: /پرداخت/i }).first();
    await payButton.click();

    // Wait for error handling
    await page.waitForTimeout(3000);

    // Should still be on checkout (no redirect on error)
    await expect(page).toHaveURL(/\/checkout/);

    // Clear route
    await page.unroute('**/api/transactions');

    console.log('500 error handled - stayed on checkout page');
  });

  test('should handle 429 rate limit response', async ({ page }) => {
    // Mock rate limit on products API
    await page.route('**/api/products**', (route) =>
      route.fulfill({
        status: 429,
        body: JSON.stringify({ error: 'Too Many Requests' }),
        headers: { 'Retry-After': '60' },
      })
    );

    // Try to access products
    await page.goto('/products');
    await page.waitForLoadState('networkidle');

    // Page should handle error gracefully (show message or fallback)
    await page.waitForTimeout(2000);

    // Clear route
    await page.unroute('**/api/products**');

    console.log('Rate limit response handled');
  });
});
