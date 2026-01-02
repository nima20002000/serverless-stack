import { describe, it, expect, beforeEach } from 'vitest';
import { useUserStore } from '@/store/user-store';

describe('user-store', () => {
  beforeEach(() => {
    useUserStore.setState({ user: null });
  });

  it('sets and clears user', () => {
    useUserStore.getState().setUser({
      id: 'user-1',
      email: 'test@kitia.ir',
      name: 'Test',
      role: 'USER',
    });

    expect(useUserStore.getState().user?.id).toBe('user-1');

    useUserStore.getState().clearUser();
    expect(useUserStore.getState().user).toBeNull();
  });
});
