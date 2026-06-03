import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  getActiveProducts,
  createProduct,
  getProductById,
  updateProduct,
  deleteProduct,
} from '@/services/product-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/product-service', () => ({
  getActiveProducts: vi.fn(),
  createProduct: vi.fn(),
  getProductById: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
}));

vi.mock('@/lib/api/with-cache', () => ({
  withCache: (fn: Function) => fn,
}));

vi.mock('@/lib/api/with-logging', () => ({
  withLogging: (fn: Function) => fn,
}));

const adminSession = { user: { id: 'admin-1', role: 'ADMIN' } };

const createProductsRequest = (query = '') =>
  new NextRequest(`http://localhost/api/products${query}`);

const createProductsPostRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/products', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const createProductRequest = (id: string, query = '') =>
  new NextRequest(`http://localhost/api/products/${id}${query}`);

const createProductPutRequest = (id: string, body: unknown) =>
  new NextRequest(`http://localhost/api/products/${id}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('GET /api/products', () => {
  const getActiveProductsMock = vi.mocked(getActiveProducts);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { GET } = await import('@/app/api/products/route');
    return { GET };
  };

  it('returns serialized products and respects sort params', async () => {
    const { GET } = await loadHandler();
    getActiveProductsMock.mockResolvedValue({
      data: [
        {
          id: 'p1',
          name: 'Product',
          price: '12.5',
          discountPercent: 10,
          isFeatured: true,
          variants: [{ id: 'v1', priceAdjust: '2.5' }],
        },
      ],
      total: 1,
    } as any);

    const response = await GET(
      createProductsRequest('?page=2&perPage=5&sortBy=price-asc')
    );
    const body = await response.json();

    expect(getActiveProductsMock).toHaveBeenCalledWith({
      page: 2,
      perPage: 5,
      sortBy: 'price-asc',
    });
    expect(response.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.data[0].price).toBe(12.5);
    expect(body.data[0].variants[0].priceAdjust).toBe(2.5);
  });

  it('falls back to newest when sortBy is invalid', async () => {
    const { GET } = await loadHandler();
    getActiveProductsMock.mockResolvedValue({ data: [], total: 0 } as any);

    const response = await GET(createProductsRequest('?sortBy=invalid'));

    expect(response.status).toBe(200);
    expect(getActiveProductsMock).toHaveBeenCalledWith({
      page: 1,
      perPage: 20,
      sortBy: 'newest',
    });
  });

  it('returns 500 when service fails', async () => {
    const { GET } = await loadHandler();
    getActiveProductsMock.mockRejectedValue(new Error('boom'));

    const response = await GET(createProductsRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'boom' });
  });
});

describe('POST /api/products', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const createProductMock = vi.mocked(createProduct);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { POST } = await import('@/app/api/products/route');
    return { POST };
  };

  it('returns 403 for non-admin users', async () => {
    const { POST } = await loadHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await POST(
      createProductsPostRequest({ name: 'Test', description: 'Desc' })
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it('returns 400 when required fields are missing', async () => {
    const { POST } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);

    const response = await POST(
      createProductsPostRequest({ description: 'Desc', price: 10, stock: 2 })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Required fields are missing',
    });
    expect(createProductMock).not.toHaveBeenCalled();
  });

  it('creates product with parsed values', async () => {
    const { POST } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    createProductMock.mockResolvedValue({ id: 'p1' } as any);

    const response = await POST(
      createProductsPostRequest({
        name: 'Test',
        description: 'Desc',
        price: '12.5',
        discountPercent: '10',
        stock: '5',
        images: undefined,
        categoryId: null,
        tagIds: ['t1'],
      })
    );

    expect(response.status).toBe(201);
    expect(createProductMock).toHaveBeenCalledWith({
      name: 'Test',
      description: 'Desc',
      price: 12.5,
      discountPercent: 10,
      stock: 5,
      images: [],
      categoryId: undefined,
      tagIds: ['t1'],
      hasVariants: false,
      isFeatured: false,
      isActive: true,
    });
  });

  it('returns 400 when service throws', async () => {
    const { POST } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    createProductMock.mockRejectedValue(new Error('bad'));

    const response = await POST(
      createProductsPostRequest({
        name: 'Test',
        description: 'Desc',
        price: 10,
        stock: 2,
      })
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'bad' });
  });
});

describe('GET /api/products/[id]', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const getProductByIdMock = vi.mocked(getProductById);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { GET } = await import('@/app/api/products/[id]/route');
    return { GET };
  };

  it('prevents includeInactive for non-admin sessions', async () => {
    const { GET } = await loadHandler();
    getServerSessionMock.mockResolvedValue({ user: { role: 'USER' } } as any);
    getProductByIdMock.mockResolvedValue({
      id: 'p1',
      price: '10',
      variants: [{ id: 'v1', priceAdjust: '2' }],
    } as any);

    const response = await GET(
      createProductRequest('p1', '?includeRelations=true&includeInactive=true'),
      { params: { id: 'p1' } }
    );
    const body = await response.json();

    expect(getProductByIdMock).toHaveBeenCalledWith('p1', true, false);
    expect(body.product.price).toBe(10);
    expect(body.product.variants[0].priceAdjust).toBe(2);
  });

  it('allows includeInactive for admin sessions', async () => {
    const { GET } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    getProductByIdMock.mockResolvedValue({ id: 'p1', price: 10 } as any);

    const response = await GET(
      createProductRequest('p1', '?includeInactive=true'),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(200);
    expect(getProductByIdMock).toHaveBeenCalledWith('p1', false, true);
  });

  it('returns 404 when service fails', async () => {
    const { GET } = await loadHandler();
    getProductByIdMock.mockRejectedValue(new Error('missing'));

    const response = await GET(createProductRequest('p1'), {
      params: { id: 'p1' },
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'missing' });
  });
});

describe('PUT /api/products/[id]', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const updateProductMock = vi.mocked(updateProduct);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { PUT } = await import('@/app/api/products/[id]/route');
    return { PUT };
  };

  it('returns 403 for non-admin users', async () => {
    const { PUT } = await loadHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await PUT(
      createProductPutRequest('p1', { name: 'Test' }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(updateProductMock).not.toHaveBeenCalled();
  });

  it('updates product with parsed values', async () => {
    const { PUT } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    updateProductMock.mockResolvedValue({ id: 'p1' } as any);

    const response = await PUT(
      createProductPutRequest('p1', {
        name: 'New',
        price: '9.5',
        discountPercent: null,
        stock: '4',
        images: ['img'],
        hasVariants: true,
        isFeatured: false,
        isActive: true,
        categoryId: 'c1',
        tagIds: ['t1'],
      }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(200);
    expect(updateProductMock).toHaveBeenCalledWith('p1', {
      name: 'New',
      price: 9.5,
      discountPercent: null,
      stock: 4,
      images: ['img'],
      hasVariants: true,
      isFeatured: false,
      isActive: true,
      categoryId: 'c1',
      tagIds: ['t1'],
    });
  });

  it('returns 400 when service throws', async () => {
    const { PUT } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    updateProductMock.mockRejectedValue(new Error('bad'));

    const response = await PUT(createProductPutRequest('p1', { name: 'New' }), {
      params: { id: 'p1' },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'bad' });
  });
});

describe('DELETE /api/products/[id]', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const deleteProductMock = vi.mocked(deleteProduct);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { DELETE } = await import('@/app/api/products/[id]/route');
    return { DELETE };
  };

  it('returns 403 for non-admin users', async () => {
    const { DELETE } = await loadHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await DELETE(createProductRequest('p1'), {
      params: { id: 'p1' },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(deleteProductMock).not.toHaveBeenCalled();
  });

  it('deletes product for admins', async () => {
    const { DELETE } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    deleteProductMock.mockResolvedValue(undefined);

    const response = await DELETE(createProductRequest('p1'), {
      params: { id: 'p1' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Product deleted successfully',
    });
  });

  it('returns 400 when service throws', async () => {
    const { DELETE } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    deleteProductMock.mockRejectedValue(new Error('bad'));

    const response = await DELETE(createProductRequest('p1'), {
      params: { id: 'p1' },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'bad' });
  });
});
