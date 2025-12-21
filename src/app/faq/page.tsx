import { Metadata } from 'next';
import FAQList from '@/components/faq/FAQList';

export const metadata: Metadata = {
  title: "سوالات متداول - کیتیا",
  description: "پاسخ سوالات رایج درباره خرید، ارسال، پرداخت، مرجوعی و خدمات کیتیا. راهنمای کامل برای خرید لیوان سفری و ماگ.",
  openGraph: {
    title: "سوالات متداول - کیتیا",
    description: "پاسخ به سوالات رایج درباره خرید، ارسال، پرداخت و مرجوعی در کیتیا",
    type: "website",
    locale: "fa_IR",
    siteName: "کیتیا",
  },
  twitter: {
    card: "summary",
    title: "سوالات متداول - کیتیا",
    description: "پاسخ سوالات رایج درباره خرید و خدمات کیتیا",
  },
};

export default function FAQPage() {
  return <FAQList />;
}
