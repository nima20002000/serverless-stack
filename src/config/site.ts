export type SiteDirection = 'ltr' | 'rtl';

function getDirection(value: string | undefined): SiteDirection {
  return value === 'rtl' ? 'rtl' : 'ltr';
}

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Supabase Vercel Stack',
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    'Open-source commerce boilerplate for Supabase and Vercel.',
  language: process.env.NEXT_PUBLIC_SITE_LANGUAGE || 'en',
  direction: getDirection(process.env.NEXT_PUBLIC_SITE_DIRECTION),
  locale: process.env.NEXT_PUBLIC_SITE_LOCALE || 'en-US',
  currency: (process.env.NEXT_PUBLIC_SITE_CURRENCY || 'USD').toUpperCase(),
  displayName:
    process.env.NEXT_PUBLIC_SITE_DISPLAY_NAME || 'Supabase Vercel Stack',
  timeZone: process.env.NEXT_PUBLIC_SITE_TIME_ZONE,
};

export const siteLocale = {
  language: siteConfig.language,
  direction: siteConfig.direction,
  locale: siteConfig.locale,
  ogLocale: siteConfig.locale.replace('-', '_'),
  currency: siteConfig.currency,
  timeZone: siteConfig.timeZone,
};

export type SiteConfig = typeof siteConfig;
