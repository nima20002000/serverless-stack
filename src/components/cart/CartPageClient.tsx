'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, ShoppingBagIcon } from '@heroicons/react/24/outline';
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

  const handleUpdateQuantity = (
    productId: string,
    quantity: number,
    variantId?: string
  ) => {
    try {
      setError('');
      updateQuantity(productId, quantity, variantId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update cart');
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
    if (window.confirm('Clear all items from your cart?')) {
      clearCart();
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-10 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-4">
            <Link
              href="/products"
              className="rounded-lg p-2 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Back to products"
            >
              <ArrowLeftIcon className="h-5 w-5 text-slate-700 dark:text-slate-200" />
            </Link>
            <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
              Cart
            </h1>
          </div>

          {items.length > 0 && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {itemCount} {itemCount === 1 ? 'item' : 'items'} in your cart
              </p>
              <button
                onClick={handleClearCart}
                className="text-left text-sm font-medium text-red-700 transition-colors hover:text-red-800"
              >
                Clear cart
              </button>
            </div>
          )}
        </div>

        {error && (
          <Alert type="error" className="mb-6" onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {items.length === 0 ? (
          <div className="rounded-lg border border-slate-200 bg-white p-12 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="mx-auto max-w-md text-center">
              <ShoppingBagIcon className="mx-auto mb-6 h-20 w-20 text-slate-300" />
              <h2 className="mb-3 text-xl font-bold text-slate-950 dark:text-white">
                Your cart is empty
              </h2>
              <p className="mb-8 text-slate-600 dark:text-slate-400">
                Browse products and add items when you are ready to checkout.
              </p>
              <Button
                variant="primary"
                onClick={() => router.push('/products')}
              >
                Browse products
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <h2 className="mb-4 border-b border-slate-200 pb-3 text-lg font-bold text-slate-950 dark:border-slate-800 dark:text-white">
                  Items
                </h2>
                <div>
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

              <div className="mt-4">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 transition-colors hover:text-blue-800 dark:text-blue-300"
                >
                  Continue shopping
                </Link>
              </div>
            </div>

            <div>
              <div className="sticky top-24">
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
