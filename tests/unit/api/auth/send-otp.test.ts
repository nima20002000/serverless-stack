import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { sendOTP } from '@/services/otp-service';
import {
  validatePhone,
  validateEmail,
  getUserByIdentifier,
} from '@/services/user-service';
import { logUserActivity } from '@/services/activity-log-service';
import { getClientInfo } from '@/lib/request-utils';

vi.mock('@/services/otp-service', () => ({
  sendOTP: vi.fn(),
}));

vi.mock('@/services/user-service', () => ({
  validatePhone: vi.fn(),
  validateEmail: vi.fn(),
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
  new NextRequest('http://localhost/api/auth/send-otp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/auth/send-otp', () => {
  const sendOTPMock = vi.mocked(sendOTP);
  const validatePhoneMock = vi.mocked(validatePhone);
  const validateEmailMock = vi.mocked(validateEmail);
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
    validatePhoneMock.mockReturnValue(true);
    validateEmailMock.mockReturnValue(true);
    getUserByIdentifierMock.mockResolvedValue(null);
    logUserActivityMock.mockResolvedValue(true as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getHandler() {
    const { POST } = await import('@/app/api/auth/send-otp/route');
    return POST;
  }

  it('returns 400 when identifier is missing', async () => {
    const POST = await getHandler();

    const response = await POST(createRequest({ purpose: 'register' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'ایمیل یا شماره تلفن الزامی است',
    });
  });

  it('returns 400 for invalid phone format', async () => {
    const POST = await getHandler();
    validatePhoneMock.mockReturnValue(false);

    const response = await POST(
      createRequest({ phone: '0912', purpose: 'register' })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'شماره تلفن نامعتبر است. فرمت صحیح: 09xxxxxxxxx',
    });
  });

  it('returns 400 for invalid email format', async () => {
    const POST = await getHandler();
    validateEmailMock.mockReturnValue(false);

    const response = await POST(
      createRequest({ email: 'bad-email', purpose: 'register' })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'فرمت ایمیل نامعتبر است',
    });
  });

  it('returns 400 for invalid purpose', async () => {
    const POST = await getHandler();

    const response = await POST(
      createRequest({ phone: '09123456789', purpose: 'other' })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'نوع درخواست نامعتبر است',
    });
  });

  it('returns 400 when user already exists for register', async () => {
    const POST = await getHandler();
    getUserByIdentifierMock.mockResolvedValue({ id: 'user-1' } as any);

    const response = await POST(
      createRequest({ phone: '09123456789', purpose: 'register' })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'کاربری با این ایمیل یا شماره تلفن قبلاً ثبت‌نام کرده است',
    });
  });

  it('returns 404 when user is missing for login', async () => {
    const POST = await getHandler();
    getUserByIdentifierMock.mockResolvedValue(null);

    const response = await POST(
      createRequest({ phone: '09123456789', purpose: 'login' })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'کاربری با این مشخصات یافت نشد',
    });
  });

  it('returns 400 when user exists for checkout', async () => {
    const POST = await getHandler();
    getUserByIdentifierMock.mockResolvedValue({ id: 'user-1' } as any);

    const response = await POST(
      createRequest({ phone: '09123456789', purpose: 'checkout' })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'این شماره قبلاً ثبت‌نام شده است. لطفاً وارد حساب کاربری خود شوید',
    });
  });

  it('returns 429 when OTP rate limit hits', async () => {
    const POST = await getHandler();
    getUserByIdentifierMock.mockResolvedValue({ id: 'user-1' } as any);
    sendOTPMock.mockResolvedValue({
      success: false,
      error: 'slow down',
      errorCode: 'RATE_LIMIT',
      expiresAt: '2024-01-01T00:00:00.000Z',
    } as any);

    const response = await POST(
      createRequest({ phone: '09123456789', purpose: 'login' })
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: 'slow down',
      expiresAt: '2024-01-01T00:00:00.000Z',
    });
    expect(logUserActivityMock).toHaveBeenCalled();
  });

  it('returns 500 when OTP send fails', async () => {
    const POST = await getHandler();
    getUserByIdentifierMock.mockResolvedValue({ id: 'user-1' } as any);
    sendOTPMock.mockResolvedValue({
      success: false,
      error: 'send failed',
      errorCode: 'SEND_FAILED',
      expiresAt: '2024-01-01T00:00:00.000Z',
    } as any);

    const response = await POST(
      createRequest({ phone: '09123456789', purpose: 'login' })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'send failed',
      expiresAt: '2024-01-01T00:00:00.000Z',
    });
  });

  it('returns success payload for email', async () => {
    const POST = await getHandler();
    sendOTPMock.mockResolvedValue({
      success: true,
      expiresAt: '2024-01-01T00:00:00.000Z',
    } as any);

    const response = await POST(
      createRequest({ email: 'test@example.com', purpose: 'register' })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'کد تایید به ایمیل شما ارسال شد',
      expiresIn: 300,
      expiresAt: '2024-01-01T00:00:00.000Z',
    });
    expect(sendOTPMock).toHaveBeenCalledWith('test@example.com', 'register');
  });
});
