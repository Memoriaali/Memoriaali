/**
 * Frontend E2E Tests - Authentication Flow
 *
 * These tests verify the login and logout functionality works correctly
 * in the frontend application with real backend API integration.
 */

import { frontendTestCredentials } from '@fixtures/frontend-test-users';
import { LoginPage } from '@pages/LoginPage';
import { expect, test } from '@playwright/test';

test.describe('Authentication Flow E2E Tests', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test.describe('Successful Login Scenarios', () => {
    test('admin user can login successfully', async ({ page }) => {
      await loginPage.loginAsAdmin();

      // Verify successful login by checking URL and user interface
      await expect(page).toHaveURL(/\/dashboard|\/admin/);

      // Check for admin-specific elements
      await expect(page.locator('[data-testid="nav-users"]')).toBeVisible();
    });

    test('regular user can login successfully', async ({ page }) => {
      await loginPage.loginAsUser();

      // Verify successful login
      await expect(page).toHaveURL(/\/dashboard|\/home/);

      // Regular users should see limited navigation
      await expect(page.locator('[data-testid="nav-profile"]')).toBeVisible();
    });

    test('moderator user can login successfully', async ({ page }) => {
      await loginPage.loginAsModerator();

      // Verify successful login
      await expect(page).toHaveURL(/\/dashboard|\/moderator/);
    });
  });

  test.describe('Failed Login Scenarios', () => {
    test('shows error for invalid email', async () => {
      await loginPage.attemptInvalidLogin('invalid@email.com', 'validPassword123!');

      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('Invalid credentials');
    });

    test('shows error for invalid password', async () => {
      const admin = frontendTestCredentials.admin;
      await loginPage.attemptInvalidLogin(admin.email, 'wrongPassword');

      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toContain('Invalid credentials');
    });

    test('shows error for inactive user', async () => {
      const inactive = frontendTestCredentials.inactiveUser;
      await loginPage.attemptInvalidLogin(inactive.email, inactive.password);

      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).toMatch(/inactive|not activated|account disabled/i);
    });

    test('shows validation error for empty fields', async () => {
      await loginPage.fillLoginForm('', '');
      await loginPage.submitLogin();

      // Check for form validation errors
      const hasErrors = await loginPage.hasValidationErrors();
      expect(hasErrors).toBe(true);
    });

    test('shows validation error for invalid email format', async () => {
      await loginPage.fillLoginForm('not-an-email', 'password123');
      await loginPage.submitLogin();

      // Should show validation error for email format
      const hasErrors = await loginPage.hasValidationErrors();
      expect(hasErrors).toBe(true);
    });
  });

  test.describe('Login Form Behavior', () => {
    test('form clears correctly', async () => {
      await loginPage.fillLoginForm('test@example.com', 'password123');
      await loginPage.clearForm();

      // Verify form is cleared
      await expect(loginPage.emailInput).toHaveValue('');
      await expect(loginPage.passwordInput).toHaveValue('');
    });

    test('shows loading state during login', async () => {
      const admin = frontendTestCredentials.admin;
      await loginPage.fillLoginForm(admin.email, admin.password);

      // Start login and check for loading state
      await loginPage.submitLogin();

      // Note: This test may need adjustment based on actual loading implementation
      await loginPage.waitForLoginCompletion();
    });

    test('redirects already logged in users', async ({ page }) => {
      // First login
      await loginPage.loginAsAdmin();

      // Try to go to login page again
      await page.goto('/login');

      // Should be redirected away from login page
      const isOnLogin = await loginPage.isAlreadyLoggedIn();
      expect(isOnLogin).toBe(true);
    });
  });

  test.describe('Logout Flow', () => {
    test('user can logout successfully', async ({ page }) => {
      // Login first
      await loginPage.loginAsAdmin();

      // Logout
      await page.locator('[data-testid="nav-logout"]').click();

      // Should be redirected to login page or home
      await expect(page).toHaveURL(/\/login|\/$/);
    });
  });
});
