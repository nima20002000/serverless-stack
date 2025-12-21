import { MetadataRoute } from 'next';
import { getAbsoluteUrl } from '@/lib/seo/config';

export const dynamic = 'force-dynamic';

/**
 * Generate robots.txt for search engine crawlers
 * Disallows admin, API, and profile routes while allowing public content
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/profile'],
      },
    ],
    sitemap: getAbsoluteUrl('/sitemap.xml'),
  };
}
