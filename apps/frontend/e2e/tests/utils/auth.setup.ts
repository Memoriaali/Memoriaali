/**
 * Authentication Setup for Frontend E2E Tests
 *
 * This file creates authenticated browser contexts that can be reused
 * across multiple tests to avoid repeated login operations.
 */

import { test as setup, expect } from '@playwright/test';
import { LoginPage } from '@pages/LoginPage';
import { frontendTestCredentials } from '@fixtures/frontend-test-users';

const authFile = 'tests/utils/.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
  const loginPage = new LoginPage(page);

  // Navigate to login page
  await loginPage.goto();

  // Login as admin
  await loginPage.loginAsAdmin();

  // Verify we're logged in successfully
  await expect(page).toHaveURL(/\/dashboard|\/admin/);

  // Save authenticated state
  await page.context().storageState({ path: authFile });

  console.log('✅ Admin authentication state saved');
});
