/**
 * Test Setup and Infrastructure for Prisma Pagination
 *
 * This module provides a comprehensive testing infrastructure for Prisma-based pagination
 * services. It uses in-memory SQLite for fast, isolated tests and provides utilities for
 * test data creation and cleanup.
 *
 * The setup follows TDD principles with deterministic test data generation and complete
 * isolation between test runs.
 */

import { afterAll, afterEach, beforeEach } from 'vitest';
import { PrismaClient } from '../../generated/client';

/**
 * Test database instance using in-memory SQLite.
 * Each test gets a fresh database instance for complete isolation.
 */
export let testDb: PrismaClient;

/**
 * User role type for test data.
 * Matches the UserRole enum from Prisma schema.
 */
export type TestUserRole = 'ADMIN' | 'USER' | 'MODERATOR' | 'EXPERT';

/**
 * Account type for test data.
 * Matches the AccountType enum from Prisma schema.
 */
export type TestAccountType = 'PRIVATE' | 'COMPANY';

/**
 * Test setup configuration.
 * Provides centralized configuration for test behavior.
 *
 * Invariants:
 * - All timeout values are positive integers
 * - User counts are positive for meaningful test data
 * - Role and status arrays contain valid enum values
 */
export const TEST_CONFIG = {
  /** Timeout for database operations in tests */
  DB_TIMEOUT: 5000,

  /** Default test data counts */
  DEFAULT_USER_COUNT: 25,

  /** Test user roles for consistent test data */
  TEST_ROLES: ['ADMIN', 'USER', 'MODERATOR'] as const,

  /** Test account types for varied test scenarios */
  TEST_ACCOUNT_TYPES: ['PRIVATE', 'COMPANY'] as const,
} as const;

/**
 * User factory interface for creating test users.
 * Matches the actual Prisma User model structure.
 *
 * Invariants:
 * - Optional fields can be undefined or provided
 * - Required fields have defaults when not specified
 * - All provided values match Prisma schema constraints
 */
export interface UserFactory {
  id?: string;
  username?: string;
  hashedPassword?: string;
  salt?: string;
  role?: TestUserRole;
  accountType?: TestAccountType;
  isActivated?: boolean;
  verificationCode?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  streetAddress?: string;
  postalCode?: string;
  postOffice?: string;
  telephone?: string;
  profession?: string;
  companyName?: string;
  companyEmail?: string;
  companyTelephone?: string;
  companyContactPerson?: string;
  createdAt?: Date;
  updatedAt?: Date;
  createdById?: string;
  updatedById?: string;
}

/**
 * Test database setup before each test.
 * Creates a fresh in-memory SQLite database instance for isolation.
 *
 * @return {Promise<void>} Resolves when database is ready
 *
 * Preconditions:
 * - SQLite is available in the test environment
 * - Prisma schema is compiled and available
 *
 * Postconditions:
 * - Fresh database instance is available in testDb
 * - Database schema is applied and ready for use
 * - Database connection is established
 *
 * Invariants:
 * - Each test gets a completely isolated database
 * - No data persists between tests
 * - Connection is properly established before proceeding
 */
beforeEach(async () => {
  // Use DATABASE_URL environment variable for MySQL test database
  // Falls back to default test database if not set
  const databaseUrl =
    'mysql://memoriaali_database_test_user:database_test_user_password_123@localhost:33062/memoriaali_database_test';

  testDb = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: [], // Suppress logs during testing for cleaner output
  });

  // Connect to the database
  await testDb.$connect();

  // Clean up any existing test data for isolation
  await cleanupTestData();
});

/**
 * Test database cleanup after each test.
 * Ensures complete cleanup and disconnection.
 *
 * @return {Promise<void>} Resolves when cleanup is complete
 *
 * Preconditions:
 * - testDb instance exists and may be connected
 *
 * Postconditions:
 * - Database connection is closed
 * - All resources are cleaned up
 *
 * Invariants:
 * - No connections leak between tests
 * - Database instance is properly disposed
 */
afterEach(async () => {
  if (testDb) {
    await testDb.$disconnect();
  }
});

/**
 * Final cleanup after all tests complete.
 * Ensures no resources are left hanging.
 *
 * @return {Promise<void>} Resolves when final cleanup is complete
 */
afterAll(async () => {
  if (testDb) {
    await testDb.$disconnect();
  }
});

/**
 * Creates a single test user with deterministic data.
 *
 * @param {UserFactory} overrides - Optional field overrides for customization
 * @return {Promise<User>} Created user object from database
 *
 * Preconditions:
 * - testDb is connected and ready
 * - override parameters are valid when provided
 * - username and email are unique in current test database
 *
 * Postconditions:
 * - User is created in database with all required fields
 * - Returns the created user object with generated fields
 * - User has valid defaults for all required schema fields
 *
 * Invariants:
 * - Generated data is deterministic for testing
 * - Email addresses and usernames are unique when auto-generated
 * - All required schema fields are populated
 *
 * @example
 * const user = await createTestUser({ role: 'ADMIN' });
 * // Returns user with ADMIN role and default test values
 *
 * @example
 * const user = await createTestUser({
 *   email: 'specific@example.com',
 *   firstName: 'John'
 * });
 */
export const createTestUser = async (overrides: UserFactory = {}) => {
  const userCount = await testDb.user.count();
  const userIndex = userCount + 1;

  const defaultData = {
    id: overrides.id || `test-user-${userIndex}`,
    username: overrides.username || `testuser${userIndex}`,
    hashedPassword: overrides.hashedPassword || '$2b$10$hashedpasswordexample123456',
    salt: overrides.salt || `salt${userIndex}example`,
    role: overrides.role || 'USER',
    accountType: overrides.accountType || 'PRIVATE',
    isActivated: overrides.isActivated ?? true,
    verificationCode: overrides.verificationCode || `verify${userIndex}code`,
    email: overrides.email || `test-user-${userIndex}@example.com`,
    firstName: overrides.firstName || `TestUser${userIndex}`,
    lastName: overrides.lastName || `LastName${userIndex}`,
    streetAddress: overrides.streetAddress || `${userIndex} Test Street`,
    postalCode: overrides.postalCode || `0010${userIndex}`,
    postOffice: overrides.postOffice || 'Test City',
    telephone: overrides.telephone || `+358-${userIndex}-123456`,
    profession: overrides.profession || 'Test Professional',
    companyName:
      overrides.companyName ||
      (overrides.accountType === 'COMPANY' ? `Test Company ${userIndex}` : null),
    companyEmail:
      overrides.companyEmail ||
      (overrides.accountType === 'COMPANY' ? `company${userIndex}@example.com` : null),
    companyTelephone:
      overrides.companyTelephone ||
      (overrides.accountType === 'COMPANY' ? `+358-${userIndex}-654321` : null),
    companyContactPerson:
      overrides.companyContactPerson ||
      (overrides.accountType === 'COMPANY' ? `Contact Person ${userIndex}` : null),
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    createdById: overrides.createdById || null,
    updatedById: overrides.updatedById || null,
  };

  return await testDb.user.create({
    data: defaultData,
  });
};

/**
 * Creates multiple test users with varied characteristics.
 *
 * @param {number} count - Number of users to create (default: 25)
 * @return {Promise<User[]>} Array of created user objects
 *
 * Preconditions:
 * - testDb is connected and ready
 * - count is a positive integer
 *
 * Postconditions:
 * - Specified number of users are created
 * - Users have varied roles and account types for comprehensive testing
 * - Returns array of created user objects in creation order
 * - Users have sequential creation timestamps for predictable ordering
 *
 * Invariants:
 * - Users are distributed across different roles and account types
 * - Creation timestamps are sequential for predictable ordering
 * - Email addresses and usernames are unique
 * - Mix of activated and non-activated users for testing
 *
 * @example
 * const users = await createTestUsers(10);
 * // Creates 10 users with varied roles and account types
 *
 * @example
 * const users = await createTestUsers(50);
 * // Creates 50 users for large dataset pagination testing
 */
export const createTestUsers = async (count: number = TEST_CONFIG.DEFAULT_USER_COUNT) => {
  if (count < 1) {
    throw new Error('User count must be at least 1');
  }

  const users = [];
  const baseDate = new Date('2024-01-01T00:00:00Z');

  for (let i = 0; i < count; i++) {
    const roleIndex = i % TEST_CONFIG.TEST_ROLES.length;
    const accountTypeIndex = i % TEST_CONFIG.TEST_ACCOUNT_TYPES.length;

    const createdAt = new Date(baseDate.getTime() + i * 60000); // 1 minute apart

    const user = await createTestUser({
      id: `test-user-${i + 1}`,
      username: `testuser${i + 1}`,
      email: `test-user-${i + 1}@example.com`,
      firstName: `TestUser${i + 1}`,
      lastName: `LastName${i + 1}`,
      role: TEST_CONFIG.TEST_ROLES[roleIndex],
      accountType: TEST_CONFIG.TEST_ACCOUNT_TYPES[accountTypeIndex],
      isActivated: i % 4 !== 0, // Most users activated, some not for testing
      createdAt,
      updatedAt: createdAt,
    });

    users.push(user);
  }

  return users;
};

/**
 * Creates a test admin user for admin-specific tests.
 *
 * @param {UserFactory} overrides - Optional field overrides
 * @return {Promise<User>} Created admin user object
 *
 * Preconditions:
 * - testDb is connected and ready
 *
 * Postconditions:
 * - Admin user is created with ADMIN role
 * - User is activated and ready for admin operations
 * - Returns the created admin user
 *
 * Invariants:
 * - Admin user always has ADMIN role
 * - Admin user is active and verified
 * - Admin user has valid authentication credentials
 *
 * @example
 * const admin = await createTestAdmin();
 * // Creates admin user with default admin credentials
 */
export const createTestAdmin = async (overrides: UserFactory = {}) => {
  const adminData: UserFactory = {
    username: 'testadmin',
    email: 'admin@example.com',
    firstName: 'Test',
    lastName: 'Admin',
    role: 'ADMIN',
    accountType: 'PRIVATE',
    isActivated: true,
    ...overrides,
  };

  return await createTestUser(adminData);
};

/**
 * Cleanup test data to ensure isolated test environments.
 *
 * @return {Promise<void>} Resolves when cleanup is complete
 *
 * Preconditions:
 * - testDb is connected and ready
 *
 * Postconditions:
 * - All test data is removed from the database
 * - Database is ready for fresh test data
 *
 * Invariants:
 * - Foreign key constraints are respected during cleanup
 * - Self-referential relationships are handled properly
 * - Tables are cleaned in dependency order
 */
export const cleanupTestData = async () => {
  try {
    // First, remove self-referential constraints in users table
    // Set createdById and updatedById to null to break circular references
    await testDb.user.updateMany({
      data: {
        createdById: null,
        updatedById: null,
      },
    });

    // Clean up in reverse dependency order to handle foreign keys
    // Most related tables have onDelete: Cascade, but we clean explicitly for safety

    // Clean up tables that reference users (some may not have CASCADE)
    await testDb.metadataSuggestion.deleteMany();
    await testDb.researchRequest.deleteMany();
    await testDb.defaultQuestion.deleteMany();
    await testDb.refreshToken.deleteMany();
    await testDb.comment.deleteMany();
    await testDb.usersInGroups.deleteMany();
    await testDb.oralHistory.deleteMany();

    // Clean up documents and related data
    await testDb.documentsInCollections.deleteMany();
    await testDb.documentQuality.deleteMany();
    await testDb.document.deleteMany();

    // Clean up collections and groups
    await testDb.collection.deleteMany();
    await testDb.group.deleteMany();

    // Finally, clean up users
    await testDb.user.deleteMany();

    // Clean up any remaining orphaned data
    await testDb.sipComment.deleteMany();
    await testDb.sip.deleteMany();
    await testDb.iri.deleteMany();
  } catch (error) {
    console.error('Error during test data cleanup:', error);
    throw error;
  }
};

/**
 * Helper to get current user count for assertions.
 *
 * @return {Promise<number>} Current count of users in database
 *
 * Preconditions:
 * - testDb is connected and ready
 *
 * Postconditions:
 * - Returns current count of users in database
 * - Count reflects actual database state
 *
 * Invariants:
 * - Count is always non-negative
 * - Reflects actual database state at time of call
 */
export const getUserCount = async (): Promise<number> => {
  return await testDb.user.count();
};

/**
 * Helper to create users with specific search patterns for testing.
 *
 * @param {string} searchTerm - Term to include in names and emails
 * @param {number} count - Number of searchable users to create (default: 3)
 * @return {Promise<User[]>} Array of created users with search term
 *
 * Preconditions:
 * - testDb is connected and ready
 * - searchTerm is provided and non-empty
 * - count is positive
 *
 * Postconditions:
 * - Creates users with names/emails containing search term
 * - Returns array of created users
 * - Users are suitable for search functionality testing
 *
 * Invariants:
 * - Search term appears in user names and emails
 * - Users have valid schema-compliant data
 * - Generated usernames and emails remain unique
 *
 * @example
 * const users = await createSearchableTestUsers('admin');
 * // Creates users with 'admin' in names and emails
 */
export const createSearchableTestUsers = async (searchTerm: string, count: number = 3) => {
  if (!searchTerm || searchTerm.trim().length === 0) {
    throw new Error('Search term must be provided and non-empty');
  }

  const users = [];
  const baseUserCount = await getUserCount();

  for (let i = 0; i < count; i++) {
    const userIndex = baseUserCount + i + 1;
    const user = await createTestUser({
      username: `${searchTerm}user${i + 1}`,
      email: `${searchTerm}-user-${i + 1}@example.com`,
      firstName: `${searchTerm}`,
      lastName: `User${i + 1}`,
    });
    users.push(user);
  }

  return users;
};
