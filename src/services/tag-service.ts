import prisma from '@/lib/prisma/client';
import { TagFormData, TagWithCount } from '@/types/product';

export async function getAllTags(): Promise<TagWithCount[]> {
  const tags = await prisma.tag.findMany({
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return tags;
}

export async function searchTags(query: string): Promise<TagWithCount[]> {
  const tags = await prisma.tag.findMany({
    where: {
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { slug: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: 'asc' },
    take: 10,
  });

  return tags;
}

export async function getTagById(id: string): Promise<TagWithCount | null> {
  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return tag;
}

export async function getTagBySlug(slug: string): Promise<TagWithCount | null> {
  const tag = await prisma.tag.findUnique({
    where: { slug },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return tag;
}

export async function createTag(data: TagFormData) {
  // Check if tag with same name or slug exists
  const existing = await prisma.tag.findFirst({
    where: {
      OR: [{ name: data.name }, { slug: data.slug }],
    },
  });

  if (existing) {
    throw new Error('برچسب با این نام یا نامک (slug) قبلاً ثبت شده است');
  }

  const tag = await prisma.tag.create({
    data: {
      name: data.name,
      slug: data.slug,
    },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return tag;
}

export async function updateTag(id: string, data: Partial<TagFormData>) {
  // Check if tag exists
  const existing = await prisma.tag.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('برچسب یافت نشد');
  }

  // If name or slug is being updated, check they're not taken
  if (data.name || data.slug) {
    const taken = await prisma.tag.findFirst({
      where: {
        AND: [
          { id: { not: id } },
          {
            OR: [
              ...(data.name ? [{ name: data.name }] : []),
              ...(data.slug ? [{ slug: data.slug }] : []),
            ],
          },
        ],
      },
    });

    if (taken) {
      throw new Error('برچسب با این نام یا نامک (slug) قبلاً ثبت شده است');
    }
  }

  const tag = await prisma.tag.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.slug && { slug: data.slug }),
    },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  return tag;
}

export async function deleteTag(id: string) {
  // Check if tag exists
  const tag = await prisma.tag.findUnique({
    where: { id },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });

  if (!tag) {
    throw new Error('برچسب یافت نشد');
  }

  // Check if tag has products
  if (tag._count.products > 0) {
    throw new Error('این برچسب دارای محصول است و نمی‌توان آن را حذف کرد');
  }

  await prisma.tag.delete({
    where: { id },
  });

  return { success: true };
}
