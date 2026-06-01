'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MinusIcon, PlusIcon, TagIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/lib/utils/format';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import ProductGallery from './ProductGallery';
import VariantSelector from './VariantSelector';

interface MediaItem {
  id: string;
  type: 'IMAGE' | 'VIDEO';
  url: string;
  alt?: string;
  order: number;
}

interface Variant {
  id: string;
  name: string;
  sku?: string;
  color?: string;
  size?: string;
  material?: string;
  priceAdjust: number;
  stock: number;
  isActive: boolean;
  media?: MediaItem[];
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
}

interface ProductDetailProps {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    discountPercent?: number | null;
    stock: number;
    images: string[];
    hasVariants?: boolean;
    isActive: boolean;
    isFeatured?: boolean;
    category?: Category | null;
    tags?: Tag[];
    media?: MediaItem[];
    variants?: Variant[];
  };
}

export default function ProductDetail({ product }: ProductDetailProps) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState('');

  // Auto-select first active variant with media if available
  // If product has no product-level media but has variants, auto-select first variant
  const getDefaultVariant = (): Variant | null => {
    if (!product.variants || product.variants.length === 0) return null;

    const hasProductMedia = product.media && product.media.length > 0;

    // If product has no product-level media, always select first active variant
    // to ensure images are displayed
    if (!hasProductMedia) {
      const firstActive = product.variants.find((v) => v.isActive);
      return firstActive || null;
    }

    // Otherwise, prioritize variants with media
    const variantWithMedia = product.variants.find(
      (v) => v.isActive && v.media && v.media.length > 0
    );
    if (variantWithMedia) return variantWithMedia;

    // Fallback to first active variant
    const firstActive = product.variants.find((v) => v.isActive);
    return firstActive || null;
  };

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(() =>
    getDefaultVariant()
  );

  // Ensure default variant is set when component mounts or product changes
  useEffect(() => {
    if (!product.variants || product.variants.length === 0) return;

    const hasProductMedia = product.media && product.media.length > 0;

    let defaultVariant: Variant | null = null;

    if (!hasProductMedia) {
      defaultVariant = product.variants.find((v) => v.isActive) || null;
    } else {
      const variantWithMedia = product.variants.find(
        (v) => v.isActive && v.media && v.media.length > 0
      );
      defaultVariant =
        variantWithMedia || product.variants.find((v) => v.isActive) || null;
    }

    if (
      defaultVariant &&
      (!selectedVariant || selectedVariant.id !== defaultVariant.id)
    ) {
      setSelectedVariant(defaultVariant);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, product.variants, product.media]); // Re-run when product data changes

  // Calculate discount
  const discountPercent = product.discountPercent || 0;

  // Calculate effective price and stock based on variant selection
  const basePrice = selectedVariant
    ? product.price + Number(selectedVariant.priceAdjust)
    : product.price;

  // Apply discount to effective price
  const effectivePrice =
    discountPercent > 0 ? basePrice * (1 - discountPercent / 100) : basePrice;

  const effectiveStock = selectedVariant
    ? selectedVariant.stock
    : product.stock;
  const isOutOfStock = effectiveStock === 0;

  const handleIncrement = () => {
    if (quantity < effectiveStock) {
      setQuantity((prev) => prev + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  };

  const handleVariantSelect = (variant: Variant | null) => {
    setSelectedVariant(variant);
    setQuantity(1); // Reset quantity when variant changes
    setError('');
  };

  const handleAddToCart = async () => {
    try {
      setError('');

      // If product has variants enabled, variant selection is REQUIRED
      if (product.hasVariants && !selectedVariant) {
        setError('Select a product option first');
        return;
      }

      setIsAdding(true);

      // Get the first media URL or fallback to legacy images
      const imageUrl =
        product.media && product.media.length > 0
          ? product.media[0].url
          : product.images && product.images.length > 0
            ? product.images[0]
            : '';

      addItem(
        {
          productId: product.id,
          name: selectedVariant
            ? `${product.name} - ${selectedVariant.name}`
            : product.name,
          price: effectivePrice,
          image: imageUrl,
          stock: effectiveStock,
          variantId: selectedVariant?.id,
          variantName: selectedVariant?.name,
        },
        quantity
      );

      // Show success and reset
      setTimeout(() => {
        setIsAdding(false);
        setQuantity(1);
        const shouldCheckout = confirm(
          'Product added to cart. Go to checkout now?'
        );
        if (shouldCheckout) {
          router.push('/checkout');
        }
      }, 300);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not add product to cart'
      );
      setIsAdding(false);
    }
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-6 text-sm">
        <button
          onClick={() => router.push('/products')}
          className="text-slate-600 hover:text-slate-800"
        >
          Products
        </button>
        {product.category && (
          <>
            <span className="mx-2 text-slate-300">/</span>
            <button
              onClick={() =>
                product.category &&
                router.push(`/products?category=${product.category.slug}`)
              }
              className="text-slate-600 hover:text-slate-800"
            >
              {product.category.name}
            </button>
          </>
        )}
        <span className="mx-2 text-slate-300">/</span>
        <span className="text-slate-900 dark:text-slate-100">
          {product.name}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Product Gallery */}
        <div>
          {product.media && product.media.length > 0 ? (
            <ProductGallery
              media={product.media}
              productName={product.name}
              selectedVariant={selectedVariant}
              allVariants={product.variants}
            />
          ) : selectedVariant &&
            selectedVariant.media &&
            selectedVariant.media.length > 0 ? (
            <ProductGallery
              media={product.media || []}
              productName={product.name}
              selectedVariant={selectedVariant}
              allVariants={product.variants}
            />
          ) : (
            <Card>
              <div className="flex h-96 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                <div className="text-sm font-medium text-slate-400">
                  No image
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Product Details */}
        <div>
          <h1 className="mb-4 text-3xl font-bold text-slate-950 dark:text-white">
            {product.name}
          </h1>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => router.push(`/products?tag=${tag.slug}`)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <TagIcon className="h-3 w-3" />
                  {tag.name}
                </button>
              ))}
            </div>
          )}

          {/* Price */}
          <div className="mb-6">
            <div className="flex items-center gap-3 flex-wrap">
              {discountPercent > 0 && (
                <span className="text-2xl font-bold text-slate-400 line-through">
                  {formatPrice(basePrice)}
                </span>
              )}
              <span className="text-3xl font-bold text-slate-950 dark:text-white">
                {formatPrice(effectivePrice)}
              </span>
              {discountPercent > 0 && (
                <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
                  {discountPercent}% off
                </span>
              )}
              {product.isFeatured && (
                <span className="rounded-full bg-slate-900 px-3 py-1 text-sm font-bold text-white">
                  Featured
                </span>
              )}
            </div>
            {selectedVariant && selectedVariant.priceAdjust !== 0 && (
              <div className="mt-2 text-sm text-slate-500">
                Base price: {formatPrice(product.price)}
                {discountPercent > 0 && (
                  <span className="ml-2">(before discount)</span>
                )}
              </div>
            )}
          </div>

          {/* Stock Status */}
          <div className="mb-6">
            {isOutOfStock ? (
              <span className="inline-block rounded-full border border-slate-200 bg-slate-100 px-4 py-2 font-medium text-slate-600">
                Out of stock
              </span>
            ) : (
              <span className="inline-block rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 font-medium text-emerald-700">
                In stock ({effectiveStock} available)
              </span>
            )}
          </div>

          {/* Variant Selector */}
          {product.variants && product.variants.length > 0 && (
            <Card className="mb-6">
              <VariantSelector
                variants={product.variants}
                basePrice={product.price}
                onVariantSelect={handleVariantSelect}
                selectedVariantId={selectedVariant?.id}
              />
            </Card>
          )}

          {/* Description */}
          <Card className="mb-6">
            <h2 className="mb-3 text-xl font-semibold text-slate-950 dark:text-white">
              Product description
            </h2>
            <p className="whitespace-pre-line leading-relaxed text-slate-600 dark:text-slate-400">
              {product.description}
            </p>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-2xl">
              <p className="text-sm text-amber-700">{error}</p>
            </div>
          )}

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Quantity
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  className="rounded-lg border border-slate-200 p-2 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Decrease quantity"
                >
                  <MinusIcon className="w-5 h-5 text-slate-600" />
                </button>

                <span className="text-lg font-medium text-slate-900 min-w-[3rem] text-center">
                  {quantity}
                </span>

                <button
                  onClick={handleIncrement}
                  disabled={quantity >= effectiveStock}
                  className="rounded-lg border border-slate-200 p-2 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Increase quantity"
                >
                  <PlusIcon className="w-5 h-5 text-slate-600" />
                </button>

                {quantity >= effectiveStock && (
                  <span className="ml-2 text-sm text-amber-600">
                    Maximum stock
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Add to Cart */}
          <div className="space-y-4">
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isOutOfStock}
              isLoading={isAdding}
              onClick={handleAddToCart}
            >
              {isOutOfStock
                ? 'Out of stock'
                : isAdding
                  ? 'Adding...'
                  : 'Add to Cart'}
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => router.back()}
            >
              Back to products
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
