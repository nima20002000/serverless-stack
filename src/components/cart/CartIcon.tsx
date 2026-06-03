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
      className={`relative rounded-lg p-2 text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 ${className}`}
      aria-label="Cart"
    >
      <ShoppingCartIcon className="h-6 w-6" />
      {displayCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
          {displayCount > 9 ? '9+' : displayCount}
        </span>
      )}
    </button>
  );
}
