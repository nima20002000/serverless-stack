import { headers } from 'next/headers';
import {
  defaultLocale,
  getLocaleDirection,
  isSupportedLocale,
  localeHeaderName,
  type Locale,
} from './config';
import { getDictionary } from './dictionaries';
import { createTranslator } from './translate';

export async function getRequestLocale(): Promise<Locale> {
  const requestHeaders = await headers();
  const locale = requestHeaders.get(localeHeaderName);
  return isSupportedLocale(locale) ? locale : defaultLocale;
}

export async function getServerI18n() {
  const locale = await getRequestLocale();
  const messages = getDictionary(locale);
  return {
    locale,
    direction: getLocaleDirection(locale),
    messages,
    t: createTranslator(messages),
  };
}
