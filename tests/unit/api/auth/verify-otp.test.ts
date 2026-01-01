import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { verifyOTP } from '@/services/otp-service';
import { createUser, getUserByIdentifier } from '@/services/user-service';
import { authenticateUserByPhone } from '@/services/auth-service';
import { logUserActivity } from '@/services/activity-log-service';
import { getClientInfo } from '@/lib/request-utils';

vi.mock('@/services/otp-service', () => ({
  verifyOTP: vi.fn(),
}));

vi.mock('@/services/user-service', () => ({
  createUser: vi.fn(),
  getUserByIdentifier: vi.fn(),
}));

vi.mock('@/services/auth-service', () => ({
  authenticateUserByPhone: vi.fn(),
}));

vi.mock('@/services/activity-log-service', () => ({
  logUserActivity: vi.fn(),
}));

vi.mock('@/lib/request-utils', () => ({
  getClientInfo: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const createRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/auth/verify-otp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/auth/verify-otp', () => {
  const verifyOTPMock = vi.mocked(verifyOTP);
  const createUserMock = vi.mocked(createUser);
  const getUserByIdentifierMock = vi.mocked(getUserByIdentifier);
  const authenticateUserByPhoneMock = vi.mocked(authenticateUserByPhone);
  const logUserActivityMock = vi.mocked(logUserActivity);
  const getClientInfoMock = vi.mocked(getClientInfo);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    getClientInfoMock.mockReturnValue({
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });
    logUserActivityMock.mockResolvedValue(true as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getHandler() {
    const { POST } = await import('@/app/api/auth/verify-otp/route');
    return POST;
  }

  it('returns 400 when identifier or otp is missing', async () => {
    const POST = await getHandler();

    const response = await POST(createRequest({ phone: '09123456789' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'ایمیل یا شماره تلفن و کد تایید الزامی است',
    });
  });

  it('returns 400 when OTP verification fails', async () => {
    const POST = await getHandler();
    verifyOTPMock.mockResolvedValue({
      success: false,
      error: 'bad otp',
      attemptsLeft: 2,
    } as any);

    const response = await POST(
      createRequest({ phone: '09123456789', otp: '1234', purpose: 'login' })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'bad otp',
      attemptsLeft: 2,
    });
    expect(logUserActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        activityType: 'OTP_FAILED',
        success: false,
      })
    );
  });

  it('returns 400 when registering without password', async () => {
    const POST = await getHandler();
    verifyOTPMock.mockResolvedValue({ success: true } as any);

    const response = await POST(
      createRequest({ phone: '09123456789', otp: '1234', purpose: 'register' })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'رمز عبور الزامی است',
    });
  });

  it('creates user and returns data for registration', async () => {
    const POST = await getHandler();
    verifyOTPMock.mockResolvedValue({ success: true } as any);
    createUserMock.mockResolvedValue({
      id: 'user-1',
      phone: '09123456789',
      email: null,
      name: 'Test User',
      role: 'USER',
    } as any);

    const response = await POST(
      createRequest({
        phone: '09123456789',
        otp: '1234',
        purpose: 'register',
        password: 'Pass1234',
        name: 'Test User',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'ثبت‌نام با موفقیت انجام شد',
      user: {
        id: 'user-1',
        phone: '09123456789',
        email: null,
        name: 'Test User',
        role: 'USER',
      },
    });
    expect(createUserMock).toHaveBeenCalledWith({
      phone: '09123456789',
      name: 'Test User',
      password: 'Pass1234',
    });
    expect(logUserActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityType: 'OTP_VERIFIED', success: true })
    );
    expect(logUserActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityType: 'REGISTER', success: true })
    );
  });

  it('returns 404 when login user is missing', async () => {
    const POST = await getHandler();
    verifyOTPMock.mockResolvedValue({ success: true } as any);
    authenticateUserByPhoneMock.mockResolvedValue(null as any);

    const response = await POST(
      createRequest({ phone: '09123456789', otp: '1234', purpose: 'login' })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'کاربری با این مشخصات یافت نشد',
    });
  });

  it('returns user data for login via phone', async () => {
    const POST = await getHandler();
    verifyOTPMock.mockResolvedValue({ success: true } as any);
    authenticateUserByPhoneMock.mockResolvedValue({
      id: 'user-2',
      phone: '09123456789',
      email: null,
      name: 'Phone User',
      role: 'USER',
    } as any);

    const response = await POST(
      createRequest({ phone: '09123456789', otp: '1234', purpose: 'login' })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'ورود با موفقیت انجام شد',
      user: {
        id: 'user-2',
        phone: '09123456789',
        email: null,
        name: 'Phone User',
        role: 'USER',
      },
    });
    expect(authenticateUserByPhoneMock).toHaveBeenCalledWith('09123456789');
    expect(logUserActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityType: 'LOGIN_SUCCESS', success: true })
    );
  });

  it('returns user data for login via email', async () => {
    const POST = await getHandler();
    verifyOTPMock.mockResolvedValue({ success: true } as any);
    getUserByIdentifierMock.mockResolvedValue({
      id: 'user-3',
      phone: null,
      email: 'test@example.com',
      name: 'Email User',
      role: 'USER',
    } as any);

    const response = await POST(
      createRequest({
        email: 'test@example.com',
        otp: '1234',
        purpose: 'login',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'ورود با موفقیت انجام شد',
      user: {
        id: 'user-3',
        phone: null,
        email: 'test@example.com',
        name: 'Email User',
        role: 'USER',
      },
    });
    expect(getUserByIdentifierMock).toHaveBeenCalledWith('test@example.com');
  });
});
