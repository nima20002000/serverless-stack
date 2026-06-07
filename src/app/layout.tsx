import type { Metadata } from 'next';
import './globals.css';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { VersionProvider } from '@/components/providers/VersionProvider';
import { I18nProvider } from '@/components/providers/I18nProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { ClientErrorReporter } from '@/components/providers/ClientErrorReporter';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import {
  generateOrganizationSchema,
  generateWebSiteSchema,
  renderJsonLd,
} from '@/lib/seo/structured-data';
import ToastContainer from '@/components/ui-v4/Toast';
import { siteConfig } from '@/config/site';
import { getBaseUrl } from '@/lib/seo/config';
import { getServerI18n } from '@/lib/i18n/server';
import { getThemeBootScript } from '@/lib/theme';

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: siteConfig.name,
  description: siteConfig.description,
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Generate site-wide JSON-LD structured data
  const organizationSchema = generateOrganizationSchema();
  const webSiteSchema = generateWebSiteSchema();
  const { locale, direction, messages } = await getServerI18n();

  return (
    <html lang={locale} dir={direction} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: getThemeBootScript() }}
          data-theme-boot
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
        <I18nProvider locale={locale} direction={direction} messages={messages}>
          <ThemeProvider>
            <SessionProvider>
              <VersionProvider>
                <ClientErrorReporter />
                <ToastContainer />
                <Header />
                {children}
                <Footer />
              </VersionProvider>
            </SessionProvider>
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
