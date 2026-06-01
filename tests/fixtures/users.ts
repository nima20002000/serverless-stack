/**
 * User Test Fixtures
 */

export const testUsers = {
  regularUser: {
    email: 'test-user@example.com',
    phone: '+12025550001',
    name: 'Test User',
    password: 'TestPassword123!',
    role: 'USER' as const,
  },
  adminUser: {
    email: 'test-admin@example.com',
    phone: '+12025550002',
    name: 'Test Admin',
    password: 'AdminPassword123!',
    role: 'ADMIN' as const,
  },
  emailOnlyUser: {
    email: 'test-email-only@example.com',
    name: 'Email Only User',
    password: 'EmailPassword123!',
    role: 'USER' as const,
  },
  phoneOnlyUser: {
    phone: '+12025550003',
    name: 'Phone Only User',
    password: 'PhonePassword123!',
    role: 'USER' as const,
  },
  otpUser: {
    phone: '+12025550004',
    email: 'test-otp@example.com',
    name: 'OTP Test User',
    role: 'USER' as const,
    // No password - OTP only
  },
} as const;

export function generateUniqueTestUser(prefix = 'test') {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);

  return {
    email: `${prefix}-${timestamp}-${random}@example.com`,
    phone: `+1202555${String(timestamp).slice(-4)}`,
    name: `User ${prefix} ${random}`,
    password: 'TestPassword123!',
    role: 'USER' as const,
  };
}

export function generateTestUserBatch(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    email: `test-batch-${i}-${Date.now()}@example.com`,
    phone: `+1202555${String(i).padStart(4, '0')}`,
    name: `Batch User ${i + 1}`,
    password: 'BatchPassword123!',
    role: 'USER' as const,
  }));
}
