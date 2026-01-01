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
import StatCardV4 from '@/components/ui-v4/StatCard';
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
  const [featuredProductsRaw, discountedProductsRaw, categories] =
    await Promise.all([
      getFeaturedProducts({ limit: 4 }),
      getDiscountedProducts({ limit: 4 }),
      getCategoryTree(),
    ]);

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
    <div className="relative min-h-screen bg-[#fff7fa] overflow-hidden">
      <div className="absolute -top-32 -left-24 h-80 w-80 rounded-full bg-rose-200/40 blur-3xl" />
      <div className="absolute top-20 right-10 h-64 w-64 rounded-full bg-pink-100/60 blur-3xl" />
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#fbcfe8_1px,transparent_1px)] bg-[length:22px_22px]" />

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-10">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div className="text-right">
            <div className="flex flex-wrap gap-3 justify-end mb-6">
              <PillV4 tone="blush">ارسال سریع</PillV4>
              <PillV4 tone="cream">بسته‌بندی هدیه</PillV4>
              <PillV4 tone="rose">کمک به گربه‌های خیابانی</PillV4>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-rose-900 leading-tight">
              لحظه‌های ظریف،
              <span className="block text-rose-600">طراحی برای دخترانه‌ها</span>
            </h1>
            <p className="text-lg md:text-2xl text-rose-700 mt-6 leading-relaxed">
              انتخابی هوشمندانه برای ماگ‌های خاص و هدیه‌های دوست‌داشتنی.
            </p>
            <p className="text-base md:text-lg text-rose-500 mt-6 leading-relaxed">
              تجربه‌ای دلپذیر از خرید آنلاین و حمایت از گربه‌های خیابانی.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 justify-end">
              <Link href="/products">
                <Button variant="primary" size="lg">
                  دیدن کالکشن
                </Button>
              </Link>
              <Link href="/products?discounted=true">
                <Button variant="soft" size="lg">
                  پیشنهادهای ویژه
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 justify-end text-sm text-rose-500">
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                ارسال شهری ۲۴ ساعته
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                پرداخت امن و سریع
              </span>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                بسته‌بندی با عشق
              </span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-8 right-8">
              <PillV4 tone="blush" size="sm">
                محبوب امروز
              </PillV4>
            </div>
            <Card className="relative p-4 shadow-[0_30px_80px_-50px_rgba(244,63,94,0.6)]">
              <div className="relative aspect-[3/4] rounded-[28px] overflow-hidden">
                <Image
                  src={HERO_IMAGE_OPTIMIZED}
                  alt="کیتیا - فروشگاه آنلاین"
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>
            </Card>
            <div className="absolute -bottom-6 left-6 right-6 grid grid-cols-2 gap-4">
              <StatCardV4
                label="ارسال سریع"
                value="۲۴ ساعت"
                trend="سفارش‌های شهری"
                accent="rose"
                icon={
                  <svg
                    className="w-5 h-5"
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
                }
              />
              <StatCardV4
                label="تضمین کیفیت"
                value="۷ روز"
                trend="بازگشت آسان"
                accent="pink"
                icon={
                  <svg
                    className="w-5 h-5"
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
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCardV4
            label="پرداخت مطمئن"
            value="چند درگاه"
            trend="زرین‌پال و زیبال"
            accent="peach"
            icon={
              <svg
                className="w-5 h-5"
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
            }
          />
          <StatCardV4
            label="سفارش هدیه"
            value="کارت تبریک"
            trend="پیام شخصی"
            accent="rose"
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7h18v10H3zM3 7l9 6 9-6"
                />
              </svg>
            }
          />
          <StatCardV4
            label="باشگاه مشتریان"
            value="هدیه ماهانه"
            trend="کدهای ویژه"
            accent="pink"
            icon={
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 1.343-3 3v7h6v-7c0-1.657-1.343-3-3-3zm0 0V6m0 0a3 3 0 00-3 3m3-3a3 3 0 013 3"
                />
              </svg>
            }
          />
        </div>
      </section>

      {/* Featured Products Section */}
      {featuredProducts.length > 0 && (
        <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div className="text-right">
              <PillV4 tone="rose">منتخب‌ها</PillV4>
              <h2 className="text-3xl md:text-4xl font-bold text-rose-900 mt-4">
                کالکشن دلبرانه
              </h2>
              <p className="text-rose-500 text-lg mt-3">
                محصولاتی که عاشقشان خواهید شد
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
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: 'ارسال سریع',
              desc: 'ارسال امن و سریع با بسته‌بندی ویژه هدیه.',
              color: 'from-rose-100 to-pink-100',
              text: 'text-rose-600',
              icon: 'M13 10V3L4 14h7v7l9-11h-7z',
            },
            {
              title: 'تضمین سلامت کالا',
              desc: 'بازگشت آسان تا ۷ روز، بدون دردسر.',
              color: 'from-pink-100 to-rose-100',
              text: 'text-pink-600',
              icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
            },
            {
              title: 'خرید قسطی',
              desc: 'پرداخت منعطف با چندین درگاه امن.',
              color: 'from-rose-100 to-amber-100',
              text: 'text-rose-500',
              icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
            },
          ].map((feature, index) => (
            <Card
              key={feature.title}
              className="text-right hover:shadow-[0_28px_60px_-40px_rgba(244,63,94,0.45)] transition-all duration-300 transform hover:-translate-y-2"
            >
              <div className="flex items-center justify-between mb-6">
                <div
                  className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center`}
                >
                  <svg
                    className={`w-7 h-7 ${feature.text}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d={feature.icon}
                    />
                  </svg>
                </div>
                <span className="text-4xl font-bold text-rose-100">
                  0{index + 1}
                </span>
              </div>
              <h3 className="text-xl font-bold text-rose-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-rose-500 leading-relaxed">{feature.desc}</p>
            </Card>
          ))}
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
