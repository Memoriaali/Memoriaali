import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Frontend E2E Testing
 *
 * This configuration sets up Playwright for testing the Next.js frontend UI
 * using real browser automation and interaction with the backend API.
 */
export default defineConfig({
  // Test configuration
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),

  // Reporter configuration
  reporter: process.env.CI
    ? [['junit', { outputFile: './test-results.xml' }], ['github']]
    : [['html', { outputFolder: './playwright-report' }], ['line']],

  // Global setup and teardown
  globalSetup: './tests/utils/global-setup.ts',
  globalTeardown: './tests/utils/global-teardown.ts',

  // Test execution settings
  timeout: 30 * 1000, // 30 seconds
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
  },

  // Common test configuration
  use: {
    // Base URL for the frontend application
    baseURL: process.env.FRONTEND_URL || 'http://localhost:8002',

    // Browser settings
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,

    // Screenshots and videos
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    // Context settings
    ignoreHTTPSErrors: true,
    locale: 'fi-FI',
    timezoneId: 'Europe/Helsinki',
  },

  // Browser projects for cross-browser testing
  projects: [
    {
      name: 'setup',
      testMatch: '**/tests/utils/auth.setup.ts',
    },

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './tests/utils/.auth/admin.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: './tests/utils/.auth/admin.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: './tests/utils/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
        storageState: './tests/utils/.auth/admin.json',
      },
      dependencies: ['setup'],
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: {
        ...devices['Pixel 5'],
        storageState: './tests/utils/.auth/admin.json',
      },
      dependencies: ['setup'],
    },

    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 12'],
        storageState: './tests/utils/.auth/admin.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Web server configuration (for local development)
  ...(process.env.CI
    ? {}
    : {
        webServer: {
          command: 'npm run dev',
          cwd: '../', // Run from apps/frontend directory
          port: 8002,
          reuseExistingServer: !process.env.CI,
          timeout: 120 * 1000, // 2 minutes for Next.js to start
          env: {
            NODE_ENV: 'e2e',
            PORT: '8002',
            // Backend API endpoint for frontend to connect to
            NEXT_PUBLIC_API_URL: process.env.BACKEND_URL || 'http://localhost:8001',
          },
        },
      }),

  // Output directories
  outputDir: './test-results',
});
