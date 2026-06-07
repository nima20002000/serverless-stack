export type SiteDirection = 'ltr' | 'rtl';
export type SiteCurrencyDisplay = 'symbol' | 'narrowSymbol' | 'code' | 'name';

function getDirection(value: string | undefined): SiteDirection {
  return value === 'rtl' ? 'rtl' : 'ltr';
}

function getCurrencyDisplay(value: string | undefined): SiteCurrencyDisplay {
  if (value === undefined || value === '') {
    return 'symbol';
  }

  if (
    value === 'symbol' ||
    value === 'narrowSymbol' ||
    value === 'code' ||
    value === 'name'
  ) {
    return value;
  }

  throw new Error(
    `Invalid NEXT_PUBLIC_SITE_CURRENCY_DISPLAY value: ${value}. Expected symbol, narrowSymbol, code, or name.`
  );
}

export const siteConfig = {
  name: process.env.NEXT_PUBLIC_SITE_NAME || 'Serverless Stack',
  description:
    process.env.NEXT_PUBLIC_SITE_DESCRIPTION ||
    'Open-source commerce boilerplate for Supabase and Vercel.',
  language: process.env.NEXT_PUBLIC_SITE_LANGUAGE || 'en',
  direction: getDirection(process.env.NEXT_PUBLIC_SITE_DIRECTION),
  locale: process.env.NEXT_PUBLIC_SITE_LOCALE || 'en-US',
  currency: (process.env.NEXT_PUBLIC_SITE_CURRENCY || 'USD').toUpperCase(),
  currencyDisplay: getCurrencyDisplay(
    process.env.NEXT_PUBLIC_SITE_CURRENCY_DISPLAY
  ),
  displayName: process.env.NEXT_PUBLIC_SITE_DISPLAY_NAME || 'Serverless Stack',
  timeZone: process.env.NEXT_PUBLIC_SITE_TIME_ZONE,
};

export const siteLocale = {
  language: siteConfig.language,
  direction: siteConfig.direction,
  locale: siteConfig.locale,
  ogLocale: siteConfig.locale.replace('-', '_'),
  currency: siteConfig.currency,
  currencyDisplay: siteConfig.currencyDisplay,
  timeZone: siteConfig.timeZone,
};

export type SiteConfig = typeof siteConfig;
