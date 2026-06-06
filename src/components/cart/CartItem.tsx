'use client';

import { TrashIcon, MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { CartItem as CartItemType, formatPrice } from '@/store/cart-store';
import Image from 'next/image';
import { optimizeImage } from '@/lib/cloudflare-images-client';
import { useTranslations } from '@/components/providers/I18nProvider';

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (
    productId: string,
    quantity: number,
    variantId?: string
  ) => void;
  onRemove: (productId: string, variantId?: string) => void;
}

export default function CartItem({
  item,
  onUpdateQuantity,
  onRemove,
}: CartItemProps) {
  const t = useTranslations();

  const handleIncrement = () => {
    if (item.quantity < item.stock) {
      onUpdateQuantity(item.productId, item.quantity + 1, item.variantId);
    }
  };

  const handleDecrement = () => {
    if (item.quantity > 1) {
      onUpdateQuantity(item.productId, item.quantity - 1, item.variantId);
    }
  };

  const subtotal = item.price * item.quantity;

  return (
    <div className="flex gap-4 border-b border-slate-200 py-4 last:border-b-0 dark:border-slate-800">
      <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
        {item.image ? (
          <Image
            src={optimizeImage.cartItem(item.image)}
            alt={item.name}
            width={80}
            height={80}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
            No image
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <h3 className="mb-1 truncate text-sm font-medium text-slate-950 dark:text-white">
            {item.name}
          </h3>
          {item.variantName && (
            <p className="mb-1 text-xs text-slate-500">{item.variantName}</p>
          )}
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {formatPrice(item.price)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleDecrement}
            disabled={item.quantity <= 1}
            className="rounded-md border border-slate-300 p-1 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
            aria-label={t('cart.decreaseQuantity')}
          >
            <MinusIcon className="h-4 w-4 text-slate-600" />
          </button>

          <span className="min-w-[2rem] text-center text-sm font-medium text-slate-950 dark:text-white">
            {item.quantity}
          </span>

          <button
            onClick={handleIncrement}
            disabled={item.quantity >= item.stock}
            className="rounded-md border border-slate-300 p-1 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
            aria-label={t('cart.increaseQuantity')}
          >
            <PlusIcon className="h-4 w-4 text-slate-600" />
          </button>

          {item.quantity >= item.stock && (
            <span className="text-xs text-amber-600">{t('cart.maxStock')}</span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end justify-between">
        <button
          onClick={() => onRemove(item.productId, item.variantId)}
          className="rounded-md p-1 text-red-600 transition-colors hover:bg-red-50"
          aria-label={t('cart.removeFromCart')}
        >
          <TrashIcon className="h-5 w-5" />
        </button>

        <p className="text-sm font-bold text-slate-950 dark:text-white">
          {formatPrice(subtotal)}
        </p>
      </div>
    </div>
  );
}
