import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  getFeaturedProducts,
  getDiscountedProducts,
} from '@/services/product-service';
import { getCategoryTree } from '@/services/category-service';
import ProductCard from '@/components/products/ProductCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import PillV4 from '@/components/ui-v4/Pill';
import FeaturesSection from '@/components/home/FeaturesSection';
import CtaSection from '@/components/home/CtaSection';
import { optimizeImage } from '@/lib/cloudflare-images-client';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og-images';
import { getAbsoluteUrl } from '@/lib/seo/config';
import { generateCategoryAltText } from '@/lib/seo/alt-text';

// Use ISR (Incremental Static Regeneration) for optimal performance
// Page will be statically generated and revalidated every 60 seconds
export const revalidate = 60;

// Optimized hero image URL (640x640, WebP, 85% quality)
// Using Cloudflare Image Resizing for automatic WebP conversion and size optimization
const HERO_IMAGE_OPTIMIZED =
  'https://cdn.kitia.ir/cdn-cgi/image/width=640,height=640,format=auto,quality=85,fit=cover,gravity=center/hero-section-image/hero%20section.jpg';

export const metadata: Metadata = {
  title: 'کیتیا - فروشگاه آنلاین لیوان سفری و ماگ',
  description:
    'خرید بهترین لیوان‌های سفری و ماگ‌های باکیفیت. ارسال سریع به سراسر کشور، کمک به گربه‌های خیابانی با هر خرید.',
  openGraph: {
    title: 'کیتیا - فروشگاه آنلاین لیوان سفری و ماگ',
    description:
      'دنیایی از محصولات زیبا و با کیفیت برای شما. خرید آنلاین لیوان‌های سفری و ماگ با ارسال سریع و کمک به حیوانات خیابانی.',
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
    title: 'کیتیا - فروشگاه آنلاین لیوان سفری و ماگ',
    description:
      'خرید بهترین لیوان‌های سفری و ماگ‌های باکیفیت. ارسال سریع، کمک به گربه‌های خیابانی.',
    images: [DEFAULT_OG_IMAGE],
  },
  alternates: {
    canonical: getAbsoluteUrl('/'),
  },
};

export default async function Home() {
  // Fetch featured and discounted products directly from database
  // Using database-level filtering for optimal performance
  const [featuredProductsRaw, discountedProductsRaw] = await Promise.all([
    getFeaturedProducts({ limit: 4 }),
    getDiscountedProducts({ limit: 4 }),
  ]);

  let categories: Awaited<ReturnType<typeof getCategoryTree>> = [];
  try {
    categories = await getCategoryTree();
  } catch (error) {
    console.error('Failed to load category tree for homepage', error);
  }

  // Convert price and variant priceAdjust to number for display
  // Also ensure images is always an array (not null)
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

  // Get top 3 categories
  const topCategories = categories.slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="order-2 md:order-1 text-right">
            <div className="flex flex-wrap gap-2 sm:gap-3 justify-end mb-5 sm:mb-6">
              <PillV4
                tone="blush"
                size="sm"
                className="md:h-7 md:px-4 md:text-sm"
              >
                ارسال سریع
              </PillV4>
              <PillV4
                tone="cream"
                size="sm"
                className="md:h-7 md:px-4 md:text-sm"
              >
                امکان خرید قسطی
              </PillV4>
              <PillV4
                tone="rose"
                size="sm"
                className="md:h-7 md:px-4 md:text-sm"
              >
                کمک به گربه‌های خیابانی
              </PillV4>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-rose-900 mb-5 sm:mb-6 leading-tight">
              به کیتیا خوش آمدید
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-rose-700 mb-6 sm:mb-8 leading-relaxed">
              دنیایی از محصولات زیبا و با کیفیت برای شما
            </p>
            <p className="text-base sm:text-lg text-rose-500 mb-8 sm:mb-10 leading-relaxed">
              کیتیا، عرضه کننده ترند ترین ماگ ها با بهترین قیمت
            </p>
            <div className="flex flex-wrap gap-4 justify-end">
              <Link href="/products">
                <Button variant="primary" size="lg">
                  مشاهده محصولات
                </Button>
              </Link>
              <Link href="/products?discounted=true">
                <Button variant="soft" size="lg">
                  پیشنهادهای ویژه
                </Button>
              </Link>
            </div>
          </div>

          <div className="order-1 md:order-2 flex justify-center">
            <div className="relative w-full max-w-md aspect-square">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-white opacity-80 blur-3xl"></div>
              </div>
              <div className="relative w-full h-full rounded-full overflow-hidden shadow-2xl border-8 border-white">
                <Image
                  src={HERO_IMAGE_OPTIMIZED}
                  alt="کیتیا - فروشگاه آنلاین"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      {featuredProducts.length > 0 && (
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div className="text-right">
              <PillV4 tone="rose">منتخب‌ها</PillV4>
              <h2 className="text-3xl md:text-4xl font-bold text-rose-900 mt-4">
                کالکشن 2026
              </h2>
              <p className="text-rose-500 text-lg mt-3">
                ترند ترین استنلی هامون
              </p>
            </div>
            <Link href="/products" className="self-end">
              <Button variant="secondary" size="lg">
                مشاهده همه محصولات
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Discounted Products Section */}
      {discountedProducts.length > 0 && (
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 my-10">
          <Card className="p-10 bg-white/90 border-rose-100 shadow-[0_32px_80px_-55px_rgba(244,63,94,0.6)]">
            <div className="absolute -top-6 left-10">
              <PillV4 tone="blush">فقط امروز</PillV4>
            </div>
            <div className="text-right mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-rose-600 mb-3">
                پیشنهاد شگفت‌انگیز
              </h2>
              <p className="text-rose-500 text-lg">
                تخفیف های ویژه برای عاشقان تراول ماگ
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {discountedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </Card>
        </section>
      )}

      {/* Categories Section */}
      {topCategories.length > 0 && (
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-right mb-10">
            <PillV4 tone="cream">دسته‌بندی‌ها</PillV4>
            <h2 className="text-3xl md:text-4xl font-bold text-rose-900 mt-4">
              انتخاب بر اساس حس و حال
            </h2>
            <p className="text-rose-500 text-lg mt-3">هر دسته یک تجربه تازه</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {topCategories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
              >
                <Card className="hover:shadow-[0_28px_60px_-40px_rgba(244,63,94,0.45)] transition-all duration-300 transform hover:-translate-y-2 cursor-pointer h-full">
                  <div className="text-center">
                    <div className="w-full aspect-[4/5] rounded-[22px] mb-5 flex items-center justify-center overflow-hidden relative">
                      {category.image ? (
                        <Image
                          src={optimizeImage.categoryCard(category.image)}
                          alt={generateCategoryAltText({
                            categoryName: category.name,
                          })}
                          fill
                          className="object-cover object-center"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="text-6xl text-rose-400">📦</div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-rose-900 mb-2">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-rose-500 text-sm mb-4 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                    <div className="flex justify-center">
                      <PillV4 tone="blush" size="sm">
                        مشاهده محصولات
                      </PillV4>
                    </div>
                  </div>
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
