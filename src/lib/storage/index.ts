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

// Storage adapter instance
const provider = process.env.STORAGE_PROVIDER || 'r2';

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

export const storage: StorageAdapter = createStorageAdapter();
