import { Metadata } from 'next';
import { WishlistPage } from '@/components/wishlist/WishlistPage';
import { siteLocale } from '@/config/site';

export const metadata: Metadata = {
  title: 'علاقه‌مندی‌ها - کیتیا',
  description:
    'مشاهده و مدیریت لیست علاقه‌مندی‌های شما. محصولات مورد علاقه خود را ذخیره کنید و هر زمان به سبد خرید اضافه کنید.',
  openGraph: {
    title: 'علاقه‌مندی‌ها - کیتیا',
    description: 'لیست محصولات مورد علاقه شما در فروشگاه کیتیا',
    type: 'website',
    locale: siteLocale.ogLocale,
    siteName: 'کیتیا',
  },
  twitter: {
    card: 'summary',
    title: 'علاقه‌مندی‌ها - کیتیا',
    description: 'لیست محصولات مورد علاقه شما',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function WishlistPageRoute() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/60 to-white py-8">
      <div className="max-w-6xl mx-auto px-4">
        <WishlistPage />
      </div>
    </div>
  );
}
