import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createUser } from '@/services/user-service';
import { logUserActivity } from '@/services/activity-log-service';
import { getClientInfo } from '@/lib/request-utils';

vi.mock('@/services/user-service', () => ({
  createUser: vi.fn(),
  detectIdentifierType: vi.fn((identifier: string) =>
    identifier.includes('@') ? 'email' : 'phone'
  ),
}));

vi.mock('@/services/activity-log-service', () => ({
  logUserActivity: vi.fn(),
}));

vi.mock('@/lib/request-utils', () => ({
  getClientInfo: vi.fn(),
}));

vi.mock('@/lib/api/with-logging', () => ({
  withLogging: (fn: Function) => fn,
}));

vi.mock('@/lib/logger', () => ({
  log: {
    warn: vi.fn(),
  },
}));

const createRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/auth/register', () => {
  const createUserMock = vi.mocked(createUser);
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
    const { POST } = await import('@/app/api/auth/register/route');
    return POST;
  }

  it('returns 400 when required fields are missing', async () => {
    const POST = await getHandler();

    const response = await POST(createRequest({ email: 'test@example.com' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'ایمیل یا شماره تلفن به همراه رمز عبور الزامی هستند',
    });
  });

  it('creates user and returns 201 on success', async () => {
    const POST = await getHandler();
    createUserMock.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
    } as any);

    const response = await POST(
      createRequest({
        email: 'test@example.com',
        password: 'Pass1234',
        name: 'Test User',
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'ثبت‌نام با موفقیت انجام شد',
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      },
    });
    expect(createUserMock).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Pass1234',
      name: 'Test User',
    });
    expect(logUserActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityType: 'REGISTER', success: true })
    );
  });

  it('returns 400 when createUser throws', async () => {
    const POST = await getHandler();
    createUserMock.mockRejectedValue(new Error('duplicate'));

    const response = await POST(
      createRequest({ email: 'test@example.com', password: 'Pass1234' })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'duplicate',
    });
    expect(logUserActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityType: 'REGISTER', success: false })
    );
  });
});
