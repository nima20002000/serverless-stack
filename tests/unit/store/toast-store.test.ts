import { describe, it, expect, beforeEach } from 'vitest';
import { useToastStore, toast } from '@/store/toast-store';

describe('toast-store', () => {
  beforeEach(() => {
    useToastStore.setState({ toasts: [] });
  });

  it('adds and removes toasts', () => {
    const id = useToastStore.getState().addToast({
      type: 'success',
      message: 'Saved',
    });

    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].id).toBe(id);

    useToastStore.getState().removeToast(id);
    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('clears toasts', () => {
    useToastStore.getState().addToast({
      type: 'info',
      message: 'Hello',
    });
    useToastStore.getState().clearToasts();

    expect(useToastStore.getState().toasts).toHaveLength(0);
  });

  it('creates typed toasts via helpers', () => {
    const id = toast.success('Saved');

    expect(useToastStore.getState().toasts).toHaveLength(1);
    expect(useToastStore.getState().toasts[0].type).toBe('success');
    expect(useToastStore.getState().toasts[0].id).toBe(id);
  });
});
