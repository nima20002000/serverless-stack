import { Metadata } from 'next';
import { WishlistPage } from '@/components/wishlist/WishlistPage';
import { siteConfig, siteLocale } from '@/config/site';

export const metadata: Metadata = {
  title: `Wishlist - ${siteConfig.displayName}`,
  description: 'Save products for later and move them into your cart.',
  openGraph: {
    title: `Wishlist - ${siteConfig.displayName}`,
    description: 'Save products for later and move them into your cart.',
    type: 'website',
    locale: siteLocale.ogLocale,
    siteName: siteConfig.displayName,
  },
  twitter: {
    card: 'summary',
    title: `Wishlist - ${siteConfig.displayName}`,
    description: 'Save products for later.',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function WishlistPageRoute() {
  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-10 dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4">
        <WishlistPage />
      </div>
    </div>
  );
}
