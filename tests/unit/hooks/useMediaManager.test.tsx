// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMediaManager } from '@/hooks/useMediaManager';
import { renderHook, withAct } from '@utils/hook-utils';

describe('useMediaManager', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds media and sets default for first item', () => {
    const { result, unmount } = renderHook(() => useMediaManager());

    withAct(() => {
      result().handleMediaSelect(['https://cdn/img1.jpg', '/videos/clip.mp4']);
    });

    const media = result().media;
    expect(media).toHaveLength(2);
    expect(media[0].isDefault).toBe(true);
    expect(media[0].type).toBe('IMAGE');
    expect(media[1].type).toBe('VIDEO');
    expect(media[1].order).toBe(1);

    unmount();
  });

  it('updates default media by id', () => {
    const { result, unmount } = renderHook(() =>
      useMediaManager([
        {
          id: 'm1',
          type: 'IMAGE',
          url: 'a',
          alt: '',
          order: 0,
          isDefault: true,
        },
        {
          id: 'm2',
          type: 'IMAGE',
          url: 'b',
          alt: '',
          order: 1,
          isDefault: false,
        },
      ])
    );

    withAct(() => {
      result().setDefaultMedia('m2');
    });

    expect(result().media.find((m) => m.id === 'm2')?.isDefault).toBe(true);
    expect(result().media.find((m) => m.id === 'm1')?.isDefault).toBe(false);

    unmount();
  });

  it('promotes first remaining media when default is removed', () => {
    const { result, unmount } = renderHook(() =>
      useMediaManager([
        {
          id: 'm1',
          type: 'IMAGE',
          url: 'a',
          alt: '',
          order: 0,
          isDefault: true,
        },
        {
          id: 'm2',
          type: 'IMAGE',
          url: 'b',
          alt: '',
          order: 1,
          isDefault: false,
        },
      ])
    );

    withAct(() => {
      result().removeMedia('m1');
    });

    const remaining = result().media;
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('m2');
    expect(remaining[0].isDefault).toBe(true);

    unmount();
  });
});
