import { Metadata } from 'next';
import FAQList from '@/components/faq/FAQList';
import { DEFAULT_OG_IMAGE } from '@/lib/seo/og-images';
import { getAbsoluteUrl } from '@/lib/seo/config';

export const metadata: Metadata = {
  title: "سوالات متداول - کیتیا",
  description: "پاسخ سوالات رایج درباره خرید، ارسال، پرداخت، مرجوعی و خدمات کیتیا. راهنمای کامل برای خرید لیوان سفری و ماگ.",
  openGraph: {
    title: "سوالات متداول - کیتیا",
    description: "پاسخ به سوالات رایج درباره خرید، ارسال، پرداخت و مرجوعی در کیتیا",
    type: "website",
    locale: "fa_IR",
    siteName: "کیتیا",
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "کیتیا - فروشگاه آنلاین",
      }
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "سوالات متداول - کیتیا",
    description: "پاسخ سوالات رایج درباره خرید و خدمات کیتیا",
    images: [DEFAULT_OG_IMAGE],
  },
  alternates: {
    canonical: getAbsoluteUrl('/faq'),
  },
};

export default function FAQPage() {
  return <FAQList />;
}
