import { Metadata } from 'next';
import Link from 'next/link';
import {
  getFeaturedProducts,
  getDiscountedProducts,
} from '@/services/product-service';
import { getCategoryTree } from '@/services/category-service';
import ProductCard from '@/components/products/ProductCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Pill from '@/components/ui/Pill';
import FeaturesSection from '@/components/home/FeaturesSection';
import CtaSection from '@/components/home/CtaSection';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og-images';
import { getAbsoluteUrl } from '@/lib/seo/config';
import { siteConfig, siteLocale } from '@/config/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: siteConfig.displayName,
  description: siteConfig.description,
  openGraph: {
    title: siteConfig.displayName,
    description: siteConfig.description,
    type: 'website',
    locale: siteLocale.ogLocale,
    siteName: siteConfig.displayName,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${siteConfig.displayName} storefront`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.displayName,
    description: siteConfig.description,
    images: [DEFAULT_OG_IMAGE],
  },
  alternates: {
    canonical: getAbsoluteUrl('/'),
  },
};

export default async function Home() {
  let featuredProductsRaw: Awaited<ReturnType<typeof getFeaturedProducts>> = [];
  let discountedProductsRaw: Awaited<ReturnType<typeof getDiscountedProducts>> =
    [];

  const [featuredResult, discountedResult] = await Promise.allSettled([
    getFeaturedProducts({ limit: 4 }),
    getDiscountedProducts({ limit: 4 }),
  ]);

  if (featuredResult.status === 'fulfilled') {
    featuredProductsRaw = featuredResult.value;
  } else {
    console.error(
      'Failed to load homepage featured products',
      featuredResult.reason
    );
  }

  if (discountedResult.status === 'fulfilled') {
    discountedProductsRaw = discountedResult.value;
  } else {
    console.error(
      'Failed to load homepage discounted products',
      discountedResult.reason
    );
  }

  let categories: Awaited<ReturnType<typeof getCategoryTree>> = [];
  try {
    categories = await getCategoryTree();
  } catch (error) {
    console.error('Failed to load category tree for homepage', error);
  }

  const featuredProducts = featuredProductsRaw.map((p) => ({
    ...p,
    price: Number(p.price),
    images: p.images || [],
    variants: p.variants?.map((v) => ({
      ...v,
      priceAdjust: Number(v.priceAdjust),
    })),
  }));

  const discountedProducts = discountedProductsRaw.map((p) => ({
    ...p,
    price: Number(p.price),
    images: p.images || [],
    variants: p.variants?.map((v) => ({
      ...v,
      priceAdjust: Number(v.priceAdjust),
    })),
  }));

  const topCategories = categories.slice(0, 3);

  return (
    <div className="min-h-screen bg-white pt-16 text-slate-950 dark:bg-slate-950 dark:text-slate-50">
      <section className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:px-6 md:grid-cols-[1.1fr_0.9fr] md:py-14 lg:px-8">
          <div className="flex flex-col justify-center">
            <div className="mb-5 flex flex-wrap gap-2">
              <Pill tone="primary">Supabase ready</Pill>
              <Pill tone="success">Stripe and PayPal</Pill>
              <Pill tone="neutral">LTR and RTL capable</Pill>
            </div>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight text-slate-950 sm:text-5xl dark:text-white">
              A production-minded commerce storefront for modern stacks.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
              Start with a working storefront, product catalog, wishlist, cart,
              and checkout-ready commerce flow powered by Supabase and Vercel.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products">
                <Button variant="primary" size="lg">
                  Browse products
                </Button>
              </Link>
              <Link href="/cart">
                <Button variant="secondary" size="lg">
                  View cart
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-1">
            <Card className="bg-white p-6 dark:bg-slate-900">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Storefront surface
              </p>
              <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
                Catalog first
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                The first screen sends shoppers directly into live product data
                instead of a marketing-only landing page.
              </p>
            </Card>
            <Card className="bg-white p-6 dark:bg-slate-900">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Payment stack
              </p>
              <p className="mt-3 text-3xl font-bold text-slate-950 dark:text-white">
                Provider neutral
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                Built-in commerce contracts stay aligned with Stripe and PayPal
                while keeping copy and policies configurable.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {featuredProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Pill tone="primary">Featured</Pill>
              <h2 className="mt-4 text-3xl font-bold text-slate-950 dark:text-white">
                Featured products
              </h2>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                A compact section for curated or high-priority catalog items.
              </p>
            </div>
            <Link href="/products">
              <Button variant="secondary">View all products</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {discountedProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <Pill tone="warning">Promotions</Pill>
              <h2 className="mt-4 text-3xl font-bold text-slate-950 dark:text-white">
                Current offers
              </h2>
              <p className="mt-2 text-slate-600 dark:text-slate-400">
                Highlight discounted products without locking the boilerplate to
                a specific product category.
              </p>
            </div>
            <Link href="/products?discounted=true">
              <Button variant="secondary">Shop offers</Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {discountedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {topCategories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="mb-8">
            <Pill tone="neutral">Categories</Pill>
            <h2 className="mt-4 text-3xl font-bold text-slate-950 dark:text-white">
              Shop by category
            </h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">
              Use your own category tree to guide product discovery.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {topCategories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className="block"
              >
                <Card className="h-full p-5 transition hover:-translate-y-1 hover:shadow-md">
                  <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                      {category.description}
                    </p>
                  )}
                  <span className="mt-4 inline-flex text-sm font-medium text-blue-700 dark:text-blue-300">
                    View products
                  </span>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      <FeaturesSection />
      <CtaSection />
    </div>
  );
}
