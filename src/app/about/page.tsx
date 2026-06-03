import { Metadata } from 'next';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og-images';
import { getAbsoluteUrl } from '@/lib/seo/config';
import { siteConfig, siteLocale } from '@/config/site';

export const metadata: Metadata = {
  title: `About - ${siteConfig.displayName}`,
  description:
    'Learn how this commerce boilerplate structures a reusable public storefront.',
  openGraph: {
    title: `About - ${siteConfig.displayName}`,
    description:
      'A neutral commerce boilerplate for building Supabase and Vercel storefronts.',
    type: 'website',
    locale: siteLocale.ogLocale,
    siteName: siteConfig.displayName,
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: `${siteConfig.displayName} about page`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `About - ${siteConfig.displayName}`,
    description:
      'A neutral commerce boilerplate for building Supabase and Vercel storefronts.',
    images: [DEFAULT_OG_IMAGE],
  },
  alternates: {
    canonical: getAbsoluteUrl('/about'),
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-slate-50 pt-24 pb-16 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
            About
          </p>
          <h1 className="mt-3 text-4xl font-bold text-slate-950 dark:text-white">
            A neutral storefront foundation.
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
            This project is intended as a reusable starting point for commerce
            teams that want Supabase data, Vercel deployment, and modern payment
            providers without brand-specific assumptions.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            [
              'Reusable',
              'Swap in your products, categories, policy copy, and visual assets.',
            ],
            [
              'Operational',
              'Keep catalog, cart, wishlist, and checkout flows wired from day one.',
            ],
            [
              'Configurable',
              'Use environment settings for name, locale, direction, and currency.',
            ],
          ].map(([title, body]) => (
            <section
              key={title}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                {title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
