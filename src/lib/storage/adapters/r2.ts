/**
 * Cloudflare R2 Storage Adapter
 *
 * Uses AWS S3-compatible API to interact with Cloudflare R2
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { NodeHttpHandler } from '@smithy/node-http-handler';
import { Agent as HttpsAgent } from 'https';
import { StorageAdapter, UploadOptions, UploadResult, DeleteResult } from '../types';
import { log } from '@/lib/logger';

export class R2StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucketName: string;
  private publicUrl: string;

  constructor() {
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = process.env.R2_BUCKET_NAME || 'kitia-products';
    this.publicUrl = process.env.R2_PUBLIC_URL || '';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 credentials not configured. Check R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
    }

    // Configure S3 client for R2 with proper timeout and connection settings
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      requestHandler: new NodeHttpHandler({
        httpsAgent: new HttpsAgent({
          keepAlive: true,
          maxSockets: 50,
          family: 4,                // Force IPv4 to avoid IPv6 connection issues
        }),
        requestTimeout: 30000,      // 30 seconds timeout for receiving response
        connectionTimeout: 10000,    // 10 seconds timeout for establishing connection
      }),
    });

    log.info('R2 Storage adapter initialized', { bucketName: this.bucketName });
  }

  async upload(options: UploadOptions): Promise<UploadResult> {
    try {
      const { file, path, contentType } = options;

      log.info('Starting R2 upload', { path, contentType });

      // Convert File to Buffer if needed
      let body: Buffer;
      if (Buffer.isBuffer(file)) {
        // Already a Buffer
        body = file;
        log.info('File is already a Buffer', { size: body.length });
      } else if (file instanceof Blob || (file && typeof (file as unknown as Blob).arrayBuffer === 'function')) {
        // File or Blob (works for both browser File and Next.js FormData File)
        log.info('Converting File/Blob to Buffer');
        const arrayBuffer = await file.arrayBuffer();
        body = Buffer.from(arrayBuffer);
        log.info('Converted to Buffer', { size: body.length });
      } else {
        throw new Error('Invalid file type');
      }

      // Upload to R2 using PutObjectCommand
      log.info('Initiating R2 upload', { bucket: this.bucketName, path, size: body.length });

      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: path,
        Body: body,
        ContentType: contentType,
      });

      log.info('Sending upload command...');
      await this.client.send(command);
      log.info('Upload completed successfully');

      const url = this.getPublicUrl(path);

      log.info('File uploaded to R2', { path, contentType, size: body.length, url });

      return {
        success: true,
        url,
      };
    } catch (error) {
      log.error('R2 upload error', {
        error,
        path: options.path,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطا در آپلود فایل',
      };
    }
  }

  async delete(path: string): Promise<DeleteResult> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      await this.client.send(command);

      log.info('File deleted from R2', { path });

      return { success: true };
    } catch (error) {
      log.error('R2 delete error', { error, path });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطا در حذف فایل',
      };
    }
  }

  getPublicUrl(path: string): string {
    // If custom domain is configured, use it
    if (this.publicUrl) {
      return `${this.publicUrl}/${path}`;
    }

    // Otherwise use R2.dev subdomain (need to enable in Cloudflare dashboard)
    // Format: https://pub-{hash}.r2.dev/{path}
    log.warn('R2_PUBLIC_URL not configured, file may not be publicly accessible');
    return `https://${this.bucketName}.r2.dev/${path}`;
  }

  async exists(path: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      await this.client.send(command);
      return true;
    } catch {
      return false;
    }
  }
}
