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

export interface StorageObject {
  /** File key/path */
  key: string;
  /** File size in bytes */
  size: number;
  /** Last modified timestamp */
  lastModified: Date;
  /** Public URL */
  url: string;
  /** Content type (if available) */
  contentType?: string;
}

export interface ListObjectsOptions {
  /** Prefix/folder to list (e.g., "products/images/") */
  prefix?: string;
  /** Delimiter for grouping common prefixes (e.g., "/") */
  delimiter?: string;
  /** Maximum number of items to return */
  maxKeys?: number;
  /** Continuation token for pagination */
  continuationToken?: string;
}

export interface ListObjectsResult {
  /** Whether listing succeeded */
  success: boolean;
  /** List of objects */
  objects?: StorageObject[];
  /** Folder-like prefixes when using delimiter */
  prefixes?: string[];
  /** Continuation token for next page */
  nextContinuationToken?: string;
  /** Whether there are more results */
  isTruncated?: boolean;
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

  /**
   * List objects in storage
   */
  list(options?: ListObjectsOptions): Promise<ListObjectsResult>;
}

export type MediaType = 'IMAGE' | 'VIDEO';

export interface FileValidation {
  valid: boolean;
  error?: string;
  mediaType?: MediaType;
}
