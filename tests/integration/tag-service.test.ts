/**
 * Integration Tests for Tag Service
 *
 * Tests tag CRUD, slug uniqueness, retrieval, and product count behavior.
 * These tests validate real behavior against the Supabase database.
 *
 * ANTI-REWARD-HACKING NOTES:
 * - Assertions validate concrete values and state transitions
 * - Error scenarios verify specific messages
 * - Tests rely on real Supabase operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'crypto';
import { createTestSupabaseClient } from '../utils/test-client';
import { cleanupTestProducts, cleanupTestTags } from '../utils/cleanup';
import { expectValidSlug, expectValidTagObject } from '../utils/assertions';
import {
  createTag,
  updateTag,
  deleteTag,
  getTagById,
  getTagBySlug,
  getAllTags,
  searchTags,
} from '../../src/services/tag-service';

const supabase = createTestSupabaseClient();

function createTestSlug(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

async function createTestProduct() {
  const productId = randomUUID();
  const { error } = await supabase.from('products').insert({
    id: productId,
    name: `TEST-Tag-Product-${Date.now()}`,
    description: 'Test product for tag service',
    price: 150000,
    stock: 5,
    isActive: true,
    updatedAt: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create test product: ${error.message}`);
  }

  return productId;
}

describe('Tag Service Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestProducts();
    await cleanupTestTags();
  });

  afterEach(async () => {
    await cleanupTestProducts();
    await cleanupTestTags();
  });

  it('should create a tag and retrieve it by ID and slug', async () => {
    const slug = createTestSlug('test-tag');

    const created = await createTag({
      name: 'TEST-Tag-Create',
      slug,
    });

    expectValidTagObject(created);
    expectValidSlug(created.slug);
    expect(created.slug).toBe(slug);
    expect(created._count.products).toBe(0);

    const byId = await getTagById(created.id);
    if (!byId) {
      throw new Error('Expected tag to be returned by getTagById');
    }
    expect(byId.id).toBe(created.id);
    expect(byId.slug).toBe(slug);

    const bySlug = await getTagBySlug(slug);
    if (!bySlug) {
      throw new Error('Expected tag to be returned by getTagBySlug');
    }
    expect(bySlug.id).toBe(created.id);
    expect(bySlug.slug).toBe(slug);
  });

  it('should enforce slug uniqueness when creating tags', async () => {
    const slug = createTestSlug('test-unique');

    await createTag({
      name: 'TEST-Tag-Unique-1',
      slug,
    });

    await expect(
      createTag({
        name: 'TEST-Tag-Unique-2',
        slug,
      })
    ).rejects.toThrow('برچسب با این نام یا نامک (slug) قبلاً ثبت شده است');
  });

  it('should update tag fields and prevent duplicate slugs', async () => {
    const slug = createTestSlug('test-update');
    const otherSlug = createTestSlug('test-other');
    const updatedSlug = createTestSlug('test-updated');

    const tag = await createTag({
      name: 'TEST-Tag-Update',
      slug,
    });

    const otherTag = await createTag({
      name: 'TEST-Tag-Other',
      slug: otherSlug,
    });

    const updated = await updateTag(tag.id, {
      name: 'TEST-Tag-Updated',
      slug: updatedSlug,
    });

    expect(updated.id).toBe(tag.id);
    expect(updated.name).toBe('TEST-Tag-Updated');
    expect(updated.slug).toBe(updatedSlug);

    const fetched = await getTagById(tag.id);
    if (!fetched) {
      throw new Error('Expected updated tag to be returned');
    }
    expect(fetched.slug).toBe(updatedSlug);

    await expect(updateTag(tag.id, { slug: otherTag.slug })).rejects.toThrow(
      'برچسب با این نام یا نامک (slug) قبلاً ثبت شده است'
    );
  });

  it('should return product counts for tags in detail and list queries', async () => {
    const slug = createTestSlug('test-count');
    const productId = await createTestProduct();

    const tag = await createTag({
      name: 'TEST-Tag-Count',
      slug,
    });

    const { error: linkError } = await supabase.from('_ProductToTag').insert({
      A: productId,
      B: tag.id,
    });

    if (linkError) {
      throw new Error(`Failed to link product to tag: ${linkError.message}`);
    }

    const byId = await getTagById(tag.id);
    if (!byId) {
      throw new Error('Expected tag to be returned for count check');
    }
    expect(byId._count.products).toBe(1);

    const allTags = await getAllTags();
    const listed = allTags.find((item) => item.id === tag.id);
    if (!listed) {
      throw new Error('Expected tag to be included in getAllTags');
    }
    expect(listed._count.products).toBe(1);

    const searchResults = await searchTags(slug);
    const searched = searchResults.find((item) => item.id === tag.id);
    if (!searched) {
      throw new Error('Expected tag to be included in searchTags');
    }
    expect(searched._count.products).toBe(1);
  });

  it('should prevent deleting tags with products and allow deletion after unlinking', async () => {
    const slug = createTestSlug('test-delete');
    const productId = await createTestProduct();

    const tag = await createTag({
      name: 'TEST-Tag-Delete',
      slug,
    });

    const { error: linkError } = await supabase.from('_ProductToTag').insert({
      A: productId,
      B: tag.id,
    });

    if (linkError) {
      throw new Error(`Failed to link product to tag: ${linkError.message}`);
    }

    await expect(deleteTag(tag.id)).rejects.toThrow(
      'این برچسب دارای محصول است و نمی‌توان آن را حذف کرد'
    );

    const { error: unlinkError } = await supabase
      .from('_ProductToTag')
      .delete()
      .eq('A', productId)
      .eq('B', tag.id);

    if (unlinkError) {
      throw new Error(
        `Failed to unlink product from tag: ${unlinkError.message}`
      );
    }

    const result = await deleteTag(tag.id);
    expect(result.success).toBe(true);

    const afterDelete = await getTagById(tag.id);
    expect(afterDelete).toBeNull();
  });
});
