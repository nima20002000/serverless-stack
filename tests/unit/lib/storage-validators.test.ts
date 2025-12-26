import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateFile,
  generateFilePath,
  generateMediaLibraryPath,
} from '@/lib/storage/validators';

describe('storage validators', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('validates allowed image types and size limits', () => {
    const file = { type: 'image/png', size: 1024 } as File;

    expect(validateFile(file)).toEqual({ valid: true, mediaType: 'IMAGE' });
  });

  it('rejects unsupported file types', () => {
    const file = { type: 'application/pdf', size: 1024 } as File;

    const result = validateFile(file);

    expect(result.valid).toBe(false);
    expect(result.error).toBe(
      'فرمت فایل مجاز نیست. فرمت‌های مجاز: JPG, PNG, WEBP, GIF, MP4, WEBM'
    );
  });

  it('rejects files larger than limit', () => {
    const file = { type: 'image/jpeg', size: 9 * 1024 * 1024 } as File;

    const result = validateFile(file);

    expect(result.valid).toBe(false);
    expect(result.error).toBe('حجم فایل نباید بیشتر از 8MB باشد');
    expect(result.mediaType).toBe('IMAGE');
  });

  it('generates deterministic file paths', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

    const path = generateFilePath('photo.jpg', 'IMAGE');

    expect(path).toBe('products/images/4fzzzx-1700000000000.jpg');
  });

  it('generates deterministic media library paths', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);

    const path = generateMediaLibraryPath('clip.mp4', 'VIDEO');

    expect(path).toBe('media-library/videos/4fzzzx-1700000000000.mp4');
  });
});
