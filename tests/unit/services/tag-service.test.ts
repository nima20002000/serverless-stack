import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getAllTags,
  searchTags,
  getTagById,
  getTagBySlug,
  createTag,
  updateTag,
  deleteTag,
} from '@/services/tag-service';
import { createClient } from '@/lib/supabase/server';
import { clearCache } from '@/lib/redis/client';
import { createSupabaseMock, createQueryMock } from '../helpers/supabase-mock';

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/lib/redis/client', () => ({
  clearCache: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('tag-service', () => {
  const createClientMock = vi.mocked(createClient);
  const clearCacheMock = vi.mocked(clearCache);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty list when no tags exist', async () => {
    const supabase = createSupabaseMock();
    const tagsQuery = createQueryMock({ data: [], error: null });

    supabase.from.mockReturnValueOnce(tagsQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await getAllTags();

    expect(result).toEqual([]);
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });

  it('returns tags with product counts', async () => {
    const supabase = createSupabaseMock();
    const tagsQuery = createQueryMock({
      data: [
        { id: 't1', name: 'Tag 1', slug: 'tag-1' },
        { id: 't2', name: 'Tag 2', slug: 'tag-2' },
      ],
      error: null,
    });
    const countsQuery = createQueryMock({
      data: [{ B: 't1' }, { B: 't1' }, { B: 't2' }],
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(tagsQuery)
      .mockReturnValueOnce(countsQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await getAllTags();

    expect(result).toEqual([
      {
        id: 't1',
        name: 'Tag 1',
        slug: 'tag-1',
        _count: { products: 2 },
      },
      {
        id: 't2',
        name: 'Tag 2',
        slug: 'tag-2',
        _count: { products: 1 },
      },
    ]);
  });

  it('falls back to zero counts when tag count lookup fails', async () => {
    const supabase = createSupabaseMock();
    const tagsQuery = createQueryMock({
      data: [{ id: 't1', name: 'Tag 1', slug: 'tag-1' }],
      error: null,
    });
    const countsQuery = createQueryMock({
      data: null,
      error: new Error('count failed'),
    });

    supabase.from
      .mockReturnValueOnce(tagsQuery)
      .mockReturnValueOnce(countsQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await getAllTags();

    expect(result).toEqual([
      {
        id: 't1',
        name: 'Tag 1',
        slug: 'tag-1',
        _count: { products: 0 },
      },
    ]);
  });

  it('throws when tag search fails', async () => {
    const supabase = createSupabaseMock();
    const searchQuery = createQueryMock({
      data: null,
      error: new Error('search error'),
    });

    supabase.from.mockReturnValueOnce(searchQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(searchTags('shoe')).rejects.toThrow('Unable to search tags');
  });

  it('returns zero counts when search count lookup fails', async () => {
    const supabase = createSupabaseMock();
    const searchQuery = createQueryMock({
      data: [{ id: 't1', name: 'Tag 1', slug: 'tag-1' }],
      error: null,
    });
    const countsQuery = createQueryMock({
      data: null,
      error: new Error('count error'),
    });

    supabase.from
      .mockReturnValueOnce(searchQuery)
      .mockReturnValueOnce(countsQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await searchTags('tag');

    expect(result).toEqual([
      {
        id: 't1',
        name: 'Tag 1',
        slug: 'tag-1',
        _count: { products: 0 },
      },
    ]);
  });

  it('returns null when tag by id is not found', async () => {
    const supabase = createSupabaseMock();
    const tagQuery = createQueryMock({
      data: null,
      error: { code: 'PGRST116' },
    });

    supabase.from.mockReturnValueOnce(tagQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await getTagById('missing');

    expect(result).toBeNull();
  });

  it('returns tag with count when found by id', async () => {
    const supabase = createSupabaseMock();
    const tagQuery = createQueryMock({
      data: { id: 't1', name: 'Tag 1', slug: 'tag-1' },
      error: null,
    });
    const countQuery = createQueryMock({
      data: null,
      error: null,
      count: 3,
    });

    supabase.from.mockReturnValueOnce(tagQuery).mockReturnValueOnce(countQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await getTagById('t1');

    expect(result).toEqual({
      id: 't1',
      name: 'Tag 1',
      slug: 'tag-1',
      _count: { products: 3 },
    });
  });

  it('returns null when tag by slug is not found', async () => {
    const supabase = createSupabaseMock();
    const tagQuery = createQueryMock({
      data: null,
      error: { code: 'PGRST116' },
    });

    supabase.from.mockReturnValueOnce(tagQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await getTagBySlug('missing');

    expect(result).toBeNull();
  });

  it('creates a new tag and invalidates cache', async () => {
    const supabase = createSupabaseMock();
    const existingQuery = createQueryMock({ data: [], error: null });
    const createQuery = createQueryMock({
      data: { id: 't1', name: 'Tag 1', slug: 'tag-1' },
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(createQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await createTag({ name: 'Tag 1', slug: 'tag-1' });

    expect(createQuery.insert).toHaveBeenCalledWith({
      name: 'Tag 1',
      slug: 'tag-1',
    });
    expect(clearCacheMock).toHaveBeenCalledWith('tags:all');
    expect(result).toEqual({
      id: 't1',
      name: 'Tag 1',
      slug: 'tag-1',
      _count: { products: 0 },
    });
  });

  it('rejects creating tag when duplicate exists', async () => {
    const supabase = createSupabaseMock();
    const existingQuery = createQueryMock({
      data: [{ id: 't1' }],
      error: null,
    });

    supabase.from.mockReturnValueOnce(existingQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(createTag({ name: 'Tag 1', slug: 'tag-1' })).rejects.toThrow(
      'A tag with this name or slug already exists'
    );
  });

  it('updates tag and returns product count', async () => {
    const supabase = createSupabaseMock();
    const existingQuery = createQueryMock({ data: { id: 't1' }, error: null });
    const takenQuery = createQueryMock({ data: [], error: null });
    const updateQuery = createQueryMock({
      data: { id: 't1', name: 'Updated', slug: 'tag-1' },
      error: null,
    });
    const countQuery = createQueryMock({
      data: null,
      error: null,
      count: 2,
    });

    supabase.from
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(takenQuery)
      .mockReturnValueOnce(updateQuery)
      .mockReturnValueOnce(countQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await updateTag('t1', { name: 'Updated' });

    expect(updateQuery.update).toHaveBeenCalledWith({ name: 'Updated' });
    expect(clearCacheMock).toHaveBeenCalledWith('tags:all');
    expect(result).toEqual({
      id: 't1',
      name: 'Updated',
      slug: 'tag-1',
      _count: { products: 2 },
    });
  });

  it('rejects update when tag is missing', async () => {
    const supabase = createSupabaseMock();
    const existingQuery = createQueryMock({ data: null, error: null });

    supabase.from.mockReturnValueOnce(existingQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(updateTag('t1', { name: 'Updated' })).rejects.toThrow(
      'Tag not found'
    );
  });

  it('rejects update when duplicate tag exists', async () => {
    const supabase = createSupabaseMock();
    const existingQuery = createQueryMock({ data: { id: 't1' }, error: null });
    const takenQuery = createQueryMock({
      data: [{ id: 't2' }],
      error: null,
    });

    supabase.from
      .mockReturnValueOnce(existingQuery)
      .mockReturnValueOnce(takenQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(updateTag('t1', { name: 'Taken' })).rejects.toThrow(
      'A tag with this name or slug already exists'
    );
  });

  it('rejects delete when tag has products', async () => {
    const supabase = createSupabaseMock();
    const tagQuery = createQueryMock({ data: { id: 't1' }, error: null });
    const countQuery = createQueryMock({
      data: null,
      error: null,
      count: 1,
    });

    supabase.from.mockReturnValueOnce(tagQuery).mockReturnValueOnce(countQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    await expect(deleteTag('t1')).rejects.toThrow(
      'Cannot delete a tag that is assigned to products'
    );
  });

  it('deletes tag and invalidates cache', async () => {
    const supabase = createSupabaseMock();
    const tagQuery = createQueryMock({ data: { id: 't1' }, error: null });
    const countQuery = createQueryMock({
      data: null,
      error: null,
      count: 0,
    });
    const deleteQuery = createQueryMock({ data: null, error: null });

    supabase.from
      .mockReturnValueOnce(tagQuery)
      .mockReturnValueOnce(countQuery)
      .mockReturnValueOnce(deleteQuery);
    createClientMock.mockReturnValue(supabase as unknown);

    const result = await deleteTag('t1');

    expect(deleteQuery.delete).toHaveBeenCalled();
    expect(clearCacheMock).toHaveBeenCalledWith('tags:all');
    expect(result).toEqual({ success: true });
  });
});
