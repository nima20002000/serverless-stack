'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MinusIcon, PlusIcon, TagIcon } from '@heroicons/react/24/outline';
import { useCartStore } from '@/store/cart-store';
import { formatPrice } from '@/services/product-service';
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
  const getDefaultVariant = (): Variant | null => {
    if (!product.variants || product.variants.length === 0) return null;

    // Prioritize variants with media
    const variantWithMedia = product.variants.find(v =>
      v.isActive && v.media && v.media.length > 0
    );
    if (variantWithMedia) return variantWithMedia;

    // Fallback to first active variant
    const firstActive = product.variants.find(v => v.isActive);
    return firstActive || null;
  };

  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(getDefaultVariant());

  // Calculate discount
  const discountPercent = product.discountPercent || 0;

  // Calculate effective price and stock based on variant selection
  const basePrice = selectedVariant
    ? product.price + Number(selectedVariant.priceAdjust)
    : product.price;

  // Apply discount to effective price
  const effectivePrice = discountPercent > 0
    ? basePrice * (1 - discountPercent / 100)
    : basePrice;

  const effectiveStock = selectedVariant ? selectedVariant.stock : product.stock;
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
        setError('لطفاً یک نوع محصول (رنگ، سایز، ...) انتخاب کنید');
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
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در افزودن به سبد خرید');
      setIsAdding(false);
    }
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="mb-6 text-right">
        <button
          onClick={() => router.push('/products')}
          className="text-blue-600 hover:text-blue-700"
        >
          محصولات
        </button>
        {product.category && (
          <>
            <span className="mx-2 text-gray-400">/</span>
            <button
              onClick={() => product.category && router.push(`/products?category=${product.category.slug}`)}
              className="text-blue-600 hover:text-blue-700"
            >
              {product.category.name}
            </button>
          </>
        )}
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-700">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Product Gallery */}
        <div>
          {product.media && product.media.length > 0 ? (
            <ProductGallery
              media={product.media}
              productName={product.name}
              selectedVariant={selectedVariant}
            />
          ) : (
            <Card>
              <div className="flex items-center justify-center h-96 bg-gray-100 rounded-lg">
                <div className="text-gray-400 text-8xl">📦</div>
              </div>
            </Card>
          )}
        </div>

        {/* Product Details */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4 text-right">
            {product.name}
          </h1>

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => router.push(`/products?tag=${tag.slug}`)}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-full transition-colors"
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
                <span className="text-2xl font-bold text-gray-500 line-through">
                  {formatPrice(basePrice)}
                </span>
              )}
              <span className={`text-3xl font-bold ${discountPercent > 0 ? 'text-red-600' : 'text-blue-600'}`}>
                {formatPrice(effectivePrice)}
              </span>
              {discountPercent > 0 && (
                <span className="bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-md">
                  {discountPercent}% تخفیف
                </span>
              )}
              {product.isFeatured && (
                <span className="bg-yellow-500 text-white text-sm font-bold px-3 py-1 rounded-md">
                  ویژه
                </span>
              )}
            </div>
            {selectedVariant && selectedVariant.priceAdjust !== 0 && (
              <div className="mt-2 text-sm text-gray-600">
                قیمت پایه: {formatPrice(product.price)}
                {discountPercent > 0 && (
                  <span className="mr-2">(قبل از تخفیف)</span>
                )}
              </div>
            )}
          </div>

          {/* Stock Status */}
          <div className="mb-6">
            {isOutOfStock ? (
              <span className="inline-block bg-red-100 text-red-800 px-4 py-2 rounded-lg font-medium">
                ناموجود
              </span>
            ) : (
              <span className="inline-block bg-green-100 text-green-800 px-4 py-2 rounded-lg font-medium">
                موجود ({effectiveStock} عدد)
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
            <h2 className="text-xl font-semibold text-gray-900 mb-3 text-right">
              توضیحات محصول
            </h2>
            <p className="text-gray-700 leading-relaxed text-right whitespace-pre-line">
              {product.description}
            </p>
          </Card>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 text-right">{error}</p>
            </div>
          )}

          {/* Quantity Selector */}
          {!isOutOfStock && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                تعداد
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="کاهش تعداد"
                >
                  <MinusIcon className="w-5 h-5 text-gray-600" />
                </button>

                <span className="text-lg font-medium text-gray-900 min-w-[3rem] text-center">
                  {quantity}
                </span>

                <button
                  onClick={handleIncrement}
                  disabled={quantity >= effectiveStock}
                  className="p-2 rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  aria-label="افزایش تعداد"
                >
                  <PlusIcon className="w-5 h-5 text-gray-600" />
                </button>

                {quantity >= effectiveStock && (
                  <span className="text-sm text-orange-600 mr-2">حداکثر موجودی</span>
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
                ? 'ناموجود'
                : isAdding
                ? 'در حال افزودن...'
                : 'افزودن به سبد خرید'}
            </Button>

            <Button
              variant="secondary"
              size="lg"
              className="w-full"
              onClick={() => router.back()}
            >
              بازگشت به لیست محصولات
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
