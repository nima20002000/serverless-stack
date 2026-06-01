import { Metadata } from 'next';
import { getAbsoluteUrl } from '@/lib/seo/config';
import { siteConfig, siteLocale } from '@/config/site';

export const metadata: Metadata = {
  title: `Terms - ${siteConfig.displayName}`,
  description: 'Neutral terms of service template for the storefront.',
  openGraph: {
    title: `Terms - ${siteConfig.displayName}`,
    description: 'Neutral terms of service template for the storefront.',
    type: 'website',
    locale: siteLocale.ogLocale,
    siteName: siteConfig.displayName,
  },
  twitter: {
    card: 'summary',
    title: `Terms - ${siteConfig.displayName}`,
    description: 'Neutral terms of service template for the storefront.',
  },
  alternates: {
    canonical: getAbsoluteUrl('/terms'),
  },
};

const terms = [
  [
    'Use of the storefront',
    'Customers may browse products, create accounts, place orders, and manage carts according to your published policies.',
  ],
  [
    'Orders and payment',
    'Orders are confirmed only after successful payment authorization or capture through the configured payment provider.',
  ],
  [
    'Product information',
    'Product prices, inventory, images, and descriptions should be kept current, but may change without notice.',
  ],
  [
    'Limitation of liability',
    'Replace this placeholder with terms appropriate for your business, market, and legal requirements.',
  ],
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 pt-24 pb-16 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-slate-950 dark:text-white">
          Terms of service
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
          These boilerplate terms are placeholders. Review and replace them
          before accepting real customer orders.
        </p>

        <div className="mt-8 space-y-4">
          {terms.map(([title, body]) => (
            <section
              key={title}
              className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">
                {title}
              </h2>
              <p className="mt-3 leading-7 text-slate-600 dark:text-slate-400">
                {body}
              </p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
