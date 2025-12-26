import { describe, it, expect } from 'vitest';
import {
  validatePassword,
  validatePasswordNotEmpty,
} from '@/lib/utils/password-validation';

describe('password validation utils', () => {
  it('validates password matches and length', () => {
    expect(validatePassword('secret123', 'secret123', 8)).toEqual({
      isValid: true,
    });
    expect(validatePassword('secret', 'secret', 8)).toEqual({
      isValid: false,
      error: 'رمز عبور باید حداقل 8 کاراکتر باشد',
    });
    expect(validatePassword('secret123', 'secret', 8)).toEqual({
      isValid: false,
      error: 'رمز عبور جدید و تکرار آن مطابقت ندارند',
    });
  });

  it('rejects empty passwords', () => {
    expect(validatePasswordNotEmpty('')).toEqual({
      isValid: false,
      error: 'رمز عبور نمی‌تواند خالی باشد',
    });
    expect(validatePasswordNotEmpty('  ')).toEqual({
      isValid: false,
      error: 'رمز عبور نمی‌تواند خالی باشد',
    });
    expect(validatePasswordNotEmpty('pass')).toEqual({ isValid: true });
  });
});
