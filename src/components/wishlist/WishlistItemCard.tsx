'use client';

import Image from 'next/image';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { formatPrice } from '@/lib/utils/format';
import { optimizeImage } from '@/lib/cloudflare-images-client';
import type { WishlistItem } from '@/store/wishlist-store';

interface WishlistItemCardProps {
  item: WishlistItem;
  onRemove: () => void;
  onAddToCart: () => void;
  isAddingToCart: boolean;
  compact?: boolean;
}

export function WishlistItemCard({
  item,
  onRemove,
  onAddToCart,
  isAddingToCart,
  compact = false,
}: WishlistItemCardProps) {
  const isOutOfStock = item.stock <= 0;
  const effectivePrice = item.discountPercent
    ? item.price * (1 - item.discountPercent / 100)
    : item.price;

  const image = (
    <div
      className={`relative w-full bg-slate-100 dark:bg-slate-800 ${
        compact ? 'aspect-square' : 'aspect-[4/5]'
      }`}
    >
      {item.image ? (
        <Image
          src={optimizeImage.thumbnail(item.image)}
          alt={item.name}
          fill
          className="object-cover"
          sizes={
            compact
              ? '(max-width: 768px) 50vw, 25vw'
              : '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw'
          }
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm text-slate-400">
          No image
        </div>
      )}
      {isOutOfStock && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/55">
          <span className="font-bold text-white">Out of stock</span>
        </div>
      )}
      {item.discountPercent && item.discountPercent > 0 && (
        <span className="absolute left-2 top-2 rounded-full bg-red-100 px-2 py-1 text-xs font-bold text-red-700">
          {item.discountPercent}% off
        </span>
      )}
    </div>
  );

  if (compact) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <Link href={`/products/${item.productId}`}>{image}</Link>
        <div className="p-3">
          <Link href={`/products/${item.productId}`}>
            <h4 className="line-clamp-1 text-sm font-medium text-slate-950 hover:text-blue-700 dark:text-white">
              {item.name}
            </h4>
          </Link>
          <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
            {formatPrice(Math.round(effectivePrice))}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"
      data-testid="wishlist-item"
    >
      <Link href={`/products/${item.productId}`}>{image}</Link>

      <div className="p-4">
        <Link href={`/products/${item.productId}`}>
          <h3 className="mb-1 line-clamp-1 font-semibold text-slate-950 hover:text-blue-700 dark:text-white">
            {item.name}
          </h3>
        </Link>

        {item.variantName && (
          <p className="mb-2 text-sm text-slate-500">{item.variantName}</p>
        )}

        <div className="mb-3">
          {item.discountPercent ? (
            <div className="flex flex-col">
              <span className="text-sm text-slate-400 line-through">
                {formatPrice(item.price)}
              </span>
              <span className="text-lg font-bold text-slate-950 dark:text-white">
                {formatPrice(Math.round(effectivePrice))}
              </span>
            </div>
          ) : (
            <span className="text-lg font-bold text-slate-950 dark:text-white">
              {formatPrice(item.price)}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={onAddToCart}
            disabled={isOutOfStock || isAddingToCart}
            isLoading={isAddingToCart}
            data-testid="add-to-cart-from-wishlist"
          >
            {isOutOfStock ? 'Out of stock' : 'Add to cart'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onRemove}
            aria-label="Remove from wishlist"
          >
            Remove
          </Button>
        </div>
      </div>
    </div>
  );
}
