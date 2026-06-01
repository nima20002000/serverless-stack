import { ProductCardSkeletonGrid } from '@/components/products/ProductCardSkeleton';

export default function ProductsLoading() {
  return (
    <div className="min-h-screen bg-slate-50 pt-16 dark:bg-slate-950">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h1 className="text-3xl font-bold text-slate-950 dark:text-white">
            Products
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Loading product catalog...
          </p>
        </div>

        <ProductCardSkeletonGrid count={20} />
      </main>
    </div>
  );
}
