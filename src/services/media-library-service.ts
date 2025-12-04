/**
 * Media Library Service
 *
 * Handles business logic for media library operations.
 * Media library stores general-purpose images and videos for use across the site
 * (hero sections, banners, promotional content, etc.)
 */

import prisma from '@/lib/prisma/client';
import { MediaType } from '@prisma/client';
import { log } from '@/lib/logger';
import { storage } from '@/lib/storage';

export interface CreateMediaInput {
  type: MediaType;
  url: string;
  fileName: string;
  fileSize: number;
  alt?: string;
  tags?: string[];
}

export interface UpdateMediaInput {
  alt?: string;
  tags?: string[];
}

export interface MediaLibraryFilters {
  type?: MediaType;
  tags?: string[];
  search?: string;
}

/**
 * Get all media from library with optional filters
 */
export async function getAllMedia(filters?: MediaLibraryFilters) {
  try {
    interface WhereClause {
      type?: MediaType;
      tags?: { hasSome: string[] };
      OR?: Array<{
        fileName?: { contains: string; mode: 'insensitive' };
        alt?: { contains: string; mode: 'insensitive' };
      }>;
    }

    const where: WhereClause = {};

    if (filters?.type) {
      where.type = filters.type;
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      };
    }

    if (filters?.search) {
      where.OR = [
        { fileName: { contains: filters.search, mode: 'insensitive' } },
        { alt: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const media = await prisma.mediaLibrary.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    log.info('Retrieved media library items', { count: media.length, filters });
    return media;
  } catch (error) {
    log.error('Failed to get media library items', { error, filters });
    throw error;
  }
}

/**
 * Get media by ID
 */
export async function getMediaById(id: string) {
  try {
    const media = await prisma.mediaLibrary.findUnique({
      where: { id },
    });

    if (!media) {
      throw new Error('رسانه پیدا نشد');
    }

    return media;
  } catch (error) {
    log.error('Failed to get media by ID', { error, id });
    throw error;
  }
}

/**
 * Create new media library entry
 */
export async function createMedia(data: CreateMediaInput) {
  try {
    const media = await prisma.mediaLibrary.create({
      data: {
        type: data.type,
        url: data.url,
        fileName: data.fileName,
        fileSize: data.fileSize,
        alt: data.alt,
        tags: data.tags || [],
      },
    });

    log.info('Created media library entry', { mediaId: media.id, fileName: data.fileName });
    return media;
  } catch (error) {
    log.error('Failed to create media', { error, fileName: data.fileName });
    throw error;
  }
}

/**
 * Update media library entry
 */
export async function updateMedia(id: string, data: UpdateMediaInput) {
  try {
    const media = await prisma.mediaLibrary.update({
      where: { id },
      data: {
        alt: data.alt,
        tags: data.tags,
        updatedAt: new Date(),
      },
    });

    log.info('Updated media library entry', { mediaId: id });
    return media;
  } catch (error) {
    log.error('Failed to update media', { error, id });
    throw error;
  }
}

/**
 * Delete media from library and R2 storage
 */
export async function deleteMedia(id: string) {
  try {
    const media = await prisma.mediaLibrary.findUnique({
      where: { id },
    });

    if (!media) {
      throw new Error('رسانه پیدا نشد');
    }

    // Extract file path from URL
    const url = new URL(media.url);
    const filePath = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;

    // Delete from R2 storage
    const deleteResult = await storage.delete(filePath);
    if (!deleteResult.success) {
      log.warn('Failed to delete file from storage', { error: deleteResult.error, filePath });
    }

    // Delete from database
    await prisma.mediaLibrary.delete({
      where: { id },
    });

    log.info('Deleted media library entry', { mediaId: id, fileName: media.fileName });
    return { success: true };
  } catch (error) {
    log.error('Failed to delete media', { error, id });
    throw error;
  }
}

/**
 * Get all unique tags from media library
 */
export async function getAllTags() {
  try {
    const media = await prisma.mediaLibrary.findMany({
      select: { tags: true },
    });

    // Flatten and deduplicate tags
    const allTags = media.flatMap((m) => m.tags);
    const uniqueTags = Array.from(new Set(allTags)).sort();

    return uniqueTags;
  } catch (error) {
    log.error('Failed to get media tags', { error });
    throw error;
  }
}
