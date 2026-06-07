'use client';

import { useState, useMemo, memo, useEffect } from 'react';
import ProductCard from './ProductCard';
import { ProductCardSkeletonGrid } from './ProductCardSkeleton';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import RateLimitError from '@/components/ui/RateLimitError';
import { useApiWithRateLimit } from '@/hooks/useApiWithRateLimit';
import Alert from '@/components/ui/Alert';

export type ProductSortOption =
  | 'popular'
  | 'price-asc'
  | 'price-desc'
  | 'featured'
  | 'discount'
  | 'newest';

interface Variant {
  id: string;
  name: string;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  priceAdjust: number;
  stock: number;
  isActive: boolean;
  createdAt?: string;
  media?: Array<{
    id: string;
    type: 'IMAGE' | 'VIDEO';
    url: string;
    alt?: string | null;
    order: number;
  }>;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPercent?: number | null;
  stock: number;
  images: string[];
  isActive: boolean;
  isFeatured?: boolean;
  hasVariants?: boolean;
  variants?: Variant[];
  createdAt?: string;
  displayOrder: number;
}

interface ProductListProps {
  initialProducts?: Product[];
  initialPage?: number;
  initialTotal?: number;
  locale?: string;
}

/**
 * Client-side sorting function
 * Sorts products based on the selected option WITHOUT making API calls
 * This makes filtering instant and reduces server load
 */
function sortProducts(
  products: Product[],
  sortBy: ProductSortOption
): Product[] {
  const sorted = [...products];

  switch (sortBy) {
    case 'popular':
      // Popular: Sort by displayOrder (ascending), then by createdAt (newest first)
      return sorted.sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        if (!a.createdAt || !b.createdAt) return 0;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

    case 'price-asc':
      return sorted.sort((a, b) => a.price - b.price);

    case 'price-desc':
      return sorted.sort((a, b) => b.price - a.price);

    case 'featured':
      return sorted.sort((a, b) => {
        // Featured first
        if (a.isFeatured && !b.isFeatured) return -1;
        if (!a.isFeatured && b.isFeatured) return 1;
        return 0;
      });

    case 'discount':
      return sorted.sort((a, b) => {
        const aDiscount = a.discountPercent || 0;
        const bDiscount = b.discountPercent || 0;
        return bDiscount - aDiscount;
      });

    case 'newest':
      return sorted.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });

    default:
      // Fallback to popular
      return sorted.sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
          return a.displayOrder - b.displayOrder;
        }
        if (!a.createdAt || !b.createdAt) return 0;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      });
  }
}

function ProductList({
  initialProducts = [],
  initialPage = 1,
  initialTotal = 0,
  locale,
}: ProductListProps) {
  // Store ALL products fetched from server
  const [allProducts, setAllProducts] = useState<Product[]>(initialProducts);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [page, setPage] = useState(initialPage);
  const [total] = useState(initialTotal); // Only used for initial fetch calculation
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<ProductSortOption>('popular');
  const { rateLimitInfo, clearRateLimit, fetchWithRateLimit } =
    useApiWithRateLimit();
  const perPage = 20;

  // Fetch ALL products on mount (only once)
  useEffect(() => {
    if (isInitialLoad && allProducts.length < total) {
      // Calculate how many pages we need to fetch to get all products
      const totalPages = Math.ceil(total / perPage);

      const fetchAllProducts = async () => {
        setIsLoading(true);
        try {
          // Fetch remaining pages
          const pagePromises = [];
          for (let i = 2; i <= totalPages; i++) {
            const params = new URLSearchParams({
              page: i.toString(),
              perPage: perPage.toString(),
              sortBy: 'popular',
            });
            if (locale) {
              params.set('locale', locale);
            }
            pagePromises.push(
              fetchWithRateLimit<{ data: Product[]; total: number }>(() =>
                fetch(`/api/products?${params.toString()}`)
              )
            );
          }

          const results = await Promise.all(pagePromises);
          const additionalProducts = results.flatMap((r) => r?.data || []);

          setAllProducts([...initialProducts, ...additionalProducts]);
        } catch (err) {
          console.error('Error fetching all products:', err);
          // Keep using initial products if fetch fails
        } finally {
          setIsLoading(false);
          setIsInitialLoad(false);
        }
      };

      // Only fetch if we have more than one page
      if (totalPages > 1) {
        fetchAllProducts();
      } else {
        setIsInitialLoad(false);
      }
    } else {
      setIsInitialLoad(false);
    }
  }, [
    total,
    perPage,
    initialProducts,
    isInitialLoad,
    allProducts.length,
    fetchWithRateLimit,
    locale,
  ]);

  // Client-side sorted products (instant filtering!)
  const sortedProducts = useMemo(() => {
    return sortProducts(allProducts, sortBy);
  }, [allProducts, sortBy]);

  // Paginate sorted products client-side
  const paginatedProducts = useMemo(() => {
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    return sortedProducts.slice(startIndex, endIndex);
  }, [sortedProducts, page, perPage]);

  const totalPages = Math.ceil(sortedProducts.length / perPage);

  // Memoize pagination page numbers calculation
  const pageNumbers = useMemo(() => {
    const maxPages = Math.min(totalPages, 5);
    return Array.from({ length: maxPages }, (_, i) => {
      if (totalPages <= 5) {
        return i + 1;
      } else if (page <= 3) {
        return i + 1;
      } else if (page >= totalPages - 2) {
        return totalPages - 4 + i;
      } else {
        return page - 2 + i;
      }
    });
  }, [totalPages, page]);

  const handlePageChange = (newPage: number) => {
    // Validate page number
    if (newPage < 1 || newPage > totalPages) {
      return;
    }

    // Don't change if already on that page
    if (newPage === page) {
      return;
    }

    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSortChange = (newSort: ProductSortOption) => {
    if (newSort === sortBy) return;
    setSortBy(newSort);
    setPage(1); // Reset to first page when sorting changes
    // No API call needed - sorting happens instantly on client!
  };

  if (paginatedProducts.length === 0 && !isLoading) {
    return (
      <div className="py-12 text-center">
        <div className="mb-2 text-lg text-slate-700">No products found</div>
        <p className="text-slate-500">
          There are no products available for this view.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Rate Limit Error */}
      {rateLimitInfo.isRateLimited && rateLimitInfo.retryAfter && (
        <RateLimitError
          retryAfter={rateLimitInfo.retryAfter}
          onRetryReady={clearRateLimit}
          className="mb-6"
        />
      )}

      {/* General Error */}
      {error && (
        <Alert type="error" className="mb-6" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Sort Controls */}
      <div className="mb-6 flex justify-end">
        <div className="w-full sm:w-64">
          <Select
            value={sortBy}
            onChange={(value) => handleSortChange(value as ProductSortOption)}
            label="Sort by"
            options={[
              { value: 'popular', label: 'Popular' },
              { value: 'newest', label: 'Newest' },
              { value: 'price-asc', label: 'Price: low to high' },
              { value: 'price-desc', label: 'Price: high to low' },
              { value: 'featured', label: 'Featured' },
              { value: 'discount', label: 'Best discount' },
            ]}
          />
        </div>
      </div>

      {/* Products Grid */}
      {isLoading && isInitialLoad ? (
        <ProductCardSkeletonGrid count={perPage} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
            {paginatedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page === 1}
                onClick={() => handlePageChange(page - 1)}
              >
                Previous
              </Button>

              <div className="flex items-center gap-1">
                {pageNumbers.map((pageNum) => (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handlePageChange(pageNum)}
                  >
                    {pageNum}
                  </Button>
                ))}
              </div>

              <Button
                variant="secondary"
                size="sm"
                disabled={page === totalPages}
                onClick={() => handlePageChange(page + 1)}
              >
                Next
              </Button>
            </div>
          )}

          {/* Results Count */}
          <div className="mt-4 text-center text-sm text-slate-600">
            Showing {(page - 1) * perPage + 1} to{' '}
            {Math.min(page * perPage, sortedProducts.length)} of{' '}
            {sortedProducts.length} products
          </div>
        </>
      )}
    </div>
  );
}

export default memo(ProductList);
