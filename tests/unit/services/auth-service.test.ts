import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  type MockedFunction,
} from 'vitest';
import { createQueryMock, createSupabaseMock } from '../helpers/supabase-mock';
import {
  authenticateUser,
  authenticateUserByEmail,
  authenticateUserByPhone,
} from '@/services/auth-service';
import { createClient } from '@/lib/supabase/server';
import * as userService from '@/services/user-service';
import bcrypt from 'bcryptjs';

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

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
  },
}));

describe('auth-service', () => {
  const createClientMock = vi.mocked(createClient);
  const compareMock = vi.mocked(bcrypt.compare) as unknown as MockedFunction<
    (data: string, hash: string) => Promise<boolean>
  >;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects missing identifier or password', async () => {
    await expect(authenticateUser('', 'pass')).rejects.toThrow(
      'ایمیل/شماره تلفن و رمز عبور الزامی است'
    );
    await expect(authenticateUser('user@example.com', '')).rejects.toThrow(
      'ایمیل/شماره تلفن و رمز عبور الزامی است'
    );
  });

  it('rejects invalid identifier format', async () => {
    await expect(authenticateUser('not-an-id', 'password123')).rejects.toThrow(
      'فرمت ایمیل یا شماره تلفن نامعتبر است'
    );
  });

  it('rejects login when user has no password', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({
      data: {
        id: 'user-1',
        email: 'user@example.com',
        phone: null,
        name: 'Test User',
        role: 'USER',
        password: null,
      },
      error: null,
    });

    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(
      authenticateUser('user@example.com', 'password123')
    ).rejects.toThrow('این حساب رمز عبور ندارد. لطفاً با پشتیبانی تماس بگیرید');
    expect(supabase.from).toHaveBeenCalledWith('users');
    expect(query.eq).toHaveBeenCalledWith('email', 'user@example.com');
  });

  it('rejects invalid password', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({
      data: {
        id: 'user-1',
        email: 'user@example.com',
        phone: null,
        name: 'Test User',
        role: 'USER',
        password: 'hashed',
      },
      error: null,
    });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as unknown);
    compareMock.mockResolvedValue(false);

    await expect(
      authenticateUser('user@example.com', 'password123')
    ).rejects.toThrow('رمز عبور اشتباه است');
  });

  it('authenticates with email and returns normalized user', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({
      data: {
        id: 'user-1',
        email: 'user@example.com',
        phone: null,
        name: 'Test User',
        role: 'USER',
        password: 'hashed',
      },
      error: null,
    });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as unknown);
    compareMock.mockResolvedValue(true);

    const result = await authenticateUser('user@example.com', 'password123');

    expect(result).toEqual({
      id: 'user-1',
      email: 'user@example.com',
      phone: null,
      name: 'Test User',
      role: 'USER',
    });
  });

  it('authenticates user by phone and links orphaned transactions', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({
      data: {
        id: 'user-2',
        email: null,
        phone: '09120000000',
        name: 'Phone User',
        role: 'USER',
      },
      error: null,
    });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as unknown);

    const linkSpy = vi
      .spyOn(userService, 'linkOrphanedTransactions')
      .mockResolvedValue(2);

    const result = await authenticateUserByPhone('09120000000');

    expect(result).toEqual({
      id: 'user-2',
      email: null,
      phone: '09120000000',
      name: 'Phone User',
      role: 'USER',
    });
    expect(linkSpy).toHaveBeenCalledWith('user-2', '09120000000');
  });

  it('authenticates user by email without password', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({
      data: {
        id: 'user-3',
        email: 'otp@example.com',
        phone: null,
        name: 'Email OTP',
        role: 'USER',
      },
      error: null,
    });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await authenticateUserByEmail('otp@example.com');

    expect(result).toEqual({
      id: 'user-3',
      email: 'otp@example.com',
      phone: null,
      name: 'Email OTP',
      role: 'USER',
    });
  });
});
