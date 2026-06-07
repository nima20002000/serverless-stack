import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SWATCH_CROP,
  getVariantSwatchStyle,
  normalizeVariantSwatch,
  normalizeVariantSwatchCrop,
} from '@/lib/variant-swatch';

describe('variant swatch helpers', () => {
  it('normalizes missing crop values to defaults', () => {
    expect(normalizeVariantSwatchCrop(null)).toEqual(DEFAULT_SWATCH_CROP);
    expect(normalizeVariantSwatchCrop({ x: 20 })).toEqual({
      x: 20,
      y: 50,
      zoom: 1,
    });
  });

  it('clamps invalid crop values before persistence', () => {
    expect(normalizeVariantSwatchCrop({ x: -25, y: 140, zoom: 9 })).toEqual({
      x: 0,
      y: 100,
      zoom: 4,
    });
  });

  it('clears crop metadata when no swatch image is selected', () => {
    expect(
      normalizeVariantSwatch({
        swatchImageUrl: '',
        swatchCrop: { x: 10, y: 20, zoom: 2 },
      })
    ).toEqual({
      swatchImageUrl: null,
      swatchCrop: null,
    });
  });

  it('returns CSS background style from normalized crop metadata', () => {
    expect(
      getVariantSwatchStyle('/media/blue.jpg', { x: 25, y: 75, zoom: 2.5 })
    ).toEqual({
      backgroundImage: 'url("/media/blue.jpg")',
      backgroundPosition: '25% 75%',
      backgroundSize: '250%',
      backgroundRepeat: 'no-repeat',
    });
  });
});
