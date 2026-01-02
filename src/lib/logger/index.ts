import pino from 'pino';

const globalForLogger = globalThis as typeof globalThis & {
  __kitiaLogger?: ReturnType<typeof pino>;
};

// Create logger without pino-pretty transport to avoid worker thread issues in Next.js
export const logger =
  globalForLogger.__kitiaLogger ??
  pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    base: {
      env: process.env.NODE_ENV,
      service: 'kitia',
    },
  });

if (!globalForLogger.__kitiaLogger) {
  globalForLogger.__kitiaLogger = logger;
}

export const log = {
  info: (msg: string, data?: object) => logger.info(data, msg),
  error: (msg: string, error?: Error | object) => logger.error(error, msg),
  warn: (msg: string, data?: object) => logger.warn(data, msg),
  debug: (msg: string, data?: object) => logger.debug(data, msg),
};
