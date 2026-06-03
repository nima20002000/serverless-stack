import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import {
  getProductMedia,
  addProductMedia,
  updateProductMedia,
  deleteProductMedia,
} from '@/services/product-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/services/product-service', () => ({
  getProductMedia: vi.fn(),
  addProductMedia: vi.fn(),
  updateProductMedia: vi.fn(),
  deleteProductMedia: vi.fn(),
}));

const adminSession = { user: { role: 'ADMIN' } };

const createMediaRequest = (id: string) =>
  new NextRequest(`http://localhost/api/products/${id}/media`);

const createMediaPostRequest = (id: string, body: unknown) =>
  new NextRequest(`http://localhost/api/products/${id}/media`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const createMediaPatchRequest = (id: string, mediaId: string, body: unknown) =>
  new NextRequest(`http://localhost/api/products/${id}/media/${mediaId}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('GET /api/products/[id]/media', () => {
  const getProductMediaMock = vi.mocked(getProductMedia);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { GET } = await import('@/app/api/products/[id]/media/route');
    return { GET };
  };

  it('returns media list', async () => {
    const { GET } = await loadHandler();
    getProductMediaMock.mockResolvedValue([{ id: 'm1' }]);

    const response = await GET(createMediaRequest('p1'), {
      params: { id: 'p1' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      media: [{ id: 'm1' }],
    });
  });

  it('returns 500 when service fails', async () => {
    const { GET } = await loadHandler();
    getProductMediaMock.mockRejectedValue(new Error('boom'));

    const response = await GET(createMediaRequest('p1'), {
      params: { id: 'p1' },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'boom' });
  });
});

describe('POST /api/products/[id]/media', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const addProductMediaMock = vi.mocked(addProductMedia);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { POST } = await import('@/app/api/products/[id]/media/route');
    return { POST };
  };

  it('returns 403 for non-admin users', async () => {
    const { POST } = await loadHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await POST(
      createMediaPostRequest('p1', { type: 'image', url: 'x' }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('returns 400 when required fields are missing', async () => {
    const { POST } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);

    const response = await POST(
      createMediaPostRequest('p1', { type: 'image' }),
      {
        params: { id: 'p1' },
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Product ID and media URL are required',
    });
  });

  it('adds media for admins', async () => {
    const { POST } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    addProductMediaMock.mockResolvedValue({ id: 'm1' } as any);

    const response = await POST(
      createMediaPostRequest('p1', {
        type: 'image',
        url: 'http://img',
        alt: 'alt',
        order: 1,
        isDefault: true,
      }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ media: { id: 'm1' } });
    expect(addProductMediaMock).toHaveBeenCalledWith({
      productId: 'p1',
      variantId: undefined,
      type: 'image',
      url: 'http://img',
      alt: 'alt',
      order: 1,
      isDefault: true,
    });
  });

  it('returns 500 when service fails', async () => {
    const { POST } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    addProductMediaMock.mockRejectedValue(new Error('boom'));

    const response = await POST(
      createMediaPostRequest('p1', { type: 'image', url: 'x' }),
      { params: { id: 'p1' } }
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'boom' });
  });
});

describe('PATCH /api/products/[id]/media/[mediaId]', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const updateProductMediaMock = vi.mocked(updateProductMedia);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { PATCH } =
      await import('@/app/api/products/[id]/media/[mediaId]/route');
    return { PATCH };
  };

  it('returns 403 for non-admin users', async () => {
    const { PATCH } = await loadHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await PATCH(createMediaPatchRequest('p1', 'm1', {}), {
      params: { id: 'p1', mediaId: 'm1' },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('updates media for admins', async () => {
    const { PATCH } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    updateProductMediaMock.mockResolvedValue({ id: 'm1' } as any);

    const response = await PATCH(
      createMediaPatchRequest('p1', 'm1', { alt: 'new', order: 2 }),
      { params: { id: 'p1', mediaId: 'm1' } }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ media: { id: 'm1' } });
    expect(updateProductMediaMock).toHaveBeenCalledWith('m1', {
      alt: 'new',
      order: 2,
      isDefault: undefined,
    });
  });

  it('returns 500 when service fails', async () => {
    const { PATCH } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    updateProductMediaMock.mockRejectedValue(new Error('boom'));

    const response = await PATCH(createMediaPatchRequest('p1', 'm1', {}), {
      params: { id: 'p1', mediaId: 'm1' },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'boom' });
  });
});

describe('DELETE /api/products/[id]/media/[mediaId]', () => {
  const getServerSessionMock = vi.mocked(getServerSession);
  const deleteProductMediaMock = vi.mocked(deleteProductMedia);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const loadHandler = async () => {
    const { DELETE } =
      await import('@/app/api/products/[id]/media/[mediaId]/route');
    return { DELETE };
  };

  it('returns 403 for non-admin users', async () => {
    const { DELETE } = await loadHandler();
    getServerSessionMock.mockResolvedValue(null);

    const response = await DELETE(createMediaRequest('p1'), {
      params: { id: 'p1', mediaId: 'm1' },
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });

  it('deletes media for admins', async () => {
    const { DELETE } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    deleteProductMediaMock.mockResolvedValue(undefined);

    const response = await DELETE(createMediaRequest('p1'), {
      params: { id: 'p1', mediaId: 'm1' },
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
  });

  it('returns 500 when service fails', async () => {
    const { DELETE } = await loadHandler();
    getServerSessionMock.mockResolvedValue(adminSession as any);
    deleteProductMediaMock.mockRejectedValue(new Error('boom'));

    const response = await DELETE(createMediaRequest('p1'), {
      params: { id: 'p1', mediaId: 'm1' },
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'boom' });
  });
});
