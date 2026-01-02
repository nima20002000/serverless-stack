// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useFormState } from '@/hooks/useFormState';
import { renderHook, withAct } from '@utils/hook-utils';

describe('useFormState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes with empty state', () => {
    const { result, unmount } = renderHook(() => useFormState());

    const [state] = result();

    expect(state).toEqual({
      error: '',
      success: '',
      isSubmitting: false,
    });

    unmount();
  });

  it('sets error and clears success', () => {
    const { result, unmount } = renderHook(() => useFormState());

    withAct(() => {
      const [, actions] = result();
      actions.setSuccess('ok');
      actions.setError('bad');
    });

    const [state] = result();
    expect(state.error).toBe('bad');
    expect(state.success).toBe('');

    unmount();
  });

  it('sets success and clears error', () => {
    const { result, unmount } = renderHook(() => useFormState());

    withAct(() => {
      const [, actions] = result();
      actions.setError('bad');
      actions.setSuccess('ok');
    });

    const [state] = result();
    expect(state.success).toBe('ok');
    expect(state.error).toBe('');

    unmount();
  });

  it('clears messages without changing submission state', () => {
    const { result, unmount } = renderHook(() => useFormState());

    withAct(() => {
      const [, actions] = result();
      actions.setError('bad');
      actions.setIsSubmitting(true);
      actions.clearMessages();
    });

    const [state] = result();
    expect(state.error).toBe('');
    expect(state.success).toBe('');
    expect(state.isSubmitting).toBe(true);

    unmount();
  });

  it('resets state fully', () => {
    const { result, unmount } = renderHook(() => useFormState());

    withAct(() => {
      const [, actions] = result();
      actions.setError('bad');
      actions.setIsSubmitting(true);
      actions.reset();
    });

    const [state] = result();
    expect(state).toEqual({
      error: '',
      success: '',
      isSubmitting: false,
    });

    unmount();
  });
});
