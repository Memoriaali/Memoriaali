import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Vitest configuration for React packages in Memoriaali v2.0
 * 
 * This configuration is optimized for testing React components
 * and frontend applications. It includes:
 * - React Testing Library setup
 * - JSDOM environment for DOM testing
 * - React plugin for JSX/TSX support
 * - Component testing utilities
 * - Accessibility testing support
 */
export const reactConfig = defineConfig({
  plugins: [react()],
  
  test: {
    // Environment configuration for browser-like testing
    environment: 'jsdom',
    globals: true,
    
    // File patterns for React tests
    include: [
      'src/**/*.{test,spec}.{js,ts,jsx,tsx}',
      'tests/**/*.{test,spec}.{js,ts,jsx,tsx}',
      '**/__tests__/**/*.{js,ts,jsx,tsx}',
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'build/**',
      '.next/**',
      'coverage/**',
      '**/*.d.ts',
      'legacy/**',
    ],
    
    // TypeScript support
    typecheck: {
      enabled: true,
      tsconfig: './tsconfig.json',
    },
    
    // Test setup files
    setupFiles: [
      './vitest.setup.ts',
      '@testing-library/jest-dom/vitest',
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.next/**',
        'coverage/**',
        '**/*.d.ts',
        '**/*.config.{js,ts}',
        '**/*.setup.{js,ts}',
        '**/test/**',
        '**/tests/**',
        '**/__tests__/**',
        '**/*.test.{js,ts,jsx,tsx}',
        '**/*.spec.{js,ts,jsx,tsx}',
        '**/main.{js,ts,jsx,tsx}',
        '**/index.{js,ts,jsx,tsx}',
        '**/*.stories.{js,ts,jsx,tsx}',
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75,
        },
      },
    },
    
    // Performance and behavior
    testTimeout: 15000, // Longer timeout for UI tests
    hookTimeout: 10000,
    teardownTimeout: 5000,
    
    // Parallel execution (be careful with DOM tests)
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 2, // Fewer threads for DOM tests
      },
    },
    
    // Retry configuration
    retry: 2, // More retries for potentially flaky UI tests
    
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
      return testPath.replace(/\.test\.([tj]sx?)/, `.test.${snapExtension}`);
    },
  },
  
  // Vite configuration for React testing
  resolve: {
    alias: {
      '@memoriaali/api-types': '../../packages/api-types/src',
      '@memoriaali/shared': '../../packages/shared/src',
      '@': './src',
      '@/components': './src/components',
      '@/pages': './src/pages',
      '@/hooks': './src/hooks',
      '@/utils': './src/utils',
      '@/types': './src/types',
      '@/assets': './src/assets',
    },
  },
  
  // Define configuration for test environment
  define: {
    'process.env.NODE_ENV': '"test"',
  },
  
  // CSS handling in tests
  css: {
    modules: {
      classNameStrategy: 'non-scoped',
    },
  },
});

export default reactConfig;