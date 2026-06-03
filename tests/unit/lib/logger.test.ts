import { describe, it, expect, vi, beforeEach } from 'vitest';

const loggerMock = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

vi.mock('pino', () => ({
  default: vi.fn(() => loggerMock),
}));

describe('logger wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('forwards log calls to pino logger', async () => {
    const { log } = await import('@/lib/logger');

    log.info('msg', { a: 1 });
    log.warn('warn', { b: 2 });
    log.error('error', { c: 3 });
    log.debug('debug', { d: 4 });

    expect(loggerMock.info).toHaveBeenCalledWith({ a: 1 }, 'msg');
    expect(loggerMock.warn).toHaveBeenCalledWith({ b: 2 }, 'warn');
    expect(loggerMock.error).toHaveBeenCalledWith({ c: 3 }, 'error');
    expect(loggerMock.debug).toHaveBeenCalledWith({ d: 4 }, 'debug');
  });
});
