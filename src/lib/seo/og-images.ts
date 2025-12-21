/**
 * Get CDN base URL from environment or fallback
 */
function getCdnUrl(): string {
  return process.env.R2_PUBLIC_URL || 'https://cdn.kitia.ir';
}

/**
 * Default Open Graph image for social sharing
 * Using hero image optimized for Open Graph (1200x630)
 */
export const DEFAULT_OG_IMAGE = `${getCdnUrl()}/cdn-cgi/image/width=1200,height=630,format=auto,quality=85,fit=cover,gravity=center/hero-section-image/hero%20section.jpg`;

/**
 * Get optimized product image URL for Open Graph
 * @param imageUrl - Product image URL
 * @returns Optimized image URL (1200x630)
 */
export function getProductOgImage(imageUrl: string): string {
  const cdnUrl = getCdnUrl();

  // If it's already a CDN URL, optimize it for OG
  if (imageUrl.startsWith(cdnUrl)) {
    const cdnDomain = new URL(cdnUrl).hostname;
    return `${cdnUrl}/cdn-cgi/image/width=1200,height=630,format=auto,quality=85,fit=cover,gravity=center/${imageUrl.split(cdnDomain + '/')[1]}`;
  }

  // Return as-is if not from CDN
  return imageUrl;
}
