/**
 * Backend E2E Test Setup
 *
 * This file configures the testing environment for backend REST API E2E testing.
 * Runs before each test to ensure proper environment setup.
 */

import { afterAll, beforeEach } from 'vitest';

// Set test environment variables as early as possible (before app import)
process.env.NODE_ENV = 'e2e';
process.env.JWT_SECRET =
  process.env.JWT_SECRET || 'test-secret-key-minimum-32-chars-long-for-e2e-testing';
process.env.WORKER_AUTH_SECRET = process.env.WORKER_AUTH_SECRET || 'test-worker-secret';
process.env.MEMORIAALI_VARIANT = process.env.MEMORIAALI_VARIANT || 'default';
process.env.E2E_SKIP_DOCKER = process.env.E2E_SKIP_DOCKER || '1';

// Database configuration for E2E testing
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'mysql://root:password@localhost:33060/memoriaali_backend_e2e';
}

// Disable server logging during tests for cleaner output
process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';

beforeEach(() => {
  // Reset any global state if needed
  // This runs before each individual test
});

afterAll(() => {
  // Cleanup after all tests complete
  // Note: Global teardown is handled in global-setup.ts
});
