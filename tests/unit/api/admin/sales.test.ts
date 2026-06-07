import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getSalesAnalytics } from '@/services/sales-analytics-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/sales-analytics-service', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/services/sales-analytics-service')>();
  return {
    ...actual,
    getSalesAnalytics: vi.fn(),
  };
});

vi.mock('@/lib/logger', () => ({
  log: {
    error: vi.fn(),
  },
}));

describe('admin sales analytics API', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getSalesAnalyticsMock = vi.mocked(getSalesAnalytics);
  const adminSession = {
    user: { id: 'admin-1', role: 'ADMIN', email: 'admin@example.com' },
  };

  const createRequest = (query = '') =>
    new NextRequest(`http://localhost/api/admin/sales${query}`);

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/sales/route');
    return { GET: handlers.GET };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('returns 403 when the user is not an admin', async () => {
    getServerSessionMock.mockResolvedValue({ user: { role: 'USER' } } as any);
    const { GET } = await loadHandlers();

    const response = await GET(createRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(getSalesAnalyticsMock).not.toHaveBeenCalled();
  });

  it('passes validated filters to the sales analytics service', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getSalesAnalyticsMock.mockResolvedValue({
      filters: {
        startDate: '2026-06-01',
        endDate: '2026-06-07',
        groupBy: 'week',
        timezone: 'UTC',
      },
      summary: {
        completedRevenue: 100,
        totalSalesRevenue: 110,
        completedOrders: 1,
        averageOrderValue: 100,
        totalAttempts: 2,
        pendingAttempts: 1,
        failedAttempts: 0,
        paymentSuccessRate: 50,
        discountTotal: 10,
      },
      timeline: [],
      breakdowns: { status: [], paymentProvider: [], customerType: [] },
      topProducts: [],
      topVariants: [],
      attentionList: [],
    });
    const { GET } = await loadHandlers();

    const response = await GET(
      createRequest('?startDate=2026-06-01&endDate=2026-06-07&groupBy=week')
    );

    expect(response.status).toBe(200);
    expect(getSalesAnalyticsMock).toHaveBeenCalledWith({
      startDate: '2026-06-01',
      endDate: '2026-06-07',
      groupBy: 'week',
    });
    await expect(response.json()).resolves.toMatchObject({
      summary: { completedRevenue: 100 },
    });
  });

  it('returns 400 for invalid date filters', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    const { GET } = await loadHandlers();

    const response = await GET(
      createRequest('?startDate=2026-06-08&endDate=2026-06-07')
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'startDate must be on or before endDate',
    });
    expect(getSalesAnalyticsMock).not.toHaveBeenCalled();
  });

  it('returns 500 when the service fails after valid filters', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getSalesAnalyticsMock.mockRejectedValue(new Error('analytics failed'));
    const { GET } = await loadHandlers();

    const response = await GET(
      createRequest('?startDate=2026-06-01&endDate=2026-06-07')
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'analytics failed',
    });
  });
});
