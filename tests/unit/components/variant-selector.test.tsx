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
    expect(markup).toContain('aria-pressed="false"');
    expect(markup).toContain('Color');
    expect(markup).not.toContain('Size');
  });

  it('groups mixed image, color, size, material, and stock states without duplicate controls', () => {
    const markup = renderToStaticMarkup(
      React.createElement(VariantSelector, {
        basePrice: 100,
        onVariantSelect: vi.fn(),
        variants: [
          {
            id: 'swatch-size-material',
            name: 'Leather sample XL',
            size: 'XL',
            material: 'Leather',
            priceAdjust: 10,
            stock: 2,
            isActive: true,
            swatchImageUrl: '/media/leather-xl.jpg',
            swatchCrop: { x: 22, y: 63, zoom: 2.25 },
          },
          {
            id: 'red',
            name: 'Red',
            color: '#dc2626',
            priceAdjust: 0,
            stock: 0,
            isActive: true,
          },
          {
            id: 'size-only',
            name: 'Size Medium',
            size: 'M',
            priceAdjust: 0,
            stock: 4,
            isActive: true,
          },
          {
            id: 'material-only',
            name: 'Linen',
            material: 'Linen',
            priceAdjust: 0,
            stock: 5,
            isActive: true,
          },
        ],
      })
    );

    expect(markup).toContain(
      'data-testid="variant-swatch-swatch-size-material"'
    );
    expect(markup).toContain(
      'background-image:url(&quot;/media/leather-xl.jpg&quot;)'
    );
    expect(markup).toContain('background-position:22% 63%');
    expect(markup).toContain('background-size:225%');
    expect(markup).toContain('aria-label="Red (Out of stock)"');
    expect(markup).toContain('disabled=""');
    expect(markup).toContain('>Size<');
    expect(markup).toContain('>Material<');
    expect(markup.split('Leather sample XL').length - 1).toBe(2);
    expect(
      markup.split('data-testid="variant-swatch-swatch-size-material"').length -
        1
    ).toBe(1);
  });

  it('preserves selected visual swatch state with dark-theme and focus classes', () => {
    const markup = renderToStaticMarkup(
      React.createElement(VariantSelector, {
        basePrice: 100,
        selectedVariantId: 'image-only',
        onVariantSelect: vi.fn(),
        variants: [
          {
            id: 'image-only',
            name: 'Image only',
            priceAdjust: 0,
            stock: 4,
            isActive: true,
            swatchImageUrl: '/media/image-only.jpg',
            swatchCrop: { x: 50, y: 50, zoom: 1 },
          },
        ],
      })
    );

    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('dark:border-blue-300');
    expect(markup).toContain('focus-visible:ring-blue-500');
    expect(markup).toContain('Selected option');
    expect(markup).toContain('Image only');
  });
});
