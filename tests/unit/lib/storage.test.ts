import { describe, it, expect, vi, beforeEach } from 'vitest';

const uploadMock = vi.fn();
const deleteMock = vi.fn();
const getPublicUrlMock = vi.fn();
const existsMock = vi.fn();
const listMock = vi.fn();

vi.mock('@/lib/storage/adapters/r2', () => ({
  R2StorageAdapter: vi.fn(() => ({
    upload: uploadMock,
    delete: deleteMock,
    getPublicUrl: getPublicUrlMock,
    exists: existsMock,
    list: listMock,
  })),
}));

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.STORAGE_PROVIDER;
    vi.resetModules();
  });

  it('uses R2 adapter by default', async () => {
    uploadMock.mockResolvedValue({ success: true, url: 'https://cdn/file' });

    const { storage } = await import('@/lib/storage');

    const result = await storage.upload({
      file: Buffer.from('data'),
      path: 'products/img.jpg',
      contentType: 'image/jpeg',
    });

    expect(result).toEqual({ success: true, url: 'https://cdn/file' });
    expect(uploadMock).toHaveBeenCalled();
  });

  it('throws on unknown storage provider', async () => {
    process.env.STORAGE_PROVIDER = 'unknown';

    const { storage } = await import('@/lib/storage');

    await expect(
      storage.upload({
        file: Buffer.from('data'),
        path: 'products/img.jpg',
        contentType: 'image/jpeg',
      })
    ).rejects.toThrow('Unknown storage provider: unknown');
  });
});
