import {
  defaultLocale,
  localeMetadata,
  supportedLocales,
  type Locale,
  type TextDirection,
} from './config';

export type ManagedLanguage = {
  code: Locale;
  label: string;
  nativeLabel: string;
  direction: TextDirection;
  isEnabled: boolean;
  isDefault: boolean;
  sortOrder: number;
};

export type LocalizedFieldValue = string | null | undefined;

export type TranslationFallback = {
  locale: Locale;
  requestedLocale: Locale;
  defaultLocale: Locale;
  fallbackFields: string[];
};

export const appLanguageOptions: ManagedLanguage[] = supportedLocales.map(
  (code, index) => ({
    code,
    label: localeMetadata[code].label,
    nativeLabel: localeMetadata[code].nativeLabel,
    direction: localeMetadata[code].direction,
    isEnabled: code === defaultLocale,
    isDefault: code === defaultLocale,
    sortOrder: index * 10,
  })
);

export function isManageableLocale(value: string): value is Locale {
  return supportedLocales.includes(value as Locale);
}

export function normalizeTranslationText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function hasAnyTranslationValue(
  values: Record<string, LocalizedFieldValue>
): boolean {
  return Object.values(values).some((value) => normalizeTranslationText(value));
}

export function getStaticLanguageDefaults(): ManagedLanguage[] {
  return appLanguageOptions.map((language) => ({
    ...language,
    isEnabled: true,
    isDefault: language.code === defaultLocale,
  }));
}

export function validateManagedLanguages(
  input: ManagedLanguage[]
): ManagedLanguage[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error('At least one supported language is required');
  }

  const seen = new Set<Locale>();
  const languages = input.map((language) => {
    if (!isManageableLocale(language.code)) {
      throw new Error(`Unsupported language: ${language.code}`);
    }

    if (seen.has(language.code)) {
      throw new Error(`Duplicate language: ${language.code}`);
    }
    seen.add(language.code);

    return {
      ...language,
      label: localeMetadata[language.code].label,
      nativeLabel: localeMetadata[language.code].nativeLabel,
      direction: localeMetadata[language.code].direction,
      sortOrder: Number.isFinite(language.sortOrder)
        ? Number(language.sortOrder)
        : appLanguageOptions.find((option) => option.code === language.code)
            ?.sortOrder || 0,
      isEnabled: Boolean(language.isEnabled),
      isDefault: Boolean(language.isDefault),
    };
  });

  const defaults = languages.filter((language) => language.isDefault);
  if (defaults.length !== 1) {
    throw new Error('Exactly one default language is required');
  }

  if (!defaults[0].isEnabled) {
    throw new Error('The default language must stay enabled');
  }

  if (!languages.some((language) => language.isEnabled)) {
    throw new Error('At least one language must be enabled');
  }

  return languages.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function resolveRequestedLocale(
  requestedLocale: string | null | undefined,
  languages: ManagedLanguage[]
): Locale {
  const defaultLanguage =
    languages.find((language) => language.isDefault) ||
    languages.find((language) => language.code === defaultLocale);

  if (
    requestedLocale &&
    isManageableLocale(requestedLocale) &&
    languages.some(
      (language) => language.code === requestedLocale && language.isEnabled
    )
  ) {
    return requestedLocale;
  }

  return defaultLanguage?.code || defaultLocale;
}

export function mergeLocalizedFields<
  T extends Record<string, unknown>,
  K extends keyof T & string,
>(
  base: T,
  fields: K[],
  requestedLocale: Locale,
  fallbackLocale: Locale,
  requestedTranslation?: Partial<Record<K, LocalizedFieldValue>> | null,
  defaultTranslation?: Partial<Record<K, LocalizedFieldValue>> | null
): T & { translationFallback: TranslationFallback } {
  const merged = { ...base } as T & {
    translationFallback: TranslationFallback;
  };
  const mergedFields = merged as Record<string, unknown>;
  const fallbackFields: string[] = [];

  for (const field of fields) {
    const requestedValue = normalizeTranslationText(
      requestedTranslation?.[field]
    );
    const defaultValue = normalizeTranslationText(defaultTranslation?.[field]);

    if (requestedValue) {
      mergedFields[field] = requestedValue;
    } else if (defaultValue) {
      mergedFields[field] = defaultValue;
      fallbackFields.push(field);
    } else {
      fallbackFields.push(field);
    }
  }

  merged.translationFallback = {
    locale: requestedLocale,
    requestedLocale,
    defaultLocale: fallbackLocale,
    fallbackFields,
  };

  return merged;
}
