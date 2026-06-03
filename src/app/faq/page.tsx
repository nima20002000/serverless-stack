import { Metadata } from 'next';
import FAQList from '@/components/faq/FAQList';
import { getAbsoluteUrl } from '@/lib/seo/config';
import { siteConfig, siteLocale } from '@/config/site';

export const metadata: Metadata = {
  title: `FAQ - ${siteConfig.displayName}`,
  description:
    'Answers to common storefront, shipping, payment, and return questions.',
  openGraph: {
    title: `FAQ - ${siteConfig.displayName}`,
    description:
      'Answers to common storefront, shipping, payment, and return questions.',
    type: 'website',
    locale: siteLocale.ogLocale,
    siteName: siteConfig.displayName,
  },
  twitter: {
    card: 'summary',
    title: `FAQ - ${siteConfig.displayName}`,
    description: 'Answers to common storefront questions.',
  },
  alternates: {
    canonical: getAbsoluteUrl('/faq'),
  },
};

export default function FAQPage() {
  return <FAQList />;
}
