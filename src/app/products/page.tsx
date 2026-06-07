import { Metadata } from 'next';
import ProductList from '@/components/products/ProductList';
import ProductsHero from '@/components/products/ProductsHero';
import { getActiveProducts } from '@/services/product-service';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og-images';
import { siteConfig } from '@/config/site';
import { getRequestLocale } from '@/lib/i18n/server';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { createTranslator } from '@/lib/i18n/translate';
import {
  buildLocalizedAlternates,
  getOpenGraphLocale,
} from '@/lib/seo/localized-metadata';
import { getEnabledLanguages } from '@/services/localization-service';

export const dynamic = 'force-dynamic';

interface ProductsPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    tag?: string;
    search?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const locale = await getRequestLocale();
  const languages = await getEnabledLanguages();
  const t = createTranslator(getDictionary(locale));
  const { category, tag, search, page } = params;

  let title = t('seo.productsTitle', { siteName: siteConfig.displayName });
  let description = t('seo.productsDescription', {
    siteName: siteConfig.displayName,
  });

  if (category) {
    title = t('seo.productsCategoryTitle', {
      category,
      siteName: siteConfig.displayName,
    });
    description = t('seo.productsCategoryDescription', { category });
  } else if (tag) {
    title = t('seo.productsTagTitle', {
      tag,
      siteName: siteConfig.displayName,
    });
    description = t('seo.productsTagDescription', { tag });
  } else if (search) {
    title = t('seo.productsSearchTitle', {
      search,
      siteName: siteConfig.displayName,
    });
    description = t('seo.productsSearchDescription', { search });
  }

  if (page && parseInt(page) > 1) {
    title = `${title} - ${t('seo.pageSuffix', { page })}`;
  }

  const queryParams = new URLSearchParams();

  if (category) queryParams.set('category', category);
  if (tag) queryParams.set('tag', tag);
  if (search) queryParams.set('search', search);
  if (page && parseInt(page) > 1) queryParams.set('page', page);

  const canonicalUrl =
    queryParams.size > 0 ? `/products?${queryParams.toString()}` : '/products';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: getOpenGraphLocale(locale),
      siteName: siteConfig.displayName,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: t('seo.productsOgAlt', { siteName: siteConfig.displayName }),
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
    alternates: buildLocalizedAlternates(canonicalUrl, locale, languages),
  };
}

export default async function ProductsPage() {
  const locale = await getRequestLocale();
  const result = await getActiveProducts({
    page: 1,
    perPage: 20,
    sortBy: 'popular',
    locale,
  });

  const products = result.data.map((product) => ({
    ...product,
    price: Number(product.price),
    images: product.images || [],
    discountPercent: product.discountPercent,
    isFeatured: product.isFeatured,
    createdAt: product.createdAt,
    displayOrder: product.displayOrder,
    variants: product.variants?.map((v) => ({
      ...v,
      priceAdjust: Number(v.priceAdjust),
      createdAt: v.createdAt,
    })),
  }));

  return (
    <div className="min-h-screen bg-slate-50 pt-16 dark:bg-slate-950">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <ProductsHero />
        <ProductList
          initialProducts={products}
          initialPage={1}
          initialTotal={result.total}
          locale={locale}
        />
      </main>
    </div>
  );
}
