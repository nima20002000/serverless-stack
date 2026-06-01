import { Metadata } from 'next';
import { getAbsoluteUrl } from '@/lib/seo/config';
import { siteConfig, siteLocale } from '@/config/site';

export const metadata: Metadata = {
  title: `Contact - ${siteConfig.displayName}`,
  description: 'Contact and support information for the storefront.',
  openGraph: {
    title: `Contact - ${siteConfig.displayName}`,
    description: 'Contact and support information for the storefront.',
    type: 'website',
    locale: siteLocale.ogLocale,
    siteName: siteConfig.displayName,
  },
  twitter: {
    card: 'summary',
    title: `Contact - ${siteConfig.displayName}`,
    description: 'Contact and support information for the storefront.',
  },
  alternates: {
    canonical: getAbsoluteUrl('/contact'),
  },
};

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-slate-50 pt-24 pb-16 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-slate-950 dark:text-white">
          Contact
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
          Replace this placeholder with your support email, help desk link,
          business address, or customer service hours before launching.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              Customer support
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Add a monitored support channel for order questions, product
              questions, and returns.
            </p>
          </section>
          <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              Order help
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Direct customers to account order history or your shipment
              tracking provider.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
