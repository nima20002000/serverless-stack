import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { clearCachePattern } from '@/lib/redis/client';

/**
 * Category Service (Supabase)
 * Handles category management including bulk operations
 */

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
  const supabase = createClient();

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
  const supabase = createClient();

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
