// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useVariantManager } from '@/hooks/useVariantManager';
import { renderHook, withAct } from '@utils/hook-utils';

describe('useVariantManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('rejects adding variant without a name', () => {
    const { result, unmount } = renderHook(() => useVariantManager());

    withAct(() => {
      result().addOrUpdateVariant();
    });

    expect(window.alert).toHaveBeenCalledWith('Variant name is required.');
    expect(result().variants).toHaveLength(0);

    unmount();
  });

  it('adds a new variant with generated id and order', () => {
    const { result, unmount } = renderHook(() => useVariantManager());

    withAct(() => {
      result().handleVariantFormChange({
        target: { name: 'name', value: 'Size L', type: 'text' },
      } as any);
    });

    withAct(() => {
      result().addOrUpdateVariant();
    });

    expect(result().variants).toHaveLength(1);
    expect(result().variants[0].name).toBe('Size L');
    expect(result().variants[0].order).toBe(0);
    expect(result().editingVariantId).toBeNull();

    unmount();
  });

  it('edits an existing variant and preserves order', () => {
    const { result, unmount } = renderHook(() =>
      useVariantManager([
        {
          id: 'v1',
          name: 'Size M',
          sku: 'SKU1',
          color: '',
          size: '',
          material: '',
          priceAdjust: '0',
          stock: '5',
          isActive: true,
          order: 1,
          media: [],
        },
      ])
    );

    withAct(() => {
      result().editVariant(result().variants[0]);
    });

    withAct(() => {
      result().handleVariantFormChange({
        target: { name: 'name', value: 'Size XL', type: 'text' },
      } as any);
    });

    withAct(() => {
      result().addOrUpdateVariant();
    });

    expect(result().variants).toHaveLength(1);
    expect(result().variants[0].name).toBe('Size XL');
    expect(result().variants[0].order).toBe(1);

    unmount();
  });

  it('deletes variant and reorders remaining items', () => {
    const { result, unmount } = renderHook(() =>
      useVariantManager([
        {
          id: 'v1',
          name: 'One',
          sku: '',
          color: '',
          size: '',
          material: '',
          priceAdjust: '0',
          stock: '1',
          isActive: true,
          order: 0,
          media: [],
        },
        {
          id: 'v2',
          name: 'Two',
          sku: '',
          color: '',
          size: '',
          material: '',
          priceAdjust: '0',
          stock: '1',
          isActive: true,
          order: 1,
          media: [],
        },
      ])
    );

    withAct(() => {
      result().deleteVariant('v1');
    });

    expect(result().variants).toHaveLength(1);
    expect(result().variants[0].id).toBe('v2');
    expect(result().variants[0].order).toBe(0);

    unmount();
  });

  it('reorders variants and updates order fields', () => {
    const { result, unmount } = renderHook(() =>
      useVariantManager([
        {
          id: 'v1',
          name: 'One',
          sku: '',
          color: '',
          size: '',
          material: '',
          priceAdjust: '0',
          stock: '1',
          isActive: true,
          order: 0,
          media: [],
        },
        {
          id: 'v2',
          name: 'Two',
          sku: '',
          color: '',
          size: '',
          material: '',
          priceAdjust: '0',
          stock: '1',
          isActive: true,
          order: 1,
          media: [],
        },
      ])
    );

    withAct(() => {
      result().reorderVariants(0, 1);
    });

    expect(result().variants[0].id).toBe('v2');
    expect(result().variants[0].order).toBe(0);
    expect(result().variants[1].id).toBe('v1');
    expect(result().variants[1].order).toBe(1);

    unmount();
  });
});
