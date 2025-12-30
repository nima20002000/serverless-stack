'use client';

import Link from 'next/link';
import { useWishlistStore, selectWishlistCount } from '@/store/wishlist-store';
import { useWishlistSync } from '@/hooks/useWishlistSync';

interface WishlistIconProps {
  className?: string;
}

export function WishlistIcon({ className = '' }: WishlistIconProps) {
  useWishlistSync();
  const wishlistCount = useWishlistStore(selectWishlistCount);

  return (
    <Link
      href="/profile/wishlist"
      className={`relative p-2 text-gray-700 hover:text-red-500 transition-colors ${className}`}
      aria-label="علاقه‌مندی‌ها"
      data-testid="wishlist-icon"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="w-6 h-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      {wishlistCount > 0 && (
        <span
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold"
          data-testid="wishlist-badge"
        >
          {wishlistCount > 99 ? '99+' : wishlistCount}
        </span>
      )}
    </Link>
  );
}
