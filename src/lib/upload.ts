import { writeFile } from 'fs/promises';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export function validateFile(file: File): { valid: boolean; error?: string; isVideo: boolean } {
  const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
  const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

  if (!isImage && !isVideo) {
    return {
      valid: false,
      error: 'فرمت فایل مجاز نیست. فرمت‌های مجاز: JPG, PNG, WEBP, GIF, MP4, WEBM',
      isVideo: false,
    };
  }

  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
  if (file.size > maxSize) {
    const maxSizeMB = maxSize / (1024 * 1024);
    return {
      valid: false,
      error: `حجم فایل نباید بیشتر از ${maxSizeMB}MB باشد`,
      isVideo,
    };
  }

  return { valid: true, isVideo };
}

export async function saveFile(file: File, isVideo: boolean): Promise<UploadResult> {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const ext = file.name.split('.').pop();
    const filename = `${uuidv4()}-${Date.now()}.${ext}`;
    const folder = isVideo ? 'videos' : 'images';
    const filepath = join(process.cwd(), 'public', 'uploads', 'products', folder, filename);

    // Save file
    await writeFile(filepath, buffer);

    // Return public URL
    const url = `/uploads/products/${folder}/${filename}`;
    return { success: true, url };
  } catch (error) {
    console.error('File upload error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'خطا در آپلود فایل' };
  }
}
