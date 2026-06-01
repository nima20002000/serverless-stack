'use client';

import { useState, useMemo, memo, useEffect } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';
import { formatNumber, formatPrice } from '@/lib/utils/format';

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
    useMemo(
      () => ({
        colorVariants: variants.filter((v) => v.color && v.isActive),
        sizeVariants: variants.filter((v) => v.size && v.isActive),
        materialVariants: variants.filter((v) => v.material && v.isActive),
        otherVariants: variants.filter(
          (v) => !v.color && !v.size && !v.material && v.isActive
        ),
      }),
      [variants]
    );

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

    return (
      <button
        onClick={() => !outOfStock && handleSelect(variant)}
        disabled={outOfStock}
        className={`relative w-12 h-12 rounded-full border-2 transition-all ${
          isSelected
            ? 'border-rose-500 ring-2 ring-rose-200/70'
            : 'border-rose-200/70 hover:border-rose-300'
        } ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        style={{ background: variant.color || '#ddd' }}
        title={`${variant.name}${outOfStock ? ' (ناموجود)' : ''}`}
        aria-label={variant.name}
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
            ? 'border-rose-500 bg-rose-50 text-rose-700'
            : 'border-rose-200/70 hover:border-rose-300 text-slate-700'
        } ${outOfStock ? 'opacity-50 cursor-not-allowed line-through' : 'cursor-pointer'}`}
        title={outOfStock ? 'ناموجود' : variant.name}
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
        className={`px-4 py-3 rounded-2xl border-2 transition-all text-right ${
          isSelected
            ? 'border-rose-500 bg-rose-50/80'
            : 'border-rose-200/70 hover:border-rose-300'
        } ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-medium text-sm">{variant.name}</div>
            {variant.sku && (
              <div className="text-xs text-slate-500 mt-1">{variant.sku}</div>
            )}
          </div>
          <div className="text-left">
            {variant.priceAdjust !== 0 && (
              <div className="text-sm font-medium text-rose-600">
                {variant.priceAdjust > 0 ? '+' : ''}
                {formatPrice(Number(variant.priceAdjust))}
              </div>
            )}
            <div
              className={`text-xs ${outOfStock ? 'text-rose-600' : 'text-slate-500'}`}
            >
              {outOfStock ? 'ناموجود' : `موجودی: ${variant.stock}`}
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
          <label className="block text-sm font-medium text-rose-900/80 mb-3">
            رنگ
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
          <label className="block text-sm font-medium text-rose-900/80 mb-3">
            سایز
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
          <label className="block text-sm font-medium text-rose-900/80 mb-3">
            جنس
          </label>
          <div className="flex flex-wrap gap-2">
            {materialVariants.map((variant) => (
              <button
                key={variant.id}
                onClick={() => !isOutOfStock(variant) && handleSelect(variant)}
                disabled={isOutOfStock(variant)}
                className={`px-4 py-2 rounded-2xl border-2 transition-all ${
                  selected === variant.id
                    ? 'border-rose-500 bg-rose-50 text-rose-700'
                    : 'border-rose-200/70 hover:border-rose-300 text-slate-700'
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
          <label className="block text-sm font-medium text-rose-900/80 mb-3">
            انتخاب نوع
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
        <div className="p-4 bg-rose-50/70 border border-rose-200/70 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-rose-900/80">
                انتخاب شما:
              </p>
              <p className="text-base font-semibold text-rose-950 mt-1">
                {selectedVariant.name}
              </p>
            </div>
            <div className="text-left">
              <p className="text-lg font-bold text-rose-700">
                {getVariantPrice(selectedVariant)}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                موجودی: {formatNumber(selectedVariant.stock)} عدد
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(VariantSelector);
