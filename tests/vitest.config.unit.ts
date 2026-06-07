import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Unit Tests Configuration - Fully Parallelized
 *
 * Unit tests use mocks (vi.mock) and don't access real databases,
 * so they can safely run in parallel across multiple threads.
 *
 * Key settings:
 * - pool: 'threads' - Use thread-based parallelization (faster than forks)
 * - singleThread: false - Allow multiple threads
 * - isolate: true - Each test file runs in isolation
 * - fileParallelism: true - Run test files in parallel
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./setup.ts'],
    include: ['unit/**/*.test.ts', 'unit/**/*.test.tsx'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    // Isolate each test file.
    isolate: true,
    // Enable file-level parallelism
    fileParallelism: true,
    // Use threads pool for parallel execution (faster than forks for mocked tests)
    pool: 'threads',
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
