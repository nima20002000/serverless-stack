import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/types/supabase';

// Production Supabase project identifier - MUST be blocked in E2E tests
const PRODUCTION_PROJECT_ID = 'gozxjxtnrbuurmstjydo';

/**
 * Create E2E test Supabase client
 * Uses environment variables for connection, with safety checks to prevent production access
 */
export function createE2ESupabaseClient(): SupabaseClient<Database> {
  // Try E2E-specific env vars first, fall back to main app env vars
  const url =
    process.env.E2E_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.E2E_SUPABASE_SECRET_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error(
      'E2E Supabase credentials not configured. ' +
        'Set E2E_SUPABASE_URL and E2E_SUPABASE_SECRET_KEY environment variables.'
    );
  }

  // CRITICAL SAFETY CHECK: Prevent accidental production access
  if (url.includes(PRODUCTION_PROJECT_ID)) {
    throw new Error(
      `FATAL: Production Supabase URL detected in E2E tests! ` +
        `URL contains production project ID: ${PRODUCTION_PROJECT_ID}. ` +
        `E2E tests MUST use a separate test database.`
    );
  }

  return createClient<Database>(url, key);
}

/**
 * Get last OTP code for a phone/email identifier
 * Used to retrieve real OTP codes from the database during E2E tests
 */
export async function getLastOTP(identifier: string): Promise<string> {
  const supabase = createE2ESupabaseClient();

  const { data, error } = await supabase
    .from('otp_verifications')
    .select('code')
    .eq('identifier', identifier)
    .order('createdAt', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    throw new Error(
      `Failed to get OTP for identifier "${identifier}": ${error.message}`
    );
  }

  if (!data) {
    throw new Error(`No OTP found for identifier "${identifier}"`);
  }

  return data.code;
}

/**
 * Get last transaction for a user by user ID
 */
export async function getLastTransaction(
  userId: string
): Promise<Database['public']['Tables']['transactions']['Row']> {
  const supabase = createE2ESupabaseClient();

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('userId', userId)
    .order('createdAt', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    throw new Error(
      `Failed to get transaction for user "${userId}": ${error.message}`
    );
  }

  if (!data) {
    throw new Error(`No transaction found for user "${userId}"`);
  }

  return data;
}

/**
 * Get last transaction by phone number (for guest checkout)
 */
export async function getLastTransactionByPhone(
  phone: string
): Promise<Database['public']['Tables']['transactions']['Row']> {
  const supabase = createE2ESupabaseClient();

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('phone', phone)
    .order('createdAt', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    throw new Error(
      `Failed to get transaction for phone "${phone}": ${error.message}`
    );
  }

  if (!data) {
    throw new Error(`No transaction found for phone "${phone}"`);
  }

  return data;
}

/**
 * Get product stock by product ID
 */
export async function getProductStock(productId: string): Promise<number> {
  const supabase = createE2ESupabaseClient();

  const { data, error } = await supabase
    .from('products')
    .select('stock')
    .eq('id', productId)
    .single();

  if (error) {
    throw new Error(
      `Failed to get stock for product "${productId}": ${error.message}`
    );
  }

  if (!data) {
    throw new Error(`Product not found: "${productId}"`);
  }

  return data.stock;
}

/**
 * Get user by email
 */
export async function getUserByEmail(
  email: string
): Promise<Database['public']['Tables']['users']['Row'] | null> {
  const supabase = createE2ESupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get user by email "${email}": ${error.message}`);
  }

  return data;
}

/**
 * Get user by phone
 */
export async function getUserByPhone(
  phone: string
): Promise<Database['public']['Tables']['users']['Row'] | null> {
  const supabase = createE2ESupabaseClient();

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('phone', phone)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(`Failed to get user by phone "${phone}": ${error.message}`);
  }

  return data;
}
