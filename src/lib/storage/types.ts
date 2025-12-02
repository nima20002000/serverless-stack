/**
 * Storage Abstraction Layer Types
 *
 * This allows switching between storage providers (R2, Supabase, S3, etc.)
 * without changing application code.
 */

export interface UploadOptions {
  /** File to upload */
  file: File | Buffer;
  /** Path/key in storage (e.g., "products/images/abc.jpg") */
  path: string;
  /** Content type (e.g., "image/jpeg") */
  contentType: string;
  /** Whether file should be publicly accessible */
  isPublic?: boolean;
}

export interface UploadResult {
  /** Whether upload succeeded */
  success: boolean;
  /** Public URL of uploaded file */
  url?: string;
  /** Error message if failed */
  error?: string;
}

export interface DeleteResult {
  /** Whether deletion succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
}

/**
 * Storage adapter interface
 * All storage providers must implement this interface
 */
export interface StorageAdapter {
  /**
   * Upload a file to storage
   */
  upload(options: UploadOptions): Promise<UploadResult>;

  /**
   * Delete a file from storage
   */
  delete(path: string): Promise<DeleteResult>;

  /**
   * Get public URL for a file
   */
  getPublicUrl(path: string): string;

  /**
   * Check if file exists
   */
  exists(path: string): Promise<boolean>;
}

export type MediaType = 'IMAGE' | 'VIDEO';

export interface FileValidation {
  valid: boolean;
  error?: string;
  mediaType?: MediaType;
}
