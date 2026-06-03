import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { validatePromoCode } from '@/services/promo-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/promo-service', () => ({
  validatePromoCode: vi.fn(),
}));

const createRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/promo/validate', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('POST /api/promo/validate', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const validatePromoCodeMock = vi.mocked(validatePromoCode);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function getHandler() {
    const { POST } = await import('@/app/api/promo/validate/route');
    return POST;
  }

  it('returns 400 when promo code is missing', async () => {
    const POST = await getHandler();

    const response = await POST(createRequest({ subtotal: 50000 }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Promo code is required',
    });
    expect(validatePromoCodeMock).not.toHaveBeenCalled();
  });

  it('returns 400 when subtotal is invalid', async () => {
    const POST = await getHandler();

    const response = await POST(createRequest({ code: 'SAVE10', subtotal: 0 }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Invalid amount',
    });
    expect(validatePromoCodeMock).not.toHaveBeenCalled();
  });

  it('returns 400 when promo code is not valid', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-1' },
    } as any);
    validatePromoCodeMock.mockResolvedValue({
      valid: false,
      error: 'Code Invalid',
    });

    const response = await POST(
      createRequest({ code: 'SAVE10', subtotal: 50000 })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'Code Invalid' });
    expect(validatePromoCodeMock).toHaveBeenCalledWith(
      'SAVE10',
      50000,
      'user-1'
    );
  });

  it('returns discount info when promo code is valid', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue({
      user: { id: 'user-2' },
    } as any);
    validatePromoCodeMock.mockResolvedValue({
      valid: true,
      promoCode: {
        code: 'SAVE10',
        discountType: 'PERCENT',
        discountValue: 10,
      } as any,
      discountAmount: 5000,
    });

    const response = await POST(
      createRequest({ code: 'SAVE10', subtotal: 50000 })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      valid: true,
      code: 'SAVE10',
      discountType: 'PERCENT',
      discountValue: 10,
      discountAmount: 5000,
      finalAmount: 45000,
    });
  });

  it('returns 500 when validation throws', async () => {
    const POST = await getHandler();
    getServerSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as any);
    validatePromoCodeMock.mockRejectedValue(new Error('boom'));

    const response = await POST(
      createRequest({ code: 'SAVE10', subtotal: 50000 })
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'boom' });
  });
});
