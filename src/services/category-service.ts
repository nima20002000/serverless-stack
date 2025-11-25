import prisma from '@/lib/prisma/client';
import { CategoryFormData, CategoryWithHierarchy } from '@/types/product';
import { DeleteResult } from '@/types/api';

export async function getAllCategories(): Promise<CategoryWithHierarchy[]> {
  const categories = await prisma.category.findMany({
    include: {
      parent: true,
      children: true,
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return categories;
}

export async function getActiveCategories(): Promise<CategoryWithHierarchy[]> {
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    include: {
      parent: true,
      children: {
        where: { isActive: true },
      },
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return categories;
}

export async function getCategoryTree(): Promise<CategoryWithHierarchy[]> {
  // Get all root categories (no parent) with their children
  const rootCategories = await prisma.category.findMany({
    where: {
      parentId: null,
      isActive: true,
    },
    include: {
      children: {
        where: { isActive: true },
        include: {
          children: {
            where: { isActive: true },
          },
          _count: {
            select: { products: true },
          },
        },
      },
      _count: {
        select: { products: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return rootCategories;
}

export async function getCategoryById(id: string): Promise<CategoryWithHierarchy | null> {
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      parent: true,
      children: true,
      _count: {
        select: { products: true },
      },
    },
  });

  return category;
}

export async function getCategoryBySlug(slug: string): Promise<CategoryWithHierarchy | null> {
  const category = await prisma.category.findUnique({
    where: { slug },
    include: {
      parent: true,
      children: true,
      _count: {
        select: { products: true },
      },
    },
  });

  return category;
}

export async function createCategory(data: CategoryFormData): Promise<CategoryWithHierarchy> {
  // Check if slug already exists
  const existing = await prisma.category.findUnique({
    where: { slug: data.slug },
  });

  if (existing) {
    throw new Error('دسته‌بندی با این نامک (slug) قبلاً ثبت شده است');
  }

  // If parentId is provided, validate it exists
  if (data.parentId) {
    const parent = await prisma.category.findUnique({
      where: { id: data.parentId },
    });

    if (!parent) {
      throw new Error('دسته‌بندی والد یافت نشد');
    }
  }

  const category = await prisma.category.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      parentId: data.parentId || null,
      isActive: data.isActive,
    },
    include: {
      parent: true,
      children: true,
      _count: {
        select: { products: true },
      },
    },
  });

  return category;
}

export async function updateCategory(id: string, data: Partial<CategoryFormData>): Promise<CategoryWithHierarchy> {
  // Check if category exists
  const existing = await prisma.category.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('دسته‌بندی یافت نشد');
  }

  // If slug is being updated, check it's not taken
  if (data.slug && data.slug !== existing.slug) {
    const slugTaken = await prisma.category.findUnique({
      where: { slug: data.slug },
    });

    if (slugTaken) {
      throw new Error('دسته‌بندی با این نامک (slug) قبلاً ثبت شده است');
    }
  }

  // If parentId is being updated, validate it
  if (data.parentId !== undefined) {
    if (data.parentId === id) {
      throw new Error('دسته‌بندی نمی‌تواند والد خودش باشد');
    }

    if (data.parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: data.parentId },
      });

      if (!parent) {
        throw new Error('دسته‌بندی والد یافت نشد');
      }

      // Check for circular reference (prevent category from being its own ancestor)
      let checkParent = parent;
      while (checkParent.parentId) {
        if (checkParent.parentId === id) {
          throw new Error('نمی‌توان دسته‌بندی را به فرزندان خودش منتقل کرد');
        }
        const nextParent = await prisma.category.findUnique({
          where: { id: checkParent.parentId },
        });
        if (!nextParent) break;
        checkParent = nextParent;
      }
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.slug && { slug: data.slug }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.parentId !== undefined && { parentId: data.parentId || null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
    include: {
      parent: true,
      children: true,
      _count: {
        select: { products: true },
      },
    },
  });

  return category;
}

export async function deleteCategory(id: string): Promise<DeleteResult> {
  // Check if category exists
  const category = await prisma.category.findUnique({
    where: { id },
    include: {
      children: true,
      _count: {
        select: { products: true },
      },
    },
  });

  if (!category) {
    throw new Error('دسته‌بندی یافت نشد');
  }

  // Check if category has children
  if (category.children.length > 0) {
    throw new Error('ابتدا باید دسته‌بندی‌های فرزند را حذف کنید');
  }

  // Check if category has products
  if (category._count.products > 0) {
    throw new Error('این دسته‌بندی دارای محصول است و نمی‌توان آن را حذف کرد');
  }

  await prisma.category.delete({
    where: { id },
  });

  return { success: true };
}
