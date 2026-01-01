'use client';

import Link from 'next/link';
import { useWishlistStore, selectWishlistCount } from '@/store/wishlist-store';
import { useWishlistSync } from '@/hooks/useWishlistSync';
import { useHydration } from '@/hooks/useHydration';

interface WishlistIconProps {
  className?: string;
}

export function WishlistIcon({ className = '' }: WishlistIconProps) {
  useWishlistSync();
  const isHydrated = useHydration();
  const wishlistCount = useWishlistStore(selectWishlistCount);

  // Only show count after hydration to prevent SSR mismatch
  const displayCount = isHydrated ? wishlistCount : 0;

  return (
    <Link
      href="/wishlist"
      className={`relative p-2 text-rose-600 hover:text-rose-700 dark:text-slate-200 dark:hover:text-slate-100 hover:bg-rose-50 dark:hover:bg-slate-800 rounded-xl transition-colors ${className}`}
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
      {displayCount > 0 && (
        <span
          className="absolute -top-1 -right-1 bg-gradient-to-br from-rose-500 to-pink-500 dark:from-slate-600 dark:to-slate-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-[0_2px_8px_-2px_rgba(244,63,94,0.5)] dark:shadow-none"
          data-testid="wishlist-badge"
        >
          {displayCount > 99 ? '99+' : displayCount}
        </span>
      )}
    </Link>
  );
}
