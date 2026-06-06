'use client';

import { createContext, useContext, useMemo } from 'react';
import type { Locale } from '@/lib/i18n/config';
import type { Messages, TranslationKey } from '@/lib/i18n/dictionaries';
import { createTranslator } from '@/lib/i18n/translate';

type I18nContextValue = {
  locale: Locale;
  direction: 'ltr' | 'rtl';
  messages: Messages;
  t: ReturnType<typeof createTranslator>;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  direction,
  messages,
  children,
}: {
  locale: Locale;
  direction: 'ltr' | 'rtl';
  messages: Messages;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({
      locale,
      direction,
      messages,
      t: createTranslator(messages),
    }),
    [direction, locale, messages]
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

export type { TranslationKey };
