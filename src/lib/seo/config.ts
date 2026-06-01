/**
 * SEO Configuration
 * Central configuration for SEO-related constants and utilities
 */
import { siteConfig, siteLocale } from '@/config/site';

/**
 * Get the base URL for the application
 * Uses environment variables with fallback to production URL
 */
export function getBaseUrl(): string {
  // Check if we're on the server side
  if (typeof window === 'undefined') {
    // Server-side: use environment variable or production URL

    // Priority 1: Use NEXT_PUBLIC_SITE_URL if set (allows dynamic configuration in Vercel)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl) {
      return siteUrl;
    }

    // Priority 2: Use NEXT_PUBLIC_APP_URL when configured.
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (
      appUrl &&
      (process.env.VERCEL_ENV !== 'production' || !appUrl.includes('localhost'))
    ) {
      return appUrl;
    }

    // Priority 3: Use VERCEL_URL for preview or production deployments.
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl && !vercelUrl.includes('localhost')) {
      return `https://${vercelUrl}`;
    }

    // Fallback for local development.
    return 'http://localhost:3000';
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
  name: siteConfig.name,
  locale: siteLocale.ogLocale,
  defaultTitle: siteConfig.name,
  defaultDescription: siteConfig.description,
} as const;
