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

function generateRandomPhone(): string {
  const subscriberNumber = 2_000_000 + Math.floor(Math.random() * 8_000_000);
  return `+1202${subscriberNumber}`;
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
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User',
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
      name: 'Registered User',
      isVerified: true,
    }),

    UNVERIFIED_USER: createTestUser({
      name: 'Unverified User',
      isVerified: false,
    }),

    GUEST_USER: createTestUser({
      name: 'Guest User',
      isVerified: false,
    }),

    ADMIN_USER: createTestUser({
      name: 'Site Admin',
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
    fullName: 'Guest Customer',
    email: `e2e-guest-${randomSuffix}@example.com`,
    shippingAddress: '123 Demo Street',
    postalCode: '1234567890',
    ...overrides,
  };
}
