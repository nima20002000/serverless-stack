import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getServerSession } from 'next-auth';
import { getActivePromoCode } from '@/services/promo-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/promo-service', () => ({
  getActivePromoCode: vi.fn(),
}));

describe('GET /api/promo/active', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getActivePromoCodeMock = vi.mocked(getActivePromoCode);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getHandler() {
    const { GET } = await import('@/app/api/promo/active/route');
    return GET;
  }

  it('returns 401 when user is not authenticated', async () => {
    const GET = await getHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Authentication is required',
    });
    expect(getActivePromoCodeMock).not.toHaveBeenCalled();
  });

  it('returns promo code for authenticated users', async () => {
    const GET = await getHandler();
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1' },
    } as any);
    getActivePromoCodeMock.mockResolvedValue({ id: 'promo-1' } as any);

    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      promoCode: { id: 'promo-1' },
    });
    expect(getActivePromoCodeMock).toHaveBeenCalledWith('user-1');
  });

  it('returns 500 when service throws', async () => {
    const GET = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    getActivePromoCodeMock.mockRejectedValue(new Error('fail'));

    const response = await GET();

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'fail' });
  });
});
