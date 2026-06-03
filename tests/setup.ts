/**
 * Global test setup file
 * Runs before all test suites
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { vi } from 'vitest';

// Load test environment variables
config({ path: resolve(__dirname, '.env') });

// Unit tests are mocked by default. Provide local placeholder values when
// tests/.env is absent so unit checks do not require live service credentials.
const unitTestDefaults: Record<string, string> = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://127.0.0.1:54321',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
  SUPABASE_SECRET_KEY: 'test-secret-key',
  DATABASE_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
};

for (const [key, value] of Object.entries(unitTestDefaults)) {
  process.env[key] ||= value;
}

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

const blockedSupabaseRefs = (process.env.TEST_BLOCKED_SUPABASE_REFS || '')
  .split(',')
  .map((projectRef) => projectRef.trim())
  .filter(Boolean);
const REMOTE_TEST_DB_CONFIRMATION = 'I_UNDERSTAND_TEST_DATABASE_IS_DESTRUCTIVE';
const TEST_REDIS_CONFIRMATION = 'I_UNDERSTAND_TEST_REDIS_IS_DESTRUCTIVE';

const blockedSupabaseRef = blockedSupabaseRefs.find((projectRef) =>
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes(projectRef)
);

function isLocalSupabaseUrl(url: string | undefined): boolean {
  if (!url) return false;

  try {
    const hostname = new URL(url).hostname;
    return hostname === '127.0.0.1' || hostname === 'localhost';
  } catch {
    return false;
  }
}

// Guard against unsafe shared-service credentials.
if (
  blockedSupabaseRef ||
  (!isLocalSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    process.env.TEST_ALLOW_DESTRUCTIVE_DB !== REMOTE_TEST_DB_CONFIRMATION) ||
  (process.env.UPSTASH_REDIS_REST_URL &&
    process.env.TEST_ALLOW_SHARED_REDIS !== TEST_REDIS_CONFIRMATION)
) {
  throw new Error(
    'FATAL: unsafe shared-service credentials detected in the test environment.\n' +
      'Tests must run against local Supabase and no Redis by default.\n' +
      `For a dedicated disposable hosted test project, set TEST_ALLOW_DESTRUCTIVE_DB="${REMOTE_TEST_DB_CONFIRMATION}".\n` +
      `For a dedicated disposable Redis instance, set TEST_ALLOW_SHARED_REDIS="${TEST_REDIS_CONFIRMATION}".`
  );
}

// Global setup logging
console.log('🧪 Test Environment Configuration:');
console.log('  - Supabase:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log(
  '  - Redis:',
  process.env.UPSTASH_REDIS_REST_URL ? 'Configured' : 'Not configured'
);
console.log(
  '  - Record Mode:',
  process.env.RECORD_CONTRACTS === 'true' ? 'ENABLED' : 'Disabled'
);
console.log('  - Timeout:', DEFAULT_TIMEOUT, 'ms');
console.log('');

export { DEFAULT_TIMEOUT };
