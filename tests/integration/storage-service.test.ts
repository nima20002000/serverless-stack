/**
 * Integration Tests for Storage Service
 *
 * Validates Cloudflare R2 upload, existence, listing, and deletion.
 */

import { describe, it, expect } from 'vitest';
import { randomUUID } from 'crypto';
import { storage } from '../../src/lib/storage';

describe('Storage Service Integration Tests', () => {
  it('should upload, list, and delete files in R2', async () => {
    const fileKey = `test/integration/${randomUUID()}.txt`;
    const payload = Buffer.from('commerce-storage-test');

    const upload = await storage.upload({
      file: payload,
      path: fileKey,
      contentType: 'text/plain',
    });

    if (!upload.success) {
      throw new Error(`Upload failed: ${upload.error || 'unknown error'}`);
    }

    expect(upload.url).toContain(fileKey);

    const existsAfterUpload = await storage.exists(fileKey);
    expect(existsAfterUpload).toBe(true);

    const listing = await storage.list({ prefix: 'test/integration/' });
    const keys = (listing.objects ?? []).map((item) => item.key);
    expect(keys).toContain(fileKey);

    const deletion = await storage.delete(fileKey);
    expect(deletion.success).toBe(true);

    const existsAfterDelete = await storage.exists(fileKey);
    expect(existsAfterDelete).toBe(false);
  });
});
