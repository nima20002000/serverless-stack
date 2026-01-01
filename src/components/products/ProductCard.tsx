'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { formatPrice } from '@/lib/utils/format';
import { useCartStore } from '@/store/cart-store';
import Button from '@/components/ui/Button';
import { useState, useCallback, memo, useMemo, useEffect, useRef } from 'react';
import { optimizeImage } from '@/lib/cloudflare-images-client';
import { generateProductAltText } from '@/lib/seo/alt-text';
import { WishlistButton } from '@/components/wishlist/WishlistButton';
import BadgeV4 from '@/components/ui-v4/Badge';

interface Variant {
  id: string;
  name: string;
  color?: string | null;
  size?: string | null;
  material?: string | null;
  priceAdjust: number;
  stock: number;
  isActive: boolean;
  media?: Array<{
    id: string;
    type: 'IMAGE' | 'VIDEO';
    url: string;
    alt?: string | null;
    order: number;
  }>;
}

interface ProductCardProps {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    discountPercent?: number | null;
    stock: number;
    images: string[];
    isActive: boolean;
    isFeatured?: boolean;
    hasVariants?: boolean;
    variants?: Variant[];
  };
}

function ProductCard({ product }: ProductCardProps) {
  const addItem = useCartStore((state) => state.addItem);
  const router = useRouter();
  const [isAdding, setIsAdding] = useState(false);

  // Get active variants - memoized to prevent dependency changes on every render
  const activeVariants = useMemo(
    () => product.variants?.filter((v) => v.isActive) || [],
    [product.variants]
  );
  const hasVariants = product.hasVariants && activeVariants.length > 0;

  // Auto-select first active variant with media if available
  const getDefaultVariant = (): Variant | null => {
    if (!hasVariants) return null;

    // Prefer variant with media
    const variantWithMedia = activeVariants.find(
      (v) => v.media && v.media.length > 0
    );
    if (variantWithMedia) return variantWithMedia;

    // Fallback to first active variant
    return activeVariants[0] || null;
  };

  const defaultVariant = getDefaultVariant();
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    defaultVariant
  );

  // Set initial image based on default variant or product images
  const getInitialImage = () => {
    if (defaultVariant?.media && defaultVariant.media.length > 0) {
      return defaultVariant.media[0].url;
    }
    return product.images[0] || '';
  };

  const [currentImage, setCurrentImage] = useState(getInitialImage());

  // Get color variants for image swapping
  const colorVariants = useMemo(() => {
    return activeVariants.filter(
      (v) => v.color && v.media && v.media.length > 0
    );
  }, [activeVariants]);

  const hasColorVariants = colorVariants.length > 1;

  // Current variant index for carousel
  const [currentVariantIndex, setCurrentVariantIndex] = useState(() => {
    if (!hasColorVariants) return 0;
    const index = colorVariants.findIndex((v) => v.id === selectedVariant?.id);
    return index >= 0 ? index : 0;
  });

  // Touch swipe handling
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);
  const minSwipeDistance = 50; // Minimum swipe distance in pixels

  // Track preloaded variant images
  const preloadedVariants = useRef<Set<string>>(new Set());

  // PRELOADING STRATEGY: Aggressively preload all color variant images on mount
  // This ensures instant switching when user swipes between variants
  useEffect(() => {
    if (!hasColorVariants || colorVariants.length === 0) return;

    // Preload all color variant images
    colorVariants.forEach((variant, index) => {
      if (preloadedVariants.current.has(variant.id)) return; // Skip if already preloaded

      const isFirstVariant = index === 0;
      const variantImages =
        variant.media?.filter((m) => m.type === 'IMAGE') || [];

      variantImages.forEach((media, mediaIndex) => {
        const isFirstImage = mediaIndex === 0;
        const priority =
          isFirstVariant && isFirstImage ? 1 : isFirstImage ? 2 : 3;

        const preloadFn = () => {
          const img = new window.Image();
          img.src = optimizeImage.thumbnail(media.url);
          if (priority <= 2) {
            img.fetchPriority = 'high';
          }
        };

        // High-priority images load immediately, low-priority during idle time
        if (priority <= 2) {
          preloadFn();
        } else {
          if (
            typeof window !== 'undefined' &&
            'requestIdleCallback' in window
          ) {
            window.requestIdleCallback(preloadFn);
          } else {
            setTimeout(preloadFn, 100);
          }
        }
      });

      preloadedVariants.current.add(variant.id);
    });
  }, [hasColorVariants, colorVariants]);

  // Navigate to next color variant image
  const goToNextVariant = useCallback(() => {
    if (!hasColorVariants) return;

    const nextIndex = (currentVariantIndex + 1) % colorVariants.length;
    setCurrentVariantIndex(nextIndex);
    const nextVariant = colorVariants[nextIndex];
    setSelectedVariant(nextVariant);
    if (nextVariant.media && nextVariant.media.length > 0) {
      setCurrentImage(nextVariant.media[0].url);
    }
  }, [hasColorVariants, currentVariantIndex, colorVariants]);

  // Navigate to previous color variant image
  const goToPrevVariant = useCallback(() => {
    if (!hasColorVariants) return;

    const prevIndex =
      currentVariantIndex === 0
        ? colorVariants.length - 1
        : currentVariantIndex - 1;
    setCurrentVariantIndex(prevIndex);
    const prevVariant = colorVariants[prevIndex];
    setSelectedVariant(prevVariant);
    if (prevVariant.media && prevVariant.media.length > 0) {
      setCurrentImage(prevVariant.media[0].url);
    }
  }, [hasColorVariants, currentVariantIndex, colorVariants]);

  // Touch swipe handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!hasColorVariants) return;
      touchEndX.current = 0; // Reset
      touchStartX.current = e.targetTouches[0].clientX;
    },
    [hasColorVariants]
  );

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!hasColorVariants) return;
      touchEndX.current = e.targetTouches[0].clientX;
    },
    [hasColorVariants]
  );

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!hasColorVariants) return;
      if (!touchStartX.current || !touchEndX.current) return;

      const distance = touchStartX.current - touchEndX.current;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      // In RTL, left swipe = next, right swipe = previous
      if (isLeftSwipe) {
        e.preventDefault();
        e.stopPropagation();
        goToNextVariant();
      } else if (isRightSwipe) {
        e.preventDefault();
        e.stopPropagation();
        goToPrevVariant();
      }

      // Reset
      touchStartX.current = 0;
      touchEndX.current = 0;
    },
    [hasColorVariants, goToNextVariant, goToPrevVariant]
  );

  // Calculate discounted price
  const discountPercent = product.discountPercent || 0;
  const basePrice = Number(product.price);
  const effectivePrice = selectedVariant
    ? basePrice + Number(selectedVariant.priceAdjust)
    : basePrice;
  const discountedPrice =
    discountPercent > 0
      ? effectivePrice * (1 - discountPercent / 100)
      : effectivePrice;

  // Effective stock considering variant selection
  const effectiveStock = selectedVariant
    ? selectedVariant.stock
    : product.stock;
  const isOutOfStock = effectiveStock === 0;

  const handleVariantSelect = (variant: Variant) => {
    setSelectedVariant(variant);

    // Update image when variant is selected
    if (variant.media && variant.media.length > 0) {
      setCurrentImage(variant.media[0].url);
    } else {
      // Fallback to product's first image
      setCurrentImage(product.images[0] || '');
    }

    // Update carousel index if this is a color variant
    if (hasColorVariants && variant.color) {
      const variantIndex = colorVariants.findIndex((v) => v.id === variant.id);
      if (variantIndex >= 0) {
        setCurrentVariantIndex(variantIndex);
      }
    }
  };

  const handleAddToCart = useCallback(async () => {
    try {
      // If product has variants, variant selection is REQUIRED
      if (hasVariants && !selectedVariant) {
        alert('لطفاً یک نوع محصول (رنگ، سایز، ...) انتخاب کنید');
        return;
      }

      setIsAdding(true);
      addItem(
        {
          productId: product.id,
          name: selectedVariant
            ? `${product.name} - ${selectedVariant.name}`
            : product.name,
          price: discountedPrice,
          image: currentImage,
          stock: effectiveStock,
          variantId: selectedVariant?.id,
          variantName: selectedVariant?.name,
        },
        1
      );
      // Show success feedback and offer checkout
      setTimeout(() => {
        setIsAdding(false);
        const shouldCheckout = confirm(
          'محصول به سبد خرید اضافه شد. می‌خواهید به تسویه حساب بروید؟'
        );
        if (shouldCheckout) {
          router.push('/checkout');
        }
      }, 300);
    } catch (error) {
      alert(
        error instanceof Error ? error.message : 'خطا در افزودن به سبد خرید'
      );
      setIsAdding(false);
    }
  }, [
    product.id,
    product.name,
    hasVariants,
    selectedVariant,
    discountedPrice,
    currentImage,
    effectiveStock,
    addItem,
    router,
  ]);

  return (
    <div className="bg-white rounded-3xl border border-rose-100 overflow-hidden shadow-[0_18px_40px_-30px_rgba(244,63,94,0.4)] hover:shadow-[0_28px_60px_-36px_rgba(244,63,94,0.45)] transition-all">
      {/* Product Image */}
      <Link href={`/products/${product.id}`}>
        <div
          className="relative w-full aspect-[4/5] bg-rose-50 overflow-hidden group"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {currentImage ? (
            <Image
              src={optimizeImage.thumbnail(currentImage)}
              alt={generateProductAltText({
                productName: product.name,
                variantName: selectedVariant?.name,
                color: selectedVariant?.color,
                size: selectedVariant?.size,
                material: selectedVariant?.material,
              })}
              fill
              loading="lazy"
              className="object-cover object-center hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-rose-300 text-4xl">📦</div>
            </div>
          )}
          {/* Wishlist Button - Left side (RTL: visually on right) */}
          <div className="absolute top-2 left-2 z-10">
            <WishlistButton
              product={{
                id: product.id,
                name: product.name,
                price: discountedPrice,
                images: product.images,
                stock: effectiveStock,
                discountPercent: product.discountPercent,
              }}
              variant={
                selectedVariant
                  ? { id: selectedVariant.id, name: selectedVariant.name }
                  : null
              }
              size="md"
              className="bg-white/80 shadow-md backdrop-blur-sm"
            />
          </div>
          {/* Badges */}
          <div className="absolute top-2 right-2 flex flex-col gap-2">
            {product.isFeatured && (
              <BadgeV4 variant="premium" size="sm">
                ویژه
              </BadgeV4>
            )}
            {discountPercent > 0 && (
              <BadgeV4 variant="error" size="sm">
                {discountPercent}% تخفیف
              </BadgeV4>
            )}
          </div>
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-bold text-lg">ناموجود</span>
            </div>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-4 text-right space-y-3">
        <p className="text-xs text-rose-500/80 line-clamp-1">
          {product.description}
        </p>
        <div className="flex flex-wrap gap-1.5 justify-end">
          {discountPercent > 0 && (
            <BadgeV4 variant="error" size="sm">
              فروش ویژه
            </BadgeV4>
          )}
          {product.isFeatured && (
            <BadgeV4 variant="premium" size="sm">
              نسخه محدود
            </BadgeV4>
          )}
        </div>
        <Link href={`/products/${product.id}`}>
          <h3 className="text-base font-semibold text-rose-900 hover:text-rose-600 line-clamp-2">
            {product.name}
          </h3>
        </Link>

        {/* Variant Selector - Compact Version for Cards */}
        {hasVariants && (
          <div className="space-y-2">
            {colorVariants.length > 0 && (
              <div className="flex flex-wrap justify-end gap-1.5">
                {colorVariants.map((variant) => {
                  const isSelected = selectedVariant?.id === variant.id;
                  const variantOutOfStock = variant.stock === 0;

                  return (
                    <button
                      key={variant.id}
                      onClick={(e) => {
                        e.preventDefault();
                        if (!variantOutOfStock) handleVariantSelect(variant);
                      }}
                      disabled={variantOutOfStock}
                      className={`relative h-6 w-6 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-rose-500 ring-2 ring-rose-200/70'
                          : 'border-rose-200/70 hover:border-rose-300'
                      } ${variantOutOfStock ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                      title={variantOutOfStock ? 'ناموجود' : variant.name}
                      aria-label={variant.name}
                    >
                      <span
                        className="absolute inset-0 rounded-[6px] border border-white/70"
                        style={{ background: variant.color || '#e2e8f0' }}
                      />
                    </button>
                  );
                })}
              </div>
            )}

            {activeVariants.some((variant) => !variant.color) && (
              <div className="flex flex-wrap justify-end gap-1.5">
                {activeVariants
                  .filter((variant) => !variant.color)
                  .map((variant) => {
                    const isSelected = selectedVariant?.id === variant.id;
                    const variantOutOfStock = variant.stock === 0;
                    const label =
                      variant.size || variant.material || variant.name;

                    return (
                      <button
                        key={variant.id}
                        onClick={(e) => {
                          e.preventDefault();
                          if (!variantOutOfStock) handleVariantSelect(variant);
                        }}
                        disabled={variantOutOfStock}
                        className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                          isSelected
                            ? 'border-rose-500 bg-rose-50 text-rose-700 font-medium'
                            : 'border-rose-200/70 hover:border-rose-300 text-slate-600'
                        } ${variantOutOfStock ? 'opacity-40 cursor-not-allowed line-through' : 'cursor-pointer'}`}
                        title={variantOutOfStock ? 'ناموجود' : variant.name}
                      >
                        {label}
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-end gap-2">
          {discountPercent > 0 ? (
            <div className="flex flex-row-reverse items-center gap-2">
              <span className="text-lg font-semibold text-rose-600">
                {formatPrice(discountedPrice)}
              </span>
              <span className="text-sm text-slate-400 line-through">
                {formatPrice(effectivePrice)}
              </span>
            </div>
          ) : (
            <span className="text-lg font-semibold text-rose-900">
              {formatPrice(effectivePrice)}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        <Button
          variant="primary"
          size="md"
          className="w-full"
          disabled={isOutOfStock}
          isLoading={isAdding}
          onClick={handleAddToCart}
        >
          {isOutOfStock
            ? 'ناموجود'
            : isAdding
              ? 'در حال افزودن...'
              : 'افزودن به سبد خرید'}
        </Button>
      </div>
    </div>
  );
}

export default memo(ProductCard);
