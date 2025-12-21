'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRightIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
import { useCartStore, selectTotal, selectItemCount } from '@/store/cart-store';
import CartItem from '@/components/cart/CartItem';
import CartSummary from '@/components/cart/CartSummary';
import Button from '@/components/ui/Button';
import Alert from '@/components/ui/Alert';

export default function CartPageClient() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, clearCart } = useCartStore();
  const total = useCartStore(selectTotal);
  const itemCount = useCartStore(selectItemCount);
  const [error, setError] = useState('');

  const handleUpdateQuantity = (productId: string, quantity: number, variantId?: string) => {
    try {
      setError('');
      updateQuantity(productId, quantity, variantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در به‌روزرسانی سبد خرید');
    }
  };

  const handleRemove = (productId: string, variantId?: string) => {
    setError('');
    removeItem(productId, variantId);
  };

  const handleCheckout = () => {
    router.push('/checkout');
  };

  const handleClearCart = () => {
    if (window.confirm('آیا از پاک کردن سبد خرید اطمینان دارید؟')) {
      clearCart();
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Link
              href="/products"
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowRightIcon className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 text-right">
              سبد خرید
            </h1>
          </div>

          {items.length > 0 && (
            <div className="flex items-center justify-between">
              <button
                onClick={handleClearCart}
                className="text-sm text-red-600 hover:text-red-700 transition-colors"
              >
                پاک کردن سبد خرید
              </button>
              <p className="text-sm text-gray-600">
                {itemCount} کالا در سبد خرید شما موجود است
              </p>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <Alert type="error" className="mb-6" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Empty Cart State */}
        {items.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12">
            <div className="max-w-md mx-auto text-center">
              <div className="mb-6">
                <ShoppingBagIcon className="w-24 h-24 mx-auto text-gray-300" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">
                سبد خرید شما خالی است
              </h2>
              <p className="text-gray-600 mb-8">
                برای مشاهده و خرید محصولات به صفحه محصولات بروید
              </p>
              <Button
                variant="primary"
                onClick={() => router.push('/products')}
              >
                مشاهده محصولات
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-lg font-bold text-gray-900 text-right mb-4 border-b pb-3">
                  لیست کالاها
                </h2>
                <div className="space-y-0">
                  {items.map((item) => (
                    <CartItem
                      key={`${item.productId}-${item.variantId || 'no-variant'}`}
                      item={item}
                      onUpdateQuantity={handleUpdateQuantity}
                      onRemove={handleRemove}
                    />
                  ))}
                </div>
              </div>

              {/* Continue Shopping Button */}
              <div className="mt-4">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <span className="text-sm font-medium">ادامه خرید</span>
                </Link>
              </div>
            </div>

            {/* Cart Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-4 z-10">
                <CartSummary
                  subtotal={total}
                  itemCount={itemCount}
                  onCheckout={handleCheckout}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
