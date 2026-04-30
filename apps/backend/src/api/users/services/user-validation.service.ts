import { Prisma, PrismaClient, User } from '@memoriaali/database';

import { ERROR_CODES, HttpException } from '../../../shared/errors';

// Type for Prisma transaction context - supports both full client and transaction
type PrismaContext = PrismaClient | Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

/**
 * User Validation Service
 *
 * Provides validation methods for user data constraints and business rules.
 * Handles email uniqueness, username constraints, and cultural sensitivity validation.
 *
 * Design by Contract:
 * - Preconditions: Valid input data and database connection
 * - Postconditions: Validation passes or throws specific validation errors
 * - Invariants: Maintains data integrity and cultural standards
 */
export class UserValidationService {
  constructor(private readonly prisma: PrismaContext) {}

  /**
   * Validates that a username is unique in the system
   *
   * Postconditions: Throws HttpException.conflict if username exists
   * Invariants: Username uniqueness constraint maintained, case-sensitive comparison
   */
  async validateUsernameUnique(username: string, excludeUserId?: string): Promise<void> {
    const whereClause: Prisma.UserWhereInput = { username };

    if (excludeUserId) {
      whereClause.id = { not: excludeUserId };
    }

    const existingUser = await this.prisma.user.findFirst({
      where: whereClause,
      select: { id: true },
    });

    if (existingUser) {
      throw HttpException.conflict(
        ERROR_CODES.USER.USERNAME_ALREADY_EXISTS,
        'Username is already taken',
      );
    }
  }

  /**
   * Validates that an email is unique in the system
   *
   * Preconditions: Valid email format (validated by Zod schema)
   * Postconditions: Throws HttpException.conflict if email exists
   * Invariants: Email uniqueness constraint maintained, case-insensitive comparison
   */
  async validateEmailUnique(email: string, excludeUserId?: string): Promise<void> {
    // Normalize email for comparison
    const normalizedEmail = email.toLowerCase().trim();

    const whereClause: Prisma.UserWhereInput = { email: normalizedEmail };

    if (excludeUserId) {
      whereClause.id = { not: excludeUserId };
    }

    const existingUser = await this.prisma.user.findFirst({
      where: whereClause,
      select: { id: true },
    });

    if (existingUser) {
      throw HttpException.conflict(
        ERROR_CODES.USER.EMAIL_ALREADY_EXISTS,
        'Email address is already registered',
      );
    }
  }

  /**
   * Validate both username and email uniqueness atomically
   *
   * Performs both validations in sequence to ensure atomic validation.
   * Useful for user creation and update operations.
   *
   * Preconditions: username and email are non-empty strings, excludeUserId is valid ID or undefined
   * Postconditions: Throws HttpException if either exists, completes silently if both unique
   * Invariants: Both constraints validated, transaction safety maintained
   */
  async validateUserIdentifiersUnique(
    username: string,
    email: string,
    excludeUserId?: string,
  ): Promise<void> {
    await this.validateUsernameUnique(username, excludeUserId);
    await this.validateEmailUnique(email, excludeUserId);
  }

  /**
   * Find user by identifier (username or email)
   *
   * Searches for user using either username or email as identifier.
   * Authentication pattern allowing login with either field.
   *
   * Preconditions: identifier is non-empty string
   * Postconditions: Returns User object if found, null if not found
   * Invariants: Email portion normalized for consistent search, username case-sensitive
   */
  async findUserByIdentifier(identifier: string): Promise<User | null> {
    const trimmedIdentifier = identifier.trim();

    // Check if identifier looks like an email (contains @)
    const isEmail = trimmedIdentifier.includes('@');
    const searchEmail = isEmail ? trimmedIdentifier.toLowerCase() : trimmedIdentifier;

    return this.prisma.user.findFirst({
      where: {
        OR: [
          { username: trimmedIdentifier }, // Username search is case-sensitive
          { email: searchEmail }, // Email search uses normalized form
        ],
      },
    });
  }

  /**
   * Validate user exists and is active
   *
   * Finds user by ID and validates they exist and are activated.
   * Provides detailed error messages for different failure conditions.
   *
   * Preconditions: userId is non-empty string
   * Postconditions: Returns User object if valid, throws HttpException if invalid
   * Invariants: Only activated users are considered valid
   */
  async validateUserExistsAndActive(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw HttpException.notFound(ERROR_CODES.USER.NOT_FOUND, 'User not found');
    }

    if (!user.isActivated) {
      throw HttpException.forbidden(
        ERROR_CODES.USER.NOT_ACTIVATED,
        'User account is not activated',
      );
    }

    return user;
  }

  async validateUserExists(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw HttpException.notFound(ERROR_CODES.USER.NOT_FOUND, 'User not found');
    }

    return user;
  }

  /**
   * Check if user exists by email
   *
   * Simple existence check for email addresses.
   * Returns boolean without throwing exceptions.
   *
   * Preconditions: email is non-empty string
   * Postconditions: Returns boolean indicating existence
   * Invariants: Email normalized for consistent search
   */
  async userExistsByEmail(email: string): Promise<boolean> {
    const normalizedEmail = email.toLowerCase().trim();

    const user = await this.prisma.user.findFirst({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    return !!user;
  }

  /**
   * Check if user exists by username
   *
   * Simple existence check for usernames.
   * Returns boolean without throwing exceptions.
   *
   * Preconditions: username is non-empty string
   * Postconditions: Returns boolean indicating existence
   * Invariants: Username comparison is case-sensitive
   */
  async userExistsByUsername(username: string): Promise<boolean> {
    const user = await this.prisma.user.findFirst({
      where: { username },
      select: { id: true },
    });

    return !!user;
  }
}
