import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { changeUserPassword, setUserPassword } from '@/services/user-service';
import { logUserActivity } from '@/services/activity-log-service';
import { getClientInfo } from '@/lib/request-utils';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/user-service', () => ({
  changeUserPassword: vi.fn(),
  setUserPassword: vi.fn(),
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

const createRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/user/password', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/user/password', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const changeUserPasswordMock = vi.mocked(changeUserPassword);
  const setUserPasswordMock = vi.mocked(setUserPassword);
  const logUserActivityMock = vi.mocked(logUserActivity);
  const getClientInfoMock = vi.mocked(getClientInfo);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    getClientInfoMock.mockReturnValue({
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getHandler() {
    const { POST } = await import('@/app/api/user/password/route');
    return POST;
  }

  it('returns 401 when user is not authenticated', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await POST(createRequest({ newPassword: 'NewPass123' }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Sign in to continue.',
    });
    expect(setUserPasswordMock).not.toHaveBeenCalled();
  });

  it('returns 400 when new password is missing', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);

    const response = await POST(createRequest({ action: 'set' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'New password is required.',
    });
  });

  it('sets password when action is set', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    setUserPasswordMock.mockResolvedValue();
    logUserActivityMock.mockResolvedValue(true as any);

    const response = await POST(
      createRequest({ action: 'set', newPassword: 'NewPass123' })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: 'Password set successfully.',
    });
    expect(setUserPasswordMock).toHaveBeenCalledWith('user-1', 'NewPass123');
    expect(logUserActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        activityType: 'PASSWORD_CHANGE',
        success: true,
        metadata: { action: 'set' },
      })
    );
  });

  it('returns 400 when current password is missing for change action', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);

    const response = await POST(
      createRequest({ action: 'change', newPassword: 'NewPass123' })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Current password is required.',
    });
    expect(changeUserPasswordMock).not.toHaveBeenCalled();
  });

  it('changes password when action is change', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    changeUserPasswordMock.mockResolvedValue();
    logUserActivityMock.mockResolvedValue(true as any);

    const response = await POST(
      createRequest({
        action: 'change',
        currentPassword: 'OldPass',
        newPassword: 'NewPass123',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: 'Password changed successfully.',
    });
    expect(changeUserPasswordMock).toHaveBeenCalledWith(
      'user-1',
      'OldPass',
      'NewPass123'
    );
    expect(logUserActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        activityType: 'PASSWORD_CHANGE',
        success: true,
        metadata: { action: 'change' },
      })
    );
  });

  it('returns 500 and logs failure when password change fails', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    changeUserPasswordMock.mockRejectedValue(new Error('bad change'));
    logUserActivityMock.mockResolvedValue(true as any);

    const response = await POST(
      createRequest({
        action: 'change',
        currentPassword: 'OldPass',
        newPassword: 'NewPass123',
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'bad change',
    });
    expect(logUserActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        activityType: 'PASSWORD_CHANGE',
        success: false,
        errorMessage: 'bad change',
      })
    );
  });
});
