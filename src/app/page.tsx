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
    <div className="min-h-screen bg-gradient-to-b from-rose-50 via-white to-pink-50">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="order-2 md:order-1 text-right">
            <div className="flex flex-wrap gap-3 justify-end mb-6">
              <PillV4 tone="blush">ارسال سریع</PillV4>
              <PillV4 tone="cream">بسته‌بندی هدیه</PillV4>
              <PillV4 tone="rose">کمک به گربه‌های خیابانی</PillV4>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-rose-900 mb-6 leading-tight">
              به کیتیا خوش آمدید
            </h1>
            <p className="text-xl md:text-2xl text-rose-700 mb-8 leading-relaxed">
              دنیایی از محصولات زیبا و با کیفیت برای شما
            </p>
            <p className="text-lg text-rose-500 mb-10 leading-relaxed">
              کیتیا با ارائه بهترین محصولات و خدمات، همراه شماست تا تجربه‌ای
              لذت‌بخش از خرید آنلاین داشته باشید.
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
              <p className="text-rose-500 text-lg mt-3">ترند ترین استنلی ها</p>
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
                تخفیف‌های ویژه برای عاشقان صورتی
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

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-rose-900 mb-4">
            چرا کیتیا؟
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-rose-500 to-pink-400 mx-auto mb-4"></div>
          <p className="text-rose-500 text-lg">مزایای خرید از ما</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="text-center hover:shadow-[0_28px_60px_-40px_rgba(244,63,94,0.45)] transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-pink-100 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-10 h-10 text-rose-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-rose-900 mb-3">
                ارسال سریع
              </h3>
              <p className="text-rose-500 leading-relaxed">
                ارسال سریع و ایمن محصولات به سراسر کشور با بسته‌بندی مناسب
              </p>
            </div>
          </Card>

          <Card className="text-center hover:shadow-[0_28px_60px_-40px_rgba(244,63,94,0.45)] transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-rose-100 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-10 h-10 text-pink-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-rose-900 mb-3">
                تضمین سلامت کالا
              </h3>
              <p className="text-rose-500 leading-relaxed">
                تضمین اصالت و سلامت کالا با امکان بازگشت تا ۷ روز
              </p>
            </div>
          </Card>

          <Card className="text-center hover:shadow-[0_28px_60px_-40px_rgba(244,63,94,0.45)] transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-rose-100 to-amber-100 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-10 h-10 text-rose-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-rose-900 mb-3">
                امکان خرید قسطی
              </h3>
              <p className="text-rose-500 leading-relaxed">
                خرید آسان با امکان پرداخت اقساطی و بدون نیاز به ضامن
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Call to Action */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-20">
        <Card className="relative overflow-hidden text-center bg-white">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,_rgba(244,63,94,0.12),_transparent_45%,_rgba(251,207,232,0.25))]" />
          <div className="relative px-6 py-12">
            <PillV4 tone="rose">مجموعه کامل</PillV4>
            <h2 className="text-3xl md:text-4xl font-bold text-rose-900 mt-6">
              آماده برای شروع خرید هستید؟
            </h2>
            <p className="text-lg text-rose-500 mt-4">
              کالکشن تازه را همین حالا ببینید و لحظه‌های خود را زیباتر کنید.
            </p>
            <div className="mt-8 flex justify-center">
              <Link href="/products">
                <Button variant="primary" size="lg">
                  مشاهده تمام محصولات
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </section>
    </div>
  );
}
