/**
 * Global Setup for Frontend E2E Tests
 *
 * This file handles global initialization that needs to happen once
 * before all frontend UI tests run. It verifies the test environment
 * is ready and services are accessible.
 */

async function globalSetup(): Promise<void> {
  console.log('🚀 Starting Frontend E2E Global Setup...');

  try {
    console.log('🔍 Verifying frontend application is accessible...');

    // Test the frontend application using native fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    const frontendResponse = await fetch('http://localhost:8002', {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!frontendResponse.ok) {
      throw new Error(
        `Frontend application health check failed with status ${frontendResponse.status}`,
      );
    }

    console.log('✅ Frontend application is accessible');

    // Verify backend API is also accessible
    console.log('🔍 Verifying backend API is accessible...');

    const backendController = new AbortController();
    const backendTimeoutId = setTimeout(() => backendController.abort(), 5000);

    const backendResponse = await fetch('http://localhost:8001/api/v2/health', {
      signal: backendController.signal,
    });

    clearTimeout(backendTimeoutId);

    if (!backendResponse.ok) {
      throw new Error(`Backend API health check failed with status ${backendResponse.status}`);
    }

    const healthData = await backendResponse.json();
    console.log('✅ Backend API is accessible and healthy:', healthData);

    // Verify authentication endpoint is working
    console.log('🔍 Verifying authentication endpoint...');

    const authResponse = await fetch('http://localhost:8001/api/v2/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'nonexistent@test.com',
        password: 'invalid',
      }),
    });

    // We expect 401 or 400, not 500 or no response
    if (authResponse.status !== 401 && authResponse.status !== 400) {
      console.warn(`⚠️ Authentication endpoint returned unexpected status: ${authResponse.status}`);
    } else {
      console.log('✅ Authentication endpoint is responding correctly');
    }
  } catch (error) {
    console.error('❌ Frontend E2E environment is not ready:', error);
    console.error('');
    console.error('🔧 Frontend E2E Environment Setup Required:');
    console.error('');
    console.error('1. Ensure Docker Desktop is running');
    console.error('2. Set up the E2E environment:');
    console.error('   cd apps/frontend/e2e');
    console.error('   npm run env:setup');
    console.error('');
    console.error('3. Verify the services are accessible:');
    console.error('   Frontend: curl http://localhost:8002');
    console.error('   Backend:  curl http://localhost:8001/api/v2/health');
    console.error('');
    console.error('💡 Alternative: Run only unit tests with:');
    console.error('   cd apps/frontend && npm run test');
    console.error('');

    // Add specific error context
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error(
          '⏰ Connection timeout - frontend/backend may not be running on expected ports',
        );
      } else if (
        error instanceof Error &&
        'cause' in error &&
        typeof error.cause === 'object' &&
        error.cause !== null &&
        'code' in error.cause &&
        (error.cause as { code?: string }).code === 'ECONNREFUSED'
      ) {
        console.error('🔌 Connection refused - check that services are running');
      }
    }

    throw error;
  }

  console.log('🎉 Frontend E2E Global Setup completed successfully');
}

export default globalSetup;
