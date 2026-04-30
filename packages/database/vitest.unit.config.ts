import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // No setupFiles - we don't want the database setup for unit tests
    testTimeout: 10000,
    hookTimeout: 5000,
    isolate: true,
    // Only include unit test files
    include: ['src/__tests__/*unit*.test.ts', 'src/__tests__/generator/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'generated/',
        'migrations/',
        'seeds/',
        'scripts/',
        '**/*.config.*',
        '**/*.d.ts',
      ],
    },
    // No database URL needed for unit tests
    env: {
      NODE_ENV: 'test',
    },
  },
});
