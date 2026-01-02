import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { verifyOTP } from '@/services/otp-service';
import { createUser, getUserByIdentifier } from '@/services/user-service';
import { logUserActivity } from '@/services/activity-log-service';
import { getClientInfo } from '@/lib/request-utils';

vi.mock('@/services/otp-service', () => ({
  verifyOTP: vi.fn(),
}));

vi.mock('@/services/user-service', () => ({
  createUser: vi.fn(),
  getUserByIdentifier: vi.fn(),
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
  new NextRequest('http://localhost/api/auth/checkout-verify-otp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/auth/checkout-verify-otp', () => {
  const verifyOTPMock = vi.mocked(verifyOTP);
  const createUserMock = vi.mocked(createUser);
  const getUserByIdentifierMock = vi.mocked(getUserByIdentifier);
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
    const { POST } = await import('@/app/api/auth/checkout-verify-otp/route');
    return POST;
  }

  it('returns 400 when identifier or code is missing', async () => {
    const POST = await getHandler();

    const response = await POST(createRequest({ phone: '09123456789' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'شماره تلفن یا ایمیل و کد تایید الزامی است',
    });
  });

  it('returns 400 when OTP verification fails', async () => {
    const POST = await getHandler();
    verifyOTPMock.mockResolvedValue({
      success: false,
      error: 'bad otp',
      attemptsLeft: 1,
    } as any);

    const response = await POST(
      createRequest({ phone: '09123456789', code: '1234', purpose: 'login' })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'bad otp',
      attemptsLeft: 1,
    });
  });

  it('returns login action when user already exists', async () => {
    const POST = await getHandler();
    verifyOTPMock.mockResolvedValue({ success: true } as any);
    getUserByIdentifierMock.mockResolvedValue({ id: 'user-1' } as any);

    const response = await POST(
      createRequest({ phone: '09123456789', code: '1234' })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      action: 'login',
      message: 'ورود با موفقیت انجام شد',
      identifier: '09123456789',
    });
    expect(createUserMock).not.toHaveBeenCalled();
  });

  it('creates account when requested and user is new', async () => {
    const POST = await getHandler();
    verifyOTPMock.mockResolvedValue({ success: true } as any);
    getUserByIdentifierMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({ id: 'user-2' } as any);

    const response = await POST(
      createRequest({
        phone: '09123456789',
        code: '1234',
        createAccount: true,
        name: 'New User',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      action: 'register',
      message: 'حساب کاربری با موفقیت ایجاد شد',
      identifier: '09123456789',
    });
    expect(createUserMock).toHaveBeenCalledWith(
      expect.objectContaining({
        phone: '09123456789',
        name: 'New User',
        password: expect.any(String),
      })
    );
    expect(logUserActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityType: 'REGISTER', success: true })
    );
  });

  it('returns 400 when no user and createAccount=false', async () => {
    const POST = await getHandler();
    verifyOTPMock.mockResolvedValue({ success: true } as any);
    getUserByIdentifierMock.mockResolvedValue(null);

    const response = await POST(
      createRequest({
        phone: '09123456789',
        code: '1234',
        createAccount: false,
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'برای ایجاد حساب کاربری، گزینه "ساخت حساب کاربری" را فعال کنید',
    });
  });
});
