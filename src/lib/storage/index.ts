/**
 * Storage Service - Main Entry Point
 *
 * Provides unified interface for file storage operations.
 * Currently uses Cloudflare R2, but can be swapped for other providers.
 */

import 'server-only';
import { R2StorageAdapter } from './adapters/r2';
import { StorageAdapter } from './types';

// Export types
export * from './types';
export * from './validators';

// Export image optimization utilities
export {
  getOptimizedImageUrl,
  getResponsiveSrcSet,
  optimizeImage,
  IMAGE_VARIANTS,
} from '../cloudflare-images-client';
export type {
  ImageTransformOptions,
  ImageFormat,
  ImageFit,
  ImageGravity,
} from '../cloudflare-images-client';

const provider = process.env.STORAGE_PROVIDER || 'r2';
let storageAdapter: StorageAdapter | null = null;

function createStorageAdapter(): StorageAdapter {
  switch (provider) {
    case 'r2':
      return new R2StorageAdapter();
    // Future providers can be added here:
    // case 'supabase':
    //   return new SupabaseStorageAdapter();
    // case 's3':
    //   return new S3StorageAdapter();
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }
}

function getStorageAdapter(): StorageAdapter {
  storageAdapter ??= createStorageAdapter();
  return storageAdapter;
}

export const storage: StorageAdapter = new Proxy({} as StorageAdapter, {
  get(_target, property: keyof StorageAdapter) {
    const adapter = getStorageAdapter();
    const value = adapter[property];
    return typeof value === 'function' ? value.bind(adapter) : value;
  },
});
