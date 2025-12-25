/**
 * Client-Safe Cloudflare Image Optimization Utilities
 *
 * This is a lightweight version that can be safely imported in client components.
 * Does not depend on any Node.js modules.
 */

export type ImageFormat = 'auto' | 'webp' | 'avif' | 'json' | 'jpeg' | 'png';
export type ImageFit = 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
export type ImageGravity =
  | 'auto'
  | 'left'
  | 'right'
  | 'top'
  | 'bottom'
  | 'center';

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  dpr?: 1 | 2 | 3;
  format?: ImageFormat;
  quality?: number;
  fit?: ImageFit;
  gravity?: ImageGravity;
  blur?: number;
  sharpen?: number;
  background?: string;
}

export const IMAGE_VARIANTS = {
  thumbnail: {
    width: 400,
    height: 500,
    format: 'auto' as ImageFormat,
    quality: 95,
    fit: 'cover' as ImageFit,
    gravity: 'center' as ImageGravity,
  },
  medium: {
    width: 800,
    height: 1000,
    format: 'auto' as ImageFormat,
    quality: 95,
    fit: 'scale-down' as ImageFit,
  },
  large: {
    width: 1200,
    height: 1500,
    format: 'auto' as ImageFormat,
    quality: 95,
    fit: 'scale-down' as ImageFit,
  },
  cartItem: {
    width: 100,
    height: 100,
    format: 'auto' as ImageFormat,
    quality: 90,
    fit: 'cover' as ImageFit,
    gravity: 'center' as ImageGravity,
  },
  categoryCard: {
    width: 300,
    height: 300,
    format: 'auto' as ImageFormat,
    quality: 95,
    fit: 'cover' as ImageFit,
    gravity: 'center' as ImageGravity,
  },
  adminThumb: {
    width: 150,
    height: 150,
    format: 'auto' as ImageFormat,
    quality: 85,
    fit: 'cover' as ImageFit,
    gravity: 'center' as ImageGravity,
  },
} as const;

export function getOptimizedImageUrl(
  imageUrl: string,
  options: ImageTransformOptions = {}
): string {
  if (!imageUrl || !imageUrl.startsWith('http')) {
    return imageUrl;
  }

  // Check if Cloudflare Image Resizing is enabled via environment variable
  // This allows graceful fallback if the feature is not enabled in Cloudflare dashboard
  const isEnabled =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGE_RESIZING_ENABLED !== 'false'
      : true;

  if (!isEnabled) {
    // Fallback: return original URL without optimization
    return imageUrl;
  }

  const params: string[] = [];

  if (options.width) params.push(`width=${options.width}`);
  if (options.height) params.push(`height=${options.height}`);
  if (options.dpr) params.push(`dpr=${options.dpr}`);
  if (options.format) params.push(`format=${options.format}`);
  if (options.quality) params.push(`quality=${options.quality}`);
  if (options.fit) params.push(`fit=${options.fit}`);
  if (options.gravity) params.push(`gravity=${options.gravity}`);
  if (options.blur) params.push(`blur=${options.blur}`);
  if (options.sharpen) params.push(`sharpen=${options.sharpen}`);
  if (options.background) params.push(`background=${options.background}`);

  if (params.length === 0) {
    return imageUrl;
  }

  const url = new URL(imageUrl);
  const transformParams = params.join(',');

  return `${url.origin}/cdn-cgi/image/${transformParams}${url.pathname}${url.search}`;
}

export function getResponsiveSrcSet(
  imageUrl: string,
  sizes: number[],
  options: Omit<ImageTransformOptions, 'width'> = {}
): string {
  return sizes
    .map((size) => {
      const url = getOptimizedImageUrl(imageUrl, {
        ...options,
        width: size,
      });
      return `${url} ${size}w`;
    })
    .join(', ');
}

export const optimizeImage = {
  thumbnail: (url: string) =>
    getOptimizedImageUrl(url, IMAGE_VARIANTS.thumbnail),
  medium: (url: string) => getOptimizedImageUrl(url, IMAGE_VARIANTS.medium),
  large: (url: string) => getOptimizedImageUrl(url, IMAGE_VARIANTS.large),
  cartItem: (url: string) => getOptimizedImageUrl(url, IMAGE_VARIANTS.cartItem),
  categoryCard: (url: string) =>
    getOptimizedImageUrl(url, IMAGE_VARIANTS.categoryCard),
  adminThumb: (url: string) =>
    getOptimizedImageUrl(url, IMAGE_VARIANTS.adminThumb),
};
