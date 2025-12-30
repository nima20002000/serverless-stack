'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useWishlistStore, selectWishlistCount } from '@/store/wishlist-store';
import { WishlistItemCard } from './WishlistItemCard';
import { useCartStore } from '@/store/cart-store';
import Button from '@/components/ui/Button';
import { useWishlistSync } from '@/hooks/useWishlistSync';
import Link from 'next/link';
import type { WishlistItem } from '@/store/wishlist-store';

function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden animate-pulse"
        >
          <div className="w-full aspect-[4/5] bg-gray-200" />
          <div className="p-4">
            <div className="h-5 bg-gray-200 rounded mb-2" />
            <div className="h-6 bg-gray-200 rounded w-1/2 mb-3" />
            <div className="flex gap-2">
              <div className="h-9 bg-gray-200 rounded flex-1" />
              <div className="h-9 w-9 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WishlistPage() {
  const { status } = useSession();
  useWishlistSync();

  const items = useWishlistStore((state) => state.items);
  const itemCount = useWishlistStore(selectWishlistCount);
  const isSyncing = useWishlistStore((state) => state.isSyncing);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const clearWishlist = useWishlistStore((state) => state.clearWishlist);
  const addToCart = useCartStore((state) => state.addItem);

  const [isClearing, setIsClearing] = useState(false);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  const handleRemove = async (item: WishlistItem) => {
    try {
      const session = await fetch('/api/auth/session').then((r) => r.json());
      if (session?.user) {
        await fetch('/api/user/wishlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: item.productId,
            variantId: item.variantId,
          }),
        });
      }
    } catch (error) {
      console.error('Error removing from wishlist:', error);
    }
    removeItem(item.productId, item.variantId);
  };

  const handleAddToCart = async (item: WishlistItem) => {
    if (item.stock <= 0) {
      alert('این محصول ناموجود است');
      return;
    }

    const cartKey = item.variantId
      ? `${item.productId}:${item.variantId}`
      : item.productId;
    setAddingToCart(cartKey);

    try {
      const effectivePrice = item.discountPercent
        ? Math.round(item.price * (1 - item.discountPercent / 100))
        : item.price;

      addToCart(
        {
          productId: item.productId,
          name: item.name,
          price: effectivePrice,
          image: item.image,
          stock: item.stock,
          variantId: item.variantId,
          variantName: item.variantName,
        },
        1
      );
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('خطا در افزودن به سبد خرید');
    } finally {
      setAddingToCart(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('آیا از حذف همه موارد اطمینان دارید؟')) return;

    setIsClearing(true);
    try {
      const session = await fetch('/api/auth/session').then((r) => r.json());
      if (session?.user) {
        // Delete each item from server
        for (const item of items) {
          await fetch('/api/user/wishlist', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: item.productId,
              variantId: item.variantId,
            }),
          });
        }
      }
    } catch (error) {
      console.error('Error clearing wishlist:', error);
    }
    clearWishlist();
    setIsClearing(false);
  };

  if (status === 'loading' || isSyncing) {
    return <WishlistSkeleton />;
  }

  if (itemCount === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1}
            stroke="currentColor"
            className="w-20 h-20 mx-auto text-gray-300"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          لیست علاقه‌مندی‌ها خالی است
        </h2>
        <p className="text-gray-600 mb-6">
          محصولات مورد علاقه خود را با کلیک روی آیکون قلب ذخیره کنید
        </p>
        <Link href="/products">
          <Button variant="primary">مشاهده محصولات</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          علاقه‌مندی‌ها ({itemCount})
        </h1>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClearAll}
          disabled={isClearing}
          isLoading={isClearing}
        >
          {isClearing ? 'در حال حذف...' : 'حذف همه'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => {
          const cartKey = item.variantId
            ? `${item.productId}:${item.variantId}`
            : item.productId;
          return (
            <WishlistItemCard
              key={`${item.productId}-${item.variantId || 'default'}`}
              item={item}
              onRemove={() => handleRemove(item)}
              onAddToCart={() => handleAddToCart(item)}
              isAddingToCart={addingToCart === cartKey}
            />
          );
        })}
      </div>
    </div>
  );
}
