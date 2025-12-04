'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/services/product-service';
import { useCartStore } from '@/store/cart-store';
import Button from '@/components/ui/Button';
import { useState, useCallback, memo } from 'react';

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    stock: number;
    images: string[];
    isActive: boolean;
  };
}

function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = useCallback(async () => {
    try {
      setIsAdding(true);
      addItem(
        {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          image: product.images[0] || '',
          stock: product.stock,
        },
        1
      );
      // Show success feedback
      setTimeout(() => setIsAdding(false), 500);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'خطا در افزودن به سبد خرید');
      setIsAdding(false);
    }
  }, [product.id, product.name, product.price, product.images, product.stock, addItem]);

  const isOutOfStock = product.stock === 0;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Product Image */}
      <Link href={`/products/${product.id}`}>
        <div className="relative h-48 bg-gray-100 overflow-hidden">
          {product.images.length > 0 ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              fill
              loading="lazy"
              className="object-cover hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-gray-400 text-4xl">📦</div>
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-bold text-lg">ناموجود</span>
            </div>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-4">
        <Link href={`/products/${product.id}`}>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 text-right line-clamp-1">
            {product.name}
          </h3>
        </Link>
        <p className="text-gray-600 text-sm mb-3 text-right line-clamp-2">
          {product.description}
        </p>

        {/* Price and Stock */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-right">
            <span className="text-xl font-bold text-gray-900">
              {formatPrice(Number(product.price))}
            </span>
          </div>
          <div className="text-left">
            <span className={`text-sm ${product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {product.stock > 0 ? `موجود: ${product.stock}` : 'ناموجود'}
            </span>
          </div>
        </div>

        {/* Add to Cart Button */}
        <Button
          variant="primary"
          size="md"
          className="w-full"
          disabled={isOutOfStock}
          isLoading={isAdding}
          onClick={handleAddToCart}
        >
          {isOutOfStock ? 'ناموجود' : isAdding ? 'در حال افزودن...' : 'افزودن به سبد خرید'}
        </Button>
      </div>
    </div>
  );
}

export default memo(ProductCard);
