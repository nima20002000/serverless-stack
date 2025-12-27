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
 * Uses service role key for full access to bypass RLS
 */
export function createTestSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are set in tests/.env'
    );
  }

  return createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
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
 * Generate next UID for test user creation
 * Follows the same logic as generateNextUID in user-service.ts
 * Format: U-{6-digit number}
 */
export async function generateTestUID(): Promise<string> {
  const supabase = createTestSupabaseClient();

  // Query for the highest UID, matching only 6-digit UIDs to avoid timestamp-based ones
  // Use maybeSingle() to handle case when no rows are returned
  const { data } = await supabase
    .from('users')
    .select('uid')
    .like('uid', 'U-______') // Match exactly 8 characters (U- + 6 digits)
    .order('uid', { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNumber = 1;

  if (data?.uid) {
    // Extract number from UID (e.g., "U-000123" -> 123)
    const match = data.uid.match(/^U-(\d{6})$/);
    if (match) {
      const currentNumber = parseInt(match[1], 10);
      // For test users, start from 100000 to avoid conflicts with production users
      nextNumber = Math.max(currentNumber + 1, 100000);
    }
  } else {
    // No existing UIDs found, start from 100000 for tests
    nextNumber = 100000;
  }

  // Ensure we stay within 6-digit range (max 999999)
  if (nextNumber > 999999) {
    nextNumber = 100000; // Wrap around
  }

  // Format as U-{6-digit number}
  return `U-${nextNumber.toString().padStart(6, '0')}`;
}
