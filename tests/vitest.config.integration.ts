import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./setup.ts'],
    include: ['integration/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    // Run integration tests sequentially to avoid database conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
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
