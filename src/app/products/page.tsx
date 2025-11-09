'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import ProductList from '@/components/products/ProductList';

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  isActive: boolean;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?page=1&perPage=20');
      const data = await response.json();
      setProducts(data.products);
      setTotal(data.total);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">در حال بارگذاری محصولات...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 text-right mb-2">
            محصولات
          </h1>
          <p className="text-gray-600 text-right">
            مشاهده و خرید بهترین محصولات
          </p>
        </div>

        <ProductList
          initialProducts={products}
          initialPage={1}
          initialTotal={total}
          onAddToCart={(productId) => {
            // TODO: Implement cart functionality
            alert('سبد خرید به زودی اضافه خواهد شد');
          }}
        />
      </main>
    </div>
  );
}
