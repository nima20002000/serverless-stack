import { MetadataRoute } from 'next';

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
    sitemap: 'https://kitia.ir/sitemap.xml',
  };
}
