/**
 * Default Open Graph image for social sharing
 * Using hero image optimized for Open Graph (1200x630)
 */
export const DEFAULT_OG_IMAGE = "https://cdn.kitia.ir/cdn-cgi/image/width=1200,height=630,format=auto,quality=85,fit=cover,gravity=center/hero-section-image/hero%20section.jpg";

/**
 * Get optimized product image URL for Open Graph
 * @param imageUrl - Product image URL
 * @returns Optimized image URL (1200x630)
 */
export function getProductOgImage(imageUrl: string): string {
  // If it's already a CDN URL, optimize it for OG
  if (imageUrl.startsWith('https://cdn.kitia.ir')) {
    return `https://cdn.kitia.ir/cdn-cgi/image/width=1200,height=630,format=auto,quality=85,fit=cover,gravity=center/${imageUrl.split('cdn.kitia.ir/')[1]}`;
  }

  // Return as-is if not from CDN
  return imageUrl;
}
