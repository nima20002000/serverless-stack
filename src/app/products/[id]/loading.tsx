import {
  Skeleton,
  SkeletonText,
  SkeletonImage,
} from '@/components/ui/Skeleton';

/**
 * Loading skeleton for product detail page
 * Shown while product data is being fetched
 */
export default function ProductDetailLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-slate-900">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Product Images Section */}
            <div>
              {/* Main Image */}
              <div className="mb-4">
                <SkeletonImage aspectRatio="4/5" className="rounded-lg" />
              </div>

              {/* Thumbnail Gallery */}
              <div className="flex gap-2 overflow-x-auto">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="w-20 h-20 flex-shrink-0 rounded-md"
                  />
                ))}
              </div>
            </div>

            {/* Product Info Section */}
            <div className="space-y-6">
              {/* Product Name */}
              <Skeleton className="h-8 w-3/4" />

              {/* Category and Tags */}
              <div className="flex gap-2 flex-wrap">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>

              {/* Description */}
              <div>
                <Skeleton className="h-5 w-20 mb-3" />
                <SkeletonText lines={4} />
              </div>

              {/* Price */}
              <div className="border-y border-gray-200 py-4 dark:border-slate-800">
                <Skeleton className="h-10 w-40" />
              </div>

              {/* Variant Selector */}
              <div>
                <Skeleton className="h-5 w-32 mb-3" />
                <div className="flex gap-2 flex-wrap">
                  <Skeleton className="h-10 w-24 rounded-lg" />
                  <Skeleton className="h-10 w-24 rounded-lg" />
                  <Skeleton className="h-10 w-24 rounded-lg" />
                </div>
              </div>

              {/* Stock Info */}
              <Skeleton className="h-6 w-32" />

              {/* Add to Cart Button */}
              <Skeleton className="h-12 w-full rounded-lg" />

              {/* Additional Info */}
              <div className="space-y-3 border-t border-gray-200 pt-4 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Skeleton variant="circular" className="w-5 h-5" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton variant="circular" className="w-5 h-5" />
                  <Skeleton className="h-4 w-40" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton variant="circular" className="w-5 h-5" />
                  <Skeleton className="h-4 w-44" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
