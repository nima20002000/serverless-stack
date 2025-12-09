/**
 * Cloudflare Image Resizing Utilities
 *
 * Free tier: 5,000 unique transformations/month
 * Additional: $0.50 per 1,000 transformations
 *
 * Documentation: https://developers.cloudflare.com/images/transform-images/
 */

export type ImageFormat = 'auto' | 'webp' | 'avif' | 'json' | 'jpeg' | 'png';
export type ImageFit = 'scale-down' | 'contain' | 'cover' | 'crop' | 'pad';
export type ImageGravity = 'auto' | 'left' | 'right' | 'top' | 'bottom' | 'center';

export interface ImageTransformOptions {
  /**
   * Width in pixels (1-12000)
   */
  width?: number;

  /**
   * Height in pixels (1-12000)
   */
  height?: number;

  /**
   * Device Pixel Ratio (1-3)
   * Multiplies dimensions for retina displays
   */
  dpr?: 1 | 2 | 3;

  /**
   * Output format
   * 'auto' = WebP for supported browsers, fallback to original
   */
  format?: ImageFormat;

  /**
   * Quality (1-100)
   * Default: 85 for lossy formats
   */
  quality?: number;

  /**
   * Fit mode - how image is resized
   * - scale-down: Similar to contain, but never upscales
   * - contain: Preserve aspect ratio, fit within dimensions
   * - cover: Preserve aspect ratio, fill dimensions (may crop)
   * - crop: Cut out exact dimensions from image
   * - pad: Resize and add padding to match dimensions
   */
  fit?: ImageFit;

  /**
   * Focus area for cropping
   * 'auto' uses smart detection (faces, salient features)
   */
  gravity?: ImageGravity;

  /**
   * Blur (1-250)
   * Higher = more blur
   */
  blur?: number;

  /**
   * Sharpen (0-10)
   * Higher = more sharpening
   */
  sharpen?: number;

  /**
   * Background color for 'pad' fit mode
   * Hex color without # (e.g., 'ffffff' for white)
   */
  background?: string;
}

/**
 * Predefined image variants for common use cases
 */
export const IMAGE_VARIANTS = {
  /**
   * Small thumbnail - product cards, category icons
   * 400x500 (4:5 aspect ratio), WebP, optimized quality
   */
  thumbnail: {
    width: 400,
    height: 500,
    format: 'auto' as ImageFormat,
    quality: 80,
    fit: 'cover' as ImageFit,
    gravity: 'auto' as ImageGravity,
  },

  /**
   * Medium size - product detail page, lightbox preview
   * 800x1000 (4:5 aspect ratio), WebP, high quality
   */
  medium: {
    width: 800,
    height: 1000,
    format: 'auto' as ImageFormat,
    quality: 85,
    fit: 'scale-down' as ImageFit,
  },

  /**
   * Large size - full screen view, zoom
   * 1200x1500 (4:5 aspect ratio), WebP, high quality
   */
  large: {
    width: 1200,
    height: 1500,
    format: 'auto' as ImageFormat,
    quality: 90,
    fit: 'scale-down' as ImageFit,
  },

  /**
   * Cart item - small square preview
   * 100x100, WebP, optimized
   */
  cartItem: {
    width: 100,
    height: 100,
    format: 'auto' as ImageFormat,
    quality: 75,
    fit: 'cover' as ImageFit,
    gravity: 'auto' as ImageGravity,
  },

  /**
   * Category card - medium square
   * 300x300, WebP, optimized
   */
  categoryCard: {
    width: 300,
    height: 300,
    format: 'auto' as ImageFormat,
    quality: 80,
    fit: 'cover' as ImageFit,
    gravity: 'center' as ImageGravity,
  },

  /**
   * Admin thumbnail - small preview
   * 150x150, WebP, lower quality for fast loading
   */
  adminThumb: {
    width: 150,
    height: 150,
    format: 'auto' as ImageFormat,
    quality: 70,
    fit: 'cover' as ImageFit,
  },
} as const;

/**
 * Build Cloudflare Image Resizing URL
 *
 * @param imageUrl - Original image URL (can be from any accessible source, including R2)
 * @param options - Transformation options
 * @returns Cloudflare-optimized image URL
 *
 * @example
 * ```typescript
 * // Using predefined variant
 * const thumbUrl = getOptimizedImageUrl(originalUrl, IMAGE_VARIANTS.thumbnail);
 *
 * // Custom transformation
 * const customUrl = getOptimizedImageUrl(originalUrl, {
 *   width: 600,
 *   format: 'webp',
 *   quality: 85
 * });
 * ```
 */
export function getOptimizedImageUrl(
  imageUrl: string,
  options: ImageTransformOptions = {}
): string {
  // If URL is empty or not a valid URL, return as-is
  if (!imageUrl || !imageUrl.startsWith('http')) {
    return imageUrl;
  }

  // Build transformation parameters
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

  // If no transformations specified, return original URL
  if (params.length === 0) {
    return imageUrl;
  }

  // Parse the original URL to extract the domain and path
  const url = new URL(imageUrl);

  // Build Cloudflare Image Resizing URL
  // Format: https://domain.com/cdn-cgi/image/[options]/[original-path]
  const transformParams = params.join(',');

  // Construct the optimized URL
  // The CDN-CGI endpoint works on the same domain as the image
  return `${url.origin}/cdn-cgi/image/${transformParams}${url.pathname}${url.search}`;
}

/**
 * Generate responsive srcset for Next.js Image component
 * Creates multiple sizes for different screen densities
 *
 * @param imageUrl - Original image URL
 * @param sizes - Array of widths to generate
 * @param options - Base transformation options
 * @returns srcset string
 *
 * @example
 * ```typescript
 * const srcset = getResponsiveSrcSet(imageUrl, [400, 800, 1200], {
 *   format: 'auto',
 *   quality: 85,
 *   fit: 'cover'
 * });
 * // Returns: "url?w=400 400w, url?w=800 800w, url?w=1200 1200w"
 * ```
 */
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

/**
 * Helper to get optimized image with common variants
 */
export const optimizeImage = {
  thumbnail: (url: string) => getOptimizedImageUrl(url, IMAGE_VARIANTS.thumbnail),
  medium: (url: string) => getOptimizedImageUrl(url, IMAGE_VARIANTS.medium),
  large: (url: string) => getOptimizedImageUrl(url, IMAGE_VARIANTS.large),
  cartItem: (url: string) => getOptimizedImageUrl(url, IMAGE_VARIANTS.cartItem),
  categoryCard: (url: string) => getOptimizedImageUrl(url, IMAGE_VARIANTS.categoryCard),
  adminThumb: (url: string) => getOptimizedImageUrl(url, IMAGE_VARIANTS.adminThumb),
};
