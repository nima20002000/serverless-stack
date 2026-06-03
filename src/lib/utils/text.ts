import {
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

const easternArabicDigitStart = 0x06f0;
const arabicIndicDigitStart = 0x0660;

export function normalizeDigits(text: string): string {
  if (!text) return text;

  return Array.from(text)
    .map((char) => {
      const code = char.charCodeAt(0);
      if (
        code >= easternArabicDigitStart &&
        code <= easternArabicDigitStart + 9
      ) {
        return String(code - easternArabicDigitStart);
      }
      if (code >= arabicIndicDigitStart && code <= arabicIndicDigitStart + 9) {
        return String(code - arabicIndicDigitStart);
      }
      return char;
    })
    .join('');
}

export function containsRightToLeftCharacters(text: string): boolean {
  if (!text) return false;

  return /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/.test(text);
}

export function isValidName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (trimmed.length > 120) return false;

  return /^[\p{L}\p{M}][\p{L}\p{M}\s.'-]*$/u.test(trimmed);
}

function getDefaultPhoneCountry(): CountryCode {
  return (
    process.env.NEXT_PUBLIC_DEFAULT_PHONE_COUNTRY || 'US'
  ).toUpperCase() as CountryCode;
}

function getLegacyIranianLocalNumber(phone: string): string | undefined {
  const normalized = normalizeDigits(phone.trim()).replace(/[^\d+]/g, '');
  if (!/^0\d{10}$/.test(normalized)) return undefined;

  const parsed = parsePhoneNumberFromString(normalized, 'IR');
  return parsed?.isValid() ? parsed.number : undefined;
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return phone;

  const defaultCountry = getDefaultPhoneCountry();
  const legacyIranianNumber = getLegacyIranianLocalNumber(phone);
  if (legacyIranianNumber) {
    return legacyIranianNumber;
  }

  let normalized = normalizeDigits(phone.trim()).replace(/[^\d+]/g, '');

  normalized = normalized.replace(/(?!^)\+/g, '');
  if (normalized.startsWith('00')) {
    normalized = `+${normalized.slice(2)}`;
  }

  try {
    const parsed = parsePhoneNumberFromString(normalized, defaultCountry);
    if (parsed?.isValid()) {
      return parsed.number;
    }
  } catch {
    return normalized;
  }

  return normalized;
}

export function getPhoneLookupCandidates(phone: string): string[] {
  if (!phone) return [];

  const defaultCountry = getDefaultPhoneCountry();
  const normalized = normalizePhoneNumber(phone);
  const legacyNormalized = normalizeDigits(phone.trim()).replace(/[^\d+]/g, '');
  const legacyWithoutPlus = legacyNormalized.replace(/\+(?=.)/g, '');
  const legacyIranianNumber = getLegacyIranianLocalNumber(phone);
  const nationalFormat = parsePhoneNumberFromString(normalized, defaultCountry)
    ?.formatNational()
    .replace(/\D/g, '');

  return Array.from(
    new Set(
      [
        legacyIranianNumber,
        normalized,
        nationalFormat,
        legacyNormalized,
        legacyWithoutPlus,
      ].filter((candidate): candidate is string => Boolean(candidate))
    )
  );
}

export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;

  if (getLegacyIranianLocalNumber(phone)) {
    return true;
  }

  const normalized = normalizePhoneNumber(phone);
  const defaultCountry = getDefaultPhoneCountry();

  try {
    const parsed = parsePhoneNumberFromString(normalized, defaultCountry);
    return parsed?.isValid() ?? false;
  } catch {
    return false;
  }
}
