import { describe, it, expect } from 'vitest';
import {
  normalizeDigits,
  containsRightToLeftCharacters,
  isValidName,
  normalizePhoneNumber,
  isValidPhoneNumber,
  getPhoneLookupCandidates,
} from '@/lib/utils/text';

describe('text utils', () => {
  it('keeps ASCII digits unchanged', () => {
    expect(normalizeDigits('1234567890')).toBe('1234567890');
    expect(normalizeDigits('0123456789')).toBe('0123456789');
  });

  it('detects right-to-left characters', () => {
    expect(
      containsRightToLeftCharacters(
        String.fromCharCode(0x0633, 0x0644, 0x0627, 0x0645)
      )
    ).toBe(true);
    expect(containsRightToLeftCharacters('hello')).toBe(false);
  });

  it('validates international names', () => {
    expect(isValidName('Alex Taylor')).toBe(true);
    expect(isValidName("Ali O'Reilly")).toBe(true);
    expect(isValidName('Maria Garcia')).toBe(true);
    expect(isValidName('')).toBe(false);
  });

  it('normalizes phone numbers and validates international formats', () => {
    const previousCountry = process.env.NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY;
    process.env.NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY = 'US';

    try {
      expect(normalizePhoneNumber('+1 (212) 555-1234')).toBe('+12125551234');
      expect(normalizePhoneNumber('2125551234')).toBe('+12125551234');
      expect(isValidPhoneNumber('+12125551234')).toBe(true);
      expect(isValidPhoneNumber('2125551234')).toBe(true);
      expect(isValidPhoneNumber('12345')).toBe(false);
    } finally {
      if (previousCountry === undefined) {
        delete process.env.NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY;
      } else {
        process.env.NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY = previousCountry;
      }
    }
  });

  it('uses the neutral US default when no phone country is configured', () => {
    const previousCountry = process.env.NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY;
    delete process.env.NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY;

    try {
      expect(normalizePhoneNumber('2125551234')).toBe('+12125551234');
      expect(isValidPhoneNumber('2125551234')).toBe(true);
      expect(normalizePhoneNumber('09123456789')).toBe('+989123456789');
      expect(isValidPhoneNumber('09123456789')).toBe(true);
      expect(isValidPhoneNumber('00123456789')).toBe(false);
    } finally {
      if (previousCountry !== undefined) {
        process.env.NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY = previousCountry;
      }
    }
  });

  it('keeps legacy phone storage candidates for lookup compatibility', () => {
    const previousCountry = process.env.NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY;
    process.env.NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY = 'IR';

    try {
      expect(getPhoneLookupCandidates('۰۹۱۲۳۴۵۶۷۸۹')).toEqual([
        '+989123456789',
        '09123456789',
      ]);
      expect(getPhoneLookupCandidates('+989123456789')).toEqual([
        '+989123456789',
        '09123456789',
        '989123456789',
      ]);
    } finally {
      if (previousCountry === undefined) {
        delete process.env.NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY;
      } else {
        process.env.NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY = previousCountry;
      }
    }
  });
});
