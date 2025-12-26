import { describe, it, expect } from 'vitest';
import {
  convertPersianToEnglish,
  containsPersianCharacters,
  isValidPersianName,
  isValidName,
  normalizePhoneNumber,
  isValidIranianPhone,
} from '@/lib/utils/persian';

describe('persian utils', () => {
  it('converts Persian and Arabic digits to English', () => {
    expect(convertPersianToEnglish('۱۲۳۴۵۶۷۸۹۰')).toBe('1234567890');
    expect(convertPersianToEnglish('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('detects Persian characters', () => {
    expect(containsPersianCharacters('سلام')).toBe(true);
    expect(containsPersianCharacters('hello')).toBe(false);
  });

  it('validates Persian and mixed names', () => {
    expect(isValidPersianName('علی رضایی')).toBe(true);
    expect(isValidPersianName('Ali')).toBe(false);
    expect(isValidName("Ali O'Reilly")).toBe(true);
    expect(isValidName('')).toBe(false);
  });

  it('normalizes phone numbers and validates Iranian format', () => {
    expect(normalizePhoneNumber('۰۹۱۲-۳۴۵-۶۷۸۹')).toBe('09123456789');
    expect(isValidIranianPhone('۰۹۱۲۳۴۵۶۷۸۹')).toBe(true);
    expect(isValidIranianPhone('9123456789')).toBe(false);
  });
});
