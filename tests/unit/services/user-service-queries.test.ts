import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { queryUser, checkUserExists } from '@/services/user-service/queries';
import { createSupabaseMock, createQueryMock } from '../helpers/supabase-mock';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

const createClientMock = vi.mocked(createClient);

const baseUser = {
  id: 'user-1',
  uid: 'UID-001',
  email: 'user@example.com',
  phone: '+12025556789',
  name: 'Jane Doe',
  role: 'USER' as const,
  isVerified: true,
  shippingAddress: null,
  shippingCountry: null,
  shippingRegion: null,
  shippingCity: null,
  shippingAddressLine1: null,
  shippingAddressLine2: null,
  postalCode: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-02-01T00:00:00.000Z',
};

describe('user-service queries', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns null when no identifier is provided', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({ data: baseUser });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(queryUser({})).resolves.toBeNull();
    expect(supabase.from).toHaveBeenCalledWith('users');
  });

  it.each([
    {
      label: 'id',
      where: { id: baseUser.id },
      column: 'id',
      value: baseUser.id,
    },
    {
      label: 'email',
      where: { email: baseUser.email },
      column: 'email',
      value: baseUser.email,
    },
    {
      label: 'phone',
      where: { phone: baseUser.phone },
      column: 'phone',
      value: baseUser.phone,
    },
  ])('queries by %s and maps date fields', async ({ where, column, value }) => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({ data: baseUser });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await queryUser(where);

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(query.select).toHaveBeenCalledWith(
      'id, uid, email, phone, name, role, isVerified, shippingAddress, shippingCountry, shippingRegion, shippingCity, shippingAddressLine1, shippingAddressLine2, postalCode, createdAt, updatedAt'
    );
    expect(query.limit).toHaveBeenCalledWith(1);
    expect(query.eq).toHaveBeenCalledWith(column, value);
    expect(query.single).toHaveBeenCalled();
    expect(result).not.toBeNull();
    expect(result?.id).toBe(baseUser.id);
    expect(result?.createdAt).toBeInstanceOf(Date);
    expect(result?.updatedAt).toBeInstanceOf(Date);
    expect(result?.createdAt.toISOString()).toBe(baseUser.createdAt);
    expect(result?.updatedAt.toISOString()).toBe(baseUser.updatedAt);
  });

  it('returns null when query errors or returns no data', async () => {
    const supabase = createSupabaseMock();
    const errorQuery = createQueryMock({
      data: baseUser,
      error: new Error('query failed'),
    });
    supabase.from.mockReturnValue(errorQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(queryUser({ id: baseUser.id })).resolves.toBeNull();

    const emptyQuery = createQueryMock({ data: null });
    supabase.from.mockReturnValue(emptyQuery);

    await expect(queryUser({ id: baseUser.id })).resolves.toBeNull();
  });

  it('returns false when no email or phone is provided', async () => {
    const supabase = createSupabaseMock();
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(checkUserExists({})).resolves.toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('builds OR conditions and excludes a user id when provided', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({ count: 1 });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as unknown);

    const exists = await checkUserExists(
      { email: 'a@b.com', phone: baseUser.phone },
      baseUser.id
    );

    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(query.select).toHaveBeenCalledWith('id', {
      count: 'exact',
      head: true,
    });
    expect(query.or).toHaveBeenCalledWith(
      `email.eq.a@b.com,phone.eq.${baseUser.phone},phone.eq.2025556789,phone.eq.12025556789`
    );
    expect(query.neq).toHaveBeenCalledWith('id', baseUser.id);
    expect(exists).toBe(true);
  });

  it('returns false when the query fails or count is zero', async () => {
    const supabase = createSupabaseMock();
    const errorQuery = createQueryMock({
      error: new Error('db down'),
      count: null,
    });
    supabase.from.mockReturnValue(errorQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(checkUserExists({ email: baseUser.email })).resolves.toBe(
      false
    );

    const emptyQuery = createQueryMock({ count: 0 });
    supabase.from.mockReturnValue(emptyQuery);

    await expect(checkUserExists({ phone: baseUser.phone })).resolves.toBe(
      false
    );
  });
});
