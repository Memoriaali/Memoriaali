/**
 * User Management Page Object Model
 *
 * This class provides methods for interacting with the user management interface during E2E tests.
 * It encapsulates all user management UI interactions including CRUD operations and user actions.
 */

import { newUserTestData, testSelectors } from '@fixtures/frontend-test-users';
import { Locator, Page, expect } from '@playwright/test';

export class UserManagementPage {
  readonly page: Page;
  readonly createUserButton: Locator;
  readonly userTable: Locator;
  readonly loadingSpinner: Locator;
  readonly successMessage: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.createUserButton = page.locator(testSelectors.userManagement.createUserButton);
    this.userTable = page.locator(testSelectors.userManagement.userTable);
    this.loadingSpinner = page.locator(testSelectors.common.loadingSpinner);
    this.successMessage = page.locator(testSelectors.common.successMessage);
    this.errorMessage = page.locator(testSelectors.common.errorMessage);
  }

  /**
   * Navigate to the user management page
   */
  async goto(): Promise<void> {
    await this.page.goto('/admin/users');
    await expect(this.userTable).toBeVisible({ timeout: 10000 });
  }

  /**
   * Click the create user button
   */
  async clickCreateUser(): Promise<void> {
    await this.createUserButton.click();

    // Wait for user form to appear
    await expect(this.page.locator(testSelectors.userForm.emailInput)).toBeVisible();
  }

  /**
   * Fill the user creation form
   */
  async fillUserForm(userData: {
    email: string;
    password: string;
    confirmPassword?: string;
    firstName: string;
    lastName: string;
    username: string;
    role?: string;
    accountType?: string;
  }): Promise<void> {
    await this.page.locator(testSelectors.userForm.emailInput).fill(userData.email);
    await this.page.locator(testSelectors.userForm.passwordInput).fill(userData.password);

    if (userData.confirmPassword) {
      await this.page
        .locator(testSelectors.userForm.confirmPasswordInput)
        .fill(userData.confirmPassword);
    }

    await this.page.locator(testSelectors.userForm.firstNameInput).fill(userData.firstName);
    await this.page.locator(testSelectors.userForm.lastNameInput).fill(userData.lastName);
    await this.page.locator(testSelectors.userForm.usernameInput).fill(userData.username);

    if (userData.role) {
      await this.page.locator(testSelectors.userForm.roleSelect).selectOption(userData.role);
    }

    if (userData.accountType) {
      await this.page
        .locator(testSelectors.userForm.accountTypeSelect)
        .selectOption(userData.accountType);
    }
  }

  /**
   * Submit the user form
   */
  async submitUserForm(): Promise<void> {
    await this.page.locator(testSelectors.userForm.submitButton).click();
  }

  /**
   * Cancel the user form
   */
  async cancelUserForm(): Promise<void> {
    await this.page.locator(testSelectors.userForm.cancelButton).click();
  }

  /**
   * Create a new user with complete workflow
   */
  async createUser(userData: typeof newUserTestData.validUser): Promise<void> {
    await this.clickCreateUser();
    await this.fillUserForm(userData);
    await this.submitUserForm();

    // Wait for success message or return to user list
    await Promise.race([
      this.successMessage.waitFor({ state: 'visible', timeout: 10000 }),
      this.userTable.waitFor({ state: 'visible', timeout: 10000 }),
    ]);
  }

  /**
   * Find a user in the table by email
   */
  async findUserInTable(email: string): Promise<Locator | null> {
    const userRows = this.userTable.locator('tbody tr');
    const count = await userRows.count();

    for (let i = 0; i < count; i++) {
      const row = userRows.nth(i);
      const rowText = await row.textContent();
      if (rowText?.includes(email)) {
        return row;
      }
    }

    return null;
  }

  /**
   * Activate a user by email
   */
  async activateUser(email: string): Promise<void> {
    const userRow = await this.findUserInTable(email);
    if (!userRow) {
      throw new Error(`User with email ${email} not found in table`);
    }

    const activateButton = userRow.locator(testSelectors.userManagement.activateButton);
    await activateButton.click();

    // Wait for confirmation dialog and confirm
    const confirmButton = this.page.locator(testSelectors.common.confirmButton);
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // Wait for action completion
    await this.waitForActionCompletion();
  }

  /**
   * Deactivate a user by email
   */
  async deactivateUser(email: string): Promise<void> {
    const userRow = await this.findUserInTable(email);
    if (!userRow) {
      throw new Error(`User with email ${email} not found in table`);
    }

    const deactivateButton = userRow.locator(testSelectors.userManagement.deactivateButton);
    await deactivateButton.click();

    // Wait for confirmation dialog and confirm
    const confirmButton = this.page.locator(testSelectors.common.confirmButton);
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // Wait for action completion
    await this.waitForActionCompletion();
  }

  /**
   * Edit a user by email
   */
  async editUser(email: string): Promise<void> {
    const userRow = await this.findUserInTable(email);
    if (!userRow) {
      throw new Error(`User with email ${email} not found in table`);
    }

    const editButton = userRow.locator(testSelectors.userManagement.editButton);
    await editButton.click();

    // Wait for edit form to appear
    await expect(this.page.locator(testSelectors.userForm.emailInput)).toBeVisible();
  }

  /**
   * Delete a user by email
   */
  async deleteUser(email: string): Promise<void> {
    const userRow = await this.findUserInTable(email);
    if (!userRow) {
      throw new Error(`User with email ${email} not found in table`);
    }

    const deleteButton = userRow.locator(testSelectors.userManagement.deleteButton);
    await deleteButton.click();

    // Wait for confirmation dialog and confirm
    const confirmButton = this.page.locator(testSelectors.common.confirmButton);
    await expect(confirmButton).toBeVisible();
    await confirmButton.click();

    // Wait for action completion
    await this.waitForActionCompletion();
  }

  /**
   * Get the total number of users in the table
   */
  async getUserCount(): Promise<number> {
    const userRows = this.userTable.locator('tbody tr');
    return await userRows.count();
  }

  /**
   * Check if a user exists in the table
   */
  async userExists(email: string): Promise<boolean> {
    const userRow = await this.findUserInTable(email);
    return userRow !== null;
  }

  /**
   * Wait for any user management action to complete
   */
  async waitForActionCompletion(): Promise<void> {
    // Wait for either success message or error message
    await Promise.race([
      this.successMessage.waitFor({ state: 'visible', timeout: 10000 }),
      this.errorMessage.waitFor({ state: 'visible', timeout: 10000 }),
    ]);
  }

  /**
   * Get the current success message
   */
  async getSuccessMessage(): Promise<string> {
    await expect(this.successMessage).toBeVisible();
    return (await this.successMessage.textContent()) || '';
  }

  /**
   * Get the current error message
   */
  async getErrorMessage(): Promise<string> {
    await expect(this.errorMessage).toBeVisible();
    return (await this.errorMessage.textContent()) || '';
  }

  /**
   * Wait for the user table to load
   */
  async waitForUserTableLoad(): Promise<void> {
    await expect(this.userTable).toBeVisible();
    await expect(this.loadingSpinner).not.toBeVisible();
  }

  /**
   * Refresh the user list
   */
  async refreshUserList(): Promise<void> {
    await this.page.reload();
    await this.waitForUserTableLoad();
  }
}
