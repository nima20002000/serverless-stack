import React, { useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot, Root } from 'react-dom/client';

export function renderHook<T>(hook: () => T) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  let result: T | undefined;

  function TestComponent() {
    result = hook();
    return null;
  }

  act(() => {
    root.render(<TestComponent />);
  });

  return {
    result: () => result as T,
    rerender: () => {
      act(() => {
        root.render(<TestComponent />);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

export async function waitForEffects() {
  await act(async () => {
    await Promise.resolve();
  });
}

export function withAct<T>(fn: () => T) {
  let value: T;
  act(() => {
    value = fn();
  });
  return value as T;
}

export function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function renderHookWithProps<TProps, TResult>(
  hook: (props: TProps) => TResult,
  initialProps: TProps
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  let result: TResult | undefined;
  let props = initialProps;

  function TestComponent() {
    result = hook(props);
    return null;
  }

  act(() => {
    root.render(<TestComponent />);
  });

  return {
    result: () => result as TResult,
    setProps: (nextProps: TProps) => {
      props = nextProps;
      act(() => {
        root.render(<TestComponent />);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}
