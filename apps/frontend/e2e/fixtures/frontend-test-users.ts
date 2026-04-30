/**
 * Frontend E2E Test User Fixtures
 *
 * This file contains test user credentials and data specifically designed for frontend UI E2E testing.
 * These users will be used for authentication flows and UI interaction testing.
 */

/**
 * Test user credentials for frontend authentication
 * These correspond to users seeded in the database via the central seeding system
 */
export const frontendTestCredentials = {
  admin: {
    email: 'admin@frontend.e2e.memoriaali.test',
    password: 'AdminFrontendE2E123!',
    role: 'ADMIN',
    displayName: 'Admin Frontend E2E',
  },
  regularUser: {
    email: 'user@frontend.e2e.memoriaali.test',
    password: 'UserFrontendE2E123!',
    role: 'USER',
    displayName: 'Regular User E2E',
  },
  moderator: {
    email: 'moderator@frontend.e2e.memoriaali.test',
    password: 'ModeratorFrontendE2E123!',
    role: 'MODERATOR',
    displayName: 'Moderator E2E',
  },
  inactiveUser: {
    email: 'inactive@frontend.e2e.memoriaali.test',
    password: 'InactiveFrontendE2E123!',
    role: 'USER',
    displayName: 'Inactive User E2E',
    isActivated: false,
  },
} as const;

/**
 * Test data for user creation forms
 */
export const newUserTestData = {
  validUser: {
    email: 'newuser@frontend.e2e.test',
    password: 'NewUserE2E123!',
    confirmPassword: 'NewUserE2E123!',
    firstName: 'New',
    lastName: 'User',
    username: 'newuser.e2e',
    role: 'USER',
    accountType: 'PRIVATE',
  },
  invalidEmail: {
    email: 'invalid-email-format',
    password: 'ValidPass123!',
    confirmPassword: 'ValidPass123!',
    firstName: 'Invalid',
    lastName: 'Email',
    username: 'invalid.email',
  },
  weakPassword: {
    email: 'weakpass@frontend.e2e.test',
    password: '123',
    confirmPassword: '123',
    firstName: 'Weak',
    lastName: 'Password',
    username: 'weak.password',
  },
  mismatchedPasswords: {
    email: 'mismatch@frontend.e2e.test',
    password: 'ValidPass123!',
    confirmPassword: 'DifferentPass123!',
    firstName: 'Mismatched',
    lastName: 'Passwords',
    username: 'mismatched.passwords',
  },
} as const;

/**
 * Expected UI text content for different locales
 */
export const expectedUIText = {
  fi: {
    loginButton: 'Kirjaudu sisään',
    logoutButton: 'Kirjaudu ulos',
    welcomeMessage: 'Tervetuloa',
    usersMenu: 'Käyttäjät',
    createUserButton: 'Luo käyttäjä',
    activateUserButton: 'Aktivoi käyttäjä',
    deactivateUserButton: 'Deaktivoi käyttäjä',
    errorMessages: {
      invalidCredentials: 'Virheelliset kirjautumistiedot',
      accessDenied: 'Pääsy evätty',
      userNotFound: 'Käyttäjää ei löytynyt',
    },
  },
  en: {
    loginButton: 'Sign In',
    logoutButton: 'Sign Out',
    welcomeMessage: 'Welcome',
    usersMenu: 'Users',
    createUserButton: 'Create User',
    activateUserButton: 'Activate User',
    deactivateUserButton: 'Deactivate User',
    errorMessages: {
      invalidCredentials: 'Invalid credentials',
      accessDenied: 'Access denied',
      userNotFound: 'User not found',
    },
  },
} as const;

/**
 * Test data selectors for UI elements
 */
export const testSelectors = {
  login: {
    emailInput: '[data-testid="login-email"]',
    passwordInput: '[data-testid="login-password"]',
    loginButton: '[data-testid="login-button"]',
    errorMessage: '[data-testid="login-error"]',
  },
  navigation: {
    usersMenu: '[data-testid="nav-users"]',
    dashboardMenu: '[data-testid="nav-dashboard"]',
    profileMenu: '[data-testid="nav-profile"]',
    logoutButton: '[data-testid="nav-logout"]',
  },
  userManagement: {
    createUserButton: '[data-testid="create-user-button"]',
    userTable: '[data-testid="users-table"]',
    userRow: '[data-testid^="user-row-"]',
    activateButton: '[data-testid^="activate-user-"]',
    deactivateButton: '[data-testid^="deactivate-user-"]',
    editButton: '[data-testid^="edit-user-"]',
    deleteButton: '[data-testid^="delete-user-"]',
  },
  userForm: {
    emailInput: '[data-testid="user-email"]',
    passwordInput: '[data-testid="user-password"]',
    confirmPasswordInput: '[data-testid="user-confirm-password"]',
    firstNameInput: '[data-testid="user-first-name"]',
    lastNameInput: '[data-testid="user-last-name"]',
    usernameInput: '[data-testid="user-username"]',
    roleSelect: '[data-testid="user-role"]',
    accountTypeSelect: '[data-testid="user-account-type"]',
    submitButton: '[data-testid="user-form-submit"]',
    cancelButton: '[data-testid="user-form-cancel"]',
  },
  common: {
    loadingSpinner: '[data-testid="loading-spinner"]',
    successMessage: '[data-testid="success-message"]',
    errorMessage: '[data-testid="error-message"]',
    confirmDialog: '[data-testid="confirm-dialog"]',
    confirmButton: '[data-testid="confirm-button"]',
    cancelButton: '[data-testid="cancel-button"]',
  },
} as const;

/**
 * API endpoints for direct testing
 */
export const apiEndpoints = {
  auth: {
    login: '/api/v2/auth/login',
    logout: '/api/v2/auth/logout',
    refresh: '/api/v2/auth/refresh',
  },
  users: {
    list: '/api/v2/users',
    create: '/api/v2/users',
    getById: (id: string) => `/api/v2/users/${id}`,
    update: (id: string) => `/api/v2/users/${id}`,
    delete: (id: string) => `/api/v2/users/${id}`,
    activate: (id: string) => `/api/v2/users/${id}/activate`,
    deactivate: (id: string) => `/api/v2/users/${id}/deactivate`,
  },
} as const;
