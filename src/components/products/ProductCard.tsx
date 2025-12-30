'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils/format';
import { useCartStore } from '@/store/cart-store';
import Button from '@/components/ui/Button';
import { useState, useCallback, memo, useMemo, useEffect, useRef } from 'react';
import { optimizeImage } from '@/lib/cloudflare-images-client';
import { generateProductAltText } from '@/lib/seo/alt-text';
import { WishlistButton } from '@/components/wishlist/WishlistButton';

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
      // Show success feedback
      setTimeout(() => setIsAdding(false), 500);
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
  ]);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Product Image */}
      <Link href={`/products/${product.id}`}>
        <div
          className="relative w-full aspect-[4/5] bg-gray-100 overflow-hidden group"
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
              <div className="text-gray-400 text-4xl">📦</div>
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
              <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-md">
                ویژه
              </span>
            )}
            {discountPercent > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-md">
                {discountPercent}% تخفیف
              </span>
            )}
          </div>
          {isOutOfStock && (
            <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
              <span className="text-white font-bold text-lg">ناموجود</span>
            </div>
          )}

          {/* Color Variant Indicators (dots) - Only show if there are multiple color variants */}
          {hasColorVariants && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {colorVariants.map((variant, index) => (
                <div
                  key={variant.id}
                  className={`transition-all duration-200 ${
                    index === currentVariantIndex
                      ? 'w-6 h-2 bg-white rounded-full shadow-md'
                      : 'w-2 h-2 bg-white/60 rounded-full'
                  }`}
                  title={variant.name}
                />
              ))}
            </div>
          )}
        </div>
      </Link>

      {/* Product Info */}
      <div className="p-4">
        <Link href={`/products/${product.id}`}>
          <h3 className="text-lg font-semibold text-gray-900 mb-2 hover:text-blue-600 text-right line-clamp-1">
            {product.name}
          </h3>
        </Link>
        <p className="text-gray-600 text-sm mb-3 text-right line-clamp-2">
          {product.description}
        </p>

        {/* Variant Selector - Compact Version for Cards */}
        {hasVariants && (
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-700 mb-2 text-right">
              انتخاب نوع:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {activeVariants.map((variant) => {
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
                    className={`px-2 py-1 text-xs rounded border transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-medium'
                        : 'border-gray-300 hover:border-gray-400 text-gray-700'
                    } ${variantOutOfStock ? 'opacity-40 cursor-not-allowed line-through' : 'cursor-pointer'}`}
                    title={variantOutOfStock ? 'ناموجود' : variant.name}
                  >
                    {variant.color && (
                      <span
                        className="inline-block w-3 h-3 rounded-full border border-gray-300 ml-1"
                        style={{ background: variant.color }}
                      />
                    )}
                    {variant.size || variant.material || variant.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price and Stock */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-right">
            {discountPercent > 0 ? (
              <div className="flex flex-col gap-1">
                <span className="text-sm text-gray-500 line-through">
                  {formatPrice(effectivePrice)}
                </span>
                <span className="text-xl font-bold text-red-600">
                  {formatPrice(discountedPrice)}
                </span>
              </div>
            ) : (
              <span className="text-xl font-bold text-gray-900">
                {formatPrice(effectivePrice)}
              </span>
            )}
          </div>
          <div className="text-left">
            <span
              className={`text-sm ${effectiveStock > 0 ? 'text-green-600' : 'text-red-600'}`}
            >
              {effectiveStock > 0 ? `موجود: ${effectiveStock}` : 'ناموجود'}
            </span>
          </div>
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
