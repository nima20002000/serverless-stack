import Image from 'next/image';
import Link from 'next/link';
import { getActiveProducts } from '@/services/product-service';
import { getCategoryTree } from '@/services/category-service';
import ProductCard from '@/components/products/ProductCard';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { optimizeImage } from '@/lib/cloudflare-images-client';

// Use ISR (Incremental Static Regeneration) instead of SSR for better performance
// Page will be statically generated and revalidated every 60 seconds
export const revalidate = 60;

// Optimized hero image URL (640x640, WebP, 85% quality)
// Using Cloudflare Image Resizing for automatic WebP conversion and size optimization
const HERO_IMAGE_OPTIMIZED = "https://cdn.kitia.ir/cdn-cgi/image/width=640,height=640,format=auto,quality=85,fit=cover/media-library/images/2uvp4v-1764882490100.jpg";

export default async function Home() {
  // Fetch featured products
  const featuredProductsResult = await getActiveProducts({ page: 1, perPage: 4 });
  const featuredProducts = featuredProductsResult.data
    .filter(p => p.isFeatured)
    .slice(0, 4)
    .map(p => ({ ...p, price: Number(p.price) }));

  // Fetch discounted products
  const discountedProducts = featuredProductsResult.data
    .filter(p => p.discountPercent && p.discountPercent > 0)
    .slice(0, 4)
    .map(p => ({ ...p, price: Number(p.price) }));

  // Fetch categories (top 3)
  const categories = await getCategoryTree();
  const topCategories = categories.slice(0, 3);

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Text Content - Right Side */}
          <div className="order-2 md:order-1 text-right">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              به کیتیا خوش آمدید
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8 leading-relaxed">
              دنیایی از محصولات زیبا و با کیفیت برای شما
            </p>
            <p className="text-lg text-gray-500 mb-10 leading-relaxed">
              کیتیا با ارائه بهترین محصولات و خدمات، همراه شماست تا تجربه‌ای لذت‌بخش از خرید آنلاین داشته باشید.
            </p>
            <Link href="/products">
              <Button variant="primary" size="lg" className="shadow-lg hover:shadow-xl transition-shadow">
                مشاهده محصولات
              </Button>
            </Link>
          </div>

          {/* Image - Left Side with circular overlay */}
          <div className="order-1 md:order-2 flex justify-center">
            <div className="relative w-full max-w-md aspect-square">
              {/* White Circle Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full h-full rounded-full bg-white opacity-80 blur-3xl"></div>
              </div>
              {/* Image Container */}
              <div className="relative w-full h-full rounded-full overflow-hidden shadow-2xl border-8 border-white">
                <img
                  src={HERO_IMAGE_OPTIMIZED}
                  alt="کیتیا - فروشگاه آنلاین"
                  fetchPriority="high"
                  decoding="async"
                  className="object-cover absolute inset-0 w-full h-full"
                  width="640"
                  height="640"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      {featuredProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-right mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              کالاهای منتخب
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-pink-500 to-purple-500 mb-4"></div>
            <p className="text-gray-600 text-lg">
              محصولات برگزیده ویژه شما
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/products">
              <Button variant="secondary" size="lg">
                مشاهده همه محصولات
              </Button>
            </Link>
          </div>
        </section>
      )}

      {/* Discounted Products Section */}
      {discountedProducts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 bg-gradient-to-r from-red-50 to-pink-50 rounded-3xl my-16">
          <div className="text-right mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-red-600 mb-4">
              پیشنهاد شگفت‌انگیز
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-red-500 to-pink-500 mb-4"></div>
            <p className="text-gray-700 text-lg">
              تخفیف‌های ویژه برای شما
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {discountedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Categories Section */}
      {topCategories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-right mb-10">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              دسته‌بندی محصولات
            </h2>
            <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-pink-500 mb-4"></div>
            <p className="text-gray-600 text-lg">
              انتخاب بر اساس دسته‌بندی
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {topCategories.map((category) => (
              <Link key={category.id} href={`/products?category=${category.slug}`}>
                <Card className="hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 cursor-pointer h-full">
                  <div className="text-center">
                    {/* Category Image */}
                    <div className="w-full aspect-[4/5] bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden relative">
                      {category.image ? (
                        <Image
                          src={optimizeImage.categoryCard(category.image)}
                          alt={category.name}
                          fill
                          className="object-cover"
                          style={{ objectPosition: 'center 45%' }}
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="text-6xl text-purple-500">📦</div>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                      {category.name}
                    </h3>
                    {category.description && (
                      <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                        {category.description}
                      </p>
                    )}
                    <div className="text-sm text-purple-600 font-medium">
                      {category._count?.products || 0} محصول
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            چرا کیتیا؟
          </h2>
          <div className="w-24 h-1 bg-gradient-to-r from-pink-500 to-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">
            مزایای خرید از ما
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1 - Fast Delivery */}
          <Card className="text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                ارسال سریع
              </h3>
              <p className="text-gray-600 leading-relaxed">
                ارسال سریع و ایمن محصولات به سراسر کشور با بسته‌بندی مناسب
              </p>
            </div>
          </Card>

          {/* Feature 2 - Quality Guarantee */}
          <Card className="text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                تضمین سلامت کالا
              </h3>
              <p className="text-gray-600 leading-relaxed">
                تضمین اصالت و سلامت کالا با امکان بازگشت تا ۷ روز
              </p>
            </div>
          </Card>

          {/* Feature 3 - Support */}
          <Card className="text-center hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2">
            <div className="flex flex-col items-center">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                پشتیبانی ۲۴ ساعته
              </h3>
              <p className="text-gray-600 leading-relaxed">
                پاسخگویی سریع به سوالات شما در تمام ساعات شبانه‌روز
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Call to Action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 mb-16">
        <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-white text-center" padding="lg">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            آماده برای شروع خرید هستید؟
          </h2>
          <p className="text-xl mb-8 opacity-90">
            محصولات شگفت‌انگیز را کشف کنید
          </p>
          <Link href="/products">
            <Button
              variant="secondary"
              size="lg"
              className="bg-white text-purple-600 hover:bg-gray-100 shadow-xl"
            >
              مشاهده تمام محصولات
            </Button>
          </Link>
        </Card>
      </section>
    </div>
  );
}
