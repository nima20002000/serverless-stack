import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { VersionProvider } from '@/components/providers/VersionProvider';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import AdminThemeGate from '@/components/layout/AdminThemeGate';
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  renderJsonLd,
} from '@/lib/seo/structured-data';
import ToastContainer from '@/components/ui-v4/Toast';
import { siteConfig } from '@/config/site';

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
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
    <html lang={siteConfig.language} dir={siteConfig.direction}>
      <head>
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
            <ToastContainer />
            <Header />
            {children}
            <Footer />
          </VersionProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
