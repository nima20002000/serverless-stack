import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  type MockedFunction,
} from 'vitest';
import {
  validatePassword,
  hashPassword,
  verifyPassword,
  getUserWithPassword,
  updatePassword,
  verifyCurrentPassword,
  ensureNoPassword,
} from '@/services/user-service/password';
import { createClient } from '@/lib/supabase/server';
import bcrypt from 'bcryptjs';
import { createSupabaseMock, createQueryMock } from '../helpers/supabase-mock';

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
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

describe('user-service password', () => {
  const createClientMock = vi.mocked(createClient);
  const hashMock = vi.mocked(bcrypt.hash) as unknown as MockedFunction<
    (data: string, salt: number) => Promise<string>
  >;
  const compareMock = vi.mocked(bcrypt.compare) as unknown as MockedFunction<
    (data: string, hash: string) => Promise<boolean>
  >;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('validates password length', () => {
    expect(validatePassword('short')).toBe(false);
    expect(validatePassword('long-enough')).toBe(true);
  });

  it('hashes and verifies passwords', async () => {
    hashMock.mockResolvedValue('hashed');
    compareMock.mockResolvedValue(true);

    await expect(hashPassword('secret')).resolves.toBe('hashed');
    await expect(verifyPassword('secret', 'hashed')).resolves.toBe(true);

    expect(hashMock).toHaveBeenCalledWith('secret', 10);
    expect(compareMock).toHaveBeenCalledWith('secret', 'hashed');
  });

  it('fetches user password or returns null', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({ data: null, error: { message: 'no' } });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await getUserWithPassword('user-1');
    expect(result).toBeNull();
  });

  it('updates password after hashing', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({ data: null, error: null });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as unknown);
    hashMock.mockResolvedValue('hashed');

    await updatePassword('user-1', 'newpassword');

    expect(query.update).toHaveBeenCalledWith({ password: 'hashed' });
    expect(query.eq).toHaveBeenCalledWith('id', 'user-1');
  });

  it('rejects invalid new password', async () => {
    await expect(updatePassword('user-1', 'short')).rejects.toThrow(
      'Password must be at least 8 characters.'
    );
  });

  it('verifies current password when required', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({
      data: { id: 'user-1', password: 'hashed' },
      error: null,
    });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as unknown);
    compareMock.mockResolvedValue(false);

    await expect(verifyCurrentPassword('user-1', 'wrong')).rejects.toThrow(
      'Current password is incorrect.'
    );
  });

  it('allows password change when no password exists', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({
      data: { id: 'user-1', password: null },
      error: null,
    });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(verifyCurrentPassword('user-1', '')).resolves.toBe(true);
  });

  it('ensures user has no password for set-password flow', async () => {
    const supabase = createSupabaseMock();
    const query = createQueryMock({
      data: { id: 'user-1', password: 'hashed' },
      error: null,
    });
    supabase.from.mockReturnValue(query);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(ensureNoPassword('user-1')).rejects.toThrow(
      'This account already has a password.'
    );
  });
});
