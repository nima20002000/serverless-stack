import { randomUUID } from 'crypto';

export interface E2ETestUser {
  id: string;
  uid: string;
  email: string;
  phone: string;
  name: string;
  firstName: string;
  lastName: string;
  password: string;
  isVerified: boolean;
  role: 'USER' | 'ADMIN';
  updatedAt: string;
  shippingAddress?: string;
  postalCode?: string;
}

/**
 * Generate a random Iranian phone number
 * Format: 09XX-XXX-XXXX
 */
function generateRandomPhone(): string {
  const operators = ['912', '919', '913', '935', '936', '937', '938', '939'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  const number = Math.floor(Math.random() * 10000000)
    .toString()
    .padStart(7, '0');
  return `0${operator}${number}`;
}

/**
 * Create a test user with random ID and optional overrides
 * All test users use 'e2e-user-' prefix for easy cleanup
 */
export function createTestUser(overrides?: Partial<E2ETestUser>): E2ETestUser {
  const now = new Date().toISOString();
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  const uuid = randomUUID();

  return {
    id: `e2e-user-${uuid}`,
    uid: `e2e-uid-${uuid}`,
    email: `e2e-test-${randomSuffix}@example.com`,
    phone: generateRandomPhone(),
    name: 'کاربر تست',
    firstName: 'کاربر',
    lastName: 'تست',
    password: 'Test1234!@#$',
    isVerified: false,
    role: 'USER',
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Pre-defined test users for common test scenarios
 * Note: IDs are regenerated on each import for idempotent tests
 */
export function getTestUsers() {
  return {
    REGISTERED_USER: createTestUser({
      name: 'کاربر ثبت‌نام شده',
      isVerified: true,
    }),

    UNVERIFIED_USER: createTestUser({
      name: 'کاربر تایید نشده',
      isVerified: false,
    }),

    GUEST_USER: createTestUser({
      name: 'کاربر مهمان',
      isVerified: false,
    }),

    ADMIN_USER: createTestUser({
      name: 'مدیر سایت',
      role: 'ADMIN',
      isVerified: true,
    }),
  };
}

/**
 * Guest checkout info (no user account needed)
 */
export interface E2EGuestInfo {
  phone: string;
  fullName: string;
  email: string;
  shippingAddress: string;
  postalCode: string;
}

export function createGuestInfo(
  overrides?: Partial<E2EGuestInfo>
): E2EGuestInfo {
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  return {
    phone: generateRandomPhone(),
    fullName: 'مهمان تست',
    email: `e2e-guest-${randomSuffix}@example.com`,
    shippingAddress: 'تهران، خیابان آزادی، پلاک ۱۲۳',
    postalCode: '1234567890',
    ...overrides,
  };
}
