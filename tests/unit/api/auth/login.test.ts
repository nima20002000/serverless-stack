import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { authenticateUser } from '@/services/auth-service';
import { logUserActivity } from '@/services/activity-log-service';
import { getClientInfo } from '@/lib/request-utils';

vi.mock('@/services/auth-service', () => ({
  authenticateUser: vi.fn(),
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
  new NextRequest('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/auth/login', () => {
  const authenticateUserMock = vi.mocked(authenticateUser);
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
    const { POST } = await import('@/app/api/auth/login/route');
    return POST;
  }

  it('returns 400 when credentials are missing', async () => {
    const POST = await getHandler();

    const response = await POST(createRequest({ email: 'test@example.com' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'ایمیل و رمز عبور الزامی است',
    });
  });

  it('returns user data and credentials on success', async () => {
    const POST = await getHandler();
    authenticateUserMock.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
    } as any);

    const response = await POST(
      createRequest({ email: 'test@example.com', password: 'Pass1234' })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      user: {
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'USER',
      },
    });
    expect(logUserActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityType: 'LOGIN_SUCCESS', success: true })
    );
  });

  it('returns 401 when authentication fails', async () => {
    const POST = await getHandler();
    authenticateUserMock.mockRejectedValue(new Error('invalid creds'));

    const response = await POST(
      createRequest({ email: 'test@example.com', password: 'bad' })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'invalid creds',
    });
    expect(logUserActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityType: 'LOGIN_FAILED', success: false })
    );
  });
});
