import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/__tests__/test-setup.ts'],
    testTimeout: 30000,
    hookTimeout: 10000,
    isolate: true,
    // Run tests sequentially to prevent database race conditions
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
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
    env: {
      DATABASE_URL:
        'mysql://memoriaali_database_test_user:database_test_user_password_123@localhost:33062/memoriaali_database_test',
      NODE_ENV: 'test',
    },
  },
});
