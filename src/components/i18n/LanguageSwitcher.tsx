'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useI18n, useTranslations } from '@/components/providers/I18nProvider';
import { type Locale } from '@/lib/i18n/config';
import { replacePathLocale } from '@/lib/i18n/routing';

function localizedHref(
  pathname: string,
  locale: Locale,
  search: string
): string {
  const nextPath = replacePathLocale(pathname || '/', locale);
  return search ? `${nextPath}?${search}` : nextPath;
}

export default function LanguageSwitcher() {
  const { locale, languages } = useI18n();
  const t = useTranslations();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();

  return (
    <div
      className="flex items-center gap-1"
      aria-label={t('nav.languageSwitcher')}
    >
      <span className="sr-only">{t('nav.language')}</span>
      {languages.map((language) => {
        const supportedLocale = language.code;
        const isActive = supportedLocale === locale;
        return (
          <a
            key={supportedLocale}
            href={localizedHref(pathname, supportedLocale, search)}
            hrefLang={supportedLocale}
            data-testid={`language-switcher-${supportedLocale}`}
            className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              isActive
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
            }`}
            aria-current={isActive ? 'true' : undefined}
          >
            {language.nativeLabel}
          </a>
        );
      })}
    </div>
  );
}
