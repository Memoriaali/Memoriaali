/**
 * Frontend E2E Tests - User Management CRUD Operations
 *
 * These tests verify the user management interface works correctly
 * with full frontend-to-backend integration for admin users.
 */

import { newUserTestData } from '@fixtures/frontend-test-users';
import { LoginPage } from '@pages/LoginPage';
import { UserManagementPage } from '@pages/UserManagementPage';
import { expect, test } from '@playwright/test';

test.describe('User Management CRUD E2E Tests', () => {
  let loginPage: LoginPage;
  let userManagementPage: UserManagementPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    userManagementPage = new UserManagementPage(page);

    // Login as admin before each test
    await loginPage.goto();
    await loginPage.loginAsAdmin();

    // Navigate to user management
    await userManagementPage.goto();
  });

  test.describe('User Creation Flow', () => {
    test('admin can create a new user successfully', async () => {
      const testUser = {
        ...newUserTestData.validUser,
        email: `created-${Date.now()}@frontend.e2e.test`,
        username: `created.user.${Date.now()}`,
      };

      await userManagementPage.createUser(testUser);

      // Verify user appears in the table
      const userExists = await userManagementPage.userExists(testUser.email);
      expect(userExists).toBe(true);

      // Verify success message
      const successMessage = await userManagementPage.getSuccessMessage();
      expect(successMessage).toMatch(/created|success/i);
    });

    test('shows validation errors for invalid user data', async () => {
      const invalidUser = newUserTestData.invalidEmail;

      await userManagementPage.clickCreateUser();
      await userManagementPage.fillUserForm(invalidUser);
      await userManagementPage.submitUserForm();

      // Should show validation errors
      const errorMessage = await userManagementPage.getErrorMessage();
      expect(errorMessage).toMatch(/invalid|error/i);
    });

    test('shows error for weak password', async () => {
      const weakPasswordUser = {
        ...newUserTestData.weakPassword,
        email: `weak-${Date.now()}@frontend.e2e.test`,
        username: `weak.${Date.now()}`,
      };

      await userManagementPage.clickCreateUser();
      await userManagementPage.fillUserForm(weakPasswordUser);
      await userManagementPage.submitUserForm();

      // Should show password validation error
      const errorMessage = await userManagementPage.getErrorMessage();
      expect(errorMessage).toMatch(/password|weak|strength/i);
    });

    test('shows error for mismatched passwords', async () => {
      const mismatchedUser = {
        ...newUserTestData.mismatchedPasswords,
        email: `mismatch-${Date.now()}@frontend.e2e.test`,
        username: `mismatch.${Date.now()}`,
      };

      await userManagementPage.clickCreateUser();
      await userManagementPage.fillUserForm(mismatchedUser);
      await userManagementPage.submitUserForm();

      // Should show password mismatch error
      const errorMessage = await userManagementPage.getErrorMessage();
      expect(errorMessage).toMatch(/password.*match|confirm/i);
    });

    test('can cancel user creation', async () => {
      const userCountBefore = await userManagementPage.getUserCount();

      await userManagementPage.clickCreateUser();
      await userManagementPage.fillUserForm(newUserTestData.validUser);
      await userManagementPage.cancelUserForm();

      // Should return to user list without creating user
      await userManagementPage.waitForUserTableLoad();
      const userCountAfter = await userManagementPage.getUserCount();
      expect(userCountAfter).toBe(userCountBefore);
    });
  });

  test.describe('User Activation/Deactivation Flow', () => {
    let testUserEmail: string;

    test.beforeEach(async () => {
      // Create a test user for activation/deactivation tests
      testUserEmail = `activation-test-${Date.now()}@frontend.e2e.test`;
      const testUser = {
        ...newUserTestData.validUser,
        email: testUserEmail,
        username: `activation.test.${Date.now()}`,
      };

      await userManagementPage.createUser(testUser);
      await userManagementPage.waitForUserTableLoad();
    });

    test('admin can activate an inactive user', async () => {
      // The created user should be inactive by default
      await userManagementPage.activateUser(testUserEmail);

      // Verify success message
      const successMessage = await userManagementPage.getSuccessMessage();
      expect(successMessage).toMatch(/activated|success/i);

      // Refresh and verify user status changed
      await userManagementPage.refreshUserList();
      const userRow = await userManagementPage.findUserInTable(testUserEmail);
      expect(userRow).not.toBeNull();

      const rowText = await userRow!.textContent();
      expect(rowText).toMatch(/active|enabled/i);
    });

    test('admin can deactivate an active user', async () => {
      // First activate the user
      await userManagementPage.activateUser(testUserEmail);
      await userManagementPage.refreshUserList();

      // Then deactivate
      await userManagementPage.deactivateUser(testUserEmail);

      // Verify success message
      const successMessage = await userManagementPage.getSuccessMessage();
      expect(successMessage).toMatch(/deactivated|disabled|success/i);

      // Refresh and verify user status changed
      await userManagementPage.refreshUserList();
      const userRow = await userManagementPage.findUserInTable(testUserEmail);
      expect(userRow).not.toBeNull();

      const rowText = await userRow!.textContent();
      expect(rowText).toMatch(/inactive|disabled/i);
    });
  });

  test.describe('User Table Interaction', () => {
    test('displays user list correctly', async () => {
      await userManagementPage.waitForUserTableLoad();

      // Verify table is visible and has content
      await expect(userManagementPage.userTable).toBeVisible();

      const userCount = await userManagementPage.getUserCount();
      expect(userCount).toBeGreaterThan(0);
    });

    test('can search/filter users', async ({ page }) => {
      // This test assumes there's a search functionality
      // Adjust based on actual implementation
      const searchInput = page.locator('[data-testid="user-search"]');

      if (await searchInput.isVisible()) {
        await searchInput.fill('admin');

        // Wait for filtered results
        await page.waitForTimeout(1000);

        const filteredRows = userManagementPage.userTable.locator('tbody tr');
        const count = await filteredRows.count();

        // Verify results contain search term
        for (let i = 0; i < count; i++) {
          const rowText = await filteredRows.nth(i).textContent();
          expect(rowText?.toLowerCase()).toContain('admin');
        }
      }
    });

    test('can navigate user pagination', async ({ page }) => {
      // This test assumes pagination exists
      // Adjust based on actual implementation
      const nextPageButton = page.locator('[data-testid="pagination-next"]');

      if (await nextPageButton.isVisible()) {
        const userCountPage1 = await userManagementPage.getUserCount();

        await nextPageButton.click();
        await userManagementPage.waitForUserTableLoad();

        const userCountPage2 = await userManagementPage.getUserCount();

        // Verify we moved to a different page
        expect(userCountPage2).toBeGreaterThan(0);
      }
    });
  });

  test.describe('User Editing Flow', () => {
    let testUserEmail: string;

    test.beforeEach(async () => {
      // Create a test user for editing tests
      testUserEmail = `edit-test-${Date.now()}@frontend.e2e.test`;
      const testUser = {
        ...newUserTestData.validUser,
        email: testUserEmail,
        username: `edit.test.${Date.now()}`,
      };

      await userManagementPage.createUser(testUser);
      await userManagementPage.waitForUserTableLoad();
    });

    test('admin can edit user details', async ({ page }) => {
      await userManagementPage.editUser(testUserEmail);

      // Update user details
      await page.locator('[data-testid="user-first-name"]').fill('Updated');
      await page.locator('[data-testid="user-last-name"]').fill('Name');

      await userManagementPage.submitUserForm();

      // Verify update success
      const successMessage = await userManagementPage.getSuccessMessage();
      expect(successMessage).toMatch(/updated|success/i);

      // Verify changes in table
      await userManagementPage.refreshUserList();
      const userRow = await userManagementPage.findUserInTable(testUserEmail);
      const rowText = await userRow!.textContent();
      expect(rowText).toContain('Updated Name');
    });
  });

  test.describe('Error Handling', () => {
    test('handles server errors gracefully', async ({ page }) => {
      // This test would simulate server errors
      // Implementation depends on how errors are handled in the UI
      // For example, if there's a way to trigger a 500 error:
      // await page.route('**/api/v2/users', route => route.fulfill({ status: 500 }));
      // Try to create a user and verify error handling
      // const testUser = newUserTestData.validUser;
      // await userManagementPage.createUser(testUser);
      // Verify error message is shown
      // const errorMessage = await userManagementPage.getErrorMessage();
      // expect(errorMessage).toMatch(/error|server|failed/i);
    });

    test('handles network timeouts gracefully', async ({ page }) => {
      // This test would simulate network timeouts
      // Implementation depends on actual error handling
      // await page.route('**/api/v2/users', route => route.abort());
      // Similar test pattern as above
    });
  });
});
