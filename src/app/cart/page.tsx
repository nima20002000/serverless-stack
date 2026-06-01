import { Metadata } from 'next';
import CartPageClient from '@/components/cart/CartPageClient';
import { siteLocale } from '@/config/site';

export const metadata: Metadata = {
  title: 'سبد خرید - کیتیا',
  description:
    'مشاهده و مدیریت سبد خرید شما. بررسی محصولات، تغییر تعداد، حذف کالا و ادامه فرآیند خرید در کیتیا.',
  openGraph: {
    title: 'سبد خرید - کیتیا',
    description: 'مشاهده و مدیریت سبد خرید شما در فروشگاه کیتیا',
    type: 'website',
    locale: siteLocale.ogLocale,
    siteName: 'کیتیا',
  },
  twitter: {
    card: 'summary',
    title: 'سبد خرید - کیتیا',
    description: 'مشاهده و مدیریت سبد خرید شما',
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function CartPage() {
  return <CartPageClient />;
}
