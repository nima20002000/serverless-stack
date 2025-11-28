import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Create logger without pino-pretty transport to avoid worker thread issues in Next.js
export const logger = pino({
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

export const log = {
  info: (msg: string, data?: object) => logger.info(data, msg),
  error: (msg: string, error?: Error | object) => logger.error(error, msg),
  warn: (msg: string, data?: object) => logger.warn(data, msg),
  debug: (msg: string, data?: object) => logger.debug(data, msg),
};
