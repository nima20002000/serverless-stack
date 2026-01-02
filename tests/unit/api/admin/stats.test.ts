import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { getDashboardStats } from '@/services/admin-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/admin-service', () => ({
  getDashboardStats: vi.fn(),
}));

describe('admin stats API', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getDashboardStatsMock = vi.mocked(getDashboardStats);

  const adminSession = {
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@kitia.ir',
    },
  };

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/stats/route');
    return { GET: handlers.GET };
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
    await expect(response.json()).resolves.toEqual({ error: 'دسترسی غیرمجاز' });
    expect(getDashboardStatsMock).not.toHaveBeenCalled();
  });

  it('GET returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { GET } = await loadHandlers();

    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'دسترسی غیرمجاز' });
    expect(getDashboardStatsMock).not.toHaveBeenCalled();
  });

  it('GET returns dashboard stats for admin', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getDashboardStatsMock.mockResolvedValue({
      users: 10,
      transactions: 5,
      revenue: 120000,
    });
    const { GET } = await loadHandlers();

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      users: 10,
      transactions: 5,
      revenue: 120000,
    });
    expect(getDashboardStatsMock).toHaveBeenCalledTimes(1);
  });

  it('GET returns 500 when service throws', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getDashboardStatsMock.mockRejectedValue(new Error('stats failed'));
    const { GET } = await loadHandlers();

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'stats failed' });
  });
});
