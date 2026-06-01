import { Metadata } from 'next';
import { getAbsoluteUrl } from '@/lib/seo/config';
import { siteConfig, siteLocale } from '@/config/site';

export const metadata: Metadata = {
  title: `Shipping - ${siteConfig.displayName}`,
  description: 'Shipping policy template for the storefront.',
  openGraph: {
    title: `Shipping - ${siteConfig.displayName}`,
    description: 'Shipping policy template for the storefront.',
    type: 'website',
    locale: siteLocale.ogLocale,
    siteName: siteConfig.displayName,
  },
  twitter: {
    card: 'summary',
    title: `Shipping - ${siteConfig.displayName}`,
    description: 'Shipping policy template for the storefront.',
  },
  alternates: {
    canonical: getAbsoluteUrl('/shipping'),
  },
};

const shippingItems = [
  [
    'Shipping methods',
    'List your carriers, pickup options, delivery zones, and any marketplace-specific fulfillment rules.',
  ],
  [
    'Processing time',
    'Define how long it usually takes to pack and hand off an order after payment is confirmed.',
  ],
  [
    'Costs',
    'Explain shipping rates, free shipping thresholds, taxes, duties, and regional surcharges.',
  ],
  [
    'Tracking',
    'Tell customers where tracking numbers appear and how shipment notifications are sent.',
  ],
];

export default function ShippingPage() {
  return (
    <main className="min-h-screen bg-slate-50 pt-24 pb-16 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-slate-950 dark:text-white">
          Shipping
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
          Replace this template with your actual fulfillment policy before
          launch.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {shippingItems.map(([title, body]) => (
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
