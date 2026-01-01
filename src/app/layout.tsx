import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { VersionProvider } from '@/components/providers/VersionProvider';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import InstallmentBanner from '@/components/layout/InstallmentBanner';
import AdminThemeGate from '@/components/layout/AdminThemeGate';
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  renderJsonLd,
} from '@/lib/seo/structured-data';

export const metadata: Metadata = {
  title: 'Kitia - فروشگاه آنلاین',
  description: 'پلتفرم خرید آنلاین کیتیا',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Generate site-wide JSON-LD structured data
  const organizationSchema = generateOrganizationSchema();
  const webSiteSchema = generateWebSiteSchema();

  return (
    <html lang="fa" dir="rtl">
      <head>
        {/* Preconnect to CDN for faster resource loading */}
        <link rel="preconnect" href="https://cdn.kitia.ir" />
        <link rel="dns-prefetch" href="https://cdn.kitia.ir" />
        {/* Preconnect to Zarinpal for payment gateway */}
        <link rel="preconnect" href="https://cdn.zarinpal.com" />
        <link rel="dns-prefetch" href="https://cdn.zarinpal.com" />
        {/* Preload critical font for faster LCP */}
        <link
          rel="preload"
          href="/fonts/BYekan.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        {/* Preload hero image for LCP optimization */}
        <link
          rel="preload"
          href="https://cdn.kitia.ir/cdn-cgi/image/width=640,height=640,format=auto,quality=85,fit=cover/media-library/images/2uvp4v-1764882490100.jpg"
          as="image"
          fetchPriority="high"
        />
        {/* Organization JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: renderJsonLd(organizationSchema) }}
        />
        {/* WebSite JSON-LD structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: renderJsonLd(webSiteSchema) }}
        />
      </head>
      <body className="antialiased flex flex-col min-h-screen">
        <SessionProvider>
          <VersionProvider>
            <AdminThemeGate />
            <InstallmentBanner />
            <Header />
            {children}
            <Footer />
          </VersionProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
