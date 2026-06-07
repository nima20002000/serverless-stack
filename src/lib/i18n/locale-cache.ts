import { isSupportedLocale, type Locale } from './config';
import { normalizeLocaleTag } from './routing';

export function normalizeLocaleForDataFetch(
  value: string | null | undefined
): Locale | null {
  const normalized = normalizeLocaleTag(value);
  return isSupportedLocale(normalized) ? normalized : null;
}

export function getLocaleCacheBucket(value: string | null | undefined): string {
  return normalizeLocaleForDataFetch(value) || 'default';
}
