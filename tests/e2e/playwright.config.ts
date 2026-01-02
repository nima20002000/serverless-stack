import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load E2E environment variables
const e2eEnvPath = path.resolve(__dirname, '.env');
const { parsed: e2eEnv } = dotenv.config({ path: e2eEnvPath, override: true });
const e2eNextAuthSecret =
  process.env.NEXTAUTH_SECRET || e2eEnv?.NEXTAUTH_SECRET;

/**
 * Playwright E2E Test Configuration for Kitia e-commerce platform
 *
 * @see https://playwright.dev/docs/test-configuration
 */
const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3000';

const webServerEnv = {
  ...process.env,
  E2E_MOCK_PAYMENTS: 'true',
  E2E_TEST: 'true',
  NEXT_PUBLIC_E2E_TEST: 'true',
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  NEXTAUTH_SECRET: e2eNextAuthSecret,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
};

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
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'fa-IR',
    timezoneId: 'Asia/Tehran',
    extraHTTPHeaders: {
      'x-e2e-test': 'true',
    },
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
    reuseExistingServer: false,
    timeout: 120000,
    // Pass E2E environment variables to the dev server
    env: webServerEnv,
  },

  reporter: process.env.CI
    ? [['html', { outputFolder: 'playwright-report' }]]
    : [['list']],

  outputDir: 'test-results/',
});
