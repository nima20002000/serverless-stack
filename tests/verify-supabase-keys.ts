/**
 * Verification script to test new Supabase API keys
 * Run: npx tsx tests/verify-supabase-keys.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load test environment
dotenv.config({ path: resolve(__dirname, '.env') });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
const secretKey = process.env.SUPABASE_SECRET_KEY!;

console.log('🔍 Verifying Supabase API Keys...\n');

console.log('URL:', url);
console.log('Publishable Key:', publishableKey?.substring(0, 30) + '...');
console.log('Secret Key:', secretKey?.substring(0, 20) + '...\n');

async function testPublishableKey() {
  console.log('📋 Testing PUBLISHABLE key (client-side access)...');

  const client = createClient(url, publishableKey);

  try {
    // Should work: Read public data
    const { data, error } = await client
      .from('products')
      .select('id, name')
      .limit(1);

    if (error) {
      console.error('❌ PUBLISHABLE key FAILED:', error.message);
      return false;
    }

    console.log('✅ PUBLISHABLE key works - can read public data');
    console.log('   Sample product:', data?.[0] || 'No products found');

    return true;
  } catch (err) {
    console.error('❌ PUBLISHABLE key ERROR:', err);
    return false;
  }
}

async function testSecretKey() {
  console.log('\n📋 Testing SECRET key (server-side access)...');

  const client = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Should work: Read data (bypasses RLS)
    const { data, error } = await client
      .from('users')
      .select('id, email')
      .limit(1);

    if (error) {
      console.error('❌ SECRET key FAILED:', error.message);
      console.error('   Full error:', JSON.stringify(error, null, 2));
      return false;
    }

    console.log('✅ SECRET key works - can read user data');
    console.log('   Sample user:', data?.[0] || 'No users found');

    // Test write capability with full required schema
    const testUserId = `test-verify-${Date.now()}`;
    const { data: insertData, error: insertError } = await client
      .from('users')
      .insert({
        id: testUserId,
        uid: `U-999999`,
        name: 'Test Verification User',
        email: `test-verify-${Date.now()}@example.com`,
        role: 'USER',
        updatedAt: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ SECRET key cannot insert:', insertError.message);
      return false;
    }

    console.log('✅ SECRET key can insert data (bypasses RLS)');

    // Clean up test user
    await client.from('users').delete().eq('id', testUserId);
    console.log('✅ Test user cleaned up');

    return true;
  } catch (err) {
    console.error('❌ SECRET key ERROR:', err);
    return false;
  }
}

async function main() {
  const publishableOk = await testPublishableKey();
  const secretOk = await testSecretKey();

  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION RESULTS:');
  console.log('='.repeat(60));
  console.log(`Publishable Key: ${publishableOk ? '✅ VALID' : '❌ INVALID'}`);
  console.log(`Secret Key:      ${secretOk ? '✅ VALID' : '❌ INVALID'}`);
  console.log('='.repeat(60));

  if (!publishableOk || !secretOk) {
    console.error('\n❌ API keys are INVALID or EXPIRED');
    console.error('   Action required: Get fresh keys from Supabase dashboard');
    process.exit(1);
  }

  console.log('\n✅ All API keys are VALID and working correctly');
  console.log('   Safe to proceed with test migration');
}

main().catch(console.error);
