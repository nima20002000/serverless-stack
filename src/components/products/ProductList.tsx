'use client';

import { useState } from 'react';
import ProductCard from './ProductCard';
import Button from '@/components/ui/Button';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  isActive: boolean;
}

interface ProductListProps {
  initialProducts?: Product[];
  initialPage?: number;
  initialTotal?: number;
}

export default function ProductList({
  initialProducts = [],
  initialPage = 1,
  initialTotal = 0,
}: ProductListProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [page, setPage] = useState(initialPage);
  const [total, setTotal] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const perPage = 20;
  const totalPages = Math.ceil(total / perPage);

  const fetchProducts = async (pageNum: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/products?page=${pageNum}&perPage=${perPage}`);
      const data = await response.json();
      setProducts(data.products);
      setTotal(data.total);
      setPage(data.page);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    fetchProducts(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">در حال بارگذاری محصولات...</div>
      </div>
    );
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
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => handlePageChange(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
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
