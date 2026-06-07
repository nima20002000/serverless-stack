import { describe, expect, it } from 'vitest';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { createTranslator } from '@/lib/i18n/translate';

describe('i18n translation helpers', () => {
  it('returns localized messages with interpolation', () => {
    const t = createTranslator(getDictionary('de'));

    expect(
      t('cart.itemsInCart', {
        count: 2,
        itemLabel: t('cart.itemPlural'),
      })
    ).toBe('2 Artikel im Warenkorb');
  });

  it('fails visibly in tests for missing translation keys', () => {
    const t = createTranslator(getDictionary('en'));
    expect(() => t('missing.key')).toThrow('Missing translation key');
  });
});
