'use client';

import { useState, useCallback, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useWishlistStore } from '@/store/wishlist-store';

interface WishlistButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    images: string[];
    stock: number;
    discountPercent?: number | null;
  };
  variant?: {
    id: string;
    name: string;
  } | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Heart button for adding/removing products from wishlist
 * - Shows filled heart if in wishlist
 * - Shows outline heart if not in wishlist
 * - Handles both authenticated and guest users
 * - Syncs with server for authenticated users
 */
export function WishlistButton({
  product,
  variant,
  size = 'md',
  className = '',
}: WishlistButtonProps) {
  const { data: session } = useSession();
  const isInWishlistFn = useWishlistStore((state) => state.isInWishlist);
  const addItem = useWishlistStore((state) => state.addItem);
  const removeItem = useWishlistStore((state) => state.removeItem);
  const [isLoading, setIsLoading] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // Check initial state
  useEffect(() => {
    setIsWishlisted(isInWishlistFn(product.id, variant?.id));
  }, [product.id, variant?.id, isInWishlistFn]);

  const handleToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (isLoading) return;

      setIsLoading(true);

      try {
        if (isWishlisted) {
          // Remove from wishlist
          if (session?.user) {
            // Sync with server
            const response = await fetch('/api/user/wishlist', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId: product.id,
                variantId: variant?.id,
              }),
            });
            if (!response.ok) throw new Error('Failed to remove');
          }
          removeItem(product.id, variant?.id);
          setIsWishlisted(false);
        } else {
          // Add to wishlist
          if (session?.user) {
            // Sync with server
            const response = await fetch('/api/user/wishlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                productId: product.id,
                variantId: variant?.id,
              }),
            });
            if (!response.ok) throw new Error('Failed to add');
          }
          addItem({
            productId: product.id,
            variantId: variant?.id,
            name: variant ? `${product.name} - ${variant.name}` : product.name,
            price: product.price,
            image: product.images[0] || '',
            stock: product.stock,
            discountPercent: product.discountPercent ?? undefined,
            variantName: variant?.name,
          });
          setIsWishlisted(true);
        }
      } catch (error) {
        console.error('Wishlist toggle error:', error);
        // Revert optimistic update
        setIsWishlisted(!isWishlisted);
      } finally {
        setIsLoading(false);
      }
    },
    [isWishlisted, isLoading, session, product, variant, addItem, removeItem]
  );

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={`
        ${sizeClasses[size]}
        flex items-center justify-center
        rounded-full
        transition-all duration-200
        hover:scale-110
        focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
        ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
        ${className}
      `}
      aria-label={
        isWishlisted ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'
      }
      aria-pressed={isWishlisted}
      data-testid="wishlist-button"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill={isWishlisted ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        className={`
          ${iconSizes[size]}
          ${isWishlisted ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}
          transition-colors duration-200
        `}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  );
}
