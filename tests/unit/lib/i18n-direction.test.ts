import { describe, expect, it } from 'vitest';
import {
  getCartDrawerDirectionClasses,
  parseTextDirection,
  resolveTextDirection,
} from '@/lib/i18n/direction';

describe('i18n direction helpers', () => {
  it('parses only supported text directions', () => {
    expect(parseTextDirection('ltr')).toBe('ltr');
    expect(parseTextDirection('rtl')).toBe('rtl');
    expect(parseTextDirection('auto')).toBeNull();
    expect(parseTextDirection(undefined)).toBeNull();
  });

  it('uses explicit direction config before locale metadata', () => {
    expect(
      resolveTextDirection({
        configuredDirection: 'rtl',
        localeDirection: 'ltr',
      })
    ).toBe('rtl');

    expect(
      resolveTextDirection({
        configuredDirection: null,
        localeDirection: 'rtl',
      })
    ).toBe('rtl');
  });

  it('returns mirrored cart drawer placement and animation classes', () => {
    expect(getCartDrawerDirectionClasses('ltr')).toEqual({
      container: 'right-0 pl-10',
      enterFrom: 'translate-x-full',
      leaveTo: 'translate-x-full',
    });

    expect(getCartDrawerDirectionClasses('rtl')).toEqual({
      container: 'left-0 pr-10',
      enterFrom: '-translate-x-full',
      leaveTo: '-translate-x-full',
    });
  });
});
