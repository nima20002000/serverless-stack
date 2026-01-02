import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { verifyOTP } from '@/services/otp-service';
import { getUserById, resetPasswordWithOTP } from '@/services/user-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/otp-service', () => ({
  verifyOTP: vi.fn(),
}));

vi.mock('@/services/user-service', () => ({
  getUserById: vi.fn(),
  resetPasswordWithOTP: vi.fn(),
}));

vi.mock('@/lib/api/with-logging', () => ({
  withLogging: (fn: Function) => fn,
}));

const createRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/user/reset-password-otp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/user/reset-password-otp', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const verifyOTPMock = vi.mocked(verifyOTP);
  const getUserByIdMock = vi.mocked(getUserById);
  const resetPasswordWithOTPMock = vi.mocked(resetPasswordWithOTP);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getHandler() {
    const { POST } = await import('@/app/api/user/reset-password-otp/route');
    return POST;
  }

  it('returns 401 when user is not authenticated', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await POST(
      createRequest({ otp: '1234', newPassword: 'x' })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'برای دسترسی به این صفحه باید وارد شوید',
    });
  });

  it('returns 400 when required fields are missing', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);

    const response = await POST(createRequest({ otp: '1234' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'کد OTP و رمز عبور جدید الزامی است',
    });
  });

  it('returns 404 when user is not found', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    getUserByIdMock.mockResolvedValue(null);

    const response = await POST(
      createRequest({ otp: '1234', newPassword: 'NewPass123' })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'کاربر یافت نشد',
    });
  });

  it('returns 400 when identifier is missing', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    getUserByIdMock.mockResolvedValue({
      id: 'user-1',
      phone: null,
      email: null,
    } as any);

    const response = await POST(
      createRequest({ otp: '1234', newPassword: 'NewPass123' })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'شماره تلفن یا ایمیل یافت نشد',
    });
  });

  it('returns 400 when OTP verification fails', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    getUserByIdMock.mockResolvedValue({
      id: 'user-1',
      phone: '09123456789',
    } as any);
    verifyOTPMock.mockResolvedValue({
      success: false,
      error: 'bad otp',
      attemptsLeft: 1,
    } as any);

    const response = await POST(
      createRequest({ otp: '1234', newPassword: 'NewPass123' })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'bad otp',
      attemptsLeft: 1,
    });
  });

  it('resets password when OTP is valid', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    getUserByIdMock.mockResolvedValue({
      id: 'user-1',
      phone: '09123456789',
    } as any);
    verifyOTPMock.mockResolvedValue({ success: true } as any);
    resetPasswordWithOTPMock.mockResolvedValue();

    const response = await POST(
      createRequest({ otp: '1234', newPassword: 'NewPass123' })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'رمز عبور با موفقیت بازیابی شد',
    });
    expect(resetPasswordWithOTPMock).toHaveBeenCalledWith(
      'user-1',
      'NewPass123'
    );
  });
});
