import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { clearCachePattern } from '@/lib/redis/client';
import { Tables } from '@/lib/supabase/types';

/**
 * Category Service (Supabase)
 * Handles category management including bulk operations
 */

type Category = Tables<'categories'>;
type CategoryWithRelations = Category & {
  parent?: Category | null;
  children?: Category[];
};

/**
 * Helper to invalidate all category caches
 */
async function invalidateCategoryCache(): Promise<void> {
  const cacheKeys = ['categories:active', 'categories:tree'];
  await clearCachePattern(cacheKeys);
  log.info('Category cache invalidated');
}

/**
 * Bulk delete categories
 * Only deletes categories that have no products or children
 */
export async function bulkDeleteCategories(categoryIds: string[]): Promise<{ count: number }> {
  const supabase = await createClient();

  try {
    // Check if any categories have products
    const categoriesWithProductNames: string[] = [];
    for (const catId of categoryIds) {
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('categoryId', catId);

      if (count && count > 0) {
        const { data: cat } = await supabase
          .from('categories')
          .select('name')
          .eq('id', catId)
          .single();
        if (cat) {
          categoriesWithProductNames.push(cat.name);
        }
      }
    }

    if (categoriesWithProductNames.length > 0) {
      throw new Error(
        `امکان حذف دسته‌بندی‌هایی که محصول دارند وجود ندارد: ${categoriesWithProductNames.join('، ')}`
      );
    }

    // Check if any categories have children
    const categoriesWithChildrenNames: string[] = [];
    for (const catId of categoryIds) {
      const { count } = await supabase
        .from('categories')
        .select('id', { count: 'exact', head: true })
        .eq('parentId', catId);

      if (count && count > 0) {
        const { data: cat } = await supabase
          .from('categories')
          .select('name')
          .eq('id', catId)
          .single();
        if (cat) {
          categoriesWithChildrenNames.push(cat.name);
        }
      }
    }

    if (categoriesWithChildrenNames.length > 0) {
      throw new Error(
        `امکان حذف دسته‌بندی‌هایی که زیردسته دارند وجود ندارد: ${categoriesWithChildrenNames.join('، ')}`
      );
    }

    // Delete categories
    const { error, count } = await supabase
      .from('categories')
      .delete({ count: 'exact' })
      .in('id', categoryIds);

    if (error) {
      log.error('Error in bulk delete categories', { error });
      throw new Error('خطا در حذف دسته‌بندی‌ها');
    }

    // Invalidate category cache
    await invalidateCategoryCache();

    log.info('Categories bulk deleted', { count });
    return { count: count || 0 };
  } catch (error) {
    log.error('Error in bulkDeleteCategories', { categoryIds, error });
    throw error;
  }
}

/**
 * Bulk update categories
 */
export async function bulkUpdateCategories(
  categoryIds: string[],
  updates: { isActive?: boolean }
): Promise<{ count: number }> {
  const supabase = await createClient();

  try {
    const { data, error } = await supabase
      .from('categories')
      .update(updates)
      .in('id', categoryIds)
      .select('id');

    if (error) {
      log.error('Error in bulk update categories', { error });
      throw new Error('خطا در بروزرسانی دسته‌بندی‌ها');
    }

    // Invalidate category cache
    await invalidateCategoryCache();

    const count = data?.length || 0;
    log.info('Categories bulk updated', { count, updates });
    return { count };
  } catch (error) {
    log.error('Error in bulkUpdateCategories', { categoryIds, updates, error });
    throw error;
  }
}

/**
 * Get all categories (admin only)
 */
export async function getAllCategories(): Promise<CategoryWithRelations[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*, parent:categories!parentId(*), children:categories!parentId(*)')
    .order('name', { ascending: true });

  if (error) {
    log.error('Error fetching all categories', { error });
    throw new Error('خطا در دریافت دسته‌بندی‌ها');
  }

  return data || [];
}

/**
 * Get active categories only
 */
export async function getActiveCategories(): Promise<CategoryWithRelations[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*, parent:categories!parentId(*), children:categories!parentId!inner(id, name, slug, isActive)')
    .eq('isActive', true)
    .eq('children.isActive', true)
    .order('name', { ascending: true });

  if (error) {
    log.error('Error fetching active categories', { error });
    throw new Error('خطا در دریافت دسته‌بندی‌های فعال');
  }

  return data || [];
}

/**
 * Get category tree (root categories with children)
 */
export async function getCategoryTree(): Promise<CategoryWithRelations[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*, children:categories!parentId!inner(*, children:categories!parentId!inner(*))')
    .is('parentId', null)
    .eq('isActive', true)
    .eq('children.isActive', true)
    .order('name', { ascending: true });

  if (error) {
    log.error('Error fetching category tree', { error });
    throw new Error('خطا در دریافت درخت دسته‌بندی‌ها');
  }

  return data || [];
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: string): Promise<CategoryWithRelations> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*, parent:categories!parentId(*), children:categories!parentId(*)')
    .eq('id', id)
    .single();

  if (error || !data) {
    log.error('Category not found', { id, error });
    throw new Error('دسته‌بندی یافت نشد');
  }

  return data;
}

/**
 * Get category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<CategoryWithRelations | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*, parent:categories!parentId(*), children:categories!parentId(*)')
    .eq('slug', slug)
    .eq('isActive', true)
    .single();

  if (error) {
    log.error('Category not found by slug', { slug, error });
    return null;
  }

  return data;
}

/**
 * Create a new category
 */
export async function createCategory(input: {
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parentId?: string | null;
  isActive?: boolean;
}): Promise<Category> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .insert({
      name: input.name,
      slug: input.slug,
      description: input.description || null,
      image: input.image || null,
      parentId: input.parentId || null,
      isActive: input.isActive !== undefined ? input.isActive : true,
    })
    .select()
    .single();

  if (error) {
    log.error('Error creating category', { error, input });
    if (error.code === '23505') {
      throw new Error('دسته‌بندی با این نامک (slug) قبلاً ثبت شده است');
    }
    throw new Error('خطا در ایجاد دسته‌بندی');
  }

  await invalidateCategoryCache();
  log.info('Category created', { id: data.id, name: data.name });
  return data;
}

/**
 * Update a category
 */
export async function updateCategory(
  id: string,
  input: {
    name?: string;
    slug?: string;
    description?: string;
    image?: string;
    parentId?: string | null;
    isActive?: boolean;
  }
): Promise<Category> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error || !data) {
    log.error('Error updating category', { id, error });
    if (error?.code === '23505') {
      throw new Error('دسته‌بندی با این نامک (slug) قبلاً ثبت شده است');
    }
    throw new Error('خطا در بروزرسانی دسته‌بندی');
  }

  await invalidateCategoryCache();
  log.info('Category updated', { id, updates: input });
  return data;
}

/**
 * Delete a category
 */
export async function deleteCategory(id: string): Promise<{ success: boolean }> {
  const supabase = await createClient();

  // Check if category has products
  const { count: productCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('categoryId', id);

  if (productCount && productCount > 0) {
    throw new Error('امکان حذف دسته‌بندی که محصول دارد وجود ندارد');
  }

  // Check if category has children
  const { count: childrenCount } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('parentId', id);

  if (childrenCount && childrenCount > 0) {
    throw new Error('امکان حذف دسته‌بندی که زیردسته دارد وجود ندارد');
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);

  if (error) {
    log.error('Error deleting category', { id, error });
    throw new Error('خطا در حذف دسته‌بندی');
  }

  await invalidateCategoryCache();
  log.info('Category deleted', { id });
  return { success: true };
}
