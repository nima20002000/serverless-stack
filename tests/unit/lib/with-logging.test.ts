import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { withLogging } from '@/lib/api/with-logging';
import { log } from '@/lib/logger';

if (typeof globalThis.crypto?.randomUUID !== 'function') {
  Object.defineProperty(globalThis, 'crypto', {
    value: { randomUUID: () => 'test-uuid' },
    configurable: true,
  });
}

vi.mock('@/lib/logger', () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('withLogging', () => {
  const logMock = vi.mocked(log);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs start and completion for successful requests', async () => {
    const handler = vi
      .fn()
      .mockResolvedValue(NextResponse.json({ ok: true }, { status: 200 }));
    const wrapped = withLogging(handler, 'health');
    const req = new NextRequest('http://localhost/api/health', {
      method: 'GET',
    });

    const response = await wrapped(req);

    expect(response.status).toBe(200);
    expect(logMock.info).toHaveBeenCalledWith(
      'API Request Started',
      expect.objectContaining({
        route: 'health',
        method: 'GET',
        url: req.url,
      })
    );
    expect(logMock.info).toHaveBeenCalledWith(
      'API Request Completed',
      expect.objectContaining({
        route: 'health',
        method: 'GET',
        status: 200,
      })
    );
    expect(logMock.error).not.toHaveBeenCalled();
  });

  it('logs failure and rethrows errors from handlers', async () => {
    const handler = vi.fn().mockRejectedValue(new Error('boom'));
    const wrapped = withLogging(handler, 'health');
    const req = new NextRequest('http://localhost/api/health', {
      method: 'GET',
    });

    await expect(wrapped(req)).rejects.toThrow('boom');

    expect(logMock.info).toHaveBeenCalledWith(
      'API Request Started',
      expect.objectContaining({
        route: 'health',
        method: 'GET',
      })
    );
    expect(logMock.error).toHaveBeenCalledWith(
      'API Request Failed',
      expect.objectContaining({
        route: 'health',
        method: 'GET',
        error: 'boom',
      })
    );
  });
});
