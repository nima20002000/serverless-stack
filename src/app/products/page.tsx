import { Metadata } from 'next';
import ProductList from '@/components/products/ProductList';
import ProductsHero from '@/components/products/ProductsHero';
import { getActiveProducts } from '@/services/product-service';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og-images';
import { getAbsoluteUrl } from '@/lib/seo/config';
import { siteConfig, siteLocale } from '@/config/site';
import { getRequestLocale } from '@/lib/i18n/server';

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
  const { category, tag, search, page } = params;

  let title = `Products - ${siteConfig.displayName}`;
  let description = `Browse the product catalog for ${siteConfig.displayName}.`;

  if (category) {
    title = `${category} products - ${siteConfig.displayName}`;
    description = `Browse products in the ${category} category.`;
  } else if (tag) {
    title = `${tag} products - ${siteConfig.displayName}`;
    description = `Browse products tagged ${tag}.`;
  } else if (search) {
    title = `Search results for ${search} - ${siteConfig.displayName}`;
    description = `Product search results for "${search}".`;
  }

  if (page && parseInt(page) > 1) {
    title = `${title} - Page ${page}`;
  }

  const canonicalPath = '/products';
  const queryParams: string[] = [];

  if (category) queryParams.push(`category=${category}`);
  if (tag) queryParams.push(`tag=${tag}`);
  if (search) queryParams.push(`search=${encodeURIComponent(search)}`);
  if (page && parseInt(page) > 1) queryParams.push(`page=${page}`);

  const canonicalUrl =
    queryParams.length > 0
      ? `${canonicalPath}?${queryParams.join('&')}`
      : canonicalPath;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: locale === 'de' ? 'de_DE' : siteLocale.ogLocale,
      siteName: siteConfig.displayName,
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: `${siteConfig.displayName} products`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
    alternates: {
      canonical: getAbsoluteUrl(canonicalUrl),
    },
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
