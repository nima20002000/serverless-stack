import { createE2ESupabaseClient } from '../utils/database';

/**
 * Clean up all E2E test data from the database
 * Uses pattern matching to identify test data by prefix
 *
 * IMPORTANT: This only cleans up data created by E2E tests (e2e-* prefix)
 * It will NOT affect real/production data
 */
export async function cleanupE2ETestData(): Promise<void> {
  const supabase = createE2ESupabaseClient();

  console.log('Cleaning up E2E test data...');

  // Delete test transaction items first (foreign key constraint)
  const { error: itemsError } = await supabase
    .from('transaction_items')
    .delete()
    .like('productId', 'e2e-product-%');

  if (itemsError) {
    console.warn(
      `Warning: Could not cleanup transaction items: ${itemsError.message}`
    );
  }

  // Delete test transactions
  const { error: txError } = await supabase
    .from('transactions')
    .delete()
    .or('transactionCode.like.KT-E2E%,phone.like.%e2e%');

  if (txError) {
    console.warn(`Warning: Could not cleanup transactions: ${txError.message}`);
  }

  // Delete test product media
  const { error: mediaError } = await supabase
    .from('product_media')
    .delete()
    .like('productId', 'e2e-product-%');

  if (mediaError) {
    console.warn(
      `Warning: Could not cleanup product media: ${mediaError.message}`
    );
  }

  // Delete test product variants
  const { error: variantsError } = await supabase
    .from('product_variants')
    .delete()
    .like('productId', 'e2e-product-%');

  if (variantsError) {
    console.warn(
      `Warning: Could not cleanup product variants: ${variantsError.message}`
    );
  }

  // Delete test products
  const { error: prodError } = await supabase
    .from('products')
    .delete()
    .like('id', 'e2e-product-%');

  if (prodError) {
    console.warn(`Warning: Could not cleanup products: ${prodError.message}`);
  }

  // Delete test promo codes
  const { error: promoError } = await supabase
    .from('promo_codes')
    .delete()
    .like('id', 'e2e-promo-%');

  if (promoError) {
    console.warn(
      `Warning: Could not cleanup promo codes: ${promoError.message}`
    );
  }

  // Delete test OTP verifications
  const { error: otpError } = await supabase
    .from('otp_verifications')
    .delete()
    .like('identifier', 'e2e-%');

  if (otpError) {
    console.warn(
      `Warning: Could not cleanup OTP verifications: ${otpError.message}`
    );
  }

  // Delete test wishlist items
  const { error: wishlistError } = await supabase
    .from('wishlists')
    .delete()
    .like('user_id', 'e2e-user-%');

  if (wishlistError) {
    console.warn(
      `Warning: Could not cleanup wishlist items: ${wishlistError.message}`
    );
  }

  // Delete test users (last, due to foreign key constraints)
  const { error: userError } = await supabase
    .from('users')
    .delete()
    .like('id', 'e2e-user-%');

  if (userError) {
    console.warn(`Warning: Could not cleanup users: ${userError.message}`);
  }

  console.log('E2E cleanup complete');
}

/**
 * Clean up test data for a specific product
 */
export async function cleanupProduct(productId: string): Promise<void> {
  if (!productId.startsWith('e2e-product-')) {
    throw new Error(
      `Cannot cleanup non-E2E product: ${productId}. ` +
        'Only products with e2e-product- prefix can be cleaned up.'
    );
  }

  const supabase = createE2ESupabaseClient();

  // Delete related transaction items
  await supabase.from('transaction_items').delete().eq('productId', productId);

  // Delete product media
  await supabase.from('product_media').delete().eq('productId', productId);

  // Delete product variants
  await supabase.from('product_variants').delete().eq('productId', productId);

  // Delete the product
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId);

  if (error) {
    console.warn(
      `Warning: Could not cleanup product ${productId}: ${error.message}`
    );
  }
}

/**
 * Clean up test data for a specific user
 */
export async function cleanupUser(userId: string): Promise<void> {
  if (!userId.startsWith('e2e-user-')) {
    throw new Error(
      `Cannot cleanup non-E2E user: ${userId}. ` +
        'Only users with e2e-user- prefix can be cleaned up.'
    );
  }

  const supabase = createE2ESupabaseClient();

  // Delete user's wishlists
  await supabase.from('wishlists').delete().eq('user_id', userId);

  // Delete user's transactions
  await supabase.from('transactions').delete().eq('userId', userId);

  // Delete user's promo codes
  await supabase.from('promo_codes').delete().eq('userId', userId);

  // Delete the user
  const { error } = await supabase.from('users').delete().eq('id', userId);

  if (error) {
    console.warn(`Warning: Could not cleanup user ${userId}: ${error.message}`);
  }
}
