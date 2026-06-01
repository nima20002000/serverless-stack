import { Metadata } from 'next';
import ProductList from '@/components/products/ProductList';
import ProductsHero from '@/components/products/ProductsHero';
import { getActiveProducts } from '@/services/product-service';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og-images';
import { getAbsoluteUrl } from '@/lib/seo/config';

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
  const { category, tag, search, page } = params;

  let title = 'محصولات - کیتیا';
  let description =
    'مشاهده و خرید بهترین لیوان‌های سفری و ماگ‌های باکیفیت. ارسال سریع، قیمت مناسب و کمک به گربه‌های خیابانی.';

  if (category) {
    title = `محصولات ${category} - کیتیا`;
    description = `مشاهده همه محصولات در دسته ${category}. لیوان‌های سفری و ماگ‌های باکیفیت با ارسال سریع.`;
  } else if (tag) {
    title = `محصولات با برچسب ${tag} - کیتیا`;
    description = `مشاهده محصولات با برچسب ${tag}. انتخاب از بین بهترین لیوان‌های سفری و ماگ‌ها.`;
  } else if (search) {
    title = `جستجو: ${search} - کیتیا`;
    description = `نتایج جستجو برای "${search}" در فروشگاه کیتیا.`;
  }

  if (page && parseInt(page) > 1) {
    title = `${title} - صفحه ${page}`;
  }

  // Build canonical URL with filters
  // For pagination, use page=1 as canonical (avoid duplicate content)
  // For filtered pages (category, tag, search), include those in canonical
  const canonicalPath = '/products';
  const queryParams: string[] = [];

  if (category) {
    queryParams.push(`category=${category}`);
  }
  if (tag) {
    queryParams.push(`tag=${tag}`);
  }
  if (search) {
    queryParams.push(`search=${encodeURIComponent(search)}`);
  }

  // Only add page to canonical if page > 1
  if (page && parseInt(page) > 1) {
    queryParams.push(`page=${page}`);
  }

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
      locale: 'fa_IR',
      siteName: 'کیتیا',
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: 'کیتیا - فروشگاه آنلاین',
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
  const result = await getActiveProducts({
    page: 1,
    perPage: 20,
    sortBy: 'popular',
  });

  // Serialize Decimal prices to numbers for client components
  // Also ensure images is always an array (not null) and include createdAt, displayOrder for client-side sorting
  const products = result.data.map((product) => ({
    ...product,
    price: Number(product.price),
    images: product.images || [],
    discountPercent: product.discountPercent,
    isFeatured: product.isFeatured,
    createdAt: product.createdAt, // Include createdAt for client-side sorting
    displayOrder: product.displayOrder, // Include displayOrder for "popular" sorting
    variants: product.variants?.map((v) => ({
      ...v,
      priceAdjust: Number(v.priceAdjust),
      createdAt: v.createdAt,
    })),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ProductsHero />

        <ProductList
          initialProducts={products}
          initialPage={1}
          initialTotal={result.total}
        />
      </main>
    </div>
  );
}
