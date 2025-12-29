import { createE2ESupabaseClient } from '../utils/database';
import { createTestProduct, E2ETestProduct, getTestProducts } from './products';
import { createTestUser, E2ETestUser, getTestUsers } from './users';

/**
 * Seed test products into the database
 * Returns the created products for use in tests
 */
export async function seedTestProducts(): Promise<E2ETestProduct[]> {
  const supabase = createE2ESupabaseClient();

  const testProducts = getTestProducts();
  const products = [
    testProducts.SIMPLE_PRODUCT,
    testProducts.DISCOUNTED_PRODUCT,
    testProducts.FEATURED_PRODUCT,
  ];

  const { data, error } = await supabase
    .from('products')
    .insert(products)
    .select();

  if (error) {
    throw new Error(`Failed to seed products: ${error.message}`);
  }

  console.log(`Seeded ${data.length} test products`);
  return data as unknown as E2ETestProduct[];
}

/**
 * Seed a single test product
 */
export async function seedProduct(
  overrides?: Partial<E2ETestProduct>
): Promise<E2ETestProduct> {
  const supabase = createE2ESupabaseClient();

  const product = createTestProduct(overrides);

  const { data, error } = await supabase
    .from('products')
    .insert(product)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to seed product: ${error.message}`);
  }

  console.log(`Seeded test product: ${data.name}`);
  return data as unknown as E2ETestProduct;
}

/**
 * Seed a test user into the database
 */
export async function seedTestUser(
  overrides?: Partial<E2ETestUser>
): Promise<E2ETestUser> {
  const supabase = createE2ESupabaseClient();

  const user = createTestUser(overrides);

  // Note: Password should be hashed in production
  // For E2E tests, we may need to use the registration flow instead
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: user.id,
      uid: user.uid,
      email: user.email,
      phone: user.phone,
      name: user.name,
      password: user.password, // Should be hashed for real tests
      isVerified: user.isVerified,
      role: user.role,
      updatedAt: user.updatedAt,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to seed user: ${error.message}`);
  }

  console.log(`Seeded test user: ${data.name}`);
  return { ...user, ...data } as E2ETestUser;
}

/**
 * Seed a promo code for testing discounts
 */
export async function seedTestPromoCode(
  code: string = 'E2ETEST10',
  discountPercent: number = 10
): Promise<void> {
  const supabase = createE2ESupabaseClient();

  // First, create a test user to associate with the promo code
  const testUser = createTestUser();

  // Insert the test user first
  const { error: userError } = await supabase.from('users').insert({
    id: testUser.id,
    uid: testUser.uid,
    name: testUser.name,
    updatedAt: testUser.updatedAt,
  });

  if (userError && !userError.message.includes('duplicate key')) {
    console.warn(
      `Warning: Could not create user for promo code: ${userError.message}`
    );
  }

  // Note: The promo_codes table structure requires userId
  // For E2E tests, we may need to adapt this based on actual schema
  const { error } = await supabase.from('promo_codes').insert({
    id: `e2e-promo-${code}`,
    code,
    userId: testUser.id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    isUsed: false,
  });

  if (error && !error.message.includes('duplicate key')) {
    throw new Error(`Failed to seed promo code: ${error.message}`);
  }

  console.log(`Seeded promo code: ${code} (${discountPercent}% off)`);
}

/**
 * Seed all test data needed for a test suite
 */
export async function seedAllTestData(): Promise<{
  products: E2ETestProduct[];
}> {
  console.log('Seeding all test data...');

  const products = await seedTestProducts();

  console.log('All test data seeded successfully');

  return { products };
}
