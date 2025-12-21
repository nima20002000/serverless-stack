/**
 * Password validation utilities
 * Centralized password validation logic to eliminate duplication
 */

export interface PasswordValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates password match and length requirements
 * @param newPassword - The new password to validate
 * @param confirmPassword - The confirmation password to match
 * @param minLength - Minimum password length (default: 8)
 * @returns Validation result with error message if invalid
 */
export function validatePassword(
  newPassword: string,
  confirmPassword: string,
  minLength: number = 8
): PasswordValidationResult {
  if (newPassword !== confirmPassword) {
    return {
      isValid: false,
      error: 'رمز عبور جدید و تکرار آن مطابقت ندارند',
    };
  }

  if (newPassword.length < minLength) {
    return {
      isValid: false,
      error: `رمز عبور باید حداقل ${minLength} کاراکتر باشد`,
    };
  }

  return { isValid: true };
}

/**
 * Validates that a password is not empty
 * @param password - Password to check
 * @returns Validation result
 */
export function validatePasswordNotEmpty(password: string): PasswordValidationResult {
  if (!password || password.trim().length === 0) {
    return {
      isValid: false,
      error: 'رمز عبور نمی‌تواند خالی باشد',
    };
  }

  return { isValid: true };
}
