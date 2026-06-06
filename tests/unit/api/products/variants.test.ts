import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  getProductVariants,
  createProductVariant,
  batchCreateProductVariants,
  batchUpdateProductVariants,
  updateProductVariant,
  deleteProductVariant,
  reorderProductVariants,
} from '@/services/product-service';
import { log } from '@/lib/logger';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/product-service', () => ({
  getProductVariants: vi.fn(),
  createProductVariant: vi.fn(),
  batchCreateProductVariants: vi.fn(),
  batchUpdateProductVariants: vi.fn(),
  updateProductVariant: vi.fn(),
  deleteProductVariant: vi.fn(),
  reorderProductVariants: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

const adminSession = { user: { id: 'admin-1', role: 'ADMIN' } };

const createVariantsRequest = (id: string) =>
  new NextRequest(`http://localhost/api/products/${id}/variants`);

const createVariantsPostRequest = (id: string, body: unknown) =>
  new NextRequest(`http://localhost/api/products/${id}/variants`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const createVariantsPatchRequest = (id: string, body: unknown) =>
  new NextRequest(`http://localhost/api/products/${id}/variants`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const createVariantPutRequest = (
  id: string,
  variantId: string,
  body: unknown
) =>
  new NextRequest(`http://localhost/api/products/${id}/variants/${variantId}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const createReorderRequest = (id: string, body: unknown) =>
  new NextRequest(`http://localhost/api/products/${id}/variants/reorder`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('GET /api/products/[id]/variants', () => {
  const getProductVariantsMock = vi.mocked(getProductVariants);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { GET } = await import('@/app/api/products/[id]/variants/route');
    return { GET };
  };

  it('returns variants list', async () => {
    const { GET } = await loadHandler();
    getProductVariantsMock.mockResolvedValue([{ id: 'v1' }]);

    const response = await GET(createVariantsRequest('p1'), {
      params: { id: 'p1' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      variants: [{ id: 'v1' }],
    });
  });

  it('returns 500 when service fails', async () => {
    const { GET } = await loadHandler();
    getProductVariantsMock.mockRejectedValue(new Error('boom'));

    const response = await GET(createVariantsRequest('p1'), {
      params: { id: 'p1' },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'boom' });
  });
});

describe('POST /api/products/[id]/variants', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const createProductVariantMock = vi.mocked(createProductVariant);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { POST } = await import('@/app/api/products/[id]/variants/route');
    return { POST };
  };

  it('returns 403 for non-admin users', async () => {
    const { POST } = await loadHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await POST(
      createVariantsPostRequest('p1', { name: 'Variant', stock: 1 }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
    expect(createProductVariantMock).not.toHaveBeenCalled();
  });

  it('returns 400 when name is missing', async () => {
    const { POST } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);

    const response = await POST(createVariantsPostRequest('p1', { stock: 1 }), {
      params: { id: 'p1' },
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Variant name is required',
    });
  });

  it('returns 400 when stock is invalid', async () => {
    const { POST } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);

    const response = await POST(
      createVariantsPostRequest('p1', { name: 'Variant', stock: -1 }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Variant stock cannot be negative',
    });
  });

  it('creates variant with defaults', async () => {
    const { POST } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    createProductVariantMock.mockResolvedValue({ id: 'v1' } as any);

    const response = await POST(
      createVariantsPostRequest('p1', {
        name: 'Variant',
        stock: 2,
        priceAdjust: undefined,
        isActive: true,
      }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ variant: { id: 'v1' } });
    expect(createProductVariantMock).toHaveBeenCalledWith({
      productId: 'p1',
      name: 'Variant',
      sku: undefined,
      color: undefined,
      size: undefined,
      material: undefined,
      priceAdjust: 0,
      stock: 2,
      isActive: true,
      swatchImageUrl: undefined,
      swatchCrop: undefined,
    });
  });

  it('forwards swatch fields for single variant creation', async () => {
    const { POST } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    createProductVariantMock.mockResolvedValue({ id: 'v1' } as any);

    const response = await POST(
      createVariantsPostRequest('p1', {
        name: 'Blue',
        stock: 2,
        swatchImageUrl: '/media/blue.jpg',
        swatchCrop: { x: 20, y: 70, zoom: 2 },
      }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(201);
    expect(createProductVariantMock).toHaveBeenCalledWith(
      expect.objectContaining({
        swatchImageUrl: '/media/blue.jpg',
        swatchCrop: { x: 20, y: 70, zoom: 2 },
      })
    );
  });

  it('forwards swatch fields for batch variant creation', async () => {
    const { POST } = await loadHandler();
    const batchCreateMock = vi.mocked(batchCreateProductVariants);
    getServerSessionMock.mockResolvedValue(adminSession as any);
    batchCreateMock.mockResolvedValue({ variants: [], idMapping: {} });

    const response = await POST(
      createVariantsPostRequest('p1', {
        variants: [
          {
            tempId: 'temp-1',
            name: 'Blue',
            stock: 2,
            swatchImageUrl: '/media/blue.jpg',
            swatchCrop: { x: 20, y: 70, zoom: 2 },
          },
        ],
      }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(201);
    expect(batchCreateMock).toHaveBeenCalledWith('p1', [
      expect.objectContaining({
        tempId: 'temp-1',
        swatchImageUrl: '/media/blue.jpg',
        swatchCrop: { x: 20, y: 70, zoom: 2 },
      }),
    ]);
  });

  it('returns 500 when service fails', async () => {
    const { POST } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    createProductVariantMock.mockRejectedValue(new Error('boom'));

    const response = await POST(
      createVariantsPostRequest('p1', { name: 'Variant', stock: 1 }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'boom' });
  });

  it('returns 400 when swatch ownership validation fails', async () => {
    const { POST } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    createProductVariantMock.mockRejectedValue(
      new Error(
        'Variant swatch image must reference existing product or variant media'
      )
    );

    const response = await POST(
      createVariantsPostRequest('p1', {
        name: 'Blue',
        stock: 1,
        swatchImageUrl: '/media/missing.jpg',
        swatchCrop: { x: 20, y: 60, zoom: 2 },
      }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        'Variant swatch image must reference existing product or variant media',
    });
  });

  it('returns 400 when swatch crop validation fails', async () => {
    const { POST } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    createProductVariantMock.mockRejectedValue(
      new Error(
        'Variant swatch crop values must be finite numbers within allowed bounds'
      )
    );

    const response = await POST(
      createVariantsPostRequest('p1', {
        name: 'Blue',
        stock: 1,
        swatchImageUrl: '/media/blue.jpg',
        swatchCrop: { x: 20, y: 101, zoom: 2 },
      }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        'Variant swatch crop values must be finite numbers within allowed bounds',
    });
  });
});

describe('PUT /api/products/[id]/variants/[variantId]', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const updateProductVariantMock = vi.mocked(updateProductVariant);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { PUT } =
      await import('@/app/api/products/[id]/variants/[variantId]/route');
    return { PUT };
  };

  it('returns 403 for non-admin users', async () => {
    const { PUT } = await loadHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await PUT(
      createVariantPutRequest('p1', 'v1', { name: 'Variant', stock: 1 }),
      { params: { id: 'p1', variantId: 'v1' } }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('returns 400 when name is missing', async () => {
    const { PUT } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);

    const response = await PUT(
      createVariantPutRequest('p1', 'v1', { stock: 1 }),
      { params: { id: 'p1', variantId: 'v1' } }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Variant name is required',
    });
  });

  it('returns 400 when stock is invalid', async () => {
    const { PUT } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);

    const response = await PUT(
      createVariantPutRequest('p1', 'v1', { name: 'Variant', stock: -1 }),
      { params: { id: 'p1', variantId: 'v1' } }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Variant stock cannot be negative',
    });
  });

  it('updates variant for admins', async () => {
    const { PUT } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    updateProductVariantMock.mockResolvedValue({ id: 'v1' } as any);

    const response = await PUT(
      createVariantPutRequest('p1', 'v1', {
        name: 'Variant',
        stock: 3,
        priceAdjust: 2,
        isActive: false,
      }),
      { params: { id: 'p1', variantId: 'v1' } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ variant: { id: 'v1' } });
    expect(updateProductVariantMock).toHaveBeenCalledWith('v1', {
      name: 'Variant',
      sku: undefined,
      color: undefined,
      size: undefined,
      material: undefined,
      priceAdjust: 2,
      stock: 3,
      isActive: false,
      swatchImageUrl: undefined,
      swatchCrop: undefined,
    });
  });

  it('forwards swatch fields for variant updates', async () => {
    const { PUT } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    updateProductVariantMock.mockResolvedValue({ id: 'v1' } as any);

    const response = await PUT(
      createVariantPutRequest('p1', 'v1', {
        name: 'Blue',
        stock: 3,
        swatchImageUrl: '/media/blue.jpg',
        swatchCrop: { x: 30, y: 60, zoom: 1.5 },
      }),
      { params: { id: 'p1', variantId: 'v1' } }
    );

    expect(response.status).toBe(200);
    expect(updateProductVariantMock).toHaveBeenCalledWith(
      'v1',
      expect.objectContaining({
        swatchImageUrl: '/media/blue.jpg',
        swatchCrop: { x: 30, y: 60, zoom: 1.5 },
      })
    );
  });

  it('returns 500 when service fails', async () => {
    const { PUT } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    updateProductVariantMock.mockRejectedValue(new Error('boom'));

    const response = await PUT(
      createVariantPutRequest('p1', 'v1', { name: 'Variant', stock: 1 }),
      { params: { id: 'p1', variantId: 'v1' } }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'boom' });
  });

  it('returns 400 when swatch validation fails', async () => {
    const { PUT } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    updateProductVariantMock.mockRejectedValue(
      new Error(
        'Variant swatch crop values must be finite numbers within allowed bounds'
      )
    );

    const response = await PUT(
      createVariantPutRequest('p1', 'v1', {
        name: 'Blue',
        stock: 1,
        swatchImageUrl: '/media/blue.jpg',
        swatchCrop: { x: 20, y: 60, zoom: 5 },
      }),
      { params: { id: 'p1', variantId: 'v1' } }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        'Variant swatch crop values must be finite numbers within allowed bounds',
    });
  });
});

describe('DELETE /api/products/[id]/variants/[variantId]', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const deleteProductVariantMock = vi.mocked(deleteProductVariant);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { DELETE } =
      await import('@/app/api/products/[id]/variants/[variantId]/route');
    return { DELETE };
  };

  it('returns 403 for non-admin users', async () => {
    const { DELETE } = await loadHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await DELETE(createVariantsRequest('p1'), {
      params: { id: 'p1', variantId: 'v1' },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('deletes variant for admins', async () => {
    const { DELETE } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    deleteProductVariantMock.mockResolvedValue(undefined);

    const response = await DELETE(createVariantsRequest('p1'), {
      params: { id: 'p1', variantId: 'v1' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it('returns 500 when service fails', async () => {
    const { DELETE } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    deleteProductVariantMock.mockRejectedValue(new Error('boom'));

    const response = await DELETE(createVariantsRequest('p1'), {
      params: { id: 'p1', variantId: 'v1' },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'boom' });
  });
});

describe('PATCH /api/products/[id]/variants', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const batchUpdateMock = vi.mocked(batchUpdateProductVariants);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { PATCH } = await import('@/app/api/products/[id]/variants/route');
    return { PATCH };
  };

  it('forwards swatch fields for batch variant updates', async () => {
    const { PATCH } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    batchUpdateMock.mockResolvedValue({ updated: 1 });

    const response = await PATCH(
      createVariantsPatchRequest('p1', {
        variants: [
          {
            id: 'v1',
            name: 'Blue',
            stock: 3,
            swatchImageUrl: '/media/blue.jpg',
            swatchCrop: { x: 30, y: 60, zoom: 1.5 },
          },
        ],
      }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(200);
    expect(batchUpdateMock).toHaveBeenCalledWith('p1', [
      expect.objectContaining({
        id: 'v1',
        swatchImageUrl: '/media/blue.jpg',
        swatchCrop: { x: 30, y: 60, zoom: 1.5 },
      }),
    ]);
  });

  it('returns 400 when batch swatch validation fails', async () => {
    const { PATCH } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    batchUpdateMock.mockRejectedValue(
      new Error(
        'Variant swatch image must reference existing product or variant media'
      )
    );

    const response = await PATCH(
      createVariantsPatchRequest('p1', {
        variants: [
          {
            id: 'v1',
            name: 'Blue',
            stock: 3,
            swatchImageUrl: '/media/missing.jpg',
            swatchCrop: { x: 30, y: 60, zoom: 1.5 },
          },
        ],
      }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error:
        'Variant swatch image must reference existing product or variant media',
    });
  });

  it('returns 400 when batch variant product ownership validation fails', async () => {
    const { PATCH } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    batchUpdateMock.mockRejectedValue(
      new Error('Product variants must belong to the requested product')
    );

    const response = await PATCH(
      createVariantsPatchRequest('p1', {
        variants: [
          {
            id: 'v-from-other-product',
            name: 'Blue',
            stock: 3,
            swatchImageUrl: '/media/blue.jpg',
            swatchCrop: { x: 30, y: 60, zoom: 1.5 },
          },
        ],
      }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Product variants must belong to the requested product',
    });
  });
});

describe('PATCH /api/products/[id]/variants/reorder', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const reorderProductVariantsMock = vi.mocked(reorderProductVariants);
  const logMock = vi.mocked(log);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { PATCH } =
      await import('@/app/api/products/[id]/variants/reorder/route');
    return { PATCH };
  };

  it('returns 403 for non-admin users', async () => {
    const { PATCH } = await loadHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await PATCH(
      createReorderRequest('p1', { variantOrders: [] }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('returns 400 for invalid payload', async () => {
    const { PATCH } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);

    const response = await PATCH(
      createReorderRequest('p1', { variantOrders: 'bad' }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'variantOrders must be an array of { id, order } objects',
    });
  });

  it('returns 400 when items are missing fields', async () => {
    const { PATCH } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);

    const response = await PATCH(
      createReorderRequest('p1', { variantOrders: [{ id: 'v1' }] }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Variant ID and display order are required',
    });
  });

  it('reorders variants for admins', async () => {
    const { PATCH } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    reorderProductVariantsMock.mockResolvedValue(undefined);

    const response = await PATCH(
      createReorderRequest('p1', {
        variantOrders: [
          { id: 'v1', order: 1 },
          { id: 'v2', order: 2 },
        ],
      }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      message: 'Product variants reordered successfully',
    });
    expect(reorderProductVariantsMock).toHaveBeenCalledWith('p1', [
      { id: 'v1', order: 1 },
      { id: 'v2', order: 2 },
    ]);
    expect(logMock.info).toHaveBeenCalledWith(
      'Variants reordered successfully',
      expect.objectContaining({ productId: 'p1', count: 2 })
    );
  });

  it('returns 500 when service fails', async () => {
    const { PATCH } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    reorderProductVariantsMock.mockRejectedValue(new Error('boom'));

    const response = await PATCH(
      createReorderRequest('p1', { variantOrders: [{ id: 'v1', order: 1 }] }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'boom' });
    expect(logMock.error).toHaveBeenCalled();
  });
});
