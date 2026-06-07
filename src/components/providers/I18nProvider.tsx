'use client';

import { createContext, useContext, useMemo } from 'react';
import type { Locale, TextDirection } from '@/lib/i18n/config';
import type { ManagedLanguage } from '@/lib/i18n/localized-content';
import type { Messages, TranslationKey } from '@/lib/i18n/dictionaries';
import { createTranslator } from '@/lib/i18n/translate';

type I18nContextValue = {
  locale: Locale;
  direction: TextDirection;
  languages: ManagedLanguage[];
  messages: Messages;
  t: ReturnType<typeof createTranslator>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  direction,
  languages,
  messages,
  children,
}: {
  locale: Locale;
  direction: TextDirection;
  languages: ManagedLanguage[];
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({
      locale,
      direction,
      languages,
      messages,
      t: createTranslator(messages),
    }),
    [direction, languages, locale, messages]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider.');
  }
  return context;
}

export function useTranslations() {
  return useI18n().t;
}

export function useTextDirection() {
  return useI18n().direction;
}

export type { TranslationKey };
