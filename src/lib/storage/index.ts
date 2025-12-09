/**
 * Storage Service - Main Entry Point
 *
 * Provides unified interface for file storage operations.
 * Currently uses Cloudflare R2, but can be swapped for other providers.
 */

import { R2StorageAdapter } from './adapters/r2';
import { StorageAdapter } from './types';

// Export types
export * from './types';
export * from './validators';

// Export image optimization utilities
export { getOptimizedImageUrl, getResponsiveSrcSet, optimizeImage, IMAGE_VARIANTS } from '../cloudflare-images';
export type { ImageTransformOptions, ImageFormat, ImageFit, ImageGravity } from '../cloudflare-images';

let storageInstance: StorageAdapter | null = null;

/**
 * Get storage adapter instance (lazy-loaded singleton)
 * In the future, this can be configured via environment variable
 */
function getStorageAdapter(): StorageAdapter {
  // Return cached instance if already created
  if (storageInstance) {
    return storageInstance;
  }

  const provider = process.env.STORAGE_PROVIDER || 'r2';

  switch (provider) {
    case 'r2':
      storageInstance = new R2StorageAdapter();
      break;
    // Future providers can be added here:
    // case 'supabase':
    //   storageInstance = new SupabaseStorageAdapter();
    //   break;
    // case 's3':
    //   storageInstance = new S3StorageAdapter();
    //   break;
    default:
      throw new Error(`Unknown storage provider: ${provider}`);
  }

  return storageInstance;
}

// Export getter function instead of direct instance
// This prevents initialization at import time (fixes build errors)
export const storage = {
  upload: async (...args: Parameters<StorageAdapter['upload']>) => {
    return getStorageAdapter().upload(...args);
  },
  delete: async (...args: Parameters<StorageAdapter['delete']>) => {
    return getStorageAdapter().delete(...args);
  },
  getPublicUrl: (...args: Parameters<StorageAdapter['getPublicUrl']>) => {
    return getStorageAdapter().getPublicUrl(...args);
  },
  exists: async (...args: Parameters<StorageAdapter['exists']>) => {
    return getStorageAdapter().exists(...args);
  },
  list: async (...args: Parameters<StorageAdapter['list']>) => {
    return getStorageAdapter().list(...args);
  },
};
