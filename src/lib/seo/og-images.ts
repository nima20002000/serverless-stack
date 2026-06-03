import { getAbsoluteUrl } from './config';

/**
 * Default Open Graph image for social sharing
 */
export const DEFAULT_OG_IMAGE = getAbsoluteUrl('/images/og-default.png');

/**
 * Get optimized product image URL for Open Graph
 * @param imageUrl - Product image URL
 * @returns Optimized image URL (1200x630)
 */
export function getProductOgImage(imageUrl: string): string {
  const mediaOrigin = process.env.R2_PUBLIC_URL;
  const imageResizingEnabled =
    process.env.NEXT_PUBLIC_CLOUDFLARE_IMAGE_RESIZING_ENABLED === 'true';

  if (mediaOrigin && imageResizingEnabled && imageUrl.startsWith(mediaOrigin)) {
    const url = new URL(imageUrl);
    return `${url.origin}/cdn-cgi/image/width=1200,height=630,format=auto,quality=85,fit=cover,gravity=center${url.pathname}${url.search}`;
  }

  return imageUrl;
}
