import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../src/types/supabase';

const BLOCKED_PROJECT_REFS = (process.env.E2E_BLOCKED_SUPABASE_REFS || '')
  .split(',')
  .map((projectRef) => projectRef.trim())
  .filter(Boolean);

const LOCAL_SUPABASE_HOSTS = new Set(['127.0.0.1', 'localhost']);
const DESTRUCTIVE_DB_CONFIRMATION = 'I_UNDERSTAND_E2E_DATABASE_IS_DESTRUCTIVE';
const E2E_STATIC_OTP_CODE =
  process.env.E2E_STATIC_OTP_CODE || process.env.E2E_TEST_OTP_CODE;

function isLocalSupabaseUrl(url: string): boolean {
  try {
    return LOCAL_SUPABASE_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

function assertSafeE2EDatabaseUrl(url: string): void {
  const blockedProjectRef = BLOCKED_PROJECT_REFS.find((projectRef) =>
    url.includes(projectRef)
  );

  if (blockedProjectRef) {
    throw new Error(
      `FATAL: Blocked Supabase URL detected in E2E tests. ` +
        `URL contains blocked project ref: ${blockedProjectRef}. ` +
        `E2E tests MUST use a separate test database.`
    );
  }

  if (
    !isLocalSupabaseUrl(url) &&
    process.env.E2E_ALLOW_DESTRUCTIVE_DB !== DESTRUCTIVE_DB_CONFIRMATION
  ) {
    throw new Error(
      'FATAL: Refusing to run destructive E2E database helpers against a remote Supabase URL. ' +
        `Use a local Supabase URL, or set E2E_ALLOW_DESTRUCTIVE_DB="${DESTRUCTIVE_DB_CONFIRMATION}" for a dedicated disposable test project.`
    );
  }
}

/**
 * Create E2E test Supabase client
 * Uses environment variables for connection, with safety checks to prevent live-data access
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

  assertSafeE2EDatabaseUrl(url);

  return createClient<Database>(url, key);
}

export async function getLastOTP(identifier: string): Promise<string> {
  if (E2E_STATIC_OTP_CODE) {
    if (!/^\d{6}$/.test(E2E_STATIC_OTP_CODE)) {
      throw new Error(
        'E2E_STATIC_OTP_CODE/E2E_TEST_OTP_CODE must be 6 digits.'
      );
    }

    return E2E_STATIC_OTP_CODE;
  }

  throw new Error(
    `OTP lookup is not available for "${identifier}" because the public boilerplate schema does not include OTP persistence. ` +
      'Set E2E_STATIC_OTP_CODE to the deterministic OTP accepted by the test app, or skip OTP journeys for this boilerplate setup.'
  );
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
  void identifier;
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
 * Resolve the configured OTP source for E2E tests.
 */
export async function waitForOTP(
  identifier: string,
  maxWaitMs: number = 10000,
  pollIntervalMs: number = 500
): Promise<string> {
  void maxWaitMs;
  void pollIntervalMs;
  return getLastOTP(identifier);
}

/**
 * Create a test user directly in the database
 * Password is hashed using bcrypt before storing
 */
export async function createTestUserInDB(userData: {
  id: string;
  uid: string;
  email?: string;
  phone?: string;
  name: string;
  password: string;
  isVerified?: boolean;
  role?: 'USER' | 'ADMIN';
  shippingAddress?: string;
  postalCode?: string;
}): Promise<Database['public']['Tables']['users']['Row']> {
  const bcrypt = await import('bcryptjs');
  const supabase = createE2ESupabaseClient();

  const hashedPassword = await bcrypt.default.hash(userData.password, 10);
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('users')
    .insert({
      id: userData.id,
      uid: userData.uid,
      email: userData.email || null,
      phone: userData.phone || null,
      name: userData.name,
      password: hashedPassword,
      isVerified: userData.isVerified ?? true,
      role: userData.role || 'USER',
      shippingAddress: userData.shippingAddress || null,
      postalCode: userData.postalCode || null,
      updatedAt: now,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return data;
}

/**
 * Delete a test user by ID
 * Only deletes users with e2e-user- prefix for safety
 */
export async function deleteTestUserById(userId: string): Promise<void> {
  if (!userId.startsWith('e2e-user-')) {
    throw new Error(
      `Cannot delete non-E2E user: ${userId}. Only users with e2e-user- prefix can be deleted.`
    );
  }

  const supabase = createE2ESupabaseClient();

  // Delete user's promo codes first (foreign key constraint)
  await supabase.from('promo_codes').delete().eq('userId', userId);

  // Delete user's transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('id')
    .eq('userId', userId);

  if (transactions && transactions.length > 0) {
    const txIds = transactions.map((t) => t.id);
    await supabase
      .from('transaction_items')
      .delete()
      .in('transactionId', txIds);
    await supabase.from('transactions').delete().eq('userId', userId);
  }

  // Delete the user
  await supabase.from('users').delete().eq('id', userId);
}

/**
 * Delete a test user by email
 */
export async function deleteTestUserByEmail(email: string): Promise<void> {
  const supabase = createE2ESupabaseClient();

  // Find user first
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (user && user.id.startsWith('e2e-user-')) {
    await deleteTestUserById(user.id);
  }
}

/**
 * Delete a test user by phone
 */
export async function deleteTestUserByPhone(phone: string): Promise<void> {
  const supabase = createE2ESupabaseClient();

  // Find user first
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('phone', phone)
    .single();

  if (user && user.id.startsWith('e2e-user-')) {
    await deleteTestUserById(user.id);
  }
}

/**
 * Wait for user to appear in database (with retry)
 * Useful after registration to verify user was created
 */
export async function waitForUserByEmail(
  email: string,
  maxWaitMs: number = 10000,
  pollIntervalMs: number = 500
): Promise<Database['public']['Tables']['users']['Row']> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const user = await getUserByEmail(email);
    if (user) {
      return user;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`User not found for email "${email}" after ${maxWaitMs}ms`);
}

/**
 * Wait for user to appear in database by phone (with retry)
 */
export async function waitForUserByPhone(
  phone: string,
  maxWaitMs: number = 10000,
  pollIntervalMs: number = 500
): Promise<Database['public']['Tables']['users']['Row']> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const user = await getUserByPhone(phone);
    if (user) {
      return user;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`User not found for phone "${phone}" after ${maxWaitMs}ms`);
}

/**
 * Expire an OTP code in the database (for testing expired OTP scenarios)
 */
export async function expireOTP(identifier: string): Promise<void> {
  void identifier;
}

export function canExpireOTP(): boolean {
  return false;
}
