/**
 * SEO Configuration
 * Central configuration for SEO-related constants and utilities
 */

/**
 * Get the base URL for the application
 * Uses environment variables with fallback to production URL
 */
export function getBaseUrl(): string {
  // Check if we're on the server side
  if (typeof window === 'undefined') {
    // Server-side: use environment variable or production URL

    // Vercel automatically sets VERCEL_URL for production/preview deployments
    // Use it if available and not localhost
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl && !vercelUrl.includes('localhost')) {
      return `https://${vercelUrl}`;
    }

    // Use NEXT_PUBLIC_APP_URL if set and not localhost
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && !appUrl.includes('localhost')) {
      return appUrl;
    }

    // Fallback to production URL (for sitemap generation in production)
    return 'https://kitia.ir';
  }

  // Client-side: use window.location.origin
  return window.location.origin;
}

/**
 * Construct absolute URL from path
 * @param path - Relative or absolute path
 * @returns Absolute URL
 */
export function getAbsoluteUrl(path: string): string {
  const baseUrl = getBaseUrl();

  // If path is already absolute, return it
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${cleanPath}`;
}

/**
 * Site metadata constants
 */
export const SITE_CONFIG = {
  name: 'کیتیا',
  locale: 'fa_IR',
  defaultTitle: 'کیتیا - فروشگاه آنلاین لیوان سفری و ماگ',
  defaultDescription: 'خرید بهترین لیوان‌های سفری و ماگ‌های باکیفیت. ارسال سریع به سراسر کشور، کمک به گربه‌های خیابانی با هر خرید.',
} as const;
