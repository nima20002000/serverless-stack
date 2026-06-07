import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { Inserts, Tables } from '@/lib/supabase/types';
import {
  invalidateCategoryCache,
  invalidateProductCache,
} from '@/lib/catalog-cache';
import {
  getStaticLanguageDefaults,
  hasAnyTranslationValue,
  isManageableLocale,
  normalizeTranslationText,
  resolveRequestedLocale,
  validateManagedLanguages,
  type ManagedLanguage,
} from '@/lib/i18n/localized-content';
import { defaultLocale, type Locale } from '@/lib/i18n/config';

type SupportedLanguageRow = Tables<'supported_languages'>;
export type ProductTranslationRow = Tables<'product_translations'>;
export type ProductMediaTranslationRow = Tables<'product_media_translations'>;
export type CategoryTranslationRow = Tables<'category_translations'>;
export type TagTranslationRow = Tables<'tag_translations'>;
export type SiteSettingTranslationRow = Tables<'site_setting_translations'>;

export type ProductTranslationInput = {
  name?: string | null;
  description?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
};

export type ProductMediaTranslationInput = {
  alt?: string | null;
};

export type CategoryTranslationInput = {
  name?: string | null;
  description?: string | null;
};

export type TagTranslationInput = {
  name?: string | null;
  description?: string | null;
};

function toManagedLanguage(row: SupportedLanguageRow): ManagedLanguage {
  if (!isManageableLocale(row.code)) {
    throw new Error(`Unsupported language stored in database: ${row.code}`);
  }

  return {
    code: row.code,
    label: row.label,
    nativeLabel: row.nativeLabel,
    direction: row.direction as ManagedLanguage['direction'],
    isEnabled: row.isEnabled,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
  };
}

function uniqueLocales(
  requestedLocale?: string | null,
  fallbackLocale?: Locale
): Locale[] {
  const locales = new Set<Locale>();

  if (requestedLocale && isManageableLocale(requestedLocale)) {
    locales.add(requestedLocale);
  }

  locales.add(fallbackLocale || defaultLocale);
  return Array.from(locales);
}

function normalizeProductTranslation(input: ProductTranslationInput) {
  return {
    name: normalizeTranslationText(input.name),
    description: normalizeTranslationText(input.description),
    seoTitle: normalizeTranslationText(input.seoTitle),
    seoDescription: normalizeTranslationText(input.seoDescription),
  };
}

function normalizeCategoryTranslation(input: CategoryTranslationInput) {
  return {
    name: normalizeTranslationText(input.name),
    description: normalizeTranslationText(input.description),
  };
}

function normalizeTagTranslation(input: TagTranslationInput) {
  return {
    name: normalizeTranslationText(input.name),
    description: normalizeTranslationText(input.description),
  };
}

export function validateProductTranslationPayload(
  translations: Record<string, ProductTranslationInput>
): void {
  for (const locale of Object.keys(translations)) {
    if (!isManageableLocale(locale)) {
      throw new Error(`Unsupported product translation locale: ${locale}`);
    }
  }
}

export function validateProductMediaTranslationPayload(
  translationsByMediaId: Record<
    string,
    Record<string, ProductMediaTranslationInput>
  >
): void {
  for (const translations of Object.values(translationsByMediaId)) {
    for (const locale of Object.keys(translations)) {
      if (!isManageableLocale(locale)) {
        throw new Error(`Unsupported media translation locale: ${locale}`);
      }
    }
  }
}

export async function getLanguageSettings(): Promise<ManagedLanguage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('supported_languages')
    .select('*')
    .order('sortOrder', { ascending: true });

  if (error) {
    log.error('Error fetching supported languages', { error });
    throw new Error('Unable to load language settings');
  }

  if (!data || data.length === 0) {
    return getStaticLanguageDefaults();
  }

  return validateManagedLanguages(data.map(toManagedLanguage));
}

export async function getEnabledLanguages(): Promise<ManagedLanguage[]> {
  return (await getLanguageSettings()).filter((language) => language.isEnabled);
}

export async function resolvePublicLocale(
  requestedLocale?: string | null
): Promise<Locale> {
  const languages = await getLanguageSettings();
  return resolveRequestedLocale(requestedLocale, languages);
}

export async function getDefaultLanguageCode(): Promise<Locale> {
  const languages = await getLanguageSettings();
  return (
    languages.find((language) => language.isDefault)?.code || defaultLocale
  );
}

export async function updateLanguageSettings(
  input: ManagedLanguage[]
): Promise<ManagedLanguage[]> {
  const languages = validateManagedLanguages(input);
  const supabase = createClient();
  const currentLanguages = await getLanguageSettings();
  const currentDefault = currentLanguages.find(
    (language) => language.isDefault
  )?.code;
  const requestedDefault = languages.find(
    (language) => language.isDefault
  )?.code;

  if (
    currentDefault &&
    requestedDefault &&
    currentDefault !== requestedDefault
  ) {
    throw new Error(
      'Changing the default language requires a catalog content migration first'
    );
  }

  const payload = languages.map((language) => ({
    code: language.code,
    label: language.label,
    nativeLabel: language.nativeLabel,
    direction: language.direction,
    isEnabled: language.isEnabled,
    isDefault: language.isDefault,
    sortOrder: language.sortOrder,
  }));
  const { error } = await supabase.rpc('update_supported_languages', {
    payload,
  });

  if (error) {
    log.error('Error updating language settings', { error });
    throw new Error('Unable to update language settings');
  }

  log.info('Language settings updated', {
    enabled: languages
      .filter((language) => language.isEnabled)
      .map((language) => language.code),
    defaultLocale: languages.find((language) => language.isDefault)?.code,
  });

  await invalidateProductCache();
  await invalidateCategoryCache();

  return getLanguageSettings();
}

export async function getProductTranslations(
  productId: string
): Promise<ProductTranslationRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('product_translations')
    .select('*')
    .eq('productId', productId)
    .order('locale', { ascending: true });

  if (error) {
    log.error('Error fetching product translations', { productId, error });
    throw new Error('Unable to load product translations');
  }

  return data || [];
}

export async function getProductTranslationsForProductIds(
  productIds: string[],
  requestedLocale?: string | null,
  fallbackLocale?: Locale
): Promise<ProductTranslationRow[]> {
  if (productIds.length === 0) return [];

  const locales = uniqueLocales(requestedLocale, fallbackLocale);
  const supabase = createClient();
  const { data, error } = await supabase
    .from('product_translations')
    .select('*')
    .in('productId', productIds)
    .in('locale', locales);

  if (error) {
    log.error('Error fetching product translation batch', { error });
    throw new Error('Unable to load product translations');
  }

  return data || [];
}

export async function saveProductTranslations(
  productId: string,
  translations: Record<string, ProductTranslationInput>
): Promise<void> {
  validateProductTranslationPayload(translations);
  const supabase = createClient();
  const rows: Array<Inserts<'product_translations'>> = [];
  const deletes: Locale[] = [];

  for (const [locale, translation] of Object.entries(translations)) {
    const localeCode = locale as Locale;
    const normalized = normalizeProductTranslation(translation);
    if (!hasAnyTranslationValue(normalized)) {
      deletes.push(localeCode);
      continue;
    }

    rows.push({
      productId,
      locale: localeCode,
      ...normalized,
      updatedAt: new Date().toISOString(),
    });
  }

  await Promise.all(
    deletes.map(async (locale) => {
      const { error } = await supabase
        .from('product_translations')
        .delete()
        .eq('productId', productId)
        .eq('locale', locale);

      if (error) {
        log.error('Error deleting product translation', {
          productId,
          locale,
          error,
        });
        throw new Error('Unable to save product translations');
      }
    })
  );

  if (rows.length > 0) {
    const { error } = await supabase
      .from('product_translations')
      .upsert(rows, { onConflict: 'productId,locale' });

    if (error) {
      log.error('Error saving product translations', { productId, error });
      throw new Error('Unable to save product translations');
    }
  }

  await invalidateProductCache();
}

export async function getProductMediaTranslationsForMediaIds(
  mediaIds: string[],
  requestedLocale?: string | null,
  fallbackLocale?: Locale
): Promise<ProductMediaTranslationRow[]> {
  if (mediaIds.length === 0) return [];

  const locales = uniqueLocales(requestedLocale, fallbackLocale);
  const supabase = createClient();
  const { data, error } = await supabase
    .from('product_media_translations')
    .select('*')
    .in('mediaId', mediaIds)
    .in('locale', locales);

  if (error) {
    log.error('Error fetching product media translation batch', { error });
    throw new Error('Unable to load product media translations');
  }

  return data || [];
}

export async function getProductMediaTranslationsForProduct(
  productId: string
): Promise<ProductMediaTranslationRow[]> {
  const supabase = createClient();
  const { data: media, error: mediaError } = await supabase
    .from('product_media')
    .select('id')
    .eq('productId', productId);

  if (mediaError) {
    log.error('Error fetching product media for translations', {
      productId,
      error: mediaError,
    });
    throw new Error('Unable to load product media translations');
  }

  const mediaIds = (media || []).map((item) => item.id);
  if (mediaIds.length === 0) return [];

  const { data, error } = await supabase
    .from('product_media_translations')
    .select('*')
    .in('mediaId', mediaIds)
    .order('locale', { ascending: true });

  if (error) {
    log.error('Error fetching product media translations', {
      productId,
      error,
    });
    throw new Error('Unable to load product media translations');
  }

  return data || [];
}

export async function validateProductMediaTranslationsBelongToProduct(
  productId: string,
  mediaIds: string[]
): Promise<void> {
  const requestedMediaIds = Array.from(new Set(mediaIds));
  if (requestedMediaIds.length === 0) return;

  const supabase = createClient();
  const { data: ownedMedia, error: mediaError } = await supabase
    .from('product_media')
    .select('id')
    .eq('productId', productId)
    .in('id', requestedMediaIds);

  if (mediaError) {
    log.error('Error validating product media translations', {
      productId,
      error: mediaError,
    });
    throw new Error('Unable to save product media translations');
  }

  const ownedMediaIds = new Set((ownedMedia || []).map((media) => media.id));
  const invalidMediaId = requestedMediaIds.find(
    (mediaId) => !ownedMediaIds.has(mediaId)
  );
  if (invalidMediaId) {
    throw new Error('Product media translations must belong to the product');
  }
}

export async function saveProductMediaTranslations(
  productId: string,
  translationsByMediaId: Record<
    string,
    Record<string, ProductMediaTranslationInput>
  >
): Promise<void> {
  validateProductMediaTranslationPayload(translationsByMediaId);
  const supabase = createClient();
  await validateProductMediaTranslationsBelongToProduct(
    productId,
    Object.keys(translationsByMediaId)
  );

  const rows: Array<Inserts<'product_media_translations'>> = [];
  const deletes: Array<{ mediaId: string; locale: Locale }> = [];

  for (const [mediaId, translations] of Object.entries(translationsByMediaId)) {
    for (const [locale, translation] of Object.entries(translations)) {
      const localeCode = locale as Locale;
      const alt = normalizeTranslationText(translation.alt);
      if (!alt) {
        deletes.push({ mediaId, locale: localeCode });
        continue;
      }

      rows.push({
        mediaId,
        locale: localeCode,
        alt,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  await Promise.all(
    deletes.map(async ({ mediaId, locale }) => {
      const { error } = await supabase
        .from('product_media_translations')
        .delete()
        .eq('mediaId', mediaId)
        .eq('locale', locale);

      if (error) {
        log.error('Error deleting product media translation', {
          mediaId,
          locale,
          error,
        });
        throw new Error('Unable to save product media translations');
      }
    })
  );

  if (rows.length > 0) {
    const { error } = await supabase
      .from('product_media_translations')
      .upsert(rows, { onConflict: 'mediaId,locale' });

    if (error) {
      log.error('Error saving product media translations', { error });
      throw new Error('Unable to save product media translations');
    }
  }

  await invalidateProductCache();
}

export async function getCategoryTranslations(
  categoryId: string
): Promise<CategoryTranslationRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('category_translations')
    .select('*')
    .eq('categoryId', categoryId)
    .order('locale', { ascending: true });

  if (error) {
    log.error('Error fetching category translations', { categoryId, error });
    throw new Error('Unable to load category translations');
  }

  return data || [];
}

export async function getCategoryTranslationsForCategoryIds(
  categoryIds: string[],
  requestedLocale?: string | null,
  fallbackLocale?: Locale
): Promise<CategoryTranslationRow[]> {
  if (categoryIds.length === 0) return [];

  const locales = uniqueLocales(requestedLocale, fallbackLocale);
  const supabase = createClient();
  const { data, error } = await supabase
    .from('category_translations')
    .select('*')
    .in('categoryId', categoryIds)
    .in('locale', locales);

  if (error) {
    log.error('Error fetching category translation batch', { error });
    throw new Error('Unable to load category translations');
  }

  return data || [];
}

export async function saveCategoryTranslations(
  categoryId: string,
  translations: Record<string, CategoryTranslationInput>
): Promise<void> {
  const supabase = createClient();
  const rows: Array<Inserts<'category_translations'>> = [];
  const deletes: Locale[] = [];

  for (const [locale, translation] of Object.entries(translations)) {
    if (!isManageableLocale(locale)) {
      throw new Error(`Unsupported category translation locale: ${locale}`);
    }

    const normalized = normalizeCategoryTranslation(translation);
    if (!hasAnyTranslationValue(normalized)) {
      deletes.push(locale);
      continue;
    }

    rows.push({
      categoryId,
      locale,
      ...normalized,
      updatedAt: new Date().toISOString(),
    });
  }

  await Promise.all(
    deletes.map(async (locale) => {
      const { error } = await supabase
        .from('category_translations')
        .delete()
        .eq('categoryId', categoryId)
        .eq('locale', locale);

      if (error) {
        log.error('Error deleting category translation', {
          categoryId,
          locale,
          error,
        });
        throw new Error('Unable to save category translations');
      }
    })
  );

  if (rows.length > 0) {
    const { error } = await supabase
      .from('category_translations')
      .upsert(rows, { onConflict: 'categoryId,locale' });

    if (error) {
      log.error('Error saving category translations', { categoryId, error });
      throw new Error('Unable to save category translations');
    }
  }

  await invalidateProductCache();
  await invalidateCategoryCache();
}

export async function getTagTranslationsForTagIds(
  tagIds: string[],
  requestedLocale?: string | null,
  fallbackLocale?: Locale
): Promise<TagTranslationRow[]> {
  if (tagIds.length === 0) return [];

  const locales = uniqueLocales(requestedLocale, fallbackLocale);
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tag_translations')
    .select('*')
    .in('tagId', tagIds)
    .in('locale', locales);

  if (error) {
    log.error('Error fetching tag translation batch', { error });
    throw new Error('Unable to load tag translations');
  }

  return data || [];
}

export async function getTagTranslations(
  tagId: string
): Promise<TagTranslationRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tag_translations')
    .select('*')
    .eq('tagId', tagId)
    .order('locale', { ascending: true });

  if (error) {
    log.error('Error fetching tag translations', { tagId, error });
    throw new Error('Unable to load tag translations');
  }

  return data || [];
}

export async function saveTagTranslations(
  tagId: string,
  translations: Record<string, TagTranslationInput>
): Promise<void> {
  const supabase = createClient();
  const rows: Array<Inserts<'tag_translations'>> = [];
  const deletes: Locale[] = [];
  const locales = Object.keys(translations);

  for (const locale of locales) {
    if (!isManageableLocale(locale)) {
      throw new Error(`Unsupported tag translation locale: ${locale}`);
    }
  }

  const existingTranslations = new Map<string, TagTranslationRow>();
  if (locales.length > 0) {
    const { data, error } = await supabase
      .from('tag_translations')
      .select('*')
      .eq('tagId', tagId)
      .in('locale', locales);

    if (error) {
      log.error('Error loading existing tag translations', { tagId, error });
      throw new Error('Unable to save tag translations');
    }

    for (const translation of data || []) {
      existingTranslations.set(translation.locale, translation);
    }
  }

  for (const [locale, translation] of Object.entries(translations)) {
    const localeCode = locale as Locale;
    const normalized = normalizeTagTranslation(translation);
    const existing = existingTranslations.get(locale);
    if (!Object.prototype.hasOwnProperty.call(translation, 'description')) {
      normalized.description = existing?.description || null;
    }

    if (!hasAnyTranslationValue(normalized)) {
      deletes.push(localeCode);
      continue;
    }

    rows.push({
      tagId,
      locale: localeCode,
      ...normalized,
      updatedAt: new Date().toISOString(),
    });
  }

  await Promise.all(
    deletes.map(async (locale) => {
      const { error } = await supabase
        .from('tag_translations')
        .delete()
        .eq('tagId', tagId)
        .eq('locale', locale);

      if (error) {
        log.error('Error deleting tag translation', {
          tagId,
          locale,
          error,
        });
        throw new Error('Unable to save tag translations');
      }
    })
  );

  if (rows.length > 0) {
    const { error } = await supabase
      .from('tag_translations')
      .upsert(rows, { onConflict: 'tagId,locale' });

    if (error) {
      log.error('Error saving tag translations', { tagId, error });
      throw new Error('Unable to save tag translations');
    }
  }

  await invalidateProductCache();
}
