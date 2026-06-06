import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAllProducts } from '@/services/product-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/product-service', () => ({
  getAllProducts: vi.fn(),
}));

describe('admin products API', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getAllProductsMock = vi.mocked(getAllProducts);

  const adminSession = {
    user: {
      id: 'admin-1',
      role: 'ADMIN',
      email: 'admin@example.com',
    },
  };

  const createRequest = (query: Record<string, string> = {}) => {
    const url = new URL('http://localhost/api/admin/products');
    Object.entries(query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
    return new NextRequest(url);
  };

  const loadHandlers = async () => {
    const handlers = await import('@/app/api/admin/products/route');
    return { GET: handlers.GET };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('GET returns 403 when session is missing', async () => {
    getServerSessionMock.mockResolvedValue(null);
    const { GET } = await loadHandlers();

    const response = await GET(createRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(getAllProductsMock).not.toHaveBeenCalled();
  });

  it('GET returns 403 when user is not admin', async () => {
    getServerSessionMock.mockResolvedValue({
      user: { role: 'USER' },
    } as any);
    const { GET } = await loadHandlers();

    const response = await GET(createRequest());

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(getAllProductsMock).not.toHaveBeenCalled();
  });

  it('GET returns products with parsed filters and numeric prices', async () => {
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getAllProductsMock.mockResolvedValue({
      data: [{ id: 'p1', name: 'Chair', price: '19.99' as any }],
      total: 1,
      page: 2,
      perPage: 25,
      totalPages: 1,
    });
    const { GET } = await loadHandlers();

    const response = await GET(
      createRequest({
        page: '2',
        perPage: '25',
        search: 'chair',
        status: 'inactive',
        stock: 'low',
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [{ id: 'p1', name: 'Chair', price: 19.99 }],
      total: 1,
      page: 2,
      perPage: 25,
      totalPages: 1,
    });
    expect(getAllProductsMock).toHaveBeenCalledWith({
      page: 2,
      perPage: 25,
      includeInactive: true,
      includeRelations: false,
      search: 'chair',
      status: 'inactive',
      stock: 'low',
    });
  });

  it('GET returns 500 when product loading fails', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getAllProductsMock.mockRejectedValue(new Error('product db down'));
    const { GET } = await loadHandlers();

    const response = await GET(createRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: 'product db down',
    });
  });
});
