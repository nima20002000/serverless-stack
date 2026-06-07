/**
 * Integration tests for admin-managed localized catalog content.
 *
 * ANTI-REWARD-HACKING NOTES:
 * - Uses real Supabase persistence and service reads.
 * - Verifies translated rows are not enough by themselves; public product
 *   service output must return localized fields with explicit fallback state.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestSupabaseClient } from '../utils/test-client';
import { createCategory } from '@/services/category-service';
import {
  createProduct,
  getActiveProducts,
  getProductById,
} from '@/services/product-service';
import {
  getLanguageSettings,
  saveCategoryTranslations,
  saveProductMediaTranslations,
  saveProductTranslations,
  saveTagTranslations,
  updateLanguageSettings,
} from '@/services/localization-service';

const supabase = createTestSupabaseClient();
const TEST_PREFIX = `TEST-L10N-${Date.now()}`;

async function cleanupLocalizedCatalog() {
  const { data: products } = await supabase
    .from('products')
    .select('id')
    .like('name', `${TEST_PREFIX}%`);
  const { data: categories } = await supabase
    .from('categories')
    .select('id')
    .like('name', `${TEST_PREFIX}%`);
  const { data: tags } = await supabase
    .from('tags')
    .select('id')
    .like('name', `${TEST_PREFIX}%`);

  if (products && products.length > 0) {
    await supabase
      .from('products')
      .delete()
      .in(
        'id',
        products.map((product) => product.id)
      );
  }

  if (categories && categories.length > 0) {
    await supabase
      .from('categories')
      .delete()
      .in(
        'id',
        categories.map((category) => category.id)
      );
  }

  if (tags && tags.length > 0) {
    await supabase
      .from('tags')
      .delete()
      .in(
        'id',
        tags.map((tag) => tag.id)
      );
  }
}

describe('localized catalog service integration', () => {
  beforeEach(async () => {
    await cleanupLocalizedCatalog();
    const languages = await getLanguageSettings();
    await updateLanguageSettings(
      languages.map((language) => ({
        ...language,
        isEnabled: true,
        isDefault: language.code === 'en',
      }))
    );
  });

  afterEach(async () => {
    await cleanupLocalizedCatalog();
  });

  it('persists product/category translations and localizes public product reads', async () => {
    const category = await createCategory({
      name: `${TEST_PREFIX} Category`,
      slug: `${TEST_PREFIX.toLowerCase()}-category`,
      description: `${TEST_PREFIX} category fallback`,
      isActive: true,
    });

    const product = await createProduct({
      name: `${TEST_PREFIX} Product`,
      description: `${TEST_PREFIX} product fallback`,
      price: 120,
      stock: 7,
      categoryId: category.id,
      isActive: true,
    });

    await saveProductTranslations(product.id, {
      de: {
        name: `${TEST_PREFIX} Deutsches Produkt`,
        seoTitle: `${TEST_PREFIX} Deutscher SEO Titel`,
        seoDescription: `${TEST_PREFIX} Deutsche SEO Beschreibung`,
      },
    });
    await saveCategoryTranslations(category.id, {
      de: {
        name: `${TEST_PREFIX} Deutsche Kategorie`,
        description: `${TEST_PREFIX} Kategorie Beschreibung`,
      },
    });

    const localizedProduct = await getProductById(
      product.id,
      true,
      false,
      'de'
    );
    expect(localizedProduct.name).toBe(`${TEST_PREFIX} Deutsches Produkt`);
    expect(localizedProduct.description).toBe(
      `${TEST_PREFIX} product fallback`
    );
    expect(localizedProduct.seoTitle).toBe(
      `${TEST_PREFIX} Deutscher SEO Titel`
    );
    expect(localizedProduct.seoDescription).toBe(
      `${TEST_PREFIX} Deutsche SEO Beschreibung`
    );

    const productWithRelations = localizedProduct as typeof localizedProduct & {
      category?: { name: string; description: string | null };
      translationFallback?: { fallbackFields: string[] };
    };
    expect(productWithRelations.category?.name).toBe(
      `${TEST_PREFIX} Deutsche Kategorie`
    );
    expect(productWithRelations.translationFallback?.fallbackFields).toContain(
      'description'
    );

    const listing = await getActiveProducts({
      page: 1,
      perPage: 50,
      locale: 'de',
      includeOutOfStock: true,
    });
    const listedProduct = listing.data.find((item) => item.id === product.id);
    expect(listedProduct?.name).toBe(`${TEST_PREFIX} Deutsches Produkt`);
    expect(listedProduct?.category?.name).toBe(
      `${TEST_PREFIX} Deutsche Kategorie`
    );
  });

  it('rejects default language changes without changing the persisted default', async () => {
    const languages = await getLanguageSettings();

    await expect(
      updateLanguageSettings(
        languages.map((language) => ({
          ...language,
          isDefault: language.code === 'de',
          isEnabled: true,
        }))
      )
    ).rejects.toThrow(
      'Changing the default language requires a catalog content migration first'
    );

    const currentLanguages = await getLanguageSettings();
    expect(currentLanguages.find((language) => language.isDefault)?.code).toBe(
      'en'
    );
  });

  it('rejects media translation writes for media outside the routed product', async () => {
    const productA = await createProduct({
      name: `${TEST_PREFIX} Scoped Product A`,
      description: `${TEST_PREFIX} scoped product A fallback`,
      price: 20,
      stock: 3,
      isActive: true,
    });
    const productB = await createProduct({
      name: `${TEST_PREFIX} Scoped Product B`,
      description: `${TEST_PREFIX} scoped product B fallback`,
      price: 30,
      stock: 4,
      isActive: true,
    });
    const mediaId = `${TEST_PREFIX.toLowerCase()}-foreign-media`;

    const { error: mediaError } = await supabase.from('product_media').insert({
      id: mediaId,
      productId: productB.id,
      variantId: null,
      type: 'IMAGE',
      url: 'https://example.com/scoped-foreign-media.jpg',
      alt: 'Foreign product media',
      isDefault: true,
      order: 0,
    });
    expect(mediaError).toBeNull();

    await expect(
      saveProductMediaTranslations(productA.id, {
        [mediaId]: {
          de: { alt: 'Should not save' },
        },
      })
    ).rejects.toThrow('Product media translations must belong to the product');

    const { data: leakedTranslation } = await supabase
      .from('product_media_translations')
      .select('mediaId')
      .eq('mediaId', mediaId)
      .maybeSingle();
    expect(leakedTranslation).toBeNull();
  });

  it('preserves tag translation descriptions when saving only tag names', async () => {
    const { data: tag, error: tagError } = await supabase
      .from('tags')
      .insert({
        name: `${TEST_PREFIX} Tag`,
        slug: `${TEST_PREFIX.toLowerCase()}-tag`,
      })
      .select('id')
      .single();
    expect(tagError).toBeNull();
    expect(tag?.id).toBeTruthy();

    await supabase.from('tag_translations').insert({
      tagId: tag!.id,
      locale: 'de',
      name: `${TEST_PREFIX} Alter Tag`,
      description: `${TEST_PREFIX} Beschreibung bleibt`,
    });

    await saveTagTranslations(tag!.id, {
      de: {
        name: `${TEST_PREFIX} Neuer Tag`,
      },
    });

    const { data: savedTranslation } = await supabase
      .from('tag_translations')
      .select('name, description')
      .eq('tagId', tag!.id)
      .eq('locale', 'de')
      .single();

    expect(savedTranslation?.name).toBe(`${TEST_PREFIX} Neuer Tag`);
    expect(savedTranslation?.description).toBe(
      `${TEST_PREFIX} Beschreibung bleibt`
    );
  });
});
