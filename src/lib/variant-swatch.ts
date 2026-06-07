export type VariantSwatchCrop = {
  x: number;
  y: number;
  zoom: number;
};

export type VariantSwatchInput = {
  swatchImageUrl?: string | null;
  swatchCrop?: unknown;
};

export type NormalizedVariantSwatch = {
  swatchImageUrl: string | null;
  swatchCrop: VariantSwatchCrop | null;
};

export const DEFAULT_SWATCH_CROP: VariantSwatchCrop = {
  x: 50,
  y: 50,
  zoom: 1,
};

export const SWATCH_CROP_LIMITS = {
  x: { min: 0, max: 100 },
  y: { min: 0, max: 100 },
  zoom: { min: 1, max: 4 },
} as const;

function toFiniteNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundCropValue(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeVariantSwatchCrop(crop: unknown): VariantSwatchCrop {
  const cropRecord =
    crop && typeof crop === 'object'
      ? (crop as Partial<Record<keyof VariantSwatchCrop, unknown>>)
      : {};

  return {
    x: roundCropValue(
      clamp(
        toFiniteNumber(cropRecord.x, DEFAULT_SWATCH_CROP.x),
        SWATCH_CROP_LIMITS.x.min,
        SWATCH_CROP_LIMITS.x.max
      )
    ),
    y: roundCropValue(
      clamp(
        toFiniteNumber(cropRecord.y, DEFAULT_SWATCH_CROP.y),
        SWATCH_CROP_LIMITS.y.min,
        SWATCH_CROP_LIMITS.y.max
      )
    ),
    zoom: roundCropValue(
      clamp(
        toFiniteNumber(cropRecord.zoom, DEFAULT_SWATCH_CROP.zoom),
        SWATCH_CROP_LIMITS.zoom.min,
        SWATCH_CROP_LIMITS.zoom.max
      )
    ),
  };
}

export function normalizeVariantSwatch(
  input: VariantSwatchInput
): NormalizedVariantSwatch {
  const swatchImageUrl = input.swatchImageUrl?.trim() || null;

  return {
    swatchImageUrl,
    swatchCrop: swatchImageUrl
      ? normalizeVariantSwatchCrop(input.swatchCrop)
      : null,
  };
}

export function getVariantSwatchStyle(
  swatchImageUrl: string | null | undefined,
  swatchCrop: unknown
): Record<string, string> {
  const normalized = normalizeVariantSwatch({
    swatchImageUrl,
    swatchCrop,
  });

  if (!normalized.swatchImageUrl || !normalized.swatchCrop) {
    return {};
  }

  return {
    backgroundImage: `url("${normalized.swatchImageUrl}")`,
    backgroundPosition: `${normalized.swatchCrop.x}% ${normalized.swatchCrop.y}%`,
    backgroundSize: `${normalized.swatchCrop.zoom * 100}%`,
    backgroundRepeat: 'no-repeat',
  };
}
