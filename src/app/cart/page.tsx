import { Metadata } from 'next';
import CartPageClient from '@/components/cart/CartPageClient';
import { siteConfig, siteLocale } from '@/config/site';

export const metadata: Metadata = {
  title: `Cart - ${siteConfig.displayName}`,
  description: 'Review and manage the products in your shopping cart.',
  openGraph: {
    title: `Cart - ${siteConfig.displayName}`,
    description: 'Review and manage the products in your shopping cart.',
    type: 'website',
    locale: siteLocale.ogLocale,
    siteName: siteConfig.displayName,
  },
  twitter: {
    card: 'summary',
    title: `Cart - ${siteConfig.displayName}`,
    description: 'Review and manage your cart.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function CartPage() {
  return <CartPageClient />;
}
