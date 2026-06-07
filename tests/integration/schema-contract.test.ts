/**
 * Database schema contract tests for RLS, grants, constraints, and RPCs.
 *
 * These tests intentionally hit the real disposable Supabase database. They
 * prove runtime behavior and live catalog state instead of only checking SQL
 * migration text.
 */

import { afterAll, afterEach, beforeEach, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import postgres from 'postgres';
import {
  createTestSupabaseClient,
  createTestSupabasePublishableClient,
} from '../utils/test-client';
import {
  cleanupTestCategories,
  cleanupTestProducts,
  cleanupTestPromoCodes,
  cleanupTestTags,
  cleanupTestTransactions,
  cleanupTestUsers,
} from '../utils/cleanup';

const serviceClient = createTestSupabaseClient();
const publishableClient = createTestSupabasePublishableClient();

const sql = postgres(process.env.DATABASE_URL || '', {
  max: 1,
  idle_timeout: 5,
  connect_timeout: 10,
});

const PUBLIC_READ_TABLES = [
  'categories',
  'tags',
  'products',
  'product_variants',
  'product_media',
  '_ProductToTag',
  'site_settings',
] as const;

const RESTRICTED_TABLES = [
  'users',
  'promo_codes',
  'transactions',
  'transaction_items',
  'invoices',
  'promo_code_usages',
  'user_activity_logs',
  'wishlists',
] as const;

const RLS_TABLES = [...PUBLIC_READ_TABLES, ...RESTRICTED_TABLES] as const;

type SupabaseError = {
  code?: string;
  message?: string;
};

function uniqueSuffix() {
  return `${Date.now()}-${randomUUID().slice(0, 8)}`;
}

async function expectPostgrestErrorCode(
  action: Promise<{ error: SupabaseError | null }>,
  code: string
) {
  const { error } = await action;

  expect(error).not.toBeNull();
  expect(error?.code).toBe(code);
}

async function seedUser(overrides: Record<string, unknown> = {}) {
  const suffix = uniqueSuffix();
  const user = {
    id: randomUUID(),
    uid: `U-${suffix}`,
    email: `test-schema-${suffix}@example.com`,
    phone: `+1202555${suffix.replace(/\D/g, '').slice(-4).padStart(4, '0')}`,
    name: 'Schema Contract User',
    role: 'USER',
    updatedAt: new Date().toISOString(),
    ...overrides,
  };

  const { error } = await serviceClient.from('users').insert(user);
  if (error) throw new Error(`Failed to seed user: ${error.message}`);

  return user;
}

async function seedCategory(overrides: Record<string, unknown> = {}) {
  const suffix = uniqueSuffix();
  const category = {
    id: randomUUID(),
    name: `TEST-Schema Category ${suffix}`,
    slug: `test-schema-category-${suffix}`,
    isActive: true,
    ...overrides,
  };

  const { error } = await serviceClient.from('categories').insert(category);
  if (error) throw new Error(`Failed to seed category: ${error.message}`);

  return category;
}

async function seedTag(overrides: Record<string, unknown> = {}) {
  const suffix = uniqueSuffix();
  const tag = {
    id: randomUUID(),
    name: `TEST-Schema Tag ${suffix}`,
    slug: `test-schema-tag-${suffix}`,
    ...overrides,
  };

  const { error } = await serviceClient.from('tags').insert(tag);
  if (error) throw new Error(`Failed to seed tag: ${error.message}`);

  return tag;
}

async function seedProduct(overrides: Record<string, unknown> = {}) {
  const suffix = uniqueSuffix();
  const product = {
    id: randomUUID(),
    name: `TEST-Schema Product ${suffix}`,
    description: 'Schema contract product',
    price: 100,
    stock: 10,
    isActive: true,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };

  const { error } = await serviceClient.from('products').insert(product);
  if (error) throw new Error(`Failed to seed product: ${error.message}`);

  return product;
}

async function seedVariant(
  productId: string,
  overrides: Record<string, unknown> = {}
) {
  const suffix = uniqueSuffix();
  const variant = {
    id: randomUUID(),
    productId,
    name: `Schema Variant ${suffix}`,
    sku: `TEST-SCHEMA-SKU-${suffix}`,
    stock: 3,
    priceAdjust: 0,
    isActive: true,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };

  const { error } = await serviceClient
    .from('product_variants')
    .insert(variant);
  if (error) throw new Error(`Failed to seed variant: ${error.message}`);

  return variant;
}

async function seedTransaction(overrides: Record<string, unknown> = {}) {
  const suffix = uniqueSuffix();
  const transaction = {
    id: randomUUID(),
    amount: 100,
    status: 'PENDING',
    transactionCode: `TEST-SCHEMA-TX-${suffix}`,
    paymentMethod: 'STRIPE',
    fullName: 'Schema Contract Buyer',
    phone: '+12025550123',
    shippingAddress: '100 Contract Street',
    updatedAt: new Date().toISOString(),
    ...overrides,
  };

  const { error } = await serviceClient
    .from('transactions')
    .insert(transaction);
  if (error) {
    throw new Error(`Failed to seed transaction: ${error.message}`);
  }

  return transaction;
}

async function cleanupSchemaContractArtifacts() {
  await sql`
    delete from public.user_activity_logs
    where metadata ->> 'test_suite' = 'schema-contract'
  `;
  await sql`
    delete from public.site_settings
    where key like 'test-schema-setting-%'
  `;
}

describe('Database schema, RLS, grants, and invariant contracts', () => {
  beforeEach(async () => {
    await cleanupSchemaContractArtifacts();
    await cleanupTestTransactions();
    await cleanupTestPromoCodes();
    await cleanupTestProducts();
    await cleanupTestCategories();
    await cleanupTestTags();
    await cleanupTestUsers();
  });

  afterEach(async () => {
    await cleanupSchemaContractArtifacts();
    await cleanupTestTransactions();
    await cleanupTestPromoCodes();
    await cleanupTestProducts();
    await cleanupTestCategories();
    await cleanupTestTags();
    await cleanupTestUsers();
  });

  afterAll(async () => {
    await sql.end();
  });

  it('exposes only intended public catalog rows through publishable-key RLS', async () => {
    const activeCategory = await seedCategory();
    const inactiveCategory = await seedCategory({
      name: `TEST-Inactive Category ${uniqueSuffix()}`,
      slug: `test-inactive-category-${uniqueSuffix()}`,
      isActive: false,
    });
    const tag = await seedTag();
    const activeProduct = await seedProduct({ categoryId: activeCategory.id });
    const inactiveProduct = await seedProduct({
      name: `TEST-Inactive Product ${uniqueSuffix()}`,
      isActive: false,
    });
    const activeVariant = await seedVariant(activeProduct.id);
    const inactiveVariant = await seedVariant(activeProduct.id, {
      sku: `TEST-INACTIVE-SKU-${uniqueSuffix()}`,
      isActive: false,
    });
    const hiddenProductVariant = await seedVariant(inactiveProduct.id, {
      sku: `TEST-HIDDEN-SKU-${uniqueSuffix()}`,
    });

    const mediaId = randomUUID();
    const hiddenMediaId = randomUUID();
    await serviceClient.from('product_media').insert([
      {
        id: mediaId,
        productId: activeProduct.id,
        variantId: activeVariant.id,
        type: 'IMAGE',
        url: 'https://media.example.com/schema-active.jpg',
      },
      {
        id: hiddenMediaId,
        productId: inactiveProduct.id,
        variantId: hiddenProductVariant.id,
        type: 'IMAGE',
        url: 'https://media.example.com/schema-hidden.jpg',
      },
    ]);
    await serviceClient
      .from('_ProductToTag')
      .insert({ A: activeProduct.id, B: tag.id });
    const settingKey = `test-schema-setting-${uniqueSuffix()}`;
    const { error: settingInsertError } = await serviceClient
      .from('site_settings')
      .insert({
        key: settingKey,
        value: 'visible',
      });
    expect(settingInsertError).toBeNull();

    const { data: visibleCategories, error: categoryError } =
      await publishableClient
        .from('categories')
        .select('id')
        .in('id', [activeCategory.id, inactiveCategory.id])
        .order('id');
    expect(categoryError).toBeNull();
    expect(visibleCategories?.map((row) => row.id)).toEqual([
      activeCategory.id,
    ]);

    const { data: visibleProducts, error: productError } =
      await publishableClient
        .from('products')
        .select('id')
        .in('id', [activeProduct.id, inactiveProduct.id])
        .order('id');
    expect(productError).toBeNull();
    expect(visibleProducts?.map((row) => row.id)).toEqual([activeProduct.id]);

    const { data: visibleVariants, error: variantError } =
      await publishableClient
        .from('product_variants')
        .select('id')
        .in('id', [
          activeVariant.id,
          inactiveVariant.id,
          hiddenProductVariant.id,
        ])
        .order('id');
    expect(variantError).toBeNull();
    expect(visibleVariants?.map((row) => row.id)).toEqual([activeVariant.id]);

    const { data: visibleMedia, error: mediaError } = await publishableClient
      .from('product_media')
      .select('id')
      .in('id', [mediaId, hiddenMediaId])
      .order('id');
    expect(mediaError).toBeNull();
    expect(visibleMedia?.map((row) => row.id)).toEqual([mediaId]);

    const { data: visibleTags, error: tagError } = await publishableClient
      .from('tags')
      .select('id')
      .eq('id', tag.id);
    expect(tagError).toBeNull();
    expect(visibleTags).toHaveLength(1);

    const { data: visibleProductTags, error: productTagError } =
      await publishableClient
        .from('_ProductToTag')
        .select('A, B')
        .eq('A', activeProduct.id);
    expect(productTagError).toBeNull();
    expect(visibleProductTags).toEqual([{ A: activeProduct.id, B: tag.id }]);

    const { data: settings, error: settingsError } = await publishableClient
      .from('site_settings')
      .select('key, value')
      .eq('key', settingKey)
      .single();
    expect(settingsError).toBeNull();
    expect(settings).toEqual({ key: settingKey, value: 'visible' });
  });

  it('blocks publishable-key reads and writes for restricted Data API surfaces', async () => {
    const user = await seedUser();
    const product = await seedProduct();
    const transaction = await seedTransaction({
      userId: user.id,
      transactionCode: `TEST-SCHEMA-RESTRICTED-${uniqueSuffix()}`,
    });
    const promoCode = {
      id: randomUUID(),
      code: `TEST-SCHEMA-PROMO-${uniqueSuffix()}`,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
    const { error: promoInsertError } = await serviceClient
      .from('promo_codes')
      .insert(promoCode);
    expect(promoInsertError).toBeNull();
    const transactionItem = {
      id: randomUUID(),
      transactionId: transaction.id,
      productId: product.id,
      quantity: 1,
      price: 100,
    };
    const { error: itemInsertError } = await serviceClient
      .from('transaction_items')
      .insert(transactionItem);
    expect(itemInsertError).toBeNull();
    const { error: invoiceInsertError } = await serviceClient
      .from('invoices')
      .insert({
        id: randomUUID(),
        transactionId: transaction.id,
        invoiceNumber: `TEST-SCHEMA-INV-${uniqueSuffix()}`,
      });
    expect(invoiceInsertError).toBeNull();
    const { error: wishlistInsertError } = await serviceClient
      .from('wishlists')
      .insert({ user_id: user.id, product_id: product.id });
    expect(wishlistInsertError).toBeNull();
    const activityLogId = randomUUID();
    const { error: activityInsertError } = await serviceClient
      .from('user_activity_logs')
      .insert({
        id: activityLogId,
        user_id: user.id,
        activity_type: 'LOGIN_SUCCESS',
        metadata: { test_suite: 'schema-contract' },
      });
    expect(activityInsertError).toBeNull();

    for (const table of RESTRICTED_TABLES) {
      await expectPostgrestErrorCode(
        publishableClient.from(table).select('*').limit(1),
        '42501'
      );
    }

    await expectPostgrestErrorCode(
      publishableClient.from('categories').insert({
        name: `TEST-Publishable Write ${uniqueSuffix()}`,
        slug: `test-publishable-write-${uniqueSuffix()}`,
      }),
      '42501'
    );
    await expectPostgrestErrorCode(
      publishableClient
        .from('products')
        .update({ name: 'TEST-Publishable Update Blocked' })
        .eq('id', product.id),
      '42501'
    );
    await expectPostgrestErrorCode(
      publishableClient.from('tags').delete().eq('id', 'missing-id'),
      '42501'
    );
  });

  it('enforces core uniqueness and check constraints with real database writes', async () => {
    const user = await seedUser();
    await expectPostgrestErrorCode(
      serviceClient.from('users').insert({
        id: randomUUID(),
        uid: `U-DUP-${uniqueSuffix()}`,
        email: user.email,
        phone: `+1202555${Date.now().toString().slice(-4)}`,
        name: 'Duplicate Email User',
        updatedAt: new Date().toISOString(),
      }),
      '23505'
    );
    await expectPostgrestErrorCode(
      serviceClient.from('users').insert({
        id: randomUUID(),
        uid: user.uid,
        email: `test-duplicate-uid-${uniqueSuffix()}@example.com`,
        phone: `+1202555${Date.now().toString().slice(-4)}`,
        name: 'Duplicate UID User',
        updatedAt: new Date().toISOString(),
      }),
      '23505'
    );
    await expectPostgrestErrorCode(
      serviceClient.from('users').insert({
        id: randomUUID(),
        uid: `U-PHONE-${uniqueSuffix()}`,
        email: `test-duplicate-phone-${uniqueSuffix()}@example.com`,
        phone: user.phone,
        name: 'Duplicate Phone User',
        updatedAt: new Date().toISOString(),
      }),
      '23505'
    );

    const category = await seedCategory();
    await expectPostgrestErrorCode(
      serviceClient.from('categories').insert({
        name: `TEST-Duplicate Category ${uniqueSuffix()}`,
        slug: category.slug,
      }),
      '23505'
    );

    const tag = await seedTag();
    await expectPostgrestErrorCode(
      serviceClient.from('tags').insert({
        name: tag.name,
        slug: `test-duplicate-tag-slug-${uniqueSuffix()}`,
      }),
      '23505'
    );
    await expectPostgrestErrorCode(
      serviceClient.from('tags').insert({
        name: `TEST-Duplicate Tag ${uniqueSuffix()}`,
        slug: tag.slug,
      }),
      '23505'
    );

    const promo = {
      id: randomUUID(),
      code: `TEST-SCHEMA-PROMO-${uniqueSuffix()}`,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    };
    const { error: promoError } = await serviceClient
      .from('promo_codes')
      .insert(promo);
    expect(promoError).toBeNull();
    await expectPostgrestErrorCode(
      serviceClient.from('promo_codes').insert({
        id: randomUUID(),
        code: promo.code,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
      '23505'
    );
    await expectPostgrestErrorCode(
      serviceClient.from('promo_codes').insert({
        id: randomUUID(),
        code: `TEST-SCHEMA-PROMO-${uniqueSuffix()}`,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
      '23505'
    );
    await expectPostgrestErrorCode(
      serviceClient.from('promo_codes').insert({
        id: randomUUID(),
        code: `TEST-SCHEMA-PROMO-${uniqueSuffix()}`,
        discountType: 'BOGO',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      }),
      '23514'
    );

    const transaction = await seedTransaction();
    await expectPostgrestErrorCode(
      serviceClient.from('transactions').insert({
        id: randomUUID(),
        amount: 100,
        transactionCode: transaction.transactionCode,
        updatedAt: new Date().toISOString(),
      }),
      '23505'
    );

    const invoiceNumber = `TEST-SCHEMA-INV-${uniqueSuffix()}`;
    const { error: invoiceError } = await serviceClient
      .from('invoices')
      .insert({
        id: randomUUID(),
        transactionId: transaction.id,
        invoiceNumber,
      });
    expect(invoiceError).toBeNull();
    await expectPostgrestErrorCode(
      serviceClient.from('invoices').insert({
        id: randomUUID(),
        transactionId: transaction.id,
        invoiceNumber: `TEST-SCHEMA-INV-${uniqueSuffix()}`,
      }),
      '23505'
    );
    const secondTransaction = await seedTransaction({
      transactionCode: `TEST-SCHEMA-TX-${uniqueSuffix()}`,
    });
    await expectPostgrestErrorCode(
      serviceClient.from('invoices').insert({
        id: randomUUID(),
        transactionId: secondTransaction.id,
        invoiceNumber,
      }),
      '23505'
    );

    const product = await seedProduct();
    const variant = await seedVariant(product.id);
    const { error: wishlistError } = await serviceClient
      .from('wishlists')
      .insert({ user_id: user.id, product_id: product.id });
    expect(wishlistError).toBeNull();
    await expectPostgrestErrorCode(
      serviceClient
        .from('wishlists')
        .insert({ user_id: user.id, product_id: product.id }),
      '23505'
    );
    const { error: variantWishlistError } = await serviceClient
      .from('wishlists')
      .insert({
        user_id: user.id,
        product_id: product.id,
        variant_id: variant.id,
      });
    expect(variantWishlistError).toBeNull();
    await expectPostgrestErrorCode(
      serviceClient.from('wishlists').insert({
        user_id: user.id,
        product_id: product.id,
        variant_id: variant.id,
      }),
      '23505'
    );

    await expectPostgrestErrorCode(
      serviceClient.from('product_variants').insert({
        id: randomUUID(),
        productId: product.id,
        name: 'Invalid Swatch Crop',
        sku: `TEST-INVALID-CROP-${uniqueSuffix()}`,
        stock: 1,
        priceAdjust: 0,
        swatchCrop: { x: 200, y: 50, zoom: 1 },
        updatedAt: new Date().toISOString(),
      }),
      '23514'
    );
  });

  it('keeps revenue RPCs service-role-only and counts only completed transactions', async () => {
    const { data: totalBefore, error: totalBeforeError } =
      await serviceClient.rpc('get_total_revenue');
    expect(totalBeforeError).toBeNull();

    const monthStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: monthlyBefore, error: monthlyBeforeError } =
      await serviceClient.rpc('get_monthly_revenue', {
        month_start: monthStart,
      });
    expect(monthlyBeforeError).toBeNull();

    await seedTransaction({
      amount: 125,
      status: 'COMPLETED',
      createdAt: new Date().toISOString(),
    });
    await seedTransaction({
      amount: 50,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    });
    await seedTransaction({
      amount: 75,
      status: 'FAILED',
      createdAt: new Date().toISOString(),
    });

    const { data: totalAfter, error: totalAfterError } =
      await serviceClient.rpc('get_total_revenue');
    expect(totalAfterError).toBeNull();
    expect(Number(totalAfter) - Number(totalBefore)).toBe(125);

    const { data: monthlyAfter, error: monthlyAfterError } =
      await serviceClient.rpc('get_monthly_revenue', {
        month_start: monthStart,
      });
    expect(monthlyAfterError).toBeNull();
    expect(Number(monthlyAfter) - Number(monthlyBefore)).toBe(125);

    const rpcPrivileges = await sql<
      {
        anon_total: boolean;
        anon_monthly: boolean;
        authenticated_total: boolean;
        authenticated_monthly: boolean;
      }[]
    >`
      select
        has_function_privilege('anon', 'public.get_total_revenue()', 'execute') as anon_total,
        has_function_privilege('anon', 'public.get_monthly_revenue(timestamp with time zone)', 'execute') as anon_monthly,
        has_function_privilege('authenticated', 'public.get_total_revenue()', 'execute') as authenticated_total,
        has_function_privilege('authenticated', 'public.get_monthly_revenue(timestamp with time zone)', 'execute') as authenticated_monthly
    `;
    expect(rpcPrivileges[0]).toEqual({
      anon_total: false,
      anon_monthly: false,
      authenticated_total: false,
      authenticated_monthly: false,
    });

    await expectPostgrestErrorCode(
      publishableClient.rpc('get_total_revenue'),
      '42501'
    );
    await expectPostgrestErrorCode(
      publishableClient.rpc('get_monthly_revenue', {
        month_start: monthStart,
      }),
      '42501'
    );
  });

  it('matches live catalog contracts for RLS, policies, grants, indexes, enums, and columns', async () => {
    const rlsRows = await sql<{ relname: string; relrowsecurity: boolean }[]>`
      select c.relname, c.relrowsecurity
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relname in ${sql(RLS_TABLES)}
      order by c.relname
    `;
    expect(rlsRows).toHaveLength(RLS_TABLES.length);
    expect(rlsRows.every((row) => row.relrowsecurity)).toBe(true);

    const policies = await sql<{ tablename: string; policyname: string }[]>`
      select tablename, policyname
      from pg_policies
      where schemaname = 'public'
      order by tablename, policyname
    `;
    expect(policies).toEqual(
      expect.arrayContaining([
        {
          tablename: 'categories',
          policyname: 'Public can read active categories',
        },
        { tablename: 'tags', policyname: 'Public can read tags' },
        {
          tablename: 'products',
          policyname: 'Public can read active products',
        },
        {
          tablename: 'product_variants',
          policyname: 'Public can read active variants',
        },
        {
          tablename: 'product_media',
          policyname: 'Public can read product media',
        },
        {
          tablename: '_ProductToTag',
          policyname: 'Public can read product tags',
        },
        {
          tablename: 'site_settings',
          policyname: 'Public can read site settings',
        },
      ])
    );

    const publicRoleGrants = await sql<
      {
        grantee: string;
        table_name: string;
        privileges: string[];
      }[]
    >`
      select grantee, table_name, array_agg(privilege_type order by privilege_type) as privileges
      from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee in ('anon', 'authenticated')
        and table_name in ${sql([...PUBLIC_READ_TABLES, ...RESTRICTED_TABLES])}
      group by grantee, table_name
      order by grantee, table_name
    `;
    const expectedReadGrants = ['SELECT'];
    for (const role of ['anon', 'authenticated']) {
      for (const table of PUBLIC_READ_TABLES) {
        expect(publicRoleGrants).toContainEqual({
          grantee: role,
          table_name: table,
          privileges: expectedReadGrants,
        });
      }
      for (const table of RESTRICTED_TABLES) {
        expect(publicRoleGrants).not.toContainEqual(
          expect.objectContaining({ grantee: role, table_name: table })
        );
      }
    }

    const serviceGrants = await sql<
      { table_name: string; privileges: string[] }[]
    >`
      select table_name, array_agg(privilege_type order by privilege_type) as privileges
      from information_schema.role_table_grants
      where table_schema = 'public'
        and grantee = 'service_role'
        and table_name in ${sql([...PUBLIC_READ_TABLES, ...RESTRICTED_TABLES])}
      group by table_name
    `;
    for (const table of [...PUBLIC_READ_TABLES, ...RESTRICTED_TABLES]) {
      expect(serviceGrants).toContainEqual({
        table_name: table,
        privileges: expect.arrayContaining([
          'DELETE',
          'INSERT',
          'SELECT',
          'UPDATE',
        ]),
      });
    }

    const routinePrivileges = await sql<
      { grantee: string; routine_name: string; privilege_type: string }[]
    >`
      select grantee, routine_name, privilege_type
      from information_schema.routine_privileges
      where specific_schema = 'public'
        and routine_name in ('get_total_revenue', 'get_monthly_revenue')
        and grantee in ('anon', 'authenticated', 'service_role')
      order by grantee, routine_name, privilege_type
    `;
    for (const role of ['anon', 'authenticated']) {
      expect(routinePrivileges).not.toContainEqual(
        expect.objectContaining({ grantee: role, privilege_type: 'EXECUTE' })
      );
    }
    expect(routinePrivileges).toEqual(
      expect.arrayContaining([
        {
          grantee: 'service_role',
          routine_name: 'get_monthly_revenue',
          privilege_type: 'EXECUTE',
        },
        {
          grantee: 'service_role',
          routine_name: 'get_total_revenue',
          privilege_type: 'EXECUTE',
        },
      ])
    );

    const defaultFunctionPrivileges = await sql<
      {
        grantee: string;
        privilege_type: string;
      }[]
    >`
      select coalesce(grantee.rolname, 'PUBLIC') as grantee, acl.privilege_type
      from pg_default_acl defaults
      join pg_roles owner on owner.oid = defaults.defaclrole
      cross join lateral aclexplode(defaults.defaclacl) as acl
      left join pg_roles grantee on grantee.oid = acl.grantee
      where owner.rolname = 'postgres'
        and defaults.defaclobjtype = 'f'
        and defaults.defaclnamespace = 0
      order by grantee, acl.privilege_type
    `;
    for (const role of ['PUBLIC', 'anon', 'authenticated']) {
      expect(defaultFunctionPrivileges).not.toContainEqual({
        grantee: role,
        privilege_type: 'EXECUTE',
      });
    }

    await sql.begin(async (transaction) => {
      await transaction`
        create table public.__schema_contract_default_acl_probe (
          id bigint generated by default as identity primary key
        )
      `;

      const futureTablePublicGrants = await transaction<
        { grantee: string; privilege_type: string }[]
      >`
        select grantee, privilege_type
        from information_schema.role_table_grants
        where table_schema = 'public'
          and table_name = '__schema_contract_default_acl_probe'
          and grantee in ('anon', 'authenticated')
        order by grantee, privilege_type
      `;
      expect(futureTablePublicGrants).toEqual([]);

      const futureSequencePrivileges = await transaction<
        {
          anon_usage: boolean;
          anon_select: boolean;
          anon_update: boolean;
          authenticated_usage: boolean;
          authenticated_select: boolean;
          authenticated_update: boolean;
        }[]
      >`
        select
          has_sequence_privilege('anon', 'public.__schema_contract_default_acl_probe_id_seq', 'usage') as anon_usage,
          has_sequence_privilege('anon', 'public.__schema_contract_default_acl_probe_id_seq', 'select') as anon_select,
          has_sequence_privilege('anon', 'public.__schema_contract_default_acl_probe_id_seq', 'update') as anon_update,
          has_sequence_privilege('authenticated', 'public.__schema_contract_default_acl_probe_id_seq', 'usage') as authenticated_usage,
          has_sequence_privilege('authenticated', 'public.__schema_contract_default_acl_probe_id_seq', 'select') as authenticated_select,
          has_sequence_privilege('authenticated', 'public.__schema_contract_default_acl_probe_id_seq', 'update') as authenticated_update
      `;
      expect(futureSequencePrivileges[0]).toEqual({
        anon_usage: false,
        anon_select: false,
        anon_update: false,
        authenticated_usage: false,
        authenticated_select: false,
        authenticated_update: false,
      });

      await transaction`
        create function public.__schema_contract_default_function_probe()
        returns integer
        language sql
        stable
        as $$
          select 1
        $$
      `;
      const futureFunctionPrivileges = await transaction<
        {
          public_execute: boolean;
          anon_execute: boolean;
          authenticated_execute: boolean;
        }[]
      >`
        select
          exists (
            select 1
            from pg_proc routine
            join pg_namespace namespace on namespace.oid = routine.pronamespace
            cross join lateral aclexplode(
              coalesce(routine.proacl, acldefault('f', routine.proowner))
            ) as acl
            where namespace.nspname = 'public'
              and routine.proname = '__schema_contract_default_function_probe'
              and acl.grantee = 0
              and acl.privilege_type = 'EXECUTE'
          ) as public_execute,
          has_function_privilege('anon', 'public.__schema_contract_default_function_probe()', 'execute') as anon_execute,
          has_function_privilege('authenticated', 'public.__schema_contract_default_function_probe()', 'execute') as authenticated_execute
      `;
      expect(futureFunctionPrivileges[0]).toEqual({
        public_execute: false,
        anon_execute: false,
        authenticated_execute: false,
      });

      await transaction`drop function public.__schema_contract_default_function_probe()`;
      await transaction`drop table public.__schema_contract_default_acl_probe`;
    });

    const indexes = await sql<{ indexname: string }[]>`
      select indexname
      from pg_indexes
      where schemaname = 'public'
        and indexname in (
          'unique_wishlist_item_variant',
          'unique_wishlist_item_no_variant',
          'unique_promo_code',
          'idx_product_variants_product_active_order',
          'transactions_paymentmethod_idx',
          'transactions_userId_createdAt_idx'
        )
      order by indexname
    `;
    expect(indexes.map((row) => row.indexname).sort()).toEqual([
      'idx_product_variants_product_active_order',
      'transactions_paymentmethod_idx',
      'transactions_userId_createdAt_idx',
      'unique_promo_code',
      'unique_wishlist_item_no_variant',
      'unique_wishlist_item_variant',
    ]);

    const paymentMethods = await sql<{ enumlabel: string }[]>`
      select enumlabel
      from pg_enum
      join pg_type on pg_type.oid = pg_enum.enumtypid
      join pg_namespace on pg_namespace.oid = pg_type.typnamespace
      where pg_namespace.nspname = 'public'
        and pg_type.typname = 'PaymentMethod'
      order by enumsortorder
    `;
    expect(paymentMethods.map((row) => row.enumlabel)).toEqual([
      'STRIPE',
      'PAYPAL',
    ]);

    const requiredColumns = await sql<
      { table_name: string; column_name: string }[]
    >`
      select table_name, column_name
      from information_schema.columns
      where table_schema = 'public'
        and (
          (table_name = 'users' and column_name in (
            'shippingAddressLine1',
            'shippingAddressLine2',
            'shippingCity',
            'shippingRegion',
            'shippingCountry'
          ))
          or (table_name = 'transactions' and column_name in (
            'shippingAddressLine1',
            'shippingAddressLine2',
            'shippingCity',
            'shippingRegion',
            'shippingCountry'
          ))
          or (table_name = 'product_variants' and column_name in (
            'swatchImageUrl',
            'swatchCrop'
          ))
        )
      order by table_name, column_name
    `;
    expect(requiredColumns).toHaveLength(12);

    const otpTables = await sql<{ table_name: string }[]>`
      select table_name
      from information_schema.tables
      where table_schema = 'public'
        and table_name = 'otp_verifications'
    `;
    expect(otpTables).toHaveLength(0);
  });
});
