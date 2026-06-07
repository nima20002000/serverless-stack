import { describe, expect, it } from 'vitest';
import {
  getStaticLanguageDefaults,
  mergeLocalizedFields,
  normalizeTranslationText,
  resolveRequestedLocale,
  validateManagedLanguages,
} from '@/lib/i18n/localized-content';

describe('localized content helpers', () => {
  it('normalizes blank translation values to null', () => {
    expect(normalizeTranslationText('  German title  ')).toBe('German title');
    expect(normalizeTranslationText('   ')).toBeNull();
    expect(normalizeTranslationText(null)).toBeNull();
  });

  it('requires exactly one enabled default language', () => {
    const languages = getStaticLanguageDefaults();

    expect(validateManagedLanguages(languages)).toHaveLength(2);
    expect(() =>
      validateManagedLanguages(
        languages.map((language) => ({ ...language, isDefault: false }))
      )
    ).toThrow('Exactly one default language is required');
    expect(() =>
      validateManagedLanguages(
        languages.map((language) =>
          language.code === 'en'
            ? { ...language, isEnabled: false, isDefault: true }
            : language
        )
      )
    ).toThrow('The default language must stay enabled');
  });

  it('falls back disabled or unsupported requested locales to the default', () => {
    const languages = getStaticLanguageDefaults().map((language) =>
      language.code === 'de' ? { ...language, isEnabled: false } : language
    );

    expect(resolveRequestedLocale('de', languages)).toBe('en');
    expect(resolveRequestedLocale('fr', languages)).toBe('en');
  });

  it('merges requested fields field-by-field with default fallback', () => {
    const product = {
      id: 'product-1',
      name: 'English name',
      description: 'English description',
    };

    const localized = mergeLocalizedFields(
      product,
      ['name', 'description'],
      'de',
      'en',
      { name: 'Deutscher Name' },
      { description: 'Default translated description' }
    );

    expect(localized.name).toBe('Deutscher Name');
    expect(localized.description).toBe('Default translated description');
    expect(localized.translationFallback.fallbackFields).toEqual([
      'description',
    ]);
  });
});
