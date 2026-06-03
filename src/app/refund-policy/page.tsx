import { Metadata } from 'next';
import { getAbsoluteUrl } from '@/lib/seo/config';
import { siteConfig, siteLocale } from '@/config/site';

export const metadata: Metadata = {
  title: `Returns - ${siteConfig.displayName}`,
  description: 'Return and refund policy template for the storefront.',
  openGraph: {
    title: `Returns - ${siteConfig.displayName}`,
    description: 'Return and refund policy template for the storefront.',
    type: 'website',
    locale: siteLocale.ogLocale,
    siteName: siteConfig.displayName,
  },
  twitter: {
    card: 'summary',
    title: `Returns - ${siteConfig.displayName}`,
    description: 'Return and refund policy template for the storefront.',
  },
  alternates: {
    canonical: getAbsoluteUrl('/refund-policy'),
  },
};

const returnItems = [
  [
    'Eligibility',
    'State which products can be returned, in what condition, and within which time window.',
  ],
  [
    'Process',
    'Explain how customers start a return and what information your team needs.',
  ],
  [
    'Refund timing',
    'Document when refunds are issued after inspection and which payment method is credited.',
  ],
  [
    'Exceptions',
    'List final sale items, hygiene restrictions, digital goods, or custom product exclusions.',
  ],
];

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 pt-24 pb-16 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-slate-950 dark:text-white">
          Returns and refunds
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
          This placeholder policy keeps the storefront public-safe while giving
          implementers clear sections to customize.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {returnItems.map(([title, body]) => (
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
