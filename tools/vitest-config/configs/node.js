import { defineConfig } from 'vitest/config';

/**
 * Vitest configuration for Node.js packages in Memoriaali v2.0
 * 
 * This configuration is optimized for testing backend services,
 * shared packages, and migration tools. It includes:
 * - TypeScript support
 * - Path mapping for monorepo packages
 * - Node.js environment setup
 * - Coverage configuration
 * - Performance optimizations
 */
export const nodeConfig = defineConfig({
  test: {
    // Environment configuration
    environment: 'node',
    globals: true,
    
    // File patterns
    include: [
      'src/**/*.{test,spec}.{js,ts}',
      'tests/**/*.{test,spec}.{js,ts}',
      '**/__tests__/**/*.{js,ts}',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      '**/*.d.ts',
      'legacy/**',
    ],
    
    // TypeScript support
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json',
    },
    
    // Test setup
    setupFiles: ['./vitest.setup.ts'],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/*.setup.{js,ts}',
        '**/test/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/*.test.{js,ts}',
        '**/*.spec.{js,ts}',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    
    // Performance and behavior
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    
    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4,
      },
    },
    
    // Retry configuration
    retry: 1,
    
    // Mock configuration
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    
    // Reporter configuration
    reporter: ['verbose', 'json', 'html'],
    outputFile: {
      json: './coverage/test-results.json',
      html: './coverage/test-report.html',
    },
    
    // Watch mode configuration
    watch: false,
    
    // Snapshot configuration
    resolveSnapshotPath: (testPath, snapExtension) => {
      return testPath.replace(/\.test\.([tj]s?)/, `.test.${snapExtension}`);
    },
  },
  
  // Vite configuration for testing
  resolve: {
    alias: {
      '@memoriaali/database': '../../packages/database/src',
      '@memoriaali/api-types': '../../packages/api-types/src',
      '@memoriaali/shared': '../../packages/shared/src',
      '@memoriaali/file-processing': '../../packages/file-processing/src',
    },
  },
  
  // Define configuration for test environment
  define: {
    'process.env.NODE_ENV': '"test"',
  },
});

export default nodeConfig;