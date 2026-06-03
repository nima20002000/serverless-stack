import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { TagFormData, TagWithCount } from '@/types/product';
import { DeleteResult } from '@/types/api';
import { clearCache } from '@/lib/redis/client';
import { log } from '@/lib/logger';
import { Inserts, Updates } from '@/lib/supabase/types';

type SupabaseTagInsert = Inserts<'tags'>;
type SupabaseTagUpdate = Updates<'tags'>;

const MAX_QUERY_LENGTH = 100;
const MAX_SEARCH_LIMIT = 10;

function sanitizeSearchQuery(rawQuery: string): string {
  return rawQuery
    .trim()
    .slice(0, MAX_QUERY_LENGTH)
    .replace(/[%_\\]/g, '');
}

/**
 * Helper to invalidate tag cache
 */
async function invalidateTagCache(): Promise<void> {
  await clearCache('tags:all');
  log.info('Tag cache invalidated');
}

/**
 * Get all tags with product count
 */
export async function getAllTags(): Promise<TagWithCount[]> {
  const supabase = createClient();

  // Get all tags
  const { data: tags, error: tagsError } = await supabase
    .from('tags')
    .select('*')
    .order('name', { ascending: true });

  if (tagsError) {
    log.error('Error fetching tags', { error: tagsError });
    throw new Error('Unable to load tags');
  }

  if (!tags || tags.length === 0) {
    return [];
  }

  // Get product counts for each tag via junction table
  const tagIds = tags.map((tag) => tag.id);
  const { data: productCounts, error: countError } = await supabase
    .from('_ProductToTag')
    .select('B')
    .in('B', tagIds);

  if (countError) {
    log.error('Error fetching tag product counts', { error: countError });
    // Return tags with 0 count if count query fails
    return tags.map((tag) => ({
      ...tag,
      _count: { products: 0 },
    }));
  }

  // Count products for each tag
  const countMap = new Map<string, number>();
  productCounts?.forEach((item) => {
    const tagId = item.B;
    countMap.set(tagId, (countMap.get(tagId) || 0) + 1);
  });

  // Merge counts with tags
  return tags.map((tag) => ({
    ...tag,
    _count: {
      products: countMap.get(tag.id) || 0,
    },
  }));
}

/**
 * Search tags by name or slug
 */
export async function searchTags(query: string): Promise<TagWithCount[]> {
  const supabase = createClient();
  const searchQuery = sanitizeSearchQuery(query);

  if (!searchQuery) {
    return [];
  }

  // Search tags (case-insensitive using ilike)
  const { data: tags, error: tagsError } = await supabase
    .from('tags')
    .select('*')
    .or(`name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`)
    .order('name', { ascending: true })
    .limit(MAX_SEARCH_LIMIT);

  if (tagsError) {
    log.error('Error searching tags', { error: tagsError, query });
    throw new Error('Unable to search tags');
  }

  if (!tags || tags.length === 0) {
    return [];
  }

  // Get product counts for found tags
  const tagIds = tags.map((tag) => tag.id);
  const { data: productCounts, error: countError } = await supabase
    .from('_ProductToTag')
    .select('B')
    .in('B', tagIds);

  if (countError) {
    log.error('Error fetching tag product counts', { error: countError });
    return tags.map((tag) => ({
      ...tag,
      _count: { products: 0 },
    }));
  }

  // Count products for each tag
  const countMap = new Map<string, number>();
  productCounts?.forEach((item) => {
    const tagId = item.B;
    countMap.set(tagId, (countMap.get(tagId) || 0) + 1);
  });

  // Merge counts with tags
  return tags.map((tag) => ({
    ...tag,
    _count: {
      products: countMap.get(tag.id) || 0,
    },
  }));
}

/**
 * Get tag by ID with product count
 */
export async function getTagById(id: string): Promise<TagWithCount | null> {
  const supabase = createClient();

  // Get tag by ID
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('*')
    .eq('id', id)
    .single();

  if (tagError) {
    if (tagError.code === 'PGRST116') {
      // Not found
      return null;
    }
    log.error('Error fetching tag by ID', { error: tagError, id });
    throw new Error('Unable to load tag');
  }

  if (!tag) {
    return null;
  }

  // Get product count for this tag
  const { count, error: countError } = await supabase
    .from('_ProductToTag')
    .select('*', { count: 'exact', head: true })
    .eq('B', id);

  if (countError) {
    log.error('Error counting tag products', { error: countError, id });
  }

  return {
    ...tag,
    _count: {
      products: count || 0,
    },
  };
}

/**
 * Get tag by slug with product count
 */
export async function getTagBySlug(slug: string): Promise<TagWithCount | null> {
  const supabase = createClient();

  // Get tag by slug
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('*')
    .eq('slug', slug)
    .single();

  if (tagError) {
    if (tagError.code === 'PGRST116') {
      // Not found
      return null;
    }
    log.error('Error fetching tag by slug', { error: tagError, slug });
    throw new Error('Unable to load tag');
  }

  if (!tag) {
    return null;
  }

  // Get product count for this tag
  const { count, error: countError } = await supabase
    .from('_ProductToTag')
    .select('*', { count: 'exact', head: true })
    .eq('B', tag.id);

  if (countError) {
    log.error('Error counting tag products', { error: countError, id: tag.id });
  }

  return {
    ...tag,
    _count: {
      products: count || 0,
    },
  };
}

/**
 * Create a new tag
 */
export async function createTag(data: TagFormData): Promise<TagWithCount> {
  const supabase = createClient();

  // Check if tag with same name or slug exists
  const { data: existing, error: checkError } = await supabase
    .from('tags')
    .select('id')
    .or(`name.eq.${data.name},slug.eq.${data.slug}`)
    .limit(1);

  if (checkError) {
    log.error('Error checking existing tag', { error: checkError, data });
    throw new Error('Unable to update tag inventory state');
  }

  if (existing && existing.length > 0) {
    throw new Error('A tag with this name or slug already exists');
  }

  // Create the tag
  const tagData: SupabaseTagInsert = {
    name: data.name,
    slug: data.slug,
  };

  const { data: newTag, error: createError } = await supabase
    .from('tags')
    .insert(tagData)
    .select()
    .single();

  if (createError) {
    log.error('Error creating tag', { error: createError, data });
    throw new Error('Unable to create tag');
  }

  // Invalidate tag cache
  await invalidateTagCache();

  return {
    ...newTag,
    _count: {
      products: 0, // New tag has no products
    },
  };
}

/**
 * Update an existing tag
 */
export async function updateTag(
  id: string,
  data: Partial<TagFormData>
): Promise<TagWithCount> {
  const supabase = createClient();

  // Check if tag exists
  const { data: existing, error: existError } = await supabase
    .from('tags')
    .select('id')
    .eq('id', id)
    .single();

  if (existError || !existing) {
    throw new Error('Tag not found');
  }

  // If name or slug is being updated, check they're not taken by another tag
  if (data.name || data.slug) {
    const orConditions = [];
    if (data.name) orConditions.push(`name.eq.${data.name}`);
    if (data.slug) orConditions.push(`slug.eq.${data.slug}`);

    const { data: taken, error: takenError } = await supabase
      .from('tags')
      .select('id')
      .neq('id', id)
      .or(orConditions.join(','))
      .limit(1);

    if (takenError) {
      log.error('Error checking duplicate tag', { error: takenError });
      throw new Error('A tag with this slug already exists');
    }

    if (taken && taken.length > 0) {
      throw new Error('A tag with this name or slug already exists');
    }
  }

  // Update the tag
  const updateData: SupabaseTagUpdate = {};
  if (data.name) updateData.name = data.name;
  if (data.slug) updateData.slug = data.slug;

  const { data: updatedTag, error: updateError } = await supabase
    .from('tags')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (updateError || !updatedTag) {
    log.error('Error updating tag', { error: updateError, id, data });
    throw new Error('Unable to update tag');
  }

  // Get product count for this tag
  const { count, error: countError } = await supabase
    .from('_ProductToTag')
    .select('*', { count: 'exact', head: true })
    .eq('B', id);

  if (countError) {
    log.error('Error counting tag products', { error: countError, id });
  }

  // Invalidate tag cache
  await invalidateTagCache();

  return {
    ...updatedTag,
    _count: {
      products: count || 0,
    },
  };
}

/**
 * Delete a tag
 */
export async function deleteTag(id: string): Promise<DeleteResult> {
  const supabase = createClient();

  // Check if tag exists
  const { data: tag, error: tagError } = await supabase
    .from('tags')
    .select('id')
    .eq('id', id)
    .single();

  if (tagError || !tag) {
    throw new Error('Tag not found');
  }

  // Check if tag has products
  const { count, error: countError } = await supabase
    .from('_ProductToTag')
    .select('*', { count: 'exact', head: true })
    .eq('B', id);

  if (countError) {
    log.error('Error counting tag products', { error: countError, id });
    throw new Error('Unable to load tag products');
  }

  if (count && count > 0) {
    throw new Error('Cannot delete a tag that is assigned to products');
  }

  // Delete the tag
  const { error: deleteError } = await supabase
    .from('tags')
    .delete()
    .eq('id', id);

  if (deleteError) {
    log.error('Error deleting tag', { error: deleteError, id });
    throw new Error('Unable to delete tag');
  }

  // Invalidate tag cache
  await invalidateTagCache();

  return { success: true };
}
