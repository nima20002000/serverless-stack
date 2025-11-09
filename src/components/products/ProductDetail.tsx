'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/services/product-service';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface ProductDetailProps {
  product: {
    id: string;
    name: string;
    description: string;
    price: number | string | { toNumber: () => number };
    stock: number;
    images: string[];
    isActive: boolean;
  };
}

export default function ProductDetail({ product }: ProductDetailProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  const isOutOfStock = product.stock === 0;

  const handleIncrement = () => {
    if (quantity < product.stock) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleAddToCart = async () => {
    try {
      setError('');
      setIsAdding(true);
      addItem(
        {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          image: product.images[0] || '',
          stock: product.stock,
        },
        quantity
      );
      // Show success and reset
      setTimeout(() => {
        setIsAdding(false);
        setQuantity(1);
      }, 500);
    } catch (err: any) {
      setError(err.message);
      setIsAdding(false);
    }
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-6 text-right">
        <button
          onClick={() => router.push('/products')}
          className="text-blue-600 hover:text-blue-700"
        >
          محصولات
        </button>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-700">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Image */}
        <Card>
          <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
            <div className="text-gray-400 text-8xl">📦</div>
          </div>
        </Card>

        {/* Product Details */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4 text-right">
            {product.name}
          </h1>

          {/* Price */}
          <div className="mb-6">
            <span className="text-3xl font-bold text-blue-600">
              {formatPrice(Number(product.price))}
            </span>
          </div>

          {/* Stock Status */}
          <div className="mb-6">
            {isOutOfStock ? (
              <span className="inline-block bg-red-100 text-red-800 px-4 py-2 rounded-lg font-medium">
                ناموجود
              </span>
            ) : (
              <span className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium">
                موجود ({product.stock} عدد)
              </span>
            )}
          </div>

          {/* Description */}
          <Card className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 text-right">
              توضیحات محصول
            </h2>
            <p className="text-gray-700 leading-relaxed text-right whitespace-pre-line">
              {product.description}
            </p>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 text-right">{error}</p>
            </div>
          )}

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                تعداد
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="کاهش تعداد"
                >
                  <MinusIcon className="w-5 h-5 text-gray-600" />
                </button>

                <span className="text-lg font-medium text-gray-900 min-w-[3rem] text-center">
                  {quantity}
                </span>

                <button
                  onClick={handleIncrement}
                  disabled={quantity >= product.stock}
                  className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="افزایش تعداد"
                >
                  <PlusIcon className="w-5 h-5 text-gray-600" />
                </button>

                {quantity >= product.stock && (
                  <span className="text-sm text-orange-600 mr-2">
                    حداکثر موجودی
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Add to Cart */}
          <div className="space-y-4">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isOutOfStock}
              isLoading={isAdding}
              onClick={handleAddToCart}
            >
              {isOutOfStock
                ? 'ناموجود'
                : isAdding
                ? 'در حال افزودن...'
                : 'افزودن به سبد خرید'}
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => router.back()}
            >
              بازگشت به لیست محصولات
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
