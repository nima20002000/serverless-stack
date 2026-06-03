import 'server-only';
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
 */
export async function bulkDeleteCategories(
  categoryIds: string[]
): Promise<{ count: number }> {
  const supabase = await createClient();

  try {
    // Batch fetch categories to check constraints
    const { data: categoriesToCheck } = await supabase
      .from('categories')
      .select('id, name')
      .in('id', categoryIds);

    if (!categoriesToCheck || categoriesToCheck.length === 0) {
      return { count: 0 };
    }

    // Batch check if any categories have products
    const { data: productsInCategories } = await supabase
      .from('products')
      .select('categoryId')
      .in('categoryId', categoryIds);

    const categoriesWithProducts = new Set(
      (productsInCategories || []).map((p) => p.categoryId).filter(Boolean)
    );

    const categoriesWithProductNames = categoriesToCheck
      .filter((cat) => categoriesWithProducts.has(cat.id))
      .map((cat) => cat.name);

    if (categoriesWithProductNames.length > 0) {
      throw new Error(
        `Cannot delete categories that contain products: ${categoriesWithProductNames.join(', ')}`
      );
    }

    // Batch check if any categories have children
    const { data: childCategories } = await supabase
      .from('categories')
      .select('parentId')
      .in('parentId', categoryIds);

    const categoriesWithChildren = new Set(
      (childCategories || []).map((c) => c.parentId).filter(Boolean)
    );

    const categoriesWithChildrenNames = categoriesToCheck
      .filter((cat) => categoriesWithChildren.has(cat.id))
      .map((cat) => cat.name);

    if (categoriesWithChildrenNames.length > 0) {
      throw new Error(
        `Cannot delete categories that contain subcategories: ${categoriesWithChildrenNames.join(', ')}`
      );
    }

    // Delete categories
    const { error, count } = await supabase
      .from('categories')
      .delete({ count: 'exact' })
      .in('id', categoryIds);

    if (error) {
      log.error('Error in bulk delete categories', { error });
      throw new Error('Unable to delete categories');
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
      throw new Error('Unable to update categories');
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
 */
export async function getAllCategories(): Promise<CategoryWithRelations[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*, parent:categories!parentId(*), children:categories!parentId(*)')
    .order('name', { ascending: true });

  if (error) {
    log.error('Error fetching all categories', { error });
    throw new Error('Unable to load categories');
  }

  if (!data) {
    return [];
  }

  // Batch fetch product counts for all categories to avoid N+1 queries
  const categoryIds = data.map((c) => c.id);
  const { data: productCounts } = await supabase
    .from('products')
    .select('categoryId')
    .in('categoryId', categoryIds);

  // Create count map for O(1) lookup
  const productCountMap = new Map<string, number>();
  (productCounts || []).forEach((p) => {
    if (p.categoryId) {
      productCountMap.set(
        p.categoryId,
        (productCountMap.get(p.categoryId) || 0) + 1
      );
    }
  });

  // Map categories with their counts
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
    .select(
      '*, parent:categories!parentId(*), children:categories!parentId(id, name, slug, isActive)'
    )
    .eq('isActive', true)
    .order('name', { ascending: true });

  if (error) {
    log.error('Error fetching active categories', { error });
    throw new Error('Unable to load active categories');
  }

  return (data || []).map((category) => ({
    ...category,
    children: Array.isArray(category.children)
      ? category.children.filter((child) => child.isActive)
      : [],
  }));
}

/**
 * Get category tree (root categories with children)
 */
export async function getCategoryTree(): Promise<CategoryWithRelations[]> {
  const supabase = await createClient();

  // First get root categories (parentId is null)
  const { data: rootCategories, error: rootError } = await supabase
    .from('categories')
    .select('*')
    .is('parentId', null)
    .eq('isActive', true)
    .order('name', { ascending: true });

  if (rootError) {
    log.error('Error fetching root categories', { error: rootError });
    throw new Error('Unable to load categories');
  }

  if (!rootCategories || rootCategories.length === 0) {
    return [];
  }

  // Then get all active child categories
  const { data: allChildren, error: childError } = await supabase
    .from('categories')
    .select('*')
    .not('parentId', 'is', null)
    .eq('isActive', true)
    .order('name', { ascending: true });

  if (childError) {
    log.error('Error fetching child categories', { error: childError });
    throw new Error('Unable to load categories');
  }

  // Build tree structure manually
  const childrenByParentId = new Map<string, CategoryWithRelations[]>();
  for (const child of allChildren || []) {
    if (child.parentId) {
      const siblings = childrenByParentId.get(child.parentId) || [];
      siblings.push({ ...child, children: [] });
      childrenByParentId.set(child.parentId, siblings);
    }
  }

  // Attach children to root categories (supports 2 levels deep)
  const tree: CategoryWithRelations[] = rootCategories.map((root) => {
    const level1Children = childrenByParentId.get(root.id) || [];
    // Attach level 2 children to level 1 children
    const childrenWithGrandchildren = level1Children.map((child) => ({
      ...child,
      children: childrenByParentId.get(child.id) || [],
    }));
    return {
      ...root,
      children: childrenWithGrandchildren,
    };
  });

  return tree;
}

/**
 * Get category by ID
 */
export async function getCategoryById(
  id: string
): Promise<CategoryWithRelations> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('categories')
    .select('*, parent:categories!parentId(*), children:categories!parentId(*)')
    .eq('id', id)
    .single();

  if (error || !data) {
    log.error('Category not found', { id, error });
    throw new Error('Category not found');
  }

  // If parent relation is missing but parentId exists, fetch parent explicitly
  // (self-join can be flaky and return null or empty array even when parentId is set)
  const parentMissing =
    !data.parent || (Array.isArray(data.parent) && data.parent.length === 0);

  if (data.parentId && parentMissing) {
    const { data: parentData } = await supabase
      .from('categories')
      .select('*')
      .eq('id', data.parentId)
      .single();

    if (parentData) {
      data.parent = parentData;
    }
  }

  // @ts-expect-error - Supabase join syntax returns children as object/null, not array
  return data;
}

/**
 * Get category by slug
 */
export async function getCategoryBySlug(
  slug: string
): Promise<CategoryWithRelations | null> {
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

  // If parent relation is missing but parentId exists, fetch parent explicitly
  // (self-join can be flaky and return null or empty array even when parentId is set)
  const parentMissing =
    !data.parent || (Array.isArray(data.parent) && data.parent.length === 0);

  if (data.parentId && parentMissing) {
    const { data: parentData } = await supabase
      .from('categories')
      .select('*')
      .eq('id', data.parentId)
      .single();

    if (parentData) {
      data.parent = parentData;
    }
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
      throw new Error('A category with this slug already exists');
    }
    throw new Error('Unable to create category');
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
      throw new Error('A category with this slug already exists');
    }
    throw new Error('Unable to update category');
  }

  await invalidateCategoryCache();
  log.info('Category updated', { id, updates: input });
  return data;
}

/**
 * Delete a category
 */
export async function deleteCategory(
  id: string
): Promise<{ success: boolean }> {
  const supabase = await createClient();

  // Check if category has products
  const { count: productCount } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('categoryId', id);

  if (productCount && productCount > 0) {
    throw new Error('Cannot delete a category that contains products');
  }

  // Check if category has children
  const { count: childrenCount } = await supabase
    .from('categories')
    .select('id', { count: 'exact', head: true })
    .eq('parentId', id);

  if (childrenCount && childrenCount > 0) {
    throw new Error('Cannot delete a category that contains subcategories');
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);

  if (error) {
    log.error('Error deleting category', { id, error });
    throw new Error('Unable to delete category');
  }

  await invalidateCategoryCache();
  log.info('Category deleted', { id });
  return { success: true };
}
