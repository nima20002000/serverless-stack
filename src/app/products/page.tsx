import { Metadata } from 'next';
import ProductList from '@/components/products/ProductList';
import { getActiveProducts } from '@/services/product-service';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og-images';

// Use ISR for better performance - revalidate every 60 seconds
export const revalidate = 60;

interface ProductsPageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    tag?: string;
    search?: string;
  }>;
}

export async function generateMetadata({ searchParams }: ProductsPageProps): Promise<Metadata> {
  const params = await searchParams;
  const { category, tag, search, page } = params;

  let title = "محصولات - کیتیا";
  let description = "مشاهده و خرید بهترین لیوان‌های سفری و ماگ‌های باکیفیت. ارسال سریع، قیمت مناسب و کمک به گربه‌های خیابانی.";

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

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "fa_IR",
      siteName: "کیتیا",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: "کیتیا - فروشگاه آنلاین",
        }
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
    alternates: {
      canonical: `/products${page && parseInt(page) > 1 ? `?page=${page}` : ''}`,
    },
  };
}

export default async function ProductsPage() {
  const result = await getActiveProducts({ page: 1, perPage: 20 });

  // Serialize Decimal prices to numbers for client components
  // Also ensure images is always an array (not null)
  const products = result.data.map((product) => ({
    ...product,
    price: Number(product.price),
    images: product.images || [],
    discountPercent: product.discountPercent,
    isFeatured: product.isFeatured,
    variants: product.variants?.map(v => ({ ...v, priceAdjust: Number(v.priceAdjust) })),
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 text-right mb-2">
            محصولات
          </h1>
          <p className="text-gray-600 text-right">
            مشاهده و خرید بهترین محصولات
          </p>
        </div>

        <ProductList
          initialProducts={products}
          initialPage={1}
          initialTotal={result.total}
        />
      </main>
    </div>
  );
}
