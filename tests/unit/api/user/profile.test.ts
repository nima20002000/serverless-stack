import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { createClient } from '@/lib/supabase/server';
import { updateUserProfile } from '@/services/user-service';
import { logUserActivity } from '@/services/activity-log-service';
import { getClientInfo } from '@/lib/request-utils';
import {
  createSupabaseMock,
  createQueryMock,
} from '../../helpers/supabase-mock';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/services/user-service', () => ({
  updateUserProfile: vi.fn(),
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

const createPatchRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/user/profile', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('GET /api/user/profile', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const createClientMock = vi.mocked(createClient);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getHandlers() {
    const { GET } = await import('@/app/api/user/profile/route');
    return { GET };
  }

  it('returns 401 when user is not authenticated', async () => {
    const { GET } = await getHandlers();
    getServerSessionMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Sign in to continue.',
    });
  });

  it('returns user profile with hasPassword flag', async () => {
    const { GET } = await getHandlers();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);

    const supabase = createSupabaseMock();
    const userQuery = createQueryMock({
      data: {
        id: 'user-1',
        uid: 'U1',
        name: 'Test',
        email: 'test@example.com',
        phone: '+12025556789',
        shippingAddress: 'Addr',
        postalCode: '12345',
        isVerified: true,
        role: 'USER',
        createdAt: '2024-01-01T00:00:00.000Z',
        password: 'hashed',
      },
      error: null,
    });
    supabase.from.mockReturnValue(userQuery);
    createClientMock.mockReturnValue(supabase as any);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBe('user-1');
    expect(body.hasPassword).toBe(true);
    expect(body.password).toBeUndefined();
    expect(body.createdAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('returns 404 when user is missing', async () => {
    const { GET } = await getHandlers();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);

    const supabase = createSupabaseMock();
    const userQuery = createQueryMock({ data: null, error: null });
    supabase.from.mockReturnValue(userQuery);
    createClientMock.mockReturnValue(supabase as any);

    const response = await GET();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: 'User not found.',
    });
  });
});

describe('PATCH /api/user/profile', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const updateUserProfileMock = vi.mocked(updateUserProfile);
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

  async function getHandlers() {
    const { PATCH } = await import('@/app/api/user/profile/route');
    return { PATCH };
  }

  it('returns 401 when user is not authenticated', async () => {
    const { PATCH } = await getHandlers();
    getServerSessionMock.mockResolvedValue(null);

    const response = await PATCH(createPatchRequest({ name: 'New' }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Sign in to continue.',
    });
    expect(updateUserProfileMock).not.toHaveBeenCalled();
  });

  it('updates profile and logs activity', async () => {
    const { PATCH } = await getHandlers();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    updateUserProfileMock.mockResolvedValue({
      id: 'user-1',
      name: 'New',
    } as any);
    logUserActivityMock.mockResolvedValue(true as any);

    const response = await PATCH(
      createPatchRequest({ name: 'New', shippingAddress: 'Addr' })
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('Profile updated successfully.');
    expect(updateUserProfileMock).toHaveBeenCalledWith('user-1', {
      name: 'New',
      email: undefined,
      phone: undefined,
      shippingAddress: 'Addr',
      postalCode: undefined,
    });
    expect(logUserActivityMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        activityType: 'PROFILE_UPDATE',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        success: true,
        metadata: { updated_fields: ['name', 'shippingAddress'] },
      })
    );
  });

  it('returns 500 when update fails', async () => {
    const { PATCH } = await getHandlers();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    updateUserProfileMock.mockRejectedValue(new Error('update failed'));

    const response = await PATCH(createPatchRequest({ name: 'New' }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'update failed',
    });
  });
});
