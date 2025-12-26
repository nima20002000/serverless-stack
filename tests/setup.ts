/**
 * Global test setup file
 * Runs before all test suites
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { vi } from 'vitest';

// Load test environment variables
config({ path: resolve(__dirname, '.env') });

// Allow server-only modules to load in Node test environment
vi.mock('server-only', () => ({}));

// Global test timeout
const DEFAULT_TIMEOUT = 30000;

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    throw new Error(
      `Missing required environment variable: ${envVar}\n` +
      'Please copy .env.example to .env and configure test credentials.'
    );
  }
}

// Warning for production credentials
if (
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('tanqgnztclrucfldxhuk') ||
  process.env.UPSTASH_REDIS_REST_URL?.includes('production')
) {
  throw new Error(
    '⛔ FATAL: Production credentials detected in test environment!\n' +
    'Tests must NEVER run against production services.\n' +
    'Use preview/staging/test instances only.'
  );
}

// Global setup logging
console.log('🧪 Test Environment Configuration:');
console.log('  - Supabase:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('  - Redis:', process.env.UPSTASH_REDIS_REST_URL ? 'Configured' : 'Not configured');
console.log('  - Record Mode:', process.env.RECORD_CONTRACTS === 'true' ? 'ENABLED' : 'Disabled');
console.log('  - Timeout:', DEFAULT_TIMEOUT, 'ms');
console.log('');

export { DEFAULT_TIMEOUT };
