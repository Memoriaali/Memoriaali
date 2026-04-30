import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Vitest configuration for Backend E2E Testing
 *
 * This configuration sets up Vitest for testing the backend REST API endpoints
 * using Supertest for HTTP requests instead of browser automation.
 */
export default defineConfig({
  test: {
    // Test environment configuration
    name: 'backend-e2e',
    environment: 'node',

    // Test file patterns
    include: ['tests/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/cypress/**',
      '**/.{idea,git,cache,output,temp}/**',
    ],

    // Global setup
    globalSetup: ['./tests/utils/global-setup.ts'],

    // Test execution configuration
    testTimeout: 30000, // 30 seconds for E2E tests
    hookTimeout: 10000, // 10 seconds for setup/teardown hooks

    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1,
      },
    },

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/', 'dist/', 'coverage/', '*.config.*', 'fixtures/'],
    },

    // Environment variables for E2E testing
    env: {
      NODE_ENV: 'e2e',
      JWT_SECRET: 'test-secret-key-minimum-32-chars-long-for-e2e-testing',
      DATABASE_URL:
        process.env.DATABASE_URL || 'mysql://root:password@localhost:33060/memoriaali_backend_e2e',
    },

    // Reporter configuration
    reporters: process.env.CI ? ['junit', 'github-actions'] : ['verbose'],
    outputFile: {
      junit: './test-results/junit.xml',
    },

    // Retry configuration for flaky tests
    retry: process.env.CI ? 2 : 0,

    // Setup files
    setupFiles: ['./tests/utils/test-setup.ts'],
  },

  // Path resolution for imports
  resolve: {
    alias: {
      '@': resolve(__dirname, '../src'),
      '@fixtures': resolve(__dirname, './fixtures'),
      '@utils': resolve(__dirname, './tests/utils'),
    },
  },

  // Dependency optimization for faster startup
  optimizeDeps: {
    include: ['supertest', '@memoriaali/database/generated/client'],
  },
});
