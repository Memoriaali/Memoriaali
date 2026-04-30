/**
 * Login Page Object Model
 *
 * This class provides methods for interacting with the login page during E2E tests.
 * It encapsulates all login-related UI interactions and provides a clean API for tests.
 */

import { frontendTestCredentials, testSelectors } from '@fixtures/frontend-test-users';
import { Locator, Page, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;
  readonly loadingSpinner: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator(testSelectors.login.emailInput);
    this.passwordInput = page.locator(testSelectors.login.passwordInput);
    this.loginButton = page.locator(testSelectors.login.loginButton);
    this.errorMessage = page.locator(testSelectors.login.errorMessage);
    this.loadingSpinner = page.locator(testSelectors.common.loadingSpinner);
  }

  /**
   * Navigate to the login page
   */
  async goto(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.emailInput).toBeVisible();
  }

  /**
   * Fill the login form with provided credentials
   */
  async fillLoginForm(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
  }

  /**
   * Submit the login form
   */
  async submitLogin(): Promise<void> {
    await this.loginButton.click();
  }

  /**
   * Complete login process with credentials
   */
  async login(email: string, password: string): Promise<void> {
    await this.fillLoginForm(email, password);
    await this.submitLogin();
  }

  /**
   * Login as admin user
   */
  async loginAsAdmin(): Promise<void> {
    const admin = frontendTestCredentials.admin;
    await this.login(admin.email, admin.password);

    // Wait for successful navigation (should redirect to dashboard)
    await this.page.waitForURL(/\/dashboard|\/admin/, { timeout: 10000 });
  }

  /**
   * Login as regular user
   */
  async loginAsUser(): Promise<void> {
    const user = frontendTestCredentials.regularUser;
    await this.login(user.email, user.password);

    // Wait for successful navigation
    await this.page.waitForURL(/\/dashboard|\/home/, { timeout: 10000 });
  }

  /**
   * Login as moderator
   */
  async loginAsModerator(): Promise<void> {
    const moderator = frontendTestCredentials.moderator;
    await this.login(moderator.email, moderator.password);

    // Wait for successful navigation
    await this.page.waitForURL(/\/dashboard|\/moderator/, { timeout: 10000 });
  }

  /**
   * Attempt login with invalid credentials
   */
  async attemptInvalidLogin(email: string, password: string): Promise<void> {
    await this.login(email, password);

    // Wait for error message to appear
    await expect(this.errorMessage).toBeVisible({ timeout: 5000 });
  }

  /**
   * Wait for login form to be ready
   */
  async waitForLoginForm(): Promise<void> {
    await expect(this.emailInput).toBeVisible();
    await expect(this.passwordInput).toBeVisible();
    await expect(this.loginButton).toBeVisible();
  }

  /**
   * Check if login form has validation errors
   */
  async hasValidationErrors(): Promise<boolean> {
    return await this.errorMessage.isVisible();
  }

  /**
   * Get the current error message text
   */
  async getErrorMessage(): Promise<string> {
    await expect(this.errorMessage).toBeVisible();
    return (await this.errorMessage.textContent()) || '';
  }

  /**
   * Check if login is in progress (loading state)
   */
  async isLoading(): Promise<boolean> {
    return await this.loadingSpinner.isVisible();
  }

  /**
   * Wait for login completion (either success or failure)
   */
  async waitForLoginCompletion(): Promise<void> {
    // Wait for either navigation (success) or error message (failure)
    await Promise.race([
      this.page.waitForURL(/\/dashboard|\/admin|\/home/, { timeout: 10000 }),
      this.errorMessage.waitFor({ state: 'visible', timeout: 10000 }),
    ]);
  }

  /**
   * Clear the login form
   */
  async clearForm(): Promise<void> {
    await this.emailInput.clear();
    await this.passwordInput.clear();
  }

  /**
   * Check if user is already logged in (redirected away from login)
   */
  async isAlreadyLoggedIn(): Promise<boolean> {
    const currentUrl = this.page.url();
    return !currentUrl.includes('/login');
  }
}
