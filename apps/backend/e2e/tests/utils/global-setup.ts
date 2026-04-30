/**
 * Global Setup for Backend E2E Tests
 *
 * This file handles global initialization that needs to happen once
 * before all tests run. For backend API testing, this includes
 * automatically setting up the Docker environment if needed.
 */

import { execSync } from 'child_process';
import { resolve } from 'path';

/**
 * Check if the backend API is accessible
 */
async function isBackendApiAccessible(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch('http://localhost:8001/api/v2/health', {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Automatically setup the Backend E2E Docker environment
 */
async function setupE2EEnvironment(): Promise<void> {
  console.log('🔧 Backend API not accessible - setting up E2E environment...');

  try {
    const e2eDir = resolve(process.cwd());
    console.log('📍 E2E directory:', e2eDir);

    // Run the environment setup script with increased timeout for Docker builds
    console.log('🚀 Starting Docker containers and services (this may take several minutes)...');
    execSync('./scripts/setup-backend-e2e-env.sh', {
      cwd: e2eDir,
      stdio: 'inherit',
      timeout: 600000, // 10 minute timeout for Docker builds
    });

    console.log('✅ E2E environment setup completed');

    // Wait a bit more for services to fully stabilize
    console.log('⏳ Allowing services to stabilize...');
    await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 seconds
  } catch (error) {
    console.error('❌ Failed to setup E2E environment:', error);
    console.error('');
    console.error('🔧 Manual Setup Required:');
    console.error('');
    console.error('1. Ensure Docker Desktop is running');
    console.error('2. Set up the E2E environment manually:');
    console.error('   cd apps/backend/e2e');
    console.error('   npm run env:setup');
    console.error('');
    console.error('3. Verify the backend API is accessible:');
    console.error('   curl http://localhost:8001/api/v2/health');
    console.error('');

    // If timeout error, provide specific guidance
    if (error instanceof Error && error.message.includes('ETIMEDOUT')) {
      console.error('⏰ Setup timed out - Docker images may be taking too long to build.');
      console.error('💡 Try running setup manually to see detailed progress:');
      console.error('   cd apps/backend/e2e && npm run env:setup');
    }

    throw error;
  }
}

/**
 * Wait for backend API to be ready with retries
 */
async function waitForBackendApi(maxRetries = 30, delayMs = 5000): Promise<void> {
  console.log('⏳ Waiting for backend API to be ready...');

  for (let i = 0; i < maxRetries; i++) {
    if (await isBackendApiAccessible()) {
      console.log('✅ Backend API is accessible and ready');
      return;
    }

    console.log(`⏳ Attempt ${i + 1}/${maxRetries} - waiting ${delayMs}ms...`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error(
    `Backend API not accessible after ${maxRetries} attempts (${(maxRetries * delayMs) / 1000}s)`,
  );
}

export default async function globalSetup(): Promise<void> {
  console.log('🚀 Starting Backend E2E Global Setup...');

  try {
    // Allow skipping Docker-based env for local in-process testing
    if (process.env.E2E_SKIP_DOCKER === '1') {
      console.log('⏭️  E2E_SKIP_DOCKER=1 detected, skipping Docker environment setup');
      return;
    }

    // First, check if backend API is already accessible
    console.log('🔍 Checking if backend API is accessible...');

    if (!(await isBackendApiAccessible())) {
      // API not accessible - automatically setup environment
      await setupE2EEnvironment();

      // Wait for API to be ready after setup
      await waitForBackendApi();
    } else {
      console.log('✅ Backend API is already accessible');
    }

    // Verify the setup by testing key endpoints
    console.log('🔍 Verifying backend API endpoints...');

    // Test health endpoint
    const healthResponse = await fetch('http://localhost:8001/api/v2/health');
    if (!healthResponse.ok) {
      throw new Error(`Backend API health check failed with status ${healthResponse.status}`);
    }

    const healthData = await healthResponse.json();
    console.log('✅ Backend API health check passed:', healthData);

    // Test authentication endpoint (should return 400/401, not 500)
    console.log('🔍 Verifying authentication endpoint...');
    const authResponse = await fetch('http://localhost:8001/api/v2/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'test@invalid.com', password: 'invalid' }),
    });

    if (authResponse.status !== 401 && authResponse.status !== 400) {
      console.warn(`⚠️ Authentication endpoint returned unexpected status: ${authResponse.status}`);
    } else {
      console.log('✅ Authentication endpoint is responding correctly');
    }
  } catch (error) {
    console.error('❌ Backend E2E Global Setup failed:', error);

    // Add specific error context
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        console.error('⏰ Connection timeout - backend API may not be starting properly');
      } else if (error.cause && (error.cause as any).code === 'ECONNREFUSED') {
        console.error('🔌 Connection refused - backend API failed to start on port 8001');
      }
    }

    throw error;
  }

  console.log('🎉 Backend E2E Global Setup completed successfully');
}
