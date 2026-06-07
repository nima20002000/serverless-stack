import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSupabaseMock, createQueryMock } from '../helpers/supabase-mock';
import { createClient } from '@/lib/supabase/server';
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
  const loadUserService = () => import('@/services/user-service');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('generates next UID based on highest UID', async () => {
    const userService = await loadUserService();
    const supabase = createSupabaseMock();
    const query = createQueryMock({ data: { uid: 'U-000123' }, error: null });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(userService.generateNextUID()).resolves.toBe('U-000124');
  });

  it('rejects createUser when no identifier is provided', async () => {
    const userService = await loadUserService();
    await expect(userService.createUser({ name: 'Test User' })).rejects.toThrow(
      'Email or phone number is required.'
    );
  });

  it('rejects createUser when user already exists', async () => {
    const userService = await loadUserService();
    vi.spyOn(queries, 'checkUserExists').mockResolvedValue(true);

    await expect(
      userService.createUser({
        name: 'User',
        email: 'user@example.com',
        password: 'password123',
      })
    ).rejects.toThrow(
      'An account with this email or phone number already exists.'
    );
  });

  it('creates user and returns sanitized data', async () => {
    const userService = await loadUserService();
    const supabase = createSupabaseMock();

    const uidQuery = createQueryMock({
      data: { uid: 'U-000998' },
      error: null,
    });
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

    supabase.from
      .mockReturnValueOnce(uidQuery)
      .mockReturnValueOnce(insertQuery);

    createClientMock.mockReturnValue(supabase as unknown);

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
  });

  it('updates user profile and normalizes dates', async () => {
    const userService = await loadUserService();
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
        shippingCountry: null,
        shippingRegion: null,
        shippingCity: null,
        shippingAddressLine1: 'Address',
        shippingAddressLine2: null,
        postalCode: '12345',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
      error: null,
    });

    supabase.from.mockReturnValue(updateQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    vi.spyOn(validation, 'validateEmailUniqueness').mockResolvedValue();
    vi.spyOn(validation, 'validatePhoneUniqueness').mockResolvedValue();

    const result = await userService.updateUserProfile('user-1', {
      name: 'New Name',
      email: 'new@example.com',
      phone: '',
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
      shippingCountry: null,
      shippingRegion: null,
      shippingCity: null,
      shippingAddressLine1: 'Address',
      shippingAddressLine2: null,
      postalCode: '12345',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-02T00:00:00.000Z'),
    });

    expect(updateQuery.update).toHaveBeenCalledWith({
      name: 'New Name',
      email: 'new@example.com',
      phone: null,
      shippingAddress: 'Address',
      shippingCountry: null,
      shippingRegion: null,
      shippingCity: null,
      shippingAddressLine1: 'Address',
      shippingAddressLine2: null,
      postalCode: '12345',
    });
  });

  it('preserves existing profile address fields during partial address updates', async () => {
    const userService = await loadUserService();
    const supabase = createSupabaseMock();
    const updateQuery = createQueryMock({
      data: {
        id: 'user-1',
        uid: 'U-000123',
        email: 'user@example.com',
        phone: null,
        name: 'User',
        role: 'USER',
        isVerified: true,
        shippingAddress: '42 Example Street\nBerlin, BE, 10117\nGermany',
        shippingCountry: 'Germany',
        shippingRegion: 'BE',
        shippingCity: 'Berlin',
        shippingAddressLine1: '42 Example Street',
        shippingAddressLine2: null,
        postalCode: '10117',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
      error: null,
    });

    supabase.from.mockReturnValue(updateQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    vi.spyOn(validation, 'validateEmailUniqueness').mockResolvedValue();
    vi.spyOn(validation, 'validatePhoneUniqueness').mockResolvedValue();
    vi.spyOn(queries, 'queryUser').mockResolvedValue({
      id: 'user-1',
      uid: 'U-000123',
      email: 'user@example.com',
      phone: null,
      name: 'User',
      role: 'USER',
      isVerified: true,
      shippingAddress: '42 Example Street\nBerlin, BE, 10115\nGermany',
      shippingCountry: 'Germany',
      shippingRegion: 'BE',
      shippingCity: 'Berlin',
      shippingAddressLine1: '42 Example Street',
      shippingAddressLine2: null,
      postalCode: '10115',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    });

    await userService.updateUserProfile('user-1', {
      postalCode: '10117',
    });

    expect(updateQuery.update).toHaveBeenCalledWith({
      shippingAddress: '42 Example Street\nBerlin, BE, 10117\nGermany',
      shippingCountry: 'Germany',
      shippingRegion: 'BE',
      shippingCity: 'Berlin',
      shippingAddressLine1: '42 Example Street',
      shippingAddressLine2: null,
      postalCode: '10117',
    });
  });

  it('keeps migrated legacy profile addresses legacy when unchanged blank structured fields are submitted', async () => {
    const userService = await loadUserService();
    const supabase = createSupabaseMock();
    const updateQuery = createQueryMock({
      data: {
        id: 'user-1',
        uid: 'U-000123',
        email: 'user@example.com',
        phone: null,
        name: 'User',
        role: 'USER',
        isVerified: true,
        shippingAddress: '123 Legacy Street',
        shippingCountry: null,
        shippingRegion: null,
        shippingCity: null,
        shippingAddressLine1: '123 Legacy Street',
        shippingAddressLine2: null,
        postalCode: '10001',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
      error: null,
    });

    supabase.from.mockReturnValue(updateQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    vi.spyOn(validation, 'validateEmailUniqueness').mockResolvedValue();
    vi.spyOn(validation, 'validatePhoneUniqueness').mockResolvedValue();
    vi.spyOn(queries, 'queryUser').mockResolvedValue({
      id: 'user-1',
      uid: 'U-000123',
      email: 'user@example.com',
      phone: null,
      name: 'User',
      role: 'USER',
      isVerified: true,
      shippingAddress: '123 Legacy Street',
      shippingCountry: null,
      shippingRegion: null,
      shippingCity: null,
      shippingAddressLine1: '123 Legacy Street',
      shippingAddressLine2: null,
      postalCode: null,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    });

    await userService.updateUserProfile('user-1', {
      name: 'User',
      shippingAddress: '123 Legacy Street',
      shippingCountry: '',
      shippingRegion: '',
      shippingCity: '',
      shippingAddressLine1: '123 Legacy Street',
      shippingAddressLine2: '',
      postalCode: '10001',
    });

    expect(updateQuery.update).toHaveBeenCalledWith({
      name: 'User',
      shippingAddress: '123 Legacy Street',
      shippingCountry: null,
      shippingRegion: null,
      shippingCity: null,
      shippingAddressLine1: '123 Legacy Street',
      shippingAddressLine2: null,
      postalCode: '10001',
    });
  });

  it('normalizes formatted phone numbers before updating profile', async () => {
    const userService = await loadUserService();
    const supabase = createSupabaseMock();
    const updateQuery = createQueryMock({
      data: {
        id: 'user-1',
        uid: 'U-000123',
        email: null,
        phone: '+12125551234',
        name: 'New Name',
        role: 'USER',
        isVerified: true,
        shippingAddress: null,
        postalCode: null,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
      },
      error: null,
    });

    supabase.from.mockReturnValue(updateQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    vi.spyOn(validation, 'validateEmailUniqueness').mockResolvedValue();
    vi.spyOn(validation, 'validatePhoneUniqueness').mockResolvedValue();

    await userService.updateUserProfile('user-1', {
      name: 'New Name',
      phone: '+1 (212) 555-1234',
    });

    expect(validation.validatePhoneUniqueness).toHaveBeenCalledWith(
      '+12125551234',
      'user-1'
    );
    expect(updateQuery.update).toHaveBeenCalledWith({
      name: 'New Name',
      phone: '+12125551234',
    });
  });

  it('normalizes formatted phone numbers before querying by phone', async () => {
    const userService = await loadUserService();
    const querySpy = vi.spyOn(queries, 'queryUser').mockResolvedValue(null);

    await userService.getUserByPhone('+1 (212) 555-1234');

    expect(querySpy).toHaveBeenCalledWith({ phone: '+12125551234' });
  });

  it('normalizes formatted phone identifiers before querying by identifier', async () => {
    const userService = await loadUserService();
    const querySpy = vi.spyOn(queries, 'queryUser').mockResolvedValue(null);

    await userService.getUserByIdentifier('+1 (212) 555-1234');

    expect(querySpy).toHaveBeenCalledWith({ phone: '+12125551234' });
  });

  it('does not throw when updating shipping info fails', async () => {
    const userService = await loadUserService();
    const supabase = createSupabaseMock();
    const updateQuery = createQueryMock({
      data: null,
      error: { message: 'x' },
    });
    supabase.from.mockReturnValue(updateQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(
      userService.updateUserShippingInfo('user-1', {
        shippingAddress: 'Addr',
        postalCode: '123',
      })
    ).resolves.toBeUndefined();
  });

  it('changes user password via validation and update', async () => {
    const userService = await loadUserService();
    const verifySpy = vi
      .spyOn(password, 'verifyCurrentPassword')
      .mockResolvedValue(true);
    const updateSpy = vi.spyOn(password, 'updatePassword').mockResolvedValue();

    await userService.changeUserPassword('user-1', 'old', 'newpassword');

    expect(verifySpy).toHaveBeenCalledWith('user-1', 'old');
    expect(updateSpy).toHaveBeenCalledWith('user-1', 'newpassword');
  });

  it('rejects resetPasswordWithOTP when user is missing', async () => {
    const userService = await loadUserService();
    vi.spyOn(password, 'getUserWithPassword').mockResolvedValue(null);

    await expect(
      userService.resetPasswordWithOTP('user-1', 'newpassword')
    ).rejects.toThrow('User not found.');
  });

  it('sets password after ensuring user has none', async () => {
    const userService = await loadUserService();
    const ensureSpy = vi
      .spyOn(password, 'ensureNoPassword')
      .mockResolvedValue();
    const updateSpy = vi.spyOn(password, 'updatePassword').mockResolvedValue();

    await userService.setUserPassword('user-1', 'newpassword');

    expect(ensureSpy).toHaveBeenCalledWith('user-1');
    expect(updateSpy).toHaveBeenCalledWith('user-1', 'newpassword');
  });

  it('links orphaned transactions and returns count', async () => {
    const userService = await loadUserService();
    const supabase = createSupabaseMock();

    const fetchResponse = {
      data: [
        { id: 't1', transactionCode: 'KT-AAA111' },
        { id: 't2', transactionCode: 'KT-BBB222' },
      ],
      error: null,
    };
    const updateResponse = { data: null, error: null };

    const fetchPromise = Promise.resolve(fetchResponse);
    const updatePromise = Promise.resolve(updateResponse);

    const fetchQuery: unknown = Object.assign(fetchPromise, {
      select: vi.fn(() => fetchQuery),
      in: vi.fn(() => fetchQuery),
      eq: vi.fn(() => fetchQuery),
      is: vi.fn(() => fetchQuery),
    });

    const updateQuery: unknown = Object.assign(updatePromise, {
      update: vi.fn(() => updateQuery),
      in: vi.fn(() => updateQuery),
      eq: vi.fn(() => updateQuery),
      is: vi.fn(() => updateQuery),
    });

    supabase.from
      .mockReturnValueOnce(fetchQuery)
      .mockReturnValueOnce(updateQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await userService.linkOrphanedTransactions(
      'user-1',
      '+12025550000'
    );

    expect(result).toBe(2);
    expect(fetchQuery.in).toHaveBeenCalledWith('phone', [
      '+12025550000',
      '2025550000',
      '12025550000',
    ]);
    expect(updateQuery.in).toHaveBeenCalledWith('phone', [
      '+12025550000',
      '2025550000',
      '12025550000',
    ]);
    expect(updateQuery.update).toHaveBeenCalledWith({ userId: 'user-1' });
  });
});
