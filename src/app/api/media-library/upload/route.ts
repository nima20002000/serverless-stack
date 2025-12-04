import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { storage, validateFile, generateMediaLibraryPath } from '@/lib/storage';
import { createMedia } from '@/services/media-library-service';
import { log } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/media-library/upload
 * Upload media to library
 */
export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
    }

    // Get form data
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const alt = formData.get('alt') as string | null;
    const tagsString = formData.get('tags') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'فایلی انتخاب نشده است' }, { status: 400 });
    }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid || !validation.mediaType) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // Generate unique file path for media library
    const filePath = generateMediaLibraryPath(file.name, validation.mediaType);

    // Upload to storage (R2)
    const uploadResult = await storage.upload({
      file,
      path: filePath,
      contentType: file.type,
      isPublic: true,
    });

    if (!uploadResult.success || !uploadResult.url) {
      log.error('Upload failed', { error: uploadResult.error, fileName: file.name });
      return NextResponse.json({ error: uploadResult.error || 'خطا در آپلود فایل' }, { status: 500 });
    }

    // Parse tags
    const tags = tagsString ? tagsString.split(',').map((t) => t.trim()).filter(Boolean) : [];

    // Create media library entry
    const media = await createMedia({
      type: validation.mediaType,
      url: uploadResult.url,
      fileName: file.name,
      fileSize: file.size,
      alt: alt || undefined,
      tags,
    });

    log.info('Media uploaded to library', {
      mediaId: media.id,
      fileName: file.name,
      type: validation.mediaType,
    });

    return NextResponse.json({ success: true, media });
  } catch (error) {
    log.error('Media library upload error', { error });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'خطا در آپلود فایل' },
      { status: 500 }
    );
  }
}
