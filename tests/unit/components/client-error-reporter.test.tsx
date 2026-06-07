// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ClientErrorReporter } from '@/components/providers/ClientErrorReporter';

describe('ClientErrorReporter', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response('{}')))
    );
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  it('reports window error events', () => {
    act(() => {
      root.render(<ClientErrorReporter />);
    });

    window.dispatchEvent(
      new ErrorEvent('error', {
        error: new Error('controlled reporter error'),
        filename: 'client.js',
        lineno: 12,
        colno: 4,
      })
    );

    expect(fetch).toHaveBeenCalledWith(
      '/api/client-errors',
      expect.objectContaining({
        method: 'POST',
      })
    );
    const body = JSON.parse(String(vi.mocked(fetch).mock.calls[0][1]?.body));
    expect(body).toMatchObject({
      message: 'controlled reporter error',
      source: 'window.error',
      context: {
        filename: 'client.js',
        line: 12,
        column: 4,
      },
    });
  });
});
