import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAllSettings, updateSettings } from '@/services/settings-service';
import { log } from '@/lib/logger';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/settings-service', () => ({
  getAllSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('admin settings API', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getAllSettingsMock = vi.mocked(getAllSettings);
  const updateSettingsMock = vi.mocked(updateSettings);
  const logMock = vi.mocked(log);

  const adminSession = {
    user: {
      role: 'ADMIN',
      email: 'admin@example.com',
    },
  };

  const createPostRequest = (
    body: unknown,
    headers: Record<string, string> = {}
  ) =>
    new NextRequest('http://localhost/api/admin/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
  const createGetRequest = (headers: Record<string, string> = {}) =>
    new NextRequest('http://localhost/api/admin/settings', {
      method: 'GET',
      headers,
    });

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/settings/route');
    return { GET: handlers.GET, POST: handlers.POST };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    delete process.env.E2E_TEST;
  });

  afterEach(() => {
    delete process.env.E2E_TEST;
  });

  it('GET returns 403 when session is missing', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { GET } = await loadHandlers();

    const response = await GET(createGetRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(getAllSettingsMock).not.toHaveBeenCalled();
  });

  it('GET does not trust x-e2e-test header for auth bypass', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { GET } = await loadHandlers();

    const response = await GET(createGetRequest({ 'x-e2e-test': 'true' }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(getAllSettingsMock).not.toHaveBeenCalled();
  });

  it('GET skips auth only when server E2E mode is enabled', async () => {
    process.env.E2E_TEST = 'true';
    getAllSettingsMock.mockResolvedValue([
      { key: 'siteName', value: 'E2E Store' },
    ]);
    const { GET } = await loadHandlers();

    const response = await GET(createGetRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      settings: [{ key: 'siteName', value: 'E2E Store' }],
    });
    expect(getServerSessionMock).not.toHaveBeenCalled();
    expect(getAllSettingsMock).toHaveBeenCalledTimes(1);
  });

  it('GET returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { GET } = await loadHandlers();

    const response = await GET(createGetRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(getAllSettingsMock).not.toHaveBeenCalled();
  });

  it('GET returns settings for admin users', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getAllSettingsMock.mockResolvedValue([
      { key: 'siteName', value: 'Supabase Vercel Stack' },
      { key: 'supportEmail', value: 'help@example.com' },
    ]);
    const { GET } = await loadHandlers();

    const response = await GET(createGetRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      settings: [
        { key: 'siteName', value: 'Supabase Vercel Stack' },
        { key: 'supportEmail', value: 'help@example.com' },
      ],
    });
    expect(getAllSettingsMock).toHaveBeenCalledTimes(1);
  });

  it('GET returns 500 when settings service fails', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getAllSettingsMock.mockRejectedValue(new Error('db down'));
    const { GET } = await loadHandlers();

    const response = await GET(createGetRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Unable to complete request',
    });
    expect(logMock.error).toHaveBeenCalledWith(
      'Error fetching site settings:',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });

  it('POST returns 403 when session is missing', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { POST } = await loadHandlers();

    const response = await POST(createPostRequest({ settings: {} }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(updateSettingsMock).not.toHaveBeenCalled();
  });

  it('POST does not trust x-e2e-test header for auth bypass', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest(
        { settings: { siteName: 'Header Spoof' } },
        { 'x-e2e-test': 'true' }
      )
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(updateSettingsMock).not.toHaveBeenCalled();
  });

  it('POST skips auth only when server E2E mode is enabled', async () => {
    process.env.E2E_TEST = 'true';
    updateSettingsMock.mockResolvedValue();
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({ settings: { siteName: 'E2E Store' } })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: 'Settings saved successfully',
    });
    expect(getServerSessionMock).not.toHaveBeenCalled();
    expect(updateSettingsMock).toHaveBeenCalledWith({
      siteName: 'E2E Store',
    });
    expect(logMock.info).toHaveBeenCalledWith(
      'Site settings updated',
      expect.objectContaining({
        admin: 'e2e-admin',
        keys: ['siteName'],
      })
    );
  });

  it('POST returns 400 for invalid settings payload', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(createPostRequest({ settings: 'invalid' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid settings payload',
    });
    expect(updateSettingsMock).not.toHaveBeenCalled();
  });

  it('POST updates settings for admin users', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    updateSettingsMock.mockResolvedValue();
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({
        settings: {
          siteName: 'Supabase Vercel Stack',
          supportEmail: 'help@example.com',
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: 'Settings saved successfully',
    });
    expect(updateSettingsMock).toHaveBeenCalledWith({
      siteName: 'Supabase Vercel Stack',
      supportEmail: 'help@example.com',
    });
    expect(logMock.info).toHaveBeenCalledWith(
      'Site settings updated',
      expect.objectContaining({
        admin: 'admin@example.com',
        keys: ['siteName', 'supportEmail'],
      })
    );
  });

  it('POST returns 500 when update fails', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    updateSettingsMock.mockRejectedValue(new Error('db down'));
    const { POST } = await loadHandlers();

    const response = await POST(
      createPostRequest({
        settings: {
          siteName: 'Supabase Vercel Stack',
        },
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'Unable to save settings',
    });
    expect(logMock.error).toHaveBeenCalledWith(
      'Error updating site settings:',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
