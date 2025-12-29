import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/types/supabase';

// Production Supabase project identifier - MUST be blocked in E2E tests
// Production: tanqgnztclrucfldxhuk (kitia production)
// Preview:    gozxjxtnrbuurmstjydo (Kitia-preview) - OK for E2E tests
const PRODUCTION_PROJECT_ID = 'tanqgnztclrucfldxhuk';

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

/**
 * Get transaction by transaction code
 */
export async function getTransactionByCode(
  code: string
): Promise<Database['public']['Tables']['transactions']['Row'] | null> {
  const supabase = createE2ESupabaseClient();

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('transactionCode', code)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(
      `Failed to get transaction by code "${code}": ${error.message}`
    );
  }

  return data;
}

/**
 * Get transaction with items by transaction ID
 */
export async function getTransactionWithItems(transactionId: string): Promise<{
  transaction: Database['public']['Tables']['transactions']['Row'];
  items: Database['public']['Tables']['transaction_items']['Row'][];
}> {
  const supabase = createE2ESupabaseClient();

  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', transactionId)
    .single();

  if (txError) {
    throw new Error(
      `Failed to get transaction "${transactionId}": ${txError.message}`
    );
  }

  const { data: items, error: itemsError } = await supabase
    .from('transaction_items')
    .select('*')
    .eq('transactionId', transactionId);

  if (itemsError) {
    throw new Error(
      `Failed to get transaction items for "${transactionId}": ${itemsError.message}`
    );
  }

  return { transaction, items: items || [] };
}

/**
 * Delete test transaction by phone (for cleanup)
 * Only deletes transactions created with E2E test phone patterns
 */
export async function deleteTestTransactionsByPhone(
  phone: string
): Promise<void> {
  const supabase = createE2ESupabaseClient();

  // First get transaction IDs to delete their items
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id')
    .eq('phone', phone);

  if (transactions && transactions.length > 0) {
    const txIds = transactions.map((t) => t.id);

    // Delete transaction items first (foreign key constraint)
    await supabase
      .from('transaction_items')
      .delete()
      .in('transactionId', txIds);

    // Delete transactions
    await supabase.from('transactions').delete().eq('phone', phone);
  }
}

/**
 * Delete test OTP verifications by identifier (for cleanup)
 */
export async function deleteTestOTPsByIdentifier(
  identifier: string
): Promise<void> {
  const supabase = createE2ESupabaseClient();
  await supabase
    .from('otp_verifications')
    .delete()
    .eq('identifier', identifier);
}

/**
 * Get an active product with stock for testing
 */
export async function getTestProduct(): Promise<{
  id: string;
  name: string;
  price: number;
  stock: number;
}> {
  const supabase = createE2ESupabaseClient();

  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, stock')
    .eq('isActive', true)
    .gt('stock', 0)
    .gt('price', 0) // Ensure valid price
    .order('stock', { ascending: false }) // Prefer products with more stock
    .limit(1)
    .single();

  if (error) {
    throw new Error(`Failed to get test product: ${error.message}`);
  }

  if (!data) {
    throw new Error('No active products with stock found for testing');
  }

  return {
    id: data.id,
    name: data.name,
    price: Number(data.price),
    stock: data.stock,
  };
}

/**
 * Wait for OTP to appear in database (with retry)
 */
export async function waitForOTP(
  identifier: string,
  maxWaitMs: number = 10000,
  pollIntervalMs: number = 500
): Promise<string> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const code = await getLastOTP(identifier);
      return code;
    } catch {
      // OTP not found yet, wait and retry
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  throw new Error(
    `OTP not found for identifier "${identifier}" after ${maxWaitMs}ms`
  );
}
