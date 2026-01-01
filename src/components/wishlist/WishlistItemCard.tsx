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

  if (compact) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden">
        <Link href={`/products/${item.productId}`}>
          <div className="relative w-full aspect-square bg-rose-50">
            {item.image ? (
              <Image
                src={optimizeImage.thumbnail(item.image)}
                alt={item.name}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-2xl">📦</span>
              </div>
            )}
            {isOutOfStock && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <span className="text-white text-sm font-bold">ناموجود</span>
              </div>
            )}
          </div>
        </Link>
        <div className="p-2">
          <Link href={`/products/${item.productId}`}>
            <h4 className="text-sm font-medium text-rose-900 line-clamp-1 hover:text-rose-600">
              {item.name}
            </h4>
          </Link>
          <p className="text-sm font-bold text-rose-900 mt-1">
            {formatPrice(Math.round(effectivePrice))}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-2xl shadow-sm border border-rose-100 overflow-hidden"
      data-testid="wishlist-item"
    >
      <Link href={`/products/${item.productId}`}>
        <div className="relative w-full aspect-[4/5] bg-rose-50">
          {item.image ? (
            <Image
              src={optimizeImage.thumbnail(item.image)}
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl">📦</span>
            </div>
          )}
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-bold">ناموجود</span>
            </div>
          )}
          {item.discountPercent && item.discountPercent > 0 && (
            <span className="absolute top-2 start-2 bg-rose-500 text-white text-xs font-bold px-2 py-1 rounded-xl">
              {item.discountPercent}% تخفیف
            </span>
          )}
        </div>
      </Link>

      <div className="p-4">
        <Link href={`/products/${item.productId}`}>
          <h3 className="font-semibold text-rose-900 mb-1 line-clamp-1 hover:text-rose-600">
            {item.name}
          </h3>
        </Link>

        {item.variantName && (
          <p className="text-sm text-rose-400 mb-2">{item.variantName}</p>
        )}

        <div className="mb-3">
          {item.discountPercent ? (
            <div className="flex flex-col">
              <span className="text-sm text-rose-300 line-through">
                {formatPrice(item.price)}
              </span>
              <span className="text-lg font-bold text-rose-700">
                {formatPrice(Math.round(effectivePrice))}
              </span>
            </div>
          ) : (
            <span className="text-lg font-bold text-rose-900">
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
            {isOutOfStock ? 'ناموجود' : 'افزودن به سبد'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onRemove}
            aria-label="حذف از علاقه‌مندی‌ها"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
