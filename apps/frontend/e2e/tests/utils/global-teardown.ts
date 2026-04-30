/**
 * Global Teardown for Frontend E2E Tests
 *
 * This file handles global cleanup that needs to happen once
 * after all frontend UI tests have completed.
 */

async function globalTeardown(): Promise<void> {
  console.log('🧹 Starting Frontend E2E Global Teardown...');

  try {
    // Clean up any global test artifacts
    console.log('🧹 Cleaning up test artifacts...');

    // Note: We don't tear down Docker containers here as they may be needed
    // for multiple test runs. Use npm run env:teardown for that.

    console.log('✅ Frontend E2E Global Teardown completed successfully');
  } catch (error) {
    console.error('❌ Error during Frontend E2E Global Teardown:', error);
    // Don't throw here as it would fail the test run
  }
}

export default globalTeardown;
