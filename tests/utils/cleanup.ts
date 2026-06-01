/**
 * Test Cleanup Utilities
 *
 * Functions for cleaning up test data after test runs.
 * All cleanup functions are designed to be idempotent and safe to run multiple times.
 */

import { createTestSupabaseClient, createTestRedisClient } from './test-client';
import { cleanupTestActivityLogs } from './activity-log-helpers';

const TEST_PREFIX = 'TEST-';
const INTEGRATION_PREFIX = 'INTEGRATION-';

/**
 * Delete all test users
 * Matches users with email starting with "test-" or generic test phone prefixes.
 * Also matches common test prefixes: register-, duplicate-, sequential-, race-, etc.
 */
export async function cleanupTestUsers() {
  const supabase = createTestSupabaseClient();

  // Delete users created during tests
  // Match various test patterns used in generateUniqueTestUser
  const { error } = await supabase
    .from('users')
    .delete()
    .or(
      `email.like.%-%-%@example.com,email.like.test-%@%,phone.like.+1202555%`
    );

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows deleted
    console.warn('Failed to cleanup test users:', error);
  }
}

/**
 * Delete all test products
 * Matches products with name starting with TEST- or INTEGRATION-
 */
export async function cleanupTestProducts() {
  const supabase = createTestSupabaseClient();

  console.log('    [cleanup] Querying test products...');
  // First, get all test product IDs
  const { data: testProducts } = await supabase
    .from('products')
    .select('id')
    .or(`name.like.${TEST_PREFIX}%,name.like.${INTEGRATION_PREFIX}%`);

  console.log(`    [cleanup] Found ${testProducts?.length || 0} test products`);

  if (!testProducts || testProducts.length === 0) {
    return; // No test products to clean up
  }

  const productIds = testProducts.map((p) => p.id);

  console.log('    [cleanup] Deleting product media...');
  // Delete product media
  await supabase.from('product_media').delete().in('productId', productIds);

  console.log('    [cleanup] Deleting product variants...');
  // Delete product variants
  await supabase.from('product_variants').delete().in('productId', productIds);

  console.log('    [cleanup] Deleting product-tag relationships...');
  // Delete product-tag relationships
  await supabase.from('_ProductToTag').delete().in('A', productIds);

  console.log('    [cleanup] Deleting products...');
  // Finally delete products
  const { error } = await supabase
    .from('products')
    .delete()
    .in('id', productIds);

  console.log('    [cleanup] Products cleanup complete');

  if (error && error.code !== 'PGRST116') {
    console.warn('Failed to cleanup test products:', error);
  }
}

/**
 * Delete all test transactions
 * Matches transactions with code starting with TEST- or TX-TEST
 */
export async function cleanupTestTransactions() {
  const supabase = createTestSupabaseClient();

  // First, get all test transaction IDs
  const { data: testTransactions } = await supabase
    .from('transactions')
    .select('id')
    .or(`transactionCode.like.TEST-%,transactionCode.like.TX-TEST%`);

  if (!testTransactions || testTransactions.length === 0) {
    return; // No test transactions to clean up
  }

  const transactionIds = testTransactions.map((t) => t.id);

  // Delete transaction items
  await supabase
    .from('transaction_items')
    .delete()
    .in('transactionId', transactionIds);

  // Delete invoices
  await supabase.from('invoices').delete().in('transactionId', transactionIds);

  // Delete transactions
  const { error } = await supabase
    .from('transactions')
    .delete()
    .in('id', transactionIds);

  if (error && error.code !== 'PGRST116') {
    console.warn('Failed to cleanup test transactions:', error);
  }
}

/**
 * Delete all test categories
 * Matches categories with slug starting with test- or integration-
 */
export async function cleanupTestCategories() {
  const supabase = createTestSupabaseClient();

  const { error } = await supabase
    .from('categories')
    .delete()
    .or(`slug.like.test-%,slug.like.integration-%`);

  if (error && error.code !== 'PGRST116') {
    console.warn('Failed to cleanup test categories:', error);
  }
}

/**
 * Delete all test tags
 * Matches tags with slug starting with test- or integration-
 */
export async function cleanupTestTags() {
  const supabase = createTestSupabaseClient();

  // First, get all test tag IDs
  const { data: testTags } = await supabase
    .from('tags')
    .select('id')
    .or(`slug.like.test-%,slug.like.integration-%`);

  if (!testTags || testTags.length === 0) {
    return; // No test tags to clean up
  }

  const tagIds = testTags.map((t) => t.id);

  // Delete tag relationships
  await supabase.from('_ProductToTag').delete().in('B', tagIds);

  // Delete tags
  const { error } = await supabase.from('tags').delete().in('id', tagIds);

  if (error && error.code !== 'PGRST116') {
    console.warn('Failed to cleanup test tags:', error);
  }
}

export async function cleanupTestOTPs() {
  return;
}

/**
 * Delete all test promo codes
 * Matches codes starting with TEST or INTEGRATION
 */
export async function cleanupTestPromoCodes() {
  const supabase = createTestSupabaseClient();

  const { error: codeError } = await supabase
    .from('promo_codes')
    .delete()
    .or(`code.like.TEST%,code.like.INTEGRATION%`);

  if (codeError && codeError.code !== 'PGRST116') {
    console.warn('Failed to cleanup test promo codes by code:', codeError);
  }

  // Delete promo codes created for test users (WELCOME-* codes)
  const { data: testUsers, error: userFetchError } = await supabase
    .from('users')
    .select('id')
    .or(`email.like.test-%@%,phone.like.+1202555%`);

  if (userFetchError && userFetchError.code !== 'PGRST116') {
    console.warn(
      'Failed to fetch test users for promo cleanup:',
      userFetchError
    );
    return;
  }

  if (!testUsers || testUsers.length === 0) {
    return;
  }

  const userIds = testUsers.map((user) => user.id);

  const { error: userPromoError } = await supabase
    .from('promo_codes')
    .delete()
    .in('userId', userIds)
    .like('code', 'WELCOME-%');

  if (userPromoError && userPromoError.code !== 'PGRST116') {
    console.warn('Failed to cleanup test promo codes by user:', userPromoError);
  }
}

/**
 * Clear test cache keys from Redis
 * Clears known cache key patterns used during tests
 */
export async function cleanupTestCache() {
  const redis = createTestRedisClient();

  if (!redis) {
    console.log('    [cleanup] Redis not configured, skipping cache cleanup');
    return;
  }

  try {
    console.log('    [cleanup] Starting Redis cleanup...');
    // Clear common product cache keys (pages 1-10)
    const productCacheKeys = [];
    for (let page = 1; page <= 10; page++) {
      productCacheKeys.push(`products:active:page:${page}:limit:20`);
      productCacheKeys.push(`products:active:page:${page}:limit:50`);
      productCacheKeys.push(`products:featured:page:${page}:limit:20`);
      productCacheKeys.push(`products:discounted:page:${page}:limit:20`);
    }

    // Clear test-specific cache keys
    const testCacheKeys = [
      'test:connection',
      'test:product:*',
      'test:transaction:*',
      'test:user:*',
    ];

    const allKeys = [...productCacheKeys, ...testCacheKeys];

    console.log(`    [cleanup] Deleting ${allKeys.length} cache keys...`);

    // Delete in batches for better performance
    const batchSize = 10;
    for (let i = 0; i < allKeys.length; i += batchSize) {
      const batch = allKeys.slice(i, i + batchSize);
      console.log(
        `    [cleanup] Deleting batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(allKeys.length / batchSize)}...`
      );
      await Promise.all(
        batch.map((key) =>
          redis.del(key).catch((err) => {
            console.log(`    [cleanup] Failed to delete ${key}:`, err.message);
          })
        )
      );
    }

    console.log('    [cleanup] Redis cleanup complete');
  } catch (error) {
    console.warn('Failed to cleanup Redis cache:', error);
  }
}

/**
 * Clean up all test data
 * Runs all cleanup functions in the correct order
 */
export async function cleanupAllTestData() {
  // Order matters: delete dependent records first
  await cleanupTestActivityLogs(); // Activity logs reference users, clean first
  await cleanupTestTransactions(); // Has foreign keys to users & products
  await cleanupTestOTPs(); // Independent
  await cleanupTestPromoCodes(); // Independent
  await cleanupTestProducts(); // Has foreign keys to categories & tags
  await cleanupTestCategories(); // May have parent-child relationships
  await cleanupTestTags(); // Independent
  await cleanupTestUsers(); // Has transactions as dependents (but we already deleted those)
  await cleanupTestCache(); // Clean Redis last
}

/**
 * Delete a specific test user by email
 */
export async function deleteTestUserByEmail(email: string) {
  const supabase = createTestSupabaseClient();

  const { error } = await supabase.from('users').delete().eq('email', email);

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
}

/**
 * Delete a specific test user by phone
 */
export async function deleteTestUserByPhone(phone: string) {
  const supabase = createTestSupabaseClient();

  const { error } = await supabase.from('users').delete().eq('phone', phone);

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
}

/**
 * Delete a specific test product by ID
 */
export async function deleteTestProductById(id: string) {
  const supabase = createTestSupabaseClient();

  // Delete media first
  await supabase.from('product_media').delete().eq('productId', id);

  // Delete variants
  await supabase.from('product_variants').delete().eq('productId', id);

  // Delete tag relationships
  await supabase.from('_ProductToTag').delete().eq('A', id);

  // Delete product
  const { error } = await supabase.from('products').delete().eq('id', id);

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
}
