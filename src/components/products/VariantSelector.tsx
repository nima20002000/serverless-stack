'use client';

import { useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/solid';

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

export default function VariantSelector({
  variants,
  basePrice,
  onVariantSelect,
  selectedVariantId,
}: VariantSelectorProps) {
  const [selected, setSelected] = useState<string | null>(selectedVariantId || null);

  if (!variants || variants.length === 0) {
    return null;
  }

  // Group variants by type
  const colorVariants = variants.filter(v => v.color && v.isActive);
  const sizeVariants = variants.filter(v => v.size && v.isActive);
  const materialVariants = variants.filter(v => v.material && v.isActive);
  const otherVariants = variants.filter(v => !v.color && !v.size && !v.material && v.isActive);

  const handleSelect = (variant: Variant) => {
    const newSelectedId = selected === variant.id ? null : variant.id;
    setSelected(newSelectedId);
    onVariantSelect(newSelectedId ? variant : null);
  };

  const getVariantPrice = (variant: Variant) => {
    const price = basePrice + Number(variant.priceAdjust);
    return price.toLocaleString('fa-IR');
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
            ? 'border-blue-600 ring-2 ring-blue-200'
            : 'border-gray-300 hover:border-gray-400'
        } ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        style={{ backgroundColor: variant.color || '#ddd' }}
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
        className={`px-4 py-2 rounded-lg border-2 transition-all min-w-[4rem] ${
          isSelected
            ? 'border-blue-600 bg-blue-50 text-blue-700'
            : 'border-gray-300 hover:border-gray-400'
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
        className={`px-4 py-3 rounded-lg border-2 transition-all text-right ${
          isSelected
            ? 'border-blue-600 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-medium text-sm">{variant.name}</div>
            {variant.sku && (
              <div className="text-xs text-gray-500 mt-1">{variant.sku}</div>
            )}
          </div>
          <div className="text-left">
            {variant.priceAdjust !== 0 && (
              <div className="text-sm font-medium text-blue-600">
                {variant.priceAdjust > 0 ? '+' : ''}
                {Number(variant.priceAdjust).toLocaleString('fa-IR')} تومان
              </div>
            )}
            <div className={`text-xs ${outOfStock ? 'text-red-600' : 'text-gray-500'}`}>
              {outOfStock ? 'ناموجود' : `موجودی: ${variant.stock}`}
            </div>
          </div>
        </div>
      </button>
    );
  };

  const selectedVariant = selected ? variants.find(v => v.id === selected) : null;

  return (
    <div className="space-y-6">
      {/* Color Variants */}
      {colorVariants.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            رنگ
          </label>
          <div className="flex flex-wrap gap-3">
            {colorVariants.map(variant => (
              <ColorSwatch key={variant.id} variant={variant} />
            ))}
          </div>
        </div>
      )}

      {/* Size Variants */}
      {sizeVariants.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            سایز
          </label>
          <div className="flex flex-wrap gap-2">
            {sizeVariants.map(variant => (
              <SizeButton key={variant.id} variant={variant} />
            ))}
          </div>
        </div>
      )}

      {/* Material Variants */}
      {materialVariants.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            جنس
          </label>
          <div className="flex flex-wrap gap-2">
            {materialVariants.map(variant => (
              <button
                key={variant.id}
                onClick={() => !isOutOfStock(variant) && handleSelect(variant)}
                disabled={isOutOfStock(variant)}
                className={`px-4 py-2 rounded-lg border-2 transition-all ${
                  selected === variant.id
                    ? 'border-blue-600 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:border-gray-400'
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
          <label className="block text-sm font-medium text-gray-700 mb-3">
            انتخاب نوع
          </label>
          <div className="space-y-2">
            {otherVariants.map(variant => (
              <VariantButton key={variant.id} variant={variant} />
            ))}
          </div>
        </div>
      )}

      {/* Selected Variant Info */}
      {selectedVariant && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">انتخاب شما:</p>
              <p className="text-base font-semibold text-gray-900 mt-1">
                {selectedVariant.name}
              </p>
            </div>
            <div className="text-left">
              <p className="text-lg font-bold text-blue-600">
                {getVariantPrice(selectedVariant)} تومان
              </p>
              <p className="text-xs text-gray-600 mt-1">
                موجودی: {selectedVariant.stock} عدد
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
