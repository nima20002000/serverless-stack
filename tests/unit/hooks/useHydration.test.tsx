// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { useHydration } from '@/hooks/useHydration';
import { renderHookBeforeEffects } from '@utils/hook-utils';

describe('useHydration', () => {
  it('returns false until hydrated, then true', async () => {
    const { result, flushEffects, unmount } = renderHookBeforeEffects(() =>
      useHydration()
    );

    expect(result()).toBe(false);

    await flushEffects();

    expect(result()).toBe(true);

    unmount();
  });
});
