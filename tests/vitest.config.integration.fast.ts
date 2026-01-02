import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Integration Tests Configuration - Fast (Parallel)
 *
 * This mode favors speed by enabling parallelism. Use it to get
 * a fast signal, then re-run failures sequentially for isolation.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./setup.ts', './integration/setup.ts'],
    include: ['integration/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 30000,
    fileParallelism: true,
    pool: 'forks',
    poolOptions: {
      forks: {
        isolate: true,
      },
    },
    sequence: {
      concurrent: true,
    },
    deps: {
      optimizer: {
        ssr: {
          include: ['@upstash/redis'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '../src'),
      '@tests': path.resolve(__dirname, './'),
      '@mocks': path.resolve(__dirname, './mocks'),
      '@fixtures': path.resolve(__dirname, './fixtures'),
      '@utils': path.resolve(__dirname, './utils'),
    },
  },
});
