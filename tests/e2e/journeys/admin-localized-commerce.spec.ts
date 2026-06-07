import { expect, test, type Page } from '@playwright/test';
import { createE2ESupabaseClient, createTestUserInDB } from '../utils/database';

const productId = 'e2e-product-localized-commerce';
const categoryId = 'e2e-category-localized-commerce';
const mediaId = 'e2e-media-localized-commerce';
const variantId = 'e2e-variant-localized-commerce';
const variantMediaId = 'e2e-variant-media-localized-commerce';
const tagId = 'e2e-tag-localized-commerce';
const adminUser = {
  id: 'e2e-user-localized-commerce-admin',
  uid: 'e2e-uid-localized-commerce-admin',
  email: 'e2e-localized-commerce-admin@example.com',
  phone: '+12025551751',
  name: 'Localized Commerce Admin',
  password: 'Test1234!@#$',
};

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');
  await page.locator('input[name="identifier"]').fill(adminUser.email);
  await page.locator('input[name="password"]').fill(adminUser.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(
    (url) => /^\/(?:[a-z]{2}\/?)?$/.test(new URL(url).pathname),
    { timeout: 30000 }
  );
}

async function cleanupLocalizedCommerceData() {
  const supabase = createE2ESupabaseClient();
  await supabase
    .from('product_media')
    .delete()
    .in('id', [mediaId, variantMediaId]);
  await supabase.from('product_variants').delete().eq('id', variantId);
  await supabase.from('_ProductToTag').delete().eq('B', tagId);
  await supabase.from('products').delete().eq('id', productId);
  await supabase.from('tags').delete().eq('id', tagId);
  await supabase.from('categories').delete().eq('id', categoryId);
  await supabase
    .from('user_activity_logs')
    .delete()
    .eq('user_id', adminUser.id);
  await supabase.from('users').delete().eq('id', adminUser.id);
}

async function seedLocalizedCommerceData() {
  const supabase = createE2ESupabaseClient();
  const now = new Date().toISOString();
  await cleanupLocalizedCommerceData();
  await createTestUserInDB({
    ...adminUser,
    isVerified: true,
    role: 'ADMIN',
  });

  await supabase.from('supported_languages').upsert(
    [
      {
        code: 'en',
        label: 'English',
        nativeLabel: 'English',
        direction: 'ltr',
        isEnabled: true,
        isDefault: true,
        sortOrder: 0,
        updatedAt: now,
      },
      {
        code: 'de',
        label: 'German',
        nativeLabel: 'Deutsch',
        direction: 'ltr',
        isEnabled: true,
        isDefault: false,
        sortOrder: 10,
        updatedAt: now,
      },
    ],
    { onConflict: 'code' }
  );

  const { error: categoryError } = await supabase.from('categories').insert({
    id: categoryId,
    name: 'E2E Localized Category',
    slug: 'e2e-localized-category',
    description: 'English category description',
    isActive: true,
    updatedAt: now,
  });
  if (categoryError) throw new Error(categoryError.message);

  const { error: productError } = await supabase.from('products').insert({
    id: productId,
    name: 'E2E Localized Product',
    description: 'English product description',
    price: 42,
    stock: 9,
    categoryId,
    images: [],
    isActive: true,
    isFeatured: false,
    hasVariants: true,
    updatedAt: now,
  });
  if (productError) throw new Error(productError.message);

  const { error: tagError } = await supabase.from('tags').insert({
    id: tagId,
    name: 'E2E Localized Tag',
    slug: 'e2e-localized-tag',
    updatedAt: now,
  });
  if (tagError) throw new Error(tagError.message);

  const { error: productTagError } = await supabase
    .from('_ProductToTag')
    .insert({ A: productId, B: tagId });
  if (productTagError) throw new Error(productTagError.message);

  const { error: variantError } = await supabase
    .from('product_variants')
    .insert({
      id: variantId,
      productId,
      name: 'E2E Variant',
      sku: 'E2E-L10N-VARIANT',
      priceAdjust: 0,
      stock: 4,
      order: 0,
      isActive: true,
      updatedAt: now,
    });
  if (variantError) throw new Error(variantError.message);

  const { error: mediaError } = await supabase.from('product_media').insert({
    id: mediaId,
    productId,
    variantId: null,
    type: 'IMAGE',
    url: 'https://example.com/e2e-localized-product.jpg',
    alt: 'English localized product image',
    isDefault: true,
    order: 0,
  });
  if (mediaError) throw new Error(mediaError.message);

  const { error: variantMediaError } = await supabase
    .from('product_media')
    .insert({
      id: variantMediaId,
      productId,
      variantId,
      type: 'IMAGE',
      url: 'https://example.com/e2e-localized-variant.jpg',
      alt: 'English localized variant image',
      isDefault: true,
      order: 1,
    });
  if (variantMediaError) throw new Error(variantMediaError.message);
}

test.describe.serial('admin localized commerce content', () => {
  test.beforeEach(async () => {
    await seedLocalizedCommerceData();
  });

  test.afterEach(async () => {
    await cleanupLocalizedCommerceData();
  });

  test('edits German product and category copy and renders localized storefront', async ({
    page,
  }) => {
    const supabase = createE2ESupabaseClient();

    await loginAsAdmin(page);
    await page.goto(`/admin/products/${productId}/edit`);
    await expect(
      page.getByRole('heading', { name: 'Edit Product' })
    ).toBeVisible();
    await page
      .getByTestId('product-translation-de-name')
      .fill('E2E Deutsches Produkt');
    await page
      .getByTestId(
        'product-media-translation-e2e-media-localized-commerce-de-alt'
      )
      .fill('Deutsches Produktbild');
    await page
      .getByTestId(
        'product-media-translation-e2e-variant-media-localized-commerce-de-alt'
      )
      .fill('Deutsches Variantenbild');
    await page
      .getByTestId('tag-translation-e2e-tag-localized-commerce-de-name')
      .fill('Deutsches Schlagwort');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.waitForURL(/\/(?:[a-z]{2}\/)?admin\/products$/, {
      timeout: 30000,
    });

    const { data: productTranslation } = await supabase
      .from('product_translations')
      .select('name, description')
      .eq('productId', productId)
      .eq('locale', 'de')
      .single();
    expect(productTranslation?.name).toBe('E2E Deutsches Produkt');
    expect(productTranslation?.description).toBeNull();

    const { data: mediaTranslations } = await supabase
      .from('product_media_translations')
      .select('mediaId, alt')
      .eq('locale', 'de')
      .in('mediaId', [mediaId, variantMediaId]);
    expect(
      mediaTranslations?.find(
        (translation) => translation.mediaId === variantMediaId
      )?.alt
    ).toBe('Deutsches Variantenbild');

    const { data: tagTranslation } = await supabase
      .from('tag_translations')
      .select('name')
      .eq('tagId', tagId)
      .eq('locale', 'de')
      .single();
    expect(tagTranslation?.name).toBe('Deutsches Schlagwort');

    await page.goto('/admin/categories');
    const categoryRow = page.locator('tr', {
      hasText: 'E2E Localized Category',
    });
    await categoryRow.getByRole('button', { name: 'Edit' }).click();
    await page
      .getByTestId('category-translation-de-name')
      .fill('E2E Deutsche Kategorie');
    await page
      .getByTestId('category-translation-de-description')
      .fill('Deutsche Kategoriebeschreibung');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Category updated.')).toBeVisible();

    const { data: categoryTranslation } = await supabase
      .from('category_translations')
      .select('name, description')
      .eq('categoryId', categoryId)
      .eq('locale', 'de')
      .single();
    expect(categoryTranslation?.name).toBe('E2E Deutsche Kategorie');

    await page.goto(`/de/products/${productId}`);
    await expect(page.getByText('E2E Deutsches Produkt').first()).toBeVisible();
    await expect(
      page.getByText('English product description').first()
    ).toBeVisible();
    await expect(
      page.getByText('E2E Deutsche Kategorie').first()
    ).toBeVisible();

    await supabase
      .from('supported_languages')
      .update({ isEnabled: false })
      .eq('code', 'de');

    await page.goto(`/de/products/${productId}`);
    await page.waitForURL(/\/en\/products\/e2e-product-localized-commerce$/, {
      timeout: 10000,
    });
  });
});
