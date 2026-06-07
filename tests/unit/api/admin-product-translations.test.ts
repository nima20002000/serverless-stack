import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  saveProductMediaTranslations,
  saveProductTranslations,
  validateProductMediaTranslationPayload,
  validateProductMediaTranslationsBelongToProduct,
  validateProductTranslationPayload,
} from '@/services/localization-service';

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth/options', () => ({
  authOptions: {},
}));

vi.mock('@/lib/e2e-mode', () => ({
  isServerE2EMode: () => true,
}));

vi.mock('@/services/localization-service', () => ({
  getProductMediaTranslationsForProduct: vi.fn(),
  getProductTranslations: vi.fn(),
  saveProductMediaTranslations: vi.fn(),
  saveProductTranslations: vi.fn(),
  validateProductMediaTranslationPayload: vi.fn(),
  validateProductMediaTranslationsBelongToProduct: vi.fn(),
  validateProductTranslationPayload: vi.fn(),
}));

vi.mock('@/lib/logger', () => ({
  log: {
    error: vi.fn(),
  },
}));

const createPutRequest = (body: unknown) =>
  new NextRequest('http://localhost/api/admin/products/p1/translations', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

describe('PUT /api/admin/products/[id]/translations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('validates media ownership before saving product translations', async () => {
    vi.mocked(
      validateProductMediaTranslationsBelongToProduct
    ).mockRejectedValue(
      new Error('Product media translations must belong to the product')
    );

    const { PUT } =
      await import('@/app/api/admin/products/[id]/translations/route');

    const response = await PUT(
      createPutRequest({
        translations: {
          de: { name: 'Deutscher Name' },
        },
        mediaTranslations: {
          foreignMedia: {
            de: { alt: 'Wrong product media' },
          },
        },
      }),
      { params: Promise.resolve({ id: 'p1' }) }
    );

    expect(response.status).toBe(400);
    expect(
      validateProductMediaTranslationsBelongToProduct
    ).toHaveBeenCalledWith('p1', ['foreignMedia']);
    expect(saveProductTranslations).not.toHaveBeenCalled();
    expect(saveProductMediaTranslations).not.toHaveBeenCalled();
  });

  it('validates media translation locales before saving product translations', async () => {
    vi.mocked(validateProductMediaTranslationPayload).mockImplementation(() => {
      throw new Error('Unsupported media translation locale: fr');
    });

    const { PUT } =
      await import('@/app/api/admin/products/[id]/translations/route');

    const response = await PUT(
      createPutRequest({
        translations: {
          de: { name: 'Deutscher Name' },
        },
        mediaTranslations: {
          media1: {
            fr: { alt: 'French alt' },
          },
        },
      }),
      { params: Promise.resolve({ id: 'p1' }) }
    );

    expect(response.status).toBe(400);
    expect(validateProductTranslationPayload).toHaveBeenCalledWith({
      de: { name: 'Deutscher Name' },
    });
    expect(validateProductMediaTranslationPayload).toHaveBeenCalledWith({
      media1: {
        fr: { alt: 'French alt' },
      },
    });
    expect(
      validateProductMediaTranslationsBelongToProduct
    ).not.toHaveBeenCalled();
    expect(saveProductTranslations).not.toHaveBeenCalled();
    expect(saveProductMediaTranslations).not.toHaveBeenCalled();
  });
});
