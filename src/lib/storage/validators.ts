/**
 * File validation utilities for uploads
 */

import { FileValidation, MediaType } from './types';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Validate uploaded file
 */
export function validateFile(file: File): FileValidation {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error:
        'فرمت فایل مجاز نیست. فرمت‌های مجاز: JPG, PNG, WEBP, GIF, MP4, WEBM',
    };
  }

  const mediaType: MediaType = isVideo ? 'VIDEO' : 'IMAGE';
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `حجم فایل نباید بیشتر از ${maxSizeMB}MB باشد`,
      mediaType,
    };
  }

  return { valid: true, mediaType };
}

/**
 * Generate unique file path for storage
 */
export function generateFilePath(
  fileName: string,
  mediaType: MediaType
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = fileName.split('.').pop();
  const folder = mediaType === 'VIDEO' ? 'videos' : 'images';

  return `products/${folder}/${random}-${timestamp}.${ext}`;
}

/**
 * Generate unique file path for media library
 */
export function generateMediaLibraryPath(
  fileName: string,
  mediaType: MediaType
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ext = fileName.split('.').pop();
  const folder = mediaType === 'VIDEO' ? 'videos' : 'images';

  return `media-library/${folder}/${random}-${timestamp}.${ext}`;
}
