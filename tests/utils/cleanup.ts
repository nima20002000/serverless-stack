/**
 * Test Cleanup Utilities
 *
 * Functions for cleaning up test data after test runs.
 * All cleanup functions are designed to be idempotent and safe to run multiple times.
 */

import { createTestSupabaseClient, createTestRedisClient } from './test-client';

const TEST_PREFIX = 'TEST-';
const INTEGRATION_PREFIX = 'INTEGRATION-';

/**
 * Delete all test users
 * Matches users with email starting with "test-" or phone starting with "091200000"
 */
export async function cleanupTestUsers() {
  const supabase = createTestSupabaseClient();

  // Delete users created during tests
  const { error } = await supabase
    .from('users')
    .delete()
    .or(`email.like.test-%@%,phone.like.091200000%`);

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows deleted
    console.warn('Failed to cleanup test users:', error);
  }
}

/**
 * Delete all test products
 * Matches products with name starting with TEST- or INTEGRATION-
 */
export async function cleanupTestProducts() {
  const supabase = createTestSupabaseClient();

  // First delete product media (cascade should handle this, but explicit is safer)
  await supabase
    .from('product_media')
    .delete()
    .or(`product_id.in.(select id from products where name like '${TEST_PREFIX}%' or name like '${INTEGRATION_PREFIX}%')`);

  // Delete product variants
  await supabase
    .from('product_variants')
    .delete()
    .or(`product_id.in.(select id from products where name like '${TEST_PREFIX}%' or name like '${INTEGRATION_PREFIX}%')`);

  // Delete product-tag relationships
  await supabase
    .from('_ProductToTag')
    .delete()
    .or(`A.in.(select id from products where name like '${TEST_PREFIX}%' or name like '${INTEGRATION_PREFIX}%')`);

  // Finally delete products
  const { error } = await supabase
    .from('products')
    .delete()
    .or(`name.like.${TEST_PREFIX}%,name.like.${INTEGRATION_PREFIX}%`);

  if (error && error.code !== 'PGRST116') {
    console.warn('Failed to cleanup test products:', error);
  }
}

/**
 * Delete all test transactions
 * Matches transactions with code starting with TEST- or KT-TEST
 */
export async function cleanupTestTransactions() {
  const supabase = createTestSupabaseClient();

  // First delete transaction items
  await supabase
    .from('transaction_items')
    .delete()
    .or(`transaction_id.in.(select id from transactions where "transactionCode" like 'TEST-%' or "transactionCode" like 'KT-TEST%')`);

  // Delete invoices
  await supabase
    .from('invoices')
    .delete()
    .or(`transaction_id.in.(select id from transactions where "transactionCode" like 'TEST-%' or "transactionCode" like 'KT-TEST%')`);

  // Delete transactions
  const { error } = await supabase
    .from('transactions')
    .delete()
    .or(`transactionCode.like.TEST-%,transactionCode.like.KT-TEST%`);

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

  // First delete tag relationships
  await supabase
    .from('_ProductToTag')
    .delete()
    .or(`B.in.(select id from tags where slug like 'test-%' or slug like 'integration-%')`);

  const { error } = await supabase
    .from('tags')
    .delete()
    .or(`slug.like.test-%,slug.like.integration-%`);

  if (error && error.code !== 'PGRST116') {
    console.warn('Failed to cleanup test tags:', error);
  }
}

/**
 * Delete all test OTP verifications
 * Matches identifiers starting with test- or 091200000
 */
export async function cleanupTestOTPs() {
  const supabase = createTestSupabaseClient();

  const { error } = await supabase
    .from('otp_verifications')
    .delete()
    .or(`identifier.like.test-%,identifier.like.091200000%`);

  if (error && error.code !== 'PGRST116') {
    console.warn('Failed to cleanup test OTPs:', error);
  }
}

/**
 * Delete all test promo codes
 * Matches codes starting with TEST or INTEGRATION
 */
export async function cleanupTestPromoCodes() {
  const supabase = createTestSupabaseClient();

  const { error } = await supabase
    .from('promo_codes')
    .delete()
    .or(`code.like.TEST%,code.like.INTEGRATION%`);

  if (error && error.code !== 'PGRST116') {
    console.warn('Failed to cleanup test promo codes:', error);
  }
}

/**
 * Clear test cache keys from Redis
 * Clears known cache key patterns used during tests
 */
export async function cleanupTestCache() {
  const redis = createTestRedisClient();

  if (!redis) {
    return;
  }

  try {
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

    for (const key of allKeys) {
      await redis.del(key);
    }
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

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('email', email);

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
}

/**
 * Delete a specific test user by phone
 */
export async function deleteTestUserByPhone(phone: string) {
  const supabase = createTestSupabaseClient();

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('phone', phone);

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
  await supabase
    .from('product_media')
    .delete()
    .eq('product_id', id);

  // Delete variants
  await supabase
    .from('product_variants')
    .delete()
    .eq('product_id', id);

  // Delete tag relationships
  await supabase
    .from('_ProductToTag')
    .delete()
    .eq('A', id);

  // Delete product
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
}
