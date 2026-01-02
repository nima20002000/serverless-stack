// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { useHydration } from '@/hooks/useHydration';
import { renderHook, waitForEffects } from '@utils/hook-utils';

describe('useHydration', () => {
  it('returns false until hydrated, then true', async () => {
    const { result, unmount } = renderHook(() => useHydration());

    expect(result()).toBe(false);

    await waitForEffects();

    expect(result()).toBe(true);

    unmount();
  });
});
