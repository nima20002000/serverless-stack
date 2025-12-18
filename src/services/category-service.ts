import { createClient } from '@/lib/supabase/server';
import { log } from '@/lib/logger';
import { clearCachePattern } from '@/lib/redis/client';
import { Tables, Inserts, Updates } from '@/lib/supabase/types';

/**
 * Category Service (Supabase)
 * Handles category management including bulk operations
 */

type Category = Tables<'categories'>;
type CategoryWithRelations = Category & {
  parent?: Category | null;
  children?: Category[];
  _count?: {
    products: number;
  };
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
 * Optimized to batch check products and children
 */
export async function bulkDeleteCategories(categoryIds: string[]): Promise<{ count: number }> {
  const supabase = await createClient();

  try {
    // Batch fetch all products for these categories
    const { data: productsInCategories } = await supabase
      .from('products')
      .select('categoryId')
      .in('categoryId', categoryIds);

    // Find categories with products
    const categoriesWithProducts = new Set(
      (productsInCategories || []).map((p) => p.categoryId).filter((id): id is string => id !== null)
    );

    if (categoriesWithProducts.size > 0) {
      // Batch fetch category names
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', Array.from(categoriesWithProducts));

      const categoriesWithProductNames = (categoriesData || []).map((c) => c.name);

      throw new Error(
        `امکان حذف دسته‌بندی‌هایی که محصول دارند وجود ندارد: ${categoriesWithProductNames.join('، ')}`
      );
    }

    // Batch fetch all children for these categories
    const { data: childrenCategories } = await supabase
      .from('categories')
      .select('parentId')
      .in('parentId', categoryIds);

    // Find categories with children
    const categoriesWithChildren = new Set(
      (childrenCategories || []).map((c) => c.parentId).filter((id): id is string => id !== null)
    );

    if (categoriesWithChildren.size > 0) {
      // Batch fetch category names
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('id, name')
        .in('id', Array.from(categoriesWithChildren));

      const categoriesWithChildrenNames = (categoriesData || []).map((c) => c.name);

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
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    log.error('Error in bulkUpdateCategories', { categoryIds, updates, error });
    throw error;
  }
}

/**
 * Get all categories (admin only)
 * Optimized to batch fetch product counts
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

  if (!data || data.length === 0) {
    return [];
  }

  const categoryIds = data.map((c) => c.id);

  // Batch fetch product counts for all categories
  const { data: products } = await supabase
    .from('products')
    .select('categoryId')
    .in('categoryId', categoryIds);

  // Count products per category
  const productCountMap = new Map<string, number>();
  (products || []).forEach((product) => {
    if (product.categoryId) {
      productCountMap.set(product.categoryId, (productCountMap.get(product.categoryId) || 0) + 1);
    }
  });

  // Assemble categories with counts
  const categoriesWithCounts = data.map((category) => ({
    ...category,
    _count: {
      products: productCountMap.get(category.id) || 0,
    },
  }));

  // @ts-expect-error - Supabase join syntax returns children as object/null, not array
  return categoriesWithCounts;
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

  // @ts-expect-error - Supabase join syntax returns children as object/null, not array
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

  // @ts-expect-error - Supabase join syntax returns children as object/null, not array
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

  // @ts-expect-error - Supabase join syntax returns children as object/null, not array
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

  // @ts-expect-error - Supabase join syntax returns children as object/null, not array
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

  const insertData: Inserts<'categories'> = {
    name: input.name,
    slug: input.slug,
    description: input.description || null,
    image: input.image || null,
    parentId: input.parentId || null,
    isActive: input.isActive !== undefined ? input.isActive : true,
  };

  const { data, error } = await supabase
    .from('categories')
    .insert(insertData)
    .select()
    .single();

  if (error || !data) {
    log.error('Error creating category', { error, input });
    if (error?.code === '23505') {
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

  const updateData: Updates<'categories'> = input;

  const { data, error } = await supabase
    .from('categories')
    .update(updateData)
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
