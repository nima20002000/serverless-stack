/**
 * Integration Tests for Admin Service Routes (Users, Transactions, Settings)
 *
 * Uses real Supabase data with mocked NextAuth sessions to validate:
 * - RBAC enforcement
 * - Pagination and filters
 * - Failure states and data correctness
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { getServerSession } from 'next-auth';
import {
  createTestSupabaseClient,
  generateTestUID,
} from '../utils/test-client';
import { cleanupTestUsers, cleanupTestTransactions } from '../utils/cleanup';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

const supabase = createTestSupabaseClient();

const SETTINGS_PREFIX = 'TEST-ADMIN-SETTING-';

async function cleanupTestSettings() {
  const { error } = await supabase
    .from('site_settings')
    .delete()
    .like('key', `${SETTINGS_PREFIX}%`);

  if (error && error.code !== 'PGRST116') {
    console.warn('Failed to cleanup test settings:', error);
  }
}

async function createTestUser(
  overrides: Partial<{
    id: string;
    uid: string;
    email: string | null;
    phone: string | null;
    name: string;
    role: 'USER' | 'ADMIN';
    createdAt: string;
    updatedAt: string;
    isVerified: boolean;
  }> = {}
) {
  const now = new Date().toISOString();
  const user = {
    id: overrides.id ?? randomUUID(),
    uid: overrides.uid ?? (await generateTestUID()),
    email: overrides.email ?? null,
    phone: overrides.phone ?? null,
    name: overrides.name ?? 'Test User',
    role: overrides.role ?? 'USER',
    isVerified: overrides.isVerified ?? true,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };

  const { error } = await supabase.from('users').insert(user);

  if (error) {
    throw new Error(`Failed to create test user: ${error.message}`);
  }

  return user;
}

async function createTestTransaction(
  overrides: Partial<{
    id: string;
    transactionCode: string;
    amount: number;
    status: 'PENDING' | 'COMPLETED' | 'FAILED';
    fullName: string | null;
    phone: string | null;
    email: string | null;
    shippingAddress: string | null;
    postalCode: string | null;
    paymentMethod: 'ZARINPAL' | 'DIGIPAY' | 'ZIBAL';
    isGuest: boolean;
    createdAt: string;
    updatedAt: string;
  }> = {}
) {
  const now = new Date().toISOString();
  const transaction = {
    id: overrides.id ?? randomUUID(),
    transactionCode: overrides.transactionCode ?? `TEST-ADMIN-TX-${Date.now()}`,
    amount: overrides.amount ?? 125000,
    status: overrides.status ?? 'PENDING',
    fullName: overrides.fullName ?? 'کاربر تراکنش',
    phone: overrides.phone ?? '09120000011',
    email: overrides.email ?? 'tx-test@example.com',
    shippingAddress: overrides.shippingAddress ?? 'تهران، خیابان تست',
    postalCode: overrides.postalCode ?? '1234567890',
    paymentMethod: overrides.paymentMethod ?? 'ZARINPAL',
    isGuest: overrides.isGuest ?? true,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };

  const { error } = await supabase.from('transactions').insert(transaction);

  if (error) {
    throw new Error(`Failed to create test transaction: ${error.message}`);
  }

  return transaction;
}

const createRequest = (path: string, query: Record<string, string> = {}) => {
  const url = new URL(`http://localhost${path}`);
  Object.entries(query).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return new NextRequest(url);
};

const loadUsersHandler = async () => {
  const handlers = await import('@/app/api/admin/users/route');
  return handlers.GET;
};

const loadTransactionsHandler = async () => {
  const handlers = await import('@/app/api/admin/transactions/route');
  return handlers.GET;
};

const loadSettingsHandlers = async () => {
  const handlers = await import('@/app/api/admin/settings/route');
  return { GET: handlers.GET, POST: handlers.POST };
};

describe('Admin Service Route Integration Tests', () => {
  const getServerSessionMock = vi.mocked(getServerSession);

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    await cleanupTestTransactions();
    await cleanupTestUsers();
    await cleanupTestSettings();
  });

  afterEach(async () => {
    await cleanupTestTransactions();
    await cleanupTestUsers();
    await cleanupTestSettings();
  });

  it('rejects non-admin access for users endpoint', async () => {
    const regularUser = await createTestUser({
      email: `test-user-${Date.now()}@example.com`,
      role: 'USER',
      name: 'Regular User',
    });

    getServerSessionMock.mockResolvedValue({
      user: {
        id: regularUser.id,
        role: 'USER',
        email: regularUser.email,
      },
    } as any);

    const GET = await loadUsersHandler();
    const response = await GET(createRequest('/api/admin/users'));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'دسترسی غیرمجاز' });
  });

  it('returns filtered and paginated users for admin session', async () => {
    const adminUser = await createTestUser({
      email: `test-admin-${Date.now()}@example.com`,
      role: 'ADMIN',
      name: 'Admin User',
    });

    const searchTag = `test-admin-users-${Date.now()}`;
    const user1 = await createTestUser({
      email: `${searchTag}-1@example.com`,
      name: `User ${searchTag} 1`,
      role: 'USER',
    });
    const user2 = await createTestUser({
      email: `${searchTag}-2@example.com`,
      name: `User ${searchTag} 2`,
      role: 'USER',
    });
    const user3 = await createTestUser({
      email: `${searchTag}-3@example.com`,
      name: `User ${searchTag} 3`,
      role: 'USER',
    });

    getServerSessionMock.mockResolvedValue({
      user: {
        id: adminUser.id,
        role: 'ADMIN',
        email: adminUser.email,
      },
    } as any);

    const GET = await loadUsersHandler();

    const firstPage = await GET(
      createRequest('/api/admin/users', {
        search: searchTag,
        page: '1',
        limit: '2',
      })
    );

    expect(firstPage.status).toBe(200);
    const firstPayload = await firstPage.json();
    expect(firstPayload.total).toBe(3);
    expect(firstPayload.totalPages).toBe(2);
    expect(firstPayload.data).toHaveLength(2);
    expect(firstPayload.data[0].email).toContain(searchTag);
    expect(firstPayload.data[0].role).toBe('USER');
    expect(firstPayload.data[0]._count).toEqual({
      transactions: 0,
      promoCodes: 0,
    });

    const secondPage = await GET(
      createRequest('/api/admin/users', {
        search: searchTag,
        page: '2',
        limit: '2',
      })
    );

    expect(secondPage.status).toBe(200);
    const secondPayload = await secondPage.json();
    expect(secondPayload.total).toBe(3);
    expect(secondPayload.page).toBe(2);
    expect(secondPayload.data).toHaveLength(1);
    const returnedId = secondPayload.data[0].id;
    const expectedIds = new Set([user1.id, user2.id, user3.id]);
    expect(expectedIds.has(returnedId)).toBe(true);
  });

  it('applies role filter for users endpoint', async () => {
    const adminSessionUser = await createTestUser({
      email: `test-admin-${Date.now()}@example.com`,
      role: 'ADMIN',
      name: 'Admin User',
    });

    const searchTag = `test-admin-role-${Date.now()}`;
    const adminCandidate = await createTestUser({
      email: `${searchTag}-admin@example.com`,
      name: `Admin ${searchTag}`,
      role: 'ADMIN',
    });
    await createTestUser({
      email: `${searchTag}-user@example.com`,
      name: `User ${searchTag}`,
      role: 'USER',
    });

    getServerSessionMock.mockResolvedValue({
      user: {
        id: adminSessionUser.id,
        role: 'ADMIN',
        email: adminSessionUser.email,
      },
    } as any);

    const GET = await loadUsersHandler();
    const response = await GET(
      createRequest('/api/admin/users', {
        search: searchTag,
        role: 'ADMIN',
      })
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.total).toBe(1);
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0].id).toBe(adminCandidate.id);
    expect(payload.data[0].role).toBe('ADMIN');
  });

  it('enforces RBAC and filters for transactions endpoint', async () => {
    const adminUser = await createTestUser({
      email: `test-admin-${Date.now()}@example.com`,
      role: 'ADMIN',
      name: 'Admin User',
    });

    const searchPrefix = `TEST-ADMIN-TX-${Date.now()}`;
    const tx1 = await createTestTransaction({
      transactionCode: `${searchPrefix}-A`,
      status: 'PENDING',
      createdAt: '2024-01-10T10:00:00.000Z',
      updatedAt: '2024-01-10T10:00:00.000Z',
    });
    const tx2 = await createTestTransaction({
      transactionCode: `${searchPrefix}-B`,
      status: 'COMPLETED',
      createdAt: '2024-01-11T10:00:00.000Z',
      updatedAt: '2024-01-11T10:00:00.000Z',
    });
    const tx3 = await createTestTransaction({
      transactionCode: `${searchPrefix}-C`,
      status: 'PENDING',
      createdAt: '2024-01-12T10:00:00.000Z',
      updatedAt: '2024-01-12T10:00:00.000Z',
    });

    getServerSessionMock.mockResolvedValue({
      user: {
        id: adminUser.id,
        role: 'ADMIN',
        email: adminUser.email,
      },
    } as any);

    const GET = await loadTransactionsHandler();

    const page1 = await GET(
      createRequest('/api/admin/transactions', {
        search: searchPrefix,
        page: '1',
        limit: '2',
      })
    );

    expect(page1.status).toBe(200);
    const page1Payload = await page1.json();
    expect(page1Payload.total).toBe(3);
    expect(page1Payload.totalPages).toBe(2);
    expect(page1Payload.data).toHaveLength(2);
    expect(page1Payload.data[0].transactionCode).toBe(tx3.transactionCode);
    expect(page1Payload.data[1].transactionCode).toBe(tx2.transactionCode);
    expect(new Date(page1Payload.data[0].createdAt).getTime()).toBeGreaterThan(
      new Date(page1Payload.data[1].createdAt).getTime()
    );

    const page2 = await GET(
      createRequest('/api/admin/transactions', {
        search: searchPrefix,
        page: '2',
        limit: '2',
      })
    );
    const page2Payload = await page2.json();
    expect(page2Payload.total).toBe(3);
    expect(page2Payload.data).toHaveLength(1);
    expect(page2Payload.data[0].transactionCode).toBe(tx1.transactionCode);

    const statusFiltered = await GET(
      createRequest('/api/admin/transactions', {
        search: searchPrefix,
        status: 'COMPLETED',
      })
    );
    const statusPayload = await statusFiltered.json();
    expect(statusPayload.total).toBe(1);
    expect(statusPayload.data[0].status).toBe('COMPLETED');
    expect(statusPayload.data[0].transactionCode).toBe(tx2.transactionCode);

    const dateFiltered = await GET(
      createRequest('/api/admin/transactions', {
        search: searchPrefix,
        dateFrom: '2024-01-11',
        dateTo: '2024-01-11',
      })
    );
    const datePayload = await dateFiltered.json();
    expect(datePayload.total).toBe(1);
    expect(datePayload.data[0].transactionCode).toBe(tx2.transactionCode);

    const nonAdmin = await createTestUser({
      email: `test-user-${Date.now()}@example.com`,
      role: 'USER',
      name: 'Regular User',
    });
    getServerSessionMock.mockResolvedValue({
      user: {
        id: nonAdmin.id,
        role: 'USER',
        email: nonAdmin.email,
      },
    } as any);
    const forbidden = await GET(
      createRequest('/api/admin/transactions', { search: searchPrefix })
    );
    expect(forbidden.status).toBe(403);
  });

  it('allows admins to read and update settings with validation', async () => {
    const adminUser = await createTestUser({
      email: `test-admin-${Date.now()}@example.com`,
      role: 'ADMIN',
      name: 'Admin User',
    });

    const settingsKey = `${SETTINGS_PREFIX}${Date.now()}`;
    const { error } = await supabase
      .from('site_settings')
      .insert({ key: settingsKey, value: 'initial' });

    if (error) {
      throw new Error(`Failed to seed settings: ${error.message}`);
    }

    getServerSessionMock.mockResolvedValue({
      user: {
        id: adminUser.id,
        role: 'ADMIN',
        email: adminUser.email,
      },
    } as any);

    const { GET, POST } = await loadSettingsHandlers();

    const response = await GET();
    expect(response.status).toBe(200);
    const payload = await response.json();
    const matched = payload.settings.find(
      (setting: any) => setting.key === settingsKey
    );
    expect(matched?.value).toBe('initial');

    const updateResponse = await POST(
      new NextRequest('http://localhost/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: { [settingsKey]: 'updated' },
        }),
      })
    );
    expect(updateResponse.status).toBe(200);
    await expect(updateResponse.json()).resolves.toEqual({
      message: 'تنظیمات با موفقیت ذخیره شد',
    });

    const { data: updated } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', settingsKey)
      .single();

    expect(updated?.value).toBe('updated');

    const invalidResponse = await POST(
      new NextRequest('http://localhost/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(invalidResponse.status).toBe(400);
    await expect(invalidResponse.json()).resolves.toEqual({
      error: 'داده‌های نامعتبر',
    });

    const nonAdmin = await createTestUser({
      email: `test-user-${Date.now()}@example.com`,
      role: 'USER',
      name: 'Regular User',
    });
    getServerSessionMock.mockResolvedValue({
      user: {
        id: nonAdmin.id,
        role: 'USER',
        email: nonAdmin.email,
      },
    } as any);

    const forbidden = await GET();
    expect(forbidden.status).toBe(403);
  });
});
