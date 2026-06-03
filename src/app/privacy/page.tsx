import { Metadata } from 'next';
import { getAbsoluteUrl } from '@/lib/seo/config';
import { siteConfig, siteLocale } from '@/config/site';

export const metadata: Metadata = {
  title: `Privacy - ${siteConfig.displayName}`,
  description: 'A neutral privacy policy template for the storefront.',
  openGraph: {
    title: `Privacy - ${siteConfig.displayName}`,
    description: 'A neutral privacy policy template for the storefront.',
    type: 'website',
    locale: siteLocale.ogLocale,
    siteName: siteConfig.displayName,
  },
  twitter: {
    card: 'summary',
    title: `Privacy - ${siteConfig.displayName}`,
    description: 'A neutral privacy policy template for the storefront.',
  },
  alternates: {
    canonical: getAbsoluteUrl('/privacy'),
  },
};

const sections = [
  [
    'Information we collect',
    'Storefronts commonly collect account details, contact information, shipping details, cart contents, order history, and payment provider references.',
  ],
  [
    'How information is used',
    'Use customer information to process orders, provide support, prevent fraud, maintain security, and improve the shopping experience.',
  ],
  [
    'Service providers',
    'Document your payment processors, hosting providers, analytics tools, email providers, and fulfillment partners before launch.',
  ],
  [
    'Customer rights',
    'Explain how customers can request access, correction, deletion, or export of their personal information.',
  ],
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 pt-24 pb-16 dark:bg-slate-950">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <h1 className="text-4xl font-bold text-slate-950 dark:text-white">
          Privacy policy
        </h1>
        <p className="mt-4 text-lg leading-8 text-slate-600 dark:text-slate-300">
          This placeholder policy should be reviewed by counsel and updated for
          your data practices, region, vendors, and retention requirements.
        </p>

        <div className="mt-8 space-y-4">
          {sections.map(([title, body]) => (
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
