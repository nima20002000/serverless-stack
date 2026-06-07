/**
 * Test Client Utilities
 *
 * Provides factory functions for creating Supabase and Redis clients
 * configured for the test environment.
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { Redis } from '@upstash/redis';
import type { Database } from '../../src/types/supabase';

/**
 * Create a Supabase client for testing
 * Uses the Supabase secret key for full access to bypass RLS.
 *
 * Hosted Supabase projects should use the new Supabase API key format.
 * Local Supabase still prints JWT service_role keys, which are accepted for
 * local URLs only.
 */
export function createTestSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  const secretKeyPrefix = ['sb', 'secret', ''].join('_');

  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      'Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in tests/.env'
    );
  }

  const isLocalSupabase =
    new URL(supabaseUrl).hostname === '127.0.0.1' ||
    new URL(supabaseUrl).hostname === 'localhost';

  if (!isLocalSupabase && !supabaseSecretKey.startsWith(secretKeyPrefix)) {
    throw new Error(
      `Invalid SUPABASE_SECRET_KEY format. Expected the Supabase secret key prefix but got '${supabaseSecretKey.substring(0, 20)}...'\n` +
        'Please update tests/.env with the new Supabase API key format for hosted test projects.\n' +
        'See tests/docs/GETTING_SUPABASE_KEYS.md for instructions.'
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Supabase client that uses the browser-safe publishable key.
 * Use this for integration tests that must prove Data API grants and RLS.
 */
export function createTestSupabasePublishableClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      'Missing Supabase publishable credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are set in tests/.env'
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Create a Redis client for testing
 * Uses REST API via Upstash
 */
export function createTestRedisClient() {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!redisUrl || !redisToken) {
    console.warn(
      'Redis credentials not configured. Cache-related tests will be skipped.'
    );
    return null;
  }

  return new Redis({
    url: redisUrl,
    token: redisToken,
  });
}

/**
 * Test database connection
 * Throws if connection fails
 */
export async function verifySupabaseConnection() {
  const supabase = createTestSupabaseClient();

  try {
    const { error } = await supabase.from('users').select('id').limit(1);

    if (error) throw error;

    return true;
  } catch (error) {
    throw new Error(
      `Failed to connect to Supabase: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Test Redis connection
 * Returns false if Redis is not configured or fails
 */
export async function verifyRedisConnection() {
  const redis = createTestRedisClient();

  if (!redis) {
    return false;
  }

  try {
    await redis.set('test:connection', 'ok', { ex: 5 });
    const value = await redis.get('test:connection');
    await redis.del('test:connection');

    return value === 'ok';
  } catch (error) {
    console.warn('Redis connection check failed:', error);
    return false;
  }
}

/**
 * Generate a random UID for test user creation
 * Uses random numbers in range 900000-999999 to avoid common fixture UIDs
 * Format: U-{6-digit number}
 */
export async function generateTestUID(): Promise<string> {
  // Use random UID in test range (900000-999999) to avoid conflicts with parallel tests
  // and seeded data which typically uses lower numbers
  const randomNumber = 900000 + Math.floor(Math.random() * 99999);
  return `U-${randomNumber.toString().padStart(6, '0')}`;
}
