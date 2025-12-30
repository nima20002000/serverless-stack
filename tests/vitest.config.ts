import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Base Vitest Configuration
 *
 * NOTE: This is the default config that runs ALL tests.
 * For optimized execution, use the specific configs:
 * - vitest.config.unit.ts: Unit tests (parallelized)
 * - vitest.config.integration.ts: Integration tests (sequential)
 *
 * This config uses conservative settings suitable for running
 * both unit and integration tests together when needed.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./setup.ts'],
    include: ['**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 60000,
    hookTimeout: 60000,
    teardownTimeout: 30000,
    // When running all tests, use sequential execution for safety
    // This prevents integration test conflicts when mixed with unit tests
    fileParallelism: false,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: true,
      },
    },
    sequence: {
      concurrent: false,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.ts',
        '**/setup.ts',
        '**/mocks/**',
        '**/fixtures/**',
      ],
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
