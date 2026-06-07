import { MetadataRoute } from 'next';
import { getAllProducts } from '@/services/product-service';
import { getAllCategories } from '@/services/category-service';
import { getBaseUrl } from '@/lib/seo/config';
import { getEnabledLanguages } from '@/services/localization-service';
import { getStaticLanguageDefaults } from '@/lib/i18n/localized-content';
import {
  buildLanguageAlternates,
  getLocalizedPath,
} from '@/lib/seo/localized-metadata';
import { log } from '@/lib/logger';
import type { Locale } from '@/lib/i18n/config';
import type { ManagedLanguage } from '@/lib/i18n/localized-content';

export const dynamic = 'force-dynamic';

async function getSitemapLanguages(): Promise<ManagedLanguage[]> {
  try {
    return await getEnabledLanguages();
  } catch (error) {
    log.warn(
      'Unable to load sitemap language settings; using static defaults',
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );
    return getStaticLanguageDefaults().filter((language) => language.isEnabled);
  }
}

function createLocalizedEntries(
  path: string,
  languages: ManagedLanguage[],
  metadata: Omit<MetadataRoute.Sitemap[number], 'url' | 'alternates'>
): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const alternates = buildLanguageAlternates(path, languages);

  return languages.map((language) => ({
    url: `${baseUrl}${getLocalizedPath(path, language.code as Locale)}`,
    ...metadata,
    alternates: {
      languages: alternates,
    },
  }));
}

/**
 * Generate dynamic sitemap for search engines
 * Includes all static pages, active products, and categories
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const languages = await getSitemapLanguages();
  const now = new Date();

  // Static pages with their priorities and change frequencies
  const staticPages: MetadataRoute.Sitemap = [
    ...createLocalizedEntries('/', languages, {
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    }),
    ...createLocalizedEntries('/products', languages, {
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    }),
    ...createLocalizedEntries('/about', languages, {
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    }),
    ...createLocalizedEntries('/contact', languages, {
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    }),
    ...createLocalizedEntries('/faq', languages, {
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
    }),
    ...createLocalizedEntries('/cart', languages, {
      lastModified: now,
      changeFrequency: 'always',
      priority: 0.4,
    }),
    ...createLocalizedEntries('/checkout', languages, {
      lastModified: now,
      changeFrequency: 'always',
      priority: 0.4,
    }),
    ...createLocalizedEntries('/terms', languages, {
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    }),
    ...createLocalizedEntries('/privacy', languages, {
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    }),
    ...createLocalizedEntries('/shipping', languages, {
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    }),
    ...createLocalizedEntries('/refund-policy', languages, {
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.3,
    }),
  ];

  try {
    // Fetch all active products (no pagination for sitemap)
    const productsResponse = await getAllProducts({
      includeInactive: false,
      perPage: 10000, // Large number to get all products
    });

    const productPages: MetadataRoute.Sitemap = productsResponse.data.flatMap(
      (product) =>
        createLocalizedEntries(`/products/${product.id}`, languages, {
          lastModified: new Date(product.updatedAt),
          changeFrequency: 'weekly',
          priority: 0.8,
        })
    );

    // Fetch all categories
    const categories = await getAllCategories();
    const categoryPages: MetadataRoute.Sitemap = categories.flatMap(
      (category) =>
        createLocalizedEntries(`/products?category=${category.id}`, languages, {
          lastModified: new Date(category.updatedAt),
          changeFrequency: 'weekly',
          priority: 0.7,
        })
    );

    return [...staticPages, ...productPages, ...categoryPages];
  } catch (error) {
    // If fetching dynamic data fails, return at least static pages
    console.error('Error generating sitemap:', error);
    return staticPages;
  }
}
