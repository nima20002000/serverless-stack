/**
 * Persian text utility functions
 * Handles conversion between Persian and English characters
 */

/**
 * Map of Persian digits to English digits
 */
const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const arabicDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/**
 * Convert Persian/Arabic digits to English digits
 * @param text - Text containing Persian or Arabic digits
 * @returns Text with English digits
 */
export function convertPersianToEnglish(text: string): string {
  if (!text) return text;

  let result = text;

  // Convert Persian digits
  persianDigits.forEach((persianDigit, index) => {
    result = result.replace(new RegExp(persianDigit, 'g'), index.toString());
  });

  // Convert Arabic digits
  arabicDigits.forEach((arabicDigit, index) => {
    result = result.replace(new RegExp(arabicDigit, 'g'), index.toString());
  });

  return result;
}

/**
 * Check if text contains Persian/Arabic characters
 * @param text - Text to check
 * @returns true if text contains Persian/Arabic characters
 */
export function containsPersianCharacters(text: string): boolean {
  if (!text) return false;

  // Persian/Arabic Unicode ranges
  const persianPattern =
    /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return persianPattern.test(text);
}

/**
 * Validate Persian name (allows Persian letters, spaces, and common Persian characters)
 * @param name - Name to validate
 * @returns true if name is valid Persian name
 */
export function isValidPersianName(name: string): boolean {
  if (!name || !name.trim()) return false;

  // Allow Persian letters, spaces, Arabic diacritics, and common Persian punctuation
  const persianNamePattern =
    /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF\s]+$/;
  return persianNamePattern.test(name.trim());
}

/**
 * Validate if text can be a valid name (Persian or English)
 * @param name - Name to validate
 * @returns true if name is valid (Persian or English letters)
 */
export function isValidName(name: string): boolean {
  if (!name || !name.trim()) return false;

  // Allow Persian, Arabic, English letters, spaces, hyphens, and apostrophes
  const namePattern =
    /^[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z\s'-]+$/;
  return namePattern.test(name.trim());
}

/**
 * Normalize phone number by converting Persian/Arabic digits to English
 * @param phone - Phone number with potentially Persian/Arabic digits
 * @returns Normalized phone number with English digits
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return phone;

  // Convert Persian/Arabic digits to English
  const normalized = convertPersianToEnglish(phone);

  // Remove any non-digit characters except leading +
  return normalized.replace(/[^\d+]/g, '').replace(/\+(?=.)/g, '');
}

/**
 * Validate Iranian phone number format (09xxxxxxxxx)
 * Accepts both Persian and English digits
 * @param phone - Phone number to validate
 * @returns true if valid Iranian phone format
 */
export function isValidIranianPhone(phone: string): boolean {
  if (!phone) return false;

  // Normalize first
  const normalized = normalizePhoneNumber(phone);

  // Check if matches Iranian phone format (09xxxxxxxxx - 11 digits starting with 09)
  return /^09\d{9}$/.test(normalized);
}
