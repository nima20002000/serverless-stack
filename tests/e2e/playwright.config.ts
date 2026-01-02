import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load E2E environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * Playwright E2E Test Configuration for Kitia e-commerce platform
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: '.',
  // Run tests sequentially to avoid database state conflicts
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Single worker to ensure tests run one by one
  workers: 1,
  timeout: 120000, // 2 minutes - checkout flow can take time

  expect: {
    timeout: 10000,
  },

  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'fa-IR',
    timezoneId: 'Asia/Tehran',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'], // Use Chromium-based mobile emulation instead of webkit
      },
    },
  ],

  webServer: {
    command: 'npm run dev:plain',
    cwd: '../..',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    // Pass E2E environment variables to the dev server
    env: {
      ...process.env,
      // Explicitly set E2E mock mode for payment verification
      E2E_MOCK_PAYMENTS: 'true',
      NEXT_PUBLIC_E2E_MOCK_PAYMENTS: 'true',
    },
  },

  reporter: process.env.CI
    ? [['html', { outputFolder: 'playwright-report' }]]
    : [['list']],

  outputDir: 'test-results/',
});
