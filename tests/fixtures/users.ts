/**
 * User Test Fixtures
 */

export const testUsers = {
  regularUser: {
    email: 'test-user@example.com',
    phone: '09120000001',
    name: 'کاربر تست',
    password: 'TestPassword123!',
    role: 'USER' as const,
  },
  adminUser: {
    email: 'test-admin@example.com',
    phone: '09120000002',
    name: 'ادمین تست',
    password: 'AdminPassword123!',
    role: 'ADMIN' as const,
  },
  emailOnlyUser: {
    email: 'test-email-only@example.com',
    name: 'کاربر ایمیل',
    password: 'EmailPassword123!',
    role: 'USER' as const,
  },
  phoneOnlyUser: {
    phone: '09120000003',
    name: 'کاربر موبایل',
    password: 'PhonePassword123!',
    role: 'USER' as const,
  },
  otpUser: {
    phone: '09120000004',
    email: 'test-otp@example.com',
    name: 'کاربر OTP',
    role: 'USER' as const,
    // No password - OTP only
  },
} as const;

export function generateUniqueTestUser(prefix = 'test') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    email: `${prefix}-${timestamp}-${random}@example.com`,
    phone: `0912${String(timestamp).slice(-7)}`,
    name: `کاربر ${prefix} ${random}`,
    password: 'TestPassword123!',
    role: 'USER' as const,
  };
}

export function generateTestUserBatch(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    email: `test-batch-${i}-${Date.now()}@example.com`,
    phone: `09120${String(100000 + i).slice(-6)}`,
    name: `کاربر دسته‌ای ${i + 1}`,
    password: 'BatchPassword123!',
    role: 'USER' as const,
  }));
}
