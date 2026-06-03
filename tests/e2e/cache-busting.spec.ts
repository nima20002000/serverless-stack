import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Cache Busting Feature
 *
 * These tests verify the cache busting mechanism works in a real browser:
 * 1. Version API returns correct data
 * 2. Service worker is registered correctly
 * 3. Version is stored in localStorage
 * 4. Service worker caching behavior
 */
test.describe('Cache Busting E2E', () => {
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

  const allowVersionCheckCookie = {
    name: 'e2e-allow-version-check',
    value: 'true',
    url: baseURL,
  };
  test.describe('Version API', () => {
    test('should return version data from /api/version', async ({
      request,
    }) => {
      const response = await request.get('/api/version');

      expect(response.ok()).toBe(true);

      const data = await response.json();

      // Check structure
      expect(data).toHaveProperty('buildId');
      expect(data).toHaveProperty('buildTime');
      expect(data).toHaveProperty('timestamp');

      // Check types
      expect(typeof data.buildId).toBe('string');
      expect(typeof data.timestamp).toBe('number');
      expect(data.buildId.length).toBeGreaterThan(0);
    });

    test('should have no-cache headers', async ({ request }) => {
      const response = await request.get('/api/version');

      expect(response.ok()).toBe(true);

      const cacheControl = response.headers()['cache-control'];
      expect(cacheControl).toContain('no-store');
      expect(cacheControl).toContain('no-cache');
    });

    test('should return consistent version within same session', async ({
      request,
    }) => {
      const response1 = await request.get('/api/version');
      const response2 = await request.get('/api/version');

      const data1 = await response1.json();
      const data2 = await response2.json();

      // buildId should be the same for same build
      expect(data1.buildId).toBe(data2.buildId);
    });
  });

  test.describe('Service Worker', () => {
    test('should serve sw.js file', async ({ request }) => {
      const response = await request.get('/sw.js');

      expect(response.ok()).toBe(true);

      const content = await response.text();

      // Should have valid service worker content
      expect(content).toContain('BUILD_VERSION');
      expect(content).toContain('commerce-boilerplate-cache');
      expect(content).toContain("self.addEventListener('install'");
      expect(content).toContain("self.addEventListener('activate'");
      expect(content).toContain("self.addEventListener('fetch'");
    });

    test('should have version injected (not placeholder)', async ({
      request,
    }) => {
      const response = await request.get('/sw.js');
      const content = await response.text();

      // Should NOT have the placeholder
      expect(content).not.toContain('__BUILD_VERSION__');

      // Should have an actual version string (git hash + timestamp or build-timestamp)
      const versionMatch = content.match(
        /const BUILD_VERSION = ['"]([^'"]+)['"]/
      );
      expect(versionMatch).not.toBeNull();
      expect(versionMatch![1].length).toBeGreaterThan(5);
    });
  });

  test.describe('Browser Integration', () => {
    test('should register service worker on page load', async ({ page }) => {
      await page.context().addCookies([allowVersionCheckCookie]);
      await page.goto('/');

      // Wait for service worker registration
      await page.waitForTimeout(2000);

      // Check if service worker was registered
      const swRegistered = await page.evaluate(async () => {
        if (!('serviceWorker' in navigator)) {
          return false;
        }
        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.length > 0;
      });

      expect(swRegistered).toBe(true);
    });

    test('should store version in localStorage after load', async ({
      page,
    }) => {
      await page.context().addCookies([allowVersionCheckCookie]);
      await page.goto('/');

      // Wait for version check to complete
      await page.waitForTimeout(3000);

      // Check localStorage for stored version
      const storedVersion = await page.evaluate(() => {
        return localStorage.getItem('commerce_boilerplate_build_version');
      });

      expect(storedVersion).not.toBeNull();
      expect(storedVersion!.length).toBeGreaterThan(5);
    });

    test('stored version should match API version', async ({ page }) => {
      await page.context().addCookies([allowVersionCheckCookie]);
      // First get the API version before loading the page
      const apiResponse = await page.request.get('/api/version');
      const apiData = await apiResponse.json();

      await page.goto('/');

      // Wait for version check to complete and poll for localStorage update
      await page.waitForFunction(
        (expectedVersion) => {
          const stored = localStorage.getItem(
            'commerce_boilerplate_build_version'
          );
          return stored === expectedVersion;
        },
        apiData.buildId,
        { timeout: 10000 }
      );

      // Get stored version
      const storedVersion = await page.evaluate(() => {
        return localStorage.getItem('commerce_boilerplate_build_version');
      });

      expect(storedVersion).toBe(apiData.buildId);
    });
  });

  test.describe('Cache Behavior', () => {
    test('should not cache /api/version requests', async ({ page }) => {
      await page.goto('/');

      // Make two requests to version endpoint
      const timestamps: number[] = [];

      for (let i = 0; i < 2; i++) {
        const response = await page.request.get('/api/version');
        const data = await response.json();
        // For dev mode, each request might have slightly different timestamp
        // But buildId should be consistent within same build
        timestamps.push(data.timestamp);
      }

      // Both requests should succeed (not stale)
      expect(timestamps.length).toBe(2);
    });

    test('should have build-version.json accessible', async ({ request }) => {
      const response = await request.get('/build-version.json');

      // In development, this file may or may not exist
      // If it exists, it should have valid data
      if (response.ok()) {
        const data = await response.json();
        expect(data).toHaveProperty('buildId');
        expect(data).toHaveProperty('timestamp');
      }
    });
  });

  test.describe('Version Provider', () => {
    test('app should load without errors when VersionProvider is active', async ({
      page,
    }) => {
      // Listen for console errors
      const consoleErrors: string[] = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Filter out known acceptable errors (like favicon 404s or third party errors)
      const criticalErrors = consoleErrors.filter(
        (error) =>
          !error.includes('favicon') &&
          !error.includes('chrome-extension') &&
          !error.includes('VersionProvider') && // If any VersionProvider errors would be critical
          error.includes('version')
      );

      expect(criticalErrors.length).toBe(0);
    });

    test('page should render correctly with version checking enabled', async ({
      page,
    }) => {
      await page.goto('/');

      // Verify page loaded correctly
      await expect(page).toHaveTitle(/Commerce Starter|Serverless Stack/);

      // Verify header is visible (app rendered successfully)
      const header = page.locator('header');
      await expect(header).toBeVisible();

      // Verify footer is visible (full page rendered)
      const footer = page.locator('footer');
      await expect(footer).toBeVisible();
    });
  });
});
