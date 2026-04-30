/**
 * Shared Prisma Client Mock
 *
 * Provides reusable mocks for Prisma database operations.
 * Used across multiple test suites to ensure consistent database mocking.
 *
 * Design by Contract:
 * - Preconditions: Mock methods called with expected parameters
 * - Postconditions: Returns predictable test data or throws expected errors
 * - Invariants: Mock state is isolated between test runs
 */

import { AccountType, Prisma, User, UserRole } from '@memoriaali/database';
import { vi, type MockedFunction } from 'vitest';

/**
 * Test user fixtures for consistent testing
 */
export const testUsers: Record<string, User> = {
  activeUser: {
    id: 'user-123',
    username: 'testuser',
    hashedPassword: '$2b$12$test.hash.here',
    salt: 'test-salt-123',
    role: UserRole.USER,
    accountType: AccountType.PRIVATE,
    isActivated: true,
    verificationCode: 'verified-123',
    passwordResetToken: null,
    passwordResetExpires: null,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    streetAddress: null,
    postalCode: null,
    postOffice: null,
    telephone: null,
    profession: null,
    companyName: null,
    companyEmail: null,
    companyTelephone: null,
    companyContactPerson: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    createdById: null,
    updatedById: null,
  },
  inactiveUser: {
    id: 'user-456',
    username: 'inactiveuser',
    hashedPassword: '$2b$12$test.hash.here',
    salt: 'test-salt-456',
    role: UserRole.USER,
    accountType: AccountType.PRIVATE,
    isActivated: false,
    verificationCode: 'pending-456',
    passwordResetToken: null,
    passwordResetExpires: null,
    email: 'inactive@example.com',
    firstName: 'Inactive',
    lastName: 'User',
    streetAddress: null,
    postalCode: null,
    postOffice: null,
    telephone: null,
    profession: null,
    companyName: null,
    companyEmail: null,
    companyTelephone: null,
    companyContactPerson: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    createdById: null,
    updatedById: null,
  },
  duplicateUser: {
    id: 'user-789',
    username: 'duplicateuser',
    hashedPassword: '$2b$12$test.hash.here',
    salt: 'test-salt-789',
    role: UserRole.USER,
    accountType: AccountType.PRIVATE,
    isActivated: true,
    verificationCode: 'verified-789',
    passwordResetToken: null,
    passwordResetExpires: null,
    email: 'duplicate@example.com',
    firstName: 'Duplicate',
    lastName: 'User',
    streetAddress: null,
    postalCode: null,
    postOffice: null,
    telephone: null,
    profession: null,
    companyName: null,
    companyEmail: null,
    companyTelephone: null,
    companyContactPerson: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
    createdById: null,
    updatedById: null,
  },
};

/**
 * Prisma mock factory with proper typing
 */
export const createPrismaMock = (): {
  prismaMock: {
    user: {
      findFirst: MockedFunction<(args?: Prisma.UserFindFirstArgs) => Promise<User | null>>;
      findUnique: MockedFunction<(args: Prisma.UserFindUniqueArgs) => Promise<User | null>>;
      create: MockedFunction<(args: Prisma.UserCreateArgs) => Promise<User>>;
      update: MockedFunction<(args: Prisma.UserUpdateArgs) => Promise<User>>;
      delete: MockedFunction<(args: Prisma.UserDeleteArgs) => Promise<User>>;
      count: MockedFunction<(args?: Prisma.UserCountArgs) => Promise<number>>;
    };
    $queryRaw: MockedFunction<
      (query: TemplateStringsArray | Prisma.Sql, ...values: unknown[]) => Promise<unknown>
    >;
    $connect: MockedFunction<() => Promise<void>>;
    $disconnect: MockedFunction<() => Promise<void>>;
    $transaction: MockedFunction<(fn: (prisma: unknown) => Promise<unknown>) => Promise<unknown>>;
  };
  userFindFirstMock: MockedFunction<(args?: Prisma.UserFindFirstArgs) => Promise<User | null>>;
  userFindUniqueMock: MockedFunction<(args: Prisma.UserFindUniqueArgs) => Promise<User | null>>;
  resetMocks: () => void;
  mockUserFoundByUsername: (username: string, user?: User | null) => void;
  mockUserFoundByEmail: (email: string, user?: User | null) => void;
  mockNoUserFound: () => void;
  mockUserFoundById: (userId: string, user?: User | null) => void;
  mockDatabaseError: (error?: Error) => void;
  mockUserByIdentifier: (identifier: string, user?: User | null) => void;
} => {
  const userFindFirstMock: MockedFunction<
    (args?: Prisma.UserFindFirstArgs) => Promise<User | null>
  > = vi.fn();
  const userFindUniqueMock: MockedFunction<
    (args: Prisma.UserFindUniqueArgs) => Promise<User | null>
  > = vi.fn();

  const prismaMock = {
    user: {
      findFirst: userFindFirstMock,
      findUnique: userFindUniqueMock,
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $transaction: vi.fn(),
  };

  return {
    prismaMock,
    userFindFirstMock,
    userFindUniqueMock,

    /**
     * Reset all mock functions to clean state
     */
    resetMocks: (): void => {
      vi.clearAllMocks();
      userFindFirstMock.mockReset();
      userFindUniqueMock.mockReset();
    },

    /**
     * Setup mock to simulate user found by username
     */
    mockUserFoundByUsername: (
      username: string,
      user: User | null = testUsers.activeUser!,
    ): void => {
      userFindFirstMock.mockResolvedValue(user);
    },

    /**
     * Setup mock to simulate user found by email
     */
    mockUserFoundByEmail: (email: string, user: User | null = testUsers.activeUser!): void => {
      userFindFirstMock.mockResolvedValue(user);
    },

    /**
     * Setup mock to simulate no user found
     */
    mockNoUserFound: (): void => {
      userFindFirstMock.mockResolvedValue(null);
      userFindUniqueMock.mockResolvedValue(null);
    },

    /**
     * Setup mock to simulate user found by ID
     */
    mockUserFoundById: (userId: string, user: User | null = testUsers.activeUser!): void => {
      userFindUniqueMock.mockResolvedValue(user);
    },

    /**
     * Setup mock to simulate database error
     */
    mockDatabaseError: (error: Error = new Error('Database connection failed')): void => {
      userFindFirstMock.mockRejectedValue(error);
      userFindUniqueMock.mockRejectedValue(error);
    },

    /**
     * Setup mock for user identifier search (username or email)
     */
    mockUserByIdentifier: (identifier: string, user: User | null = testUsers.activeUser!): void => {
      userFindFirstMock.mockResolvedValue(user);
    },
  };
};
