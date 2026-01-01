import { describe, it, expect, vi, beforeEach } from 'vitest';
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
      email: 'admin@kitia.ir',
    },
  };

  const createPostRequest = (body: unknown) =>
    new NextRequest('http://localhost/api/admin/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/settings/route');
    return { GET: handlers.GET, POST: handlers.POST };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('GET returns 403 when session is missing', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { GET } = await loadHandlers();

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'غیرمجاز' });
    expect(getAllSettingsMock).not.toHaveBeenCalled();
  });

  it('GET returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { GET } = await loadHandlers();

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'غیرمجاز' });
    expect(getAllSettingsMock).not.toHaveBeenCalled();
  });

  it('GET returns settings for admin users', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getAllSettingsMock.mockResolvedValue([
      { key: 'siteName', value: 'Kitia' },
      { key: 'supportEmail', value: 'help@kitia.ir' },
    ]);
    const { GET } = await loadHandlers();

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      settings: [
        { key: 'siteName', value: 'Kitia' },
        { key: 'supportEmail', value: 'help@kitia.ir' },
      ],
    });
    expect(getAllSettingsMock).toHaveBeenCalledTimes(1);
  });

  it('GET returns 500 when settings service fails', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getAllSettingsMock.mockRejectedValue(new Error('db down'));
    const { GET } = await loadHandlers();

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'خطا در دریافت تنظیمات',
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
    await expect(response.json()).resolves.toEqual({ error: 'غیرمجاز' });
    expect(updateSettingsMock).not.toHaveBeenCalled();
  });

  it('POST returns 400 for invalid settings payload', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { POST } = await loadHandlers();

    const response = await POST(createPostRequest({ settings: 'invalid' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'داده‌های نامعتبر',
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
          siteName: 'Kitia',
          supportEmail: 'help@kitia.ir',
        },
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      message: 'تنظیمات با موفقیت ذخیره شد',
    });
    expect(updateSettingsMock).toHaveBeenCalledWith({
      siteName: 'Kitia',
      supportEmail: 'help@kitia.ir',
    });
    expect(logMock.info).toHaveBeenCalledWith(
      'Site settings updated',
      expect.objectContaining({
        admin: 'admin@kitia.ir',
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
          siteName: 'Kitia',
        },
      })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'خطا در ذخیره تنظیمات',
    });
    expect(logMock.error).toHaveBeenCalledWith(
      'Error updating site settings:',
      expect.objectContaining({ error: expect.any(Error) })
    );
  });
});
