'use client';

import { useState, useMemo, memo, useEffect } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import { formatPrice } from '@/lib/utils/format';
import { getVariantSwatchStyle } from '@/lib/variant-swatch';

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
  swatchImageUrl?: string | null;
  swatchCrop?: unknown;
}

interface VariantSelectorProps {
  variants: Variant[];
  basePrice: number;
  onVariantSelect: (variant: Variant | null) => void;
  selectedVariantId?: string;
}

function VariantSelector({
  variants,
  basePrice,
  onVariantSelect,
  selectedVariantId,
}: VariantSelectorProps) {
  // Use the parent's selectedVariantId (which may be auto-selected)
  const [selected, setSelected] = useState<string | null>(
    selectedVariantId || null
  );

  // Sync with parent's selection changes using useEffect
  useEffect(() => {
    if (selectedVariantId !== selected && selectedVariantId !== undefined) {
      setSelected(selectedVariantId);
    }
  }, [selectedVariantId, selected]);

  // Memoize variant filtering to avoid recalculating on every render
  const { colorVariants, sizeVariants, materialVariants, otherVariants } =
    useMemo(() => {
      const hasVisualSwatch = (variant: Variant) =>
        Boolean(variant.color || variant.swatchImageUrl);

      return {
        colorVariants: variants.filter((v) => hasVisualSwatch(v) && v.isActive),
        sizeVariants: variants.filter(
          (v) => !hasVisualSwatch(v) && v.size && v.isActive
        ),
        materialVariants: variants.filter(
          (v) => !hasVisualSwatch(v) && !v.size && v.material && v.isActive
        ),
        otherVariants: variants.filter(
          (v) => !hasVisualSwatch(v) && !v.size && !v.material && v.isActive
        ),
      };
    }, [variants]);

  if (!variants || variants.length === 0) {
    return null;
  }

  const handleSelect = (variant: Variant) => {
    const newSelectedId = selected === variant.id ? null : variant.id;
    setSelected(newSelectedId);
    onVariantSelect(newSelectedId ? variant : null);
  };

  const getVariantPrice = (variant: Variant) => {
    const price = basePrice + Number(variant.priceAdjust);
    return formatPrice(price);
  };

  const isOutOfStock = (variant: Variant) => variant.stock === 0;

  // Color swatch component
  const ColorSwatch = ({ variant }: { variant: Variant }) => {
    const isSelected = selected === variant.id;
    const outOfStock = isOutOfStock(variant);
    const imageSwatchStyle = getVariantSwatchStyle(
      variant.swatchImageUrl,
      variant.swatchCrop
    );
    const hasImageSwatch = !!variant.swatchImageUrl;

    return (
      <button
        onClick={() => !outOfStock && handleSelect(variant)}
        disabled={outOfStock}
        className={`relative w-12 h-12 rounded-full border-2 transition-all ${
          isSelected
            ? 'border-blue-600 ring-2 ring-blue-200/70 dark:border-blue-300 dark:ring-blue-500/40'
            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-500'
        } ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        style={
          hasImageSwatch
            ? imageSwatchStyle
            : { background: variant.color || '#ddd' }
        }
        title={`${variant.name}${outOfStock ? ' (Out of stock)' : ''}`}
        aria-label={variant.name}
        data-testid={`variant-swatch-${variant.id}`}
      >
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckIcon className="h-6 w-6 text-white drop-shadow-lg" />
          </div>
        )}
        {outOfStock && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-px h-full bg-red-500 rotate-45 absolute" />
          </div>
        )}
      </button>
    );
  };

  // Size button component
  const SizeButton = ({ variant }: { variant: Variant }) => {
    const isSelected = selected === variant.id;
    const outOfStock = isOutOfStock(variant);

    return (
      <button
        onClick={() => !outOfStock && handleSelect(variant)}
        disabled={outOfStock}
        className={`px-4 py-2 rounded-2xl border-2 transition-all min-w-[4rem] ${
          isSelected
            ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-200'
            : 'border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500'
        } ${outOfStock ? 'opacity-50 cursor-not-allowed line-through' : 'cursor-pointer'}`}
        title={outOfStock ? 'Out of stock' : variant.name}
      >
        <div className="text-sm font-medium">{variant.size}</div>
      </button>
    );
  };

  // Generic variant button
  const VariantButton = ({ variant }: { variant: Variant }) => {
    const isSelected = selected === variant.id;
    const outOfStock = isOutOfStock(variant);

    return (
      <button
        onClick={() => !outOfStock && handleSelect(variant)}
        disabled={outOfStock}
        className={`rounded-lg border-2 px-4 py-3 text-start transition-all ${
          isSelected
            ? 'border-blue-600 bg-blue-50 dark:border-blue-400 dark:bg-blue-950/50'
            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-500'
        } ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
              {variant.name}
            </div>
            {variant.sku && (
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                {variant.sku}
              </div>
            )}
          </div>
          <div className="text-start">
            {variant.priceAdjust !== 0 && (
              <div className="text-sm font-medium text-blue-700 dark:text-blue-200">
                {variant.priceAdjust > 0 ? '+' : ''}
                {formatPrice(Number(variant.priceAdjust))}
              </div>
            )}
            <div
              className={`text-xs ${
                outOfStock
                  ? 'text-red-600 dark:text-rose-300'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {outOfStock ? 'Out of stock' : `Stock: ${variant.stock}`}
            </div>
          </div>
        </div>
      </button>
    );
  };

  const selectedVariant = selected
    ? variants.find((v) => v.id === selected)
    : null;

  return (
    <div className="space-y-6">
      {/* Color Variants */}
      {colorVariants.length > 0 && (
        <div>
          <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Color
          </label>
          <div className="flex flex-wrap gap-3">
            {colorVariants.map((variant) => (
              <ColorSwatch key={variant.id} variant={variant} />
            ))}
          </div>
        </div>
      )}

      {/* Size Variants */}
      {sizeVariants.length > 0 && (
        <div>
          <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Size
          </label>
          <div className="flex flex-wrap gap-2">
            {sizeVariants.map((variant) => (
              <SizeButton key={variant.id} variant={variant} />
            ))}
          </div>
        </div>
      )}

      {/* Material Variants */}
      {materialVariants.length > 0 && (
        <div>
          <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Material
          </label>
          <div className="flex flex-wrap gap-2">
            {materialVariants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => !isOutOfStock(variant) && handleSelect(variant)}
                disabled={isOutOfStock(variant)}
                className={`px-4 py-2 rounded-2xl border-2 transition-all ${
                  selected === variant.id
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950/50 dark:text-blue-200'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500'
                } ${isOutOfStock(variant) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {variant.material}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Other Variants */}
      {otherVariants.length > 0 && (
        <div>
          <label className="mb-3 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Option
          </label>
          <div className="space-y-2">
            {otherVariants.map((variant) => (
              <VariantButton key={variant.id} variant={variant} />
            ))}
          </div>
        </div>
      )}

      {/* Selected Variant Info */}
      {selectedVariant && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/70 dark:bg-blue-950/40">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Selected option
              </p>
              <p className="mt-1 text-base font-semibold text-slate-950 dark:text-white">
                {selectedVariant.name}
              </p>
            </div>
            <div className="text-start">
              <p className="text-lg font-bold text-blue-700 dark:text-blue-200">
                {getVariantPrice(selectedVariant)}
              </p>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Stock: {selectedVariant.stock}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(VariantSelector);
