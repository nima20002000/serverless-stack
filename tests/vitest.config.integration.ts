import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Integration Tests Configuration - Sequential Execution
 *
 * Integration tests access the real Supabase database and Redis cache.
 * They MUST run sequentially to avoid:
 * - Database state conflicts (tests sharing/modifying the same data)
 * - Race conditions in cleanup utilities
 * - Foreign key constraint violations from concurrent operations
 *
 * Key settings:
 * - pool: 'forks' - Use process forks for better isolation
 * - singleFork: true - All tests run in a single process sequentially
 * - fileParallelism: false - Disable file-level parallelism
 * - sequence.concurrent: false - Disable test-level concurrency
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./setup.ts', './integration/setup.ts'],
    include: ['integration/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 60000, // Longer timeout for DB operations
    hookTimeout: 60000, // Longer timeout for cleanup hooks
    teardownTimeout: 30000,
    // Disable file-level parallelism - run files one at a time
    fileParallelism: false,
    // Run integration tests sequentially to avoid database conflicts
    pool: 'forks',
    poolOptions: {
      forks: {
        // Use a single fork to ensure sequential execution
        singleFork: true,
        // No parallel forks
        isolate: true,
      },
    },
    // Ensure tests within files also run sequentially
    sequence: {
      concurrent: false,
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
