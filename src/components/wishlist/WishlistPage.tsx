'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useWishlistStore, selectWishlistCount } from '@/store/wishlist-store';
import { WishlistItemCard } from './WishlistItemCard';
import { useCartStore } from '@/store/cart-store';
import { toast } from '@/store/toast-store';
import Button from '@/components/ui/Button';
import { useWishlistSync } from '@/hooks/useWishlistSync';
import Link from 'next/link';
import type { WishlistItem } from '@/store/wishlist-store';

function WishlistSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="animate-pulse overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="aspect-[4/5] w-full bg-slate-100 dark:bg-slate-800" />
          <div className="p-4">
            <div className="mb-2 h-5 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="mb-3 h-6 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
            <div className="flex gap-2">
              <div className="h-9 flex-1 rounded bg-slate-100 dark:bg-slate-800" />
              <div className="h-9 w-20 rounded bg-slate-100 dark:bg-slate-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function WishlistPage() {
  const router = useRouter();
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
      toast.warning('This product is out of stock');
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
      toast.success('Product added to cart', {
        action: {
          label: 'Go to checkout',
          onClick: () => router.push('/checkout'),
        },
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Could not add product to cart');
    } finally {
      setAddingToCart(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Remove all items from your wishlist?')) return;

    setIsClearing(true);
    try {
      const session = await fetch('/api/auth/session').then((r) => r.json());
      if (session?.user) {
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
      <div className="rounded-lg border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-2 text-2xl font-bold text-slate-950 dark:text-white">
          Your wishlist is empty
        </h2>
        <p className="mb-6 text-slate-600 dark:text-slate-400">
          Save products from the catalog and return to them later.
        </p>
        <Link href="/products">
          <Button variant="primary">Browse products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div>
      {status === 'unauthenticated' && (
        <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-900">
            This wishlist is stored on this device.{' '}
            <Link href="/login" className="font-medium underline">
              Sign in
            </Link>{' '}
            to sync it with your account.
          </p>
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-950 dark:text-white">
          Wishlist ({itemCount})
        </h1>
        <Button
          variant="secondary"
          size="sm"
          onClick={handleClearAll}
          disabled={isClearing}
          isLoading={isClearing}
        >
          {isClearing ? 'Removing...' : 'Remove all'}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
