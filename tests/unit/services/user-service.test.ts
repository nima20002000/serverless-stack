import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock, createQueryMock } from '../helpers/supabase-mock';
import { createClient } from '@/lib/supabase/server';
import * as userService from '@/services/user-service';
import * as queries from '@/services/user-service/queries';
import * as password from '@/services/user-service/password';
import * as validation from '@/services/user-service/validation';

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/services/promo-service', () => ({
  createFirstTimePromoCode: vi.fn(),
}));

describe('user-service', () => {
  const createClientMock = vi.mocked(createClient);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates next UID based on highest UID', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({ data: { uid: 'U-000123' }, error: null });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as any);

    await expect(userService.generateNextUID()).resolves.toBe('U-000124');
  });

  it('rejects createUser when no identifier is provided', async () => {
    await expect(
      userService.createUser({ name: 'Test User' })
    ).rejects.toThrow('ایمیل یا شماره تلفن الزامی است');
  });

  it('rejects createUser when user already exists', async () => {
    vi.spyOn(queries, 'checkUserExists').mockResolvedValue(true);

    await expect(
      userService.createUser({
        name: 'User',
        email: 'user@example.com',
        password: 'password123',
      })
    ).rejects.toThrow('کاربری با این ایمیل یا شماره تلفن قبلاً ثبت‌نام کرده است');
  });

  it('creates user and returns sanitized data', async () => {
    const supabase = createSupabaseMock();

    const insertQuery = createQueryMock({
      data: {
        id: 'user-1',
        uid: 'U-000999',
        email: 'user@example.com',
        phone: null,
        name: 'User',
        role: 'USER',
        isVerified: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      error: null,
    });

    const cleanupQuery = createQueryMock({ data: null, error: null });

    supabase.from
      .mockReturnValueOnce(insertQuery)
      .mockReturnValueOnce(cleanupQuery);

    createClientMock.mockReturnValue(supabase as any);

    vi.spyOn(userService, 'generateNextUID').mockResolvedValue('U-000999');
    vi.spyOn(queries, 'checkUserExists').mockResolvedValue(false);
    vi.spyOn(password, 'hashPassword').mockResolvedValue('hashed');
    vi.spyOn(userService, 'linkOrphanedTransactions').mockResolvedValue(0);

    const result = await userService.createUser({
      name: 'User',
      email: 'user@example.com',
      password: 'password123',
    });

    expect(result).toEqual({
      id: 'user-1',
      uid: 'U-000999',
      email: 'user@example.com',
      phone: null,
      name: 'User',
      role: 'USER',
      isVerified: false,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    });

    expect(insertQuery.insert).toHaveBeenCalled();
    expect(cleanupQuery.delete).toHaveBeenCalled();
  });

  it('updates user profile and normalizes dates', async () => {
    const supabase = createSupabaseMock();
    const updateQuery = createQueryMock({
      data: {
        id: 'user-1',
        uid: 'U-000123',
        email: 'new@example.com',
        phone: null,
        name: 'New Name',
        role: 'USER',
        isVerified: true,
        shippingAddress: 'Address',
        postalCode: '12345',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
      error: null,
    });

    supabase.from.mockReturnValue(updateQuery);
    createClientMock.mockReturnValue(supabase as any);

    vi.spyOn(validation, 'validateEmailUniqueness').mockResolvedValue();
    vi.spyOn(validation, 'validatePhoneUniqueness').mockResolvedValue();

    const result = await userService.updateUserProfile('user-1', {
      name: 'New Name',
      email: 'new@example.com',
      phone: null,
      shippingAddress: 'Address',
      postalCode: '12345',
    });

    expect(result).toEqual({
      id: 'user-1',
      uid: 'U-000123',
      email: 'new@example.com',
      phone: null,
      name: 'New Name',
      role: 'USER',
      isVerified: true,
      shippingAddress: 'Address',
      postalCode: '12345',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    });

    expect(updateQuery.update).toHaveBeenCalledWith({
      name: 'New Name',
      email: 'new@example.com',
      phone: null,
      shippingAddress: 'Address',
      postalCode: '12345',
    });
  });

  it('does not throw when updating shipping info fails', async () => {
    const supabase = createSupabaseMock();
    const updateQuery = createQueryMock({ data: null, error: { message: 'x' } });
    supabase.from.mockReturnValue(updateQuery);
    createClientMock.mockReturnValue(supabase as any);

    await expect(
      userService.updateUserShippingInfo('user-1', {
        shippingAddress: 'Addr',
        postalCode: '123',
      })
    ).resolves.toBeUndefined();
  });

  it('changes user password via validation and update', async () => {
    const verifySpy = vi
      .spyOn(password, 'verifyCurrentPassword')
      .mockResolvedValue(true);
    const updateSpy = vi
      .spyOn(password, 'updatePassword')
      .mockResolvedValue();

    await userService.changeUserPassword('user-1', 'old', 'newpassword');

    expect(verifySpy).toHaveBeenCalledWith('user-1', 'old');
    expect(updateSpy).toHaveBeenCalledWith('user-1', 'newpassword');
  });

  it('rejects resetPasswordWithOTP when user is missing', async () => {
    vi.spyOn(password, 'getUserWithPassword').mockResolvedValue(null);

    await expect(
      userService.resetPasswordWithOTP('user-1', 'newpassword')
    ).rejects.toThrow('کاربر یافت نشد');
  });

  it('sets password after ensuring user has none', async () => {
    const ensureSpy = vi
      .spyOn(password, 'ensureNoPassword')
      .mockResolvedValue();
    const updateSpy = vi
      .spyOn(password, 'updatePassword')
      .mockResolvedValue();

    await userService.setUserPassword('user-1', 'newpassword');

    expect(ensureSpy).toHaveBeenCalledWith('user-1');
    expect(updateSpy).toHaveBeenCalledWith('user-1', 'newpassword');
  });

  it('links orphaned transactions and returns count', async () => {
    const supabase = createSupabaseMock();

    const fetchQuery = createQueryMock({
      data: [
        { id: 't1', transactionCode: 'KT-AAA111' },
        { id: 't2', transactionCode: 'KT-BBB222' },
      ],
      error: null,
    });

    const updateQuery = createQueryMock({ data: null, error: null });

    supabase.from.mockReturnValueOnce(fetchQuery).mockReturnValueOnce(updateQuery);
    createClientMock.mockReturnValue(supabase as any);

    const result = await userService.linkOrphanedTransactions(
      'user-1',
      '09120000000'
    );

    expect(result).toBe(2);
    expect(updateQuery.update).toHaveBeenCalledWith({ userId: 'user-1' });
  });
});
