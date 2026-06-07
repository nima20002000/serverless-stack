import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  defaultLocale,
  getLocaleDirection,
  isSupportedLocale,
  localeHeaderName,
  localePathnameHeaderName,
  localeSearchHeaderName,
  type Locale,
} from './config';
import { getDictionary } from './dictionaries';
import { createTranslator } from './translate';
import { getLanguageSettings } from '@/services/localization-service';
import { resolveRequestedLocale } from '@/lib/i18n/localized-content';
import { replacePathLocale } from '@/lib/i18n/routing';

export async function getRequestLocale(): Promise<Locale> {
  const requestHeaders = await headers();
  const locale = requestHeaders.get(localeHeaderName);
  return isSupportedLocale(locale) ? locale : defaultLocale;
}

export async function getServerI18n() {
  const requestHeaders = await headers();
  const requestedLocale = await getRequestLocale();
  const languages = await getLanguageSettings();
  const locale = resolveRequestedLocale(requestedLocale, languages);

  if (requestedLocale !== locale) {
    const pathname = requestHeaders.get(localePathnameHeaderName) || '/';
    const search = requestHeaders.get(localeSearchHeaderName) || '';
    redirect(`${replacePathLocale(pathname, locale)}${search}`);
  }

  const enabledLanguages = languages.filter((language) => language.isEnabled);
  const messages = getDictionary(locale);
  return {
    locale,
    direction: getLocaleDirection(locale),
    languages: enabledLanguages,
    messages,
    t: createTranslator(messages),
  };
}
