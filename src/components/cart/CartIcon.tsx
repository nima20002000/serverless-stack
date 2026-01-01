'use client';

import { ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '@/store/cart-store';
import { useHydration } from '@/hooks/useHydration';

interface CartIconProps {
  onClick?: () => void;
  className?: string;
}

export default function CartIcon({ onClick, className = '' }: CartIconProps) {
  const isHydrated = useHydration();
  // Compute itemCount directly from items to ensure reactivity
  const itemCount = useCartStore((state) =>
    state.items.reduce((count, item) => count + item.quantity, 0)
  );

  // Only show count after hydration to prevent SSR mismatch
  const displayCount = isHydrated ? itemCount : 0;

  return (
    <button
      onClick={onClick}
      className={`relative p-2 hover:bg-rose-50 rounded-xl transition-colors ${className}`}
      aria-label="سبد خرید"
    >
      <ShoppingCartIcon className="w-6 h-6 text-rose-600" />
      {displayCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-gradient-to-br from-rose-500 to-pink-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-[0_2px_8px_-2px_rgba(244,63,94,0.5)]">
          {displayCount > 9 ? '9+' : displayCount}
        </span>
      )}
    </button>
  );
}
