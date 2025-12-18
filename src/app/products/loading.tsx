import { ProductCardSkeletonGrid } from '@/components/products/ProductCardSkeleton';

/**
 * Loading skeleton for products list page
 * Shown while initial products are being fetched (SSR)
 */
export default function ProductsLoading() {
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

        <ProductCardSkeletonGrid count={20} />
      </main>
    </div>
  );
}
