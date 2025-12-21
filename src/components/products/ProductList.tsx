'use client';

import { useState, useMemo, memo } from 'react';
import ProductCard from './ProductCard';
import { ProductCardSkeletonGrid } from './ProductCardSkeleton';
import Button from '@/components/ui/Button';
import RateLimitError from '@/components/ui/RateLimitError';
import { useApiWithRateLimit } from '@/hooks/useApiWithRateLimit';
import Alert from '@/components/ui/Alert';

interface Variant {
  id: string;
  name: string;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  priceAdjust: number;
  stock: number;
  isActive: boolean;
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
}

interface ProductListProps {
  initialProducts?: Product[];
  initialPage?: number;
  initialTotal?: number;
}

function ProductList({
  initialProducts = [],
  initialPage = 1,
  initialTotal = 0,
}: ProductListProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { rateLimitInfo, clearRateLimit, fetchWithRateLimit } = useApiWithRateLimit();
  const perPage = 20;
  const totalPages = Math.ceil(total / perPage);

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

  const fetchProducts = async (pageNum: number) => {
    setIsLoading(true);
    setError(null);
    try {
      // Ensure minimum skeleton display time (300ms) for better UX
      const [result] = await Promise.all([
        fetchWithRateLimit<{ data: Product[]; total: number; page: number; totalPages?: number }>(
          () => fetch(`/api/products?page=${pageNum}&perPage=${perPage}`)
        ),
        new Promise(resolve => setTimeout(resolve, 300))
      ]);

      if (result) {
        setProducts(result.data);
        setTotal(result.total);
        setPage(result.page);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('خطا در دریافت محصولات. لطفاً دوباره تلاش کنید.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    // Validate page number
    if (newPage < 1 || newPage > totalPages) {
      return;
    }

    // Don't fetch if already on that page
    if (newPage === page) {
      return;
    }

    fetchProducts(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return <ProductCardSkeletonGrid count={perPage} />;
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 text-lg mb-2">محصولی یافت نشد</div>
        <p className="text-gray-500">در حال حاضر محصولی برای نمایش وجود ندارد</p>
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

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-8">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
          />
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
            قبلی
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
            بعدی
          </Button>
        </div>
      )}

      {/* Results Count */}
      <div className="text-center mt-4 text-gray-600 text-sm">
        نمایش {(page - 1) * perPage + 1} تا {Math.min(page * perPage, total)} از {total} محصول
      </div>
    </div>
  );
}

export default memo(ProductList);
