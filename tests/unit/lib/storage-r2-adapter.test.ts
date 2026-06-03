import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();
const putCommandMock = vi.fn(function PutObjectCommandMock(input) {
  return { input };
});
const deleteCommandMock = vi.fn(function DeleteObjectCommandMock(input) {
  return { input };
});
const headCommandMock = vi.fn(function HeadObjectCommandMock(input) {
  return { input };
});
const listCommandMock = vi.fn(function ListObjectsV2CommandMock(input) {
  return { input };
});
const S3ClientMock = vi.fn(function S3ClientMock() {
  return { send: sendMock };
});
const NodeHttpHandlerMock = vi.fn(function NodeHttpHandlerMock() {
  return {};
});

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: S3ClientMock,
  PutObjectCommand: putCommandMock,
  DeleteObjectCommand: deleteCommandMock,
  HeadObjectCommand: headCommandMock,
  ListObjectsV2Command: listCommandMock,
}));

vi.mock('@smithy/node-http-handler', () => ({
  NodeHttpHandler: NodeHttpHandlerMock,
}));

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('R2StorageAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.R2_ACCOUNT_ID = 'account';
    process.env.R2_ACCESS_KEY_ID = 'access';
    process.env.R2_SECRET_ACCESS_KEY = 'secret';
    process.env.R2_BUCKET_NAME = 'bucket';
    process.env.R2_PUBLIC_URL = 'https://cdn.example.com';
    vi.resetModules();
  });

  it('builds public URL from configured domain', async () => {
    const { R2StorageAdapter } = await import('@/lib/storage/adapters/r2');

    const adapter = new R2StorageAdapter();

    expect(adapter.getPublicUrl('path/file.jpg')).toBe(
      'https://cdn.example.com/path/file.jpg'
    );
  });

  it('requires a public URL for renderable media links', async () => {
    delete process.env.R2_PUBLIC_URL;
    const { R2StorageAdapter } = await import('@/lib/storage/adapters/r2');

    const adapter = new R2StorageAdapter();

    expect(() => adapter.getPublicUrl('path/file.jpg')).toThrow(
      'R2_PUBLIC_URL is required for public media URLs'
    );
  });

  it('uploads buffer and returns public URL', async () => {
    const { R2StorageAdapter } = await import('@/lib/storage/adapters/r2');

    sendMock.mockResolvedValue({});

    const adapter = new R2StorageAdapter();
    const result = await adapter.upload({
      file: Buffer.from('data'),
      path: 'products/img.jpg',
      contentType: 'image/jpeg',
    });

    expect(result).toEqual({
      success: true,
      url: 'https://cdn.example.com/products/img.jpg',
    });
    expect(putCommandMock).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'bucket',
        Key: 'products/img.jpg',
        ContentType: 'image/jpeg',
      })
    );
    expect(sendMock).toHaveBeenCalled();
  });

  it('returns error when file type is invalid', async () => {
    const { R2StorageAdapter } = await import('@/lib/storage/adapters/r2');

    const adapter = new R2StorageAdapter();
    const result = await adapter.upload({
      file: 123 as unknown as Buffer,
      path: 'products/img.jpg',
      contentType: 'image/jpeg',
    });

    expect(result).toEqual({
      success: false,
      error: 'Invalid file type',
    });
  });
});
