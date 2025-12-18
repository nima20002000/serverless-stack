import { Skeleton, SkeletonText, SkeletonImage } from '@/components/ui/Skeleton';

/**
 * Skeleton loader for ProductCard component
 * Matches the layout of ProductCard to provide seamless loading experience
 */
export default function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Product Image Skeleton */}
      <div className="relative w-full aspect-[4/5] bg-gray-100 overflow-hidden">
        <SkeletonImage aspectRatio="4/5" />
      </div>

      {/* Product Info Skeleton */}
      <div className="p-4">
        {/* Product Name */}
        <Skeleton variant="text" className="h-6 w-3/4 mb-2" />

        {/* Product Description */}
        <SkeletonText lines={2} className="mb-3" />

        {/* Variant Selector Skeleton (optional, shows sometimes) */}
        <div className="mb-3">
          <Skeleton variant="text" className="h-3 w-20 mb-2" />
          <div className="flex flex-wrap gap-1.5">
            <Skeleton variant="rectangular" className="h-7 w-16" />
            <Skeleton variant="rectangular" className="h-7 w-16" />
            <Skeleton variant="rectangular" className="h-7 w-16" />
          </div>
        </div>

        {/* Price and Stock Skeleton */}
        <div className="flex items-center justify-between mb-3">
          <Skeleton variant="text" className="h-8 w-24" />
          <Skeleton variant="text" className="h-5 w-16" />
        </div>

        {/* Add to Cart Button Skeleton */}
        <Skeleton variant="rectangular" className="h-10 w-full" />
      </div>
    </div>
  );
}

/**
 * Grid of product card skeletons
 * Used in ProductList while loading
 */
export function ProductCardSkeletonGrid({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
