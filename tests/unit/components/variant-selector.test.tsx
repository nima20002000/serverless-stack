import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import VariantSelector from '@/components/products/VariantSelector';

describe('VariantSelector', () => {
  it('renders swatch-enabled size variants only once as visual swatches', () => {
    const markup = renderToStaticMarkup(
      React.createElement(VariantSelector, {
        basePrice: 100,
        onVariantSelect: vi.fn(),
        variants: [
          {
            id: 'blue-xl',
            name: 'Blue XL',
            size: 'XL',
            priceAdjust: 0,
            stock: 4,
            isActive: true,
            swatchImageUrl: '/media/blue-xl.jpg',
            swatchCrop: { x: 30, y: 70, zoom: 2 },
          },
        ],
      })
    );

    expect(markup).toContain('data-testid="variant-swatch-blue-xl"');
    expect(markup).toContain('Color');
    expect(markup).not.toContain('Size');
  });
});
