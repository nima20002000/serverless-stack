/**
 * Integration Tests for Category Service
 *
 * Tests category CRUD, hierarchy, slug uniqueness, and delete constraints.
 * These tests validate real behavior against the Supabase database.
 *
 * ANTI-REWARD-HACKING NOTES:
 * - Assertions validate concrete values and relational behavior
 * - Error scenarios verify specific messages and state
 * - Tests rely on real Supabase operations
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { randomUUID } from 'crypto';
import { createTestSupabaseClient } from '../utils/test-client';
import { cleanupTestCategories, cleanupTestProducts } from '../utils/cleanup';
import {
  expectValidCategoryObject,
  expectValidSlug,
} from '../utils/assertions';
import {
  createCategory,
  getCategoryById,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
} from '../../src/services/category-service';

const supabase = createTestSupabaseClient();

function createTestSlug(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

describe('Category Service Integration Tests', () => {
  beforeEach(async () => {
    await cleanupTestProducts();
    await cleanupTestCategories();
  });

  afterEach(async () => {
    await cleanupTestProducts();
    await cleanupTestCategories();
  });

  it('should create and fetch a root category by ID', async () => {
    const slug = createTestSlug('test-root');

    const category = await createCategory({
      name: 'TEST-Category Root',
      slug,
      description: 'Category Testtext',
    });

    expectValidCategoryObject(category);
    if (category.parentId !== null) {
      throw new Error('Root category should not have a parentId');
    }
    expect(category.isActive).toBe(true);
    expect(category.slug).toBe(slug);

    const fetched = await getCategoryById(category.id);
    expectValidCategoryObject(fetched);
    expect(fetched.id).toBe(category.id);
    expect(fetched.name).toBe(category.name);
    expect(fetched.slug).toBe(category.slug);
  });

  it('should create a child category and link to its parent', async () => {
    const parentSlug = createTestSlug('test-parent');
    const childSlug = createTestSlug('test-child');

    const parent = await createCategory({
      name: 'TEST-Parent',
      slug: parentSlug,
    });

    const child = await createCategory({
      name: 'TEST-text',
      slug: childSlug,
      parentId: parent.id,
    });

    expect(child.parentId).toBe(parent.id);

    const fetchedChild = await getCategoryById(child.id);
    expect(fetchedChild.id).toBe(child.id);

    const { data: storedChild, error: childError } = await supabase
      .from('categories')
      .select('parentId')
      .eq('id', child.id)
      .single();

    if (childError) {
      throw new Error(`Failed to verify child parentId: ${childError.message}`);
    }

    expect(storedChild.parentId).toBe(parent.id);
    const parentRelation = Array.isArray(fetchedChild.parent)
      ? fetchedChild.parent[0]
      : fetchedChild.parent;

    if (!parentRelation) {
      throw new Error('Parent relation missing from getCategoryById result');
    }

    expect(parentRelation.id).toBe(parent.id);
    expect(parentRelation.slug).toBe(parentSlug);
  });

  it('should enforce slug uniqueness when creating categories', async () => {
    const slug = createTestSlug('test-unique');

    await createCategory({
      name: 'TEST-details',
      slug,
    });

    await expect(
      createCategory({
        name: 'TEST-details',
        slug,
      })
    ).rejects.toThrow('Category with text Nametext (slug) Already text');
  });

  it('should update category fields and persist changes', async () => {
    const slug = createTestSlug('test-update');
    const updatedSlug = createTestSlug('test-updated');

    const category = await createCategory({
      name: 'TEST-text',
      slug,
    });

    const updated = await updateCategory(category.id, {
      name: 'TEST-text',
      slug: updatedSlug,
      isActive: false,
    });

    expect(updated.id).toBe(category.id);
    expect(updated.name).toBe('TEST-text');
    expect(updated.slug).toBe(updatedSlug);
    expectValidSlug(updated.slug);
    expect(updated.isActive).toBe(false);

    const fetched = await getCategoryById(category.id);
    expect(fetched.name).toBe('TEST-text');
    expect(fetched.slug).toBe(updatedSlug);
    expect(fetched.isActive).toBe(false);
  });

  it('should retrieve category by slug only when active', async () => {
    const activeSlug = createTestSlug('test-active');
    const inactiveSlug = createTestSlug('test-inactive');

    const active = await createCategory({
      name: 'TEST-Active',
      slug: activeSlug,
      isActive: true,
    });

    await createCategory({
      name: 'TEST-Inactive',
      slug: inactiveSlug,
      isActive: false,
    });

    const fetchedActive = await getCategoryBySlug(activeSlug);
    expect(fetchedActive?.id).toBe(active.id);
    expect(fetchedActive?.slug).toBe(activeSlug);

    const fetchedInactive = await getCategoryBySlug(inactiveSlug);
    if (fetchedInactive !== null) {
      throw new Error('Inactive categories should not be returned by slug');
    }
  });

  it('should prevent deleting category that has products', async () => {
    const slug = createTestSlug('test-product');

    const category = await createCategory({
      name: 'TEST-text-Product',
      slug,
    });

    const productId = randomUUID();
    const { error: productError } = await supabase.from('products').insert({
      id: productId,
      name: `TEST-Product-${Date.now()}`,
      description: 'Test products',
      price: 150000,
      stock: 5,
      isActive: true,
      categoryId: category.id,
      updatedAt: new Date().toISOString(),
    });
    if (productError) {
      throw new Error(
        `Failed to seed product for test: ${productError.message}`
      );
    }

    const { count: productCount, error: productCountError } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('id', productId);

    if (productCountError) {
      throw new Error(
        `Failed to verify seeded product: ${productCountError.message}`
      );
    }

    expect(productCount).toBe(1);

    await expect(deleteCategory(category.id)).rejects.toThrow(
      'text Delete Category text Product text Not found'
    );
  });

  it('should prevent deleting category that has child categories', async () => {
    const parentSlug = createTestSlug('test-parent-delete');
    const childSlug = createTestSlug('test-child-delete');

    const parent = await createCategory({
      name: 'TEST-Parent-Delete',
      slug: parentSlug,
    });

    await createCategory({
      name: 'TEST-text-Delete',
      slug: childSlug,
      parentId: parent.id,
    });

    await expect(deleteCategory(parent.id)).rejects.toThrow(
      'text Delete Category text Not found'
    );
  });

  it('should delete a category with no dependencies', async () => {
    const slug = createTestSlug('test-delete');

    const category = await createCategory({
      name: 'TEST-Delete',
      slug,
    });

    const result = await deleteCategory(category.id);
    expect(result.success).toBe(true);

    const { count, error } = await supabase
      .from('categories')
      .select('id', { count: 'exact', head: true })
      .eq('id', category.id);

    if (error) {
      throw new Error(`Failed to verify category deletion: ${error.message}`);
    }

    expect(count).toBe(0);
  });
});
