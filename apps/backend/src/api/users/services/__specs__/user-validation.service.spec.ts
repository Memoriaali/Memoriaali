/**
 * Unit Tests for UserValidationService
 *
 * Tests all user validation operations including:
 * - Username and email uniqueness validation
 * - User identifier search (username or email)
 * - User existence and activation validation
 * - Database transaction safety and error handling
 *
 * Each test verifies the contract: preconditions, postconditions, and invariants
 */

import { User, UserRole, AccountType } from '@memoriaali/database';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { HttpException } from '../../../../shared/errors';
import { UserValidationService } from '../user-validation.service';

describe('UserValidationService', () => {
  let userValidationService: UserValidationService;
  let mockPrisma: any;

  // Test user fixtures
  const testUsers = {
    activeUser: {
      id: 'user-123',
      username: 'testuser',
      hashedPassword: '$2b$12$test.hash.here',
      salt: 'test-salt-123',
      role: UserRole.USER,
      accountType: AccountType.PRIVATE,
      isActivated: true,
      verificationCode: 'verified-123',
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
    } as User,

    inactiveUser: {
      id: 'user-456',
      username: 'inactiveuser',
      hashedPassword: '$2b$12$test.hash.here',
      salt: 'test-salt-456',
      role: UserRole.USER,
      accountType: AccountType.PRIVATE,
      isActivated: false,
      verificationCode: 'activation-token-123',
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
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      createdById: null,
      updatedById: null,
    } as User,
  };

  beforeEach(() => {
    // Create fresh mock for each test
    mockPrisma = {
      user: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
    };

    userValidationService = new UserValidationService(mockPrisma);
  });

  describe('validateUsernameUnique', () => {
    /**
     * Scenario: validateUsernameUnique succeeds when username is available
     * Expected outcome: completes without throwing when username doesn't exist
     * Contract: postcondition (no exception thrown for unique username)
     */
    it('succeeds when username is available', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(userValidationService.validateUsernameUnique('newuser')).resolves.not.toThrow();

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { username: 'newuser' },
        select: { id: true },
      });
    });

    /**
     * Scenario: validateUsernameUnique throws when username already exists
     * Expected outcome: throws HttpException with 409 status for existing username
     * Contract: precondition (username must be unique)
     */
    it('throws HttpException when username already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing-user' });

      await expect(userValidationService.validateUsernameUnique('existinguser')).rejects.toThrow(
        new HttpException(409, 'USERNAME_ALREADY_EXISTS', 'Username is already taken'),
      );

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { username: 'existinguser' },
        select: { id: true },
      });
    });

    /**
     * Scenario: validateUsernameUnique excludes specified user ID for updates
     * Expected outcome: validation passes when existing user is the excluded one
     * Contract: postcondition (allows updates by excluding current user)
     */
    it('excludes specified user ID for update operations', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        userValidationService.validateUsernameUnique('testuser', 'user-123'),
      ).resolves.not.toThrow();

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          username: 'testuser',
          id: { not: 'user-123' },
        },
        select: { id: true },
      });
    });

    /**
     * Scenario: validateUsernameUnique handles database errors gracefully
     * Expected outcome: database errors are propagated for proper error handling
     * Contract: invariant (database errors propagated to caller)
     */
    it('propagates database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.user.findFirst.mockRejectedValue(dbError);

      await expect(userValidationService.validateUsernameUnique('testuser')).rejects.toThrow(
        dbError,
      );
    });

    /**
     * Scenario: validateUsernameUnique handles empty username input
     * Expected outcome: database query executes with empty string
     * Contract: precondition (accepts any string input including empty)
     */
    it('handles empty username input', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(userValidationService.validateUsernameUnique('')).resolves.not.toThrow();

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { username: '' },
        select: { id: true },
      });
    });
  });

  describe('validateEmailUnique', () => {
    /**
     * Scenario: validateEmailUnique succeeds when email is available
     * Expected outcome: completes without throwing when email doesn't exist
     * Contract: postcondition (no exception thrown for unique email)
     */
    it('succeeds when email is available', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        userValidationService.validateEmailUnique('new@example.com'),
      ).resolves.not.toThrow();

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'new@example.com' },
        select: { id: true },
      });
    });

    /**
     * Scenario: validateEmailUnique throws when email already exists
     * Expected outcome: throws HttpException with 409 status for existing email
     * Contract: precondition (email must be unique)
     */
    it('throws HttpException when email already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing-user' });

      await expect(
        userValidationService.validateEmailUnique('existing@example.com'),
      ).rejects.toThrow(
        new HttpException(409, 'EMAIL_ALREADY_EXISTS', 'Email address is already registered'),
      );
    });

    /**
     * Scenario: validateEmailUnique normalizes email to lowercase
     * Expected outcome: email is converted to lowercase for case-insensitive comparison
     * Contract: invariant (case-insensitive email handling)
     */
    it('normalizes email to lowercase for case-insensitive validation', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await userValidationService.validateEmailUnique('TEST@EXAMPLE.COM');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true },
      });
    });

    /**
     * Scenario: validateEmailUnique trims whitespace from email
     * Expected outcome: leading and trailing whitespace is removed
     * Contract: invariant (whitespace normalization)
     */
    it('trims whitespace from email input', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await userValidationService.validateEmailUnique('  test@example.com  ');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true },
      });
    });

    /**
     * Scenario: validateEmailUnique excludes specified user ID for updates
     * Expected outcome: validation passes when existing user is the excluded one
     * Contract: postcondition (allows updates by excluding current user)
     */
    it('excludes specified user ID for update operations', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await userValidationService.validateEmailUnique('test@example.com', 'user-123');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          id: { not: 'user-123' },
        },
        select: { id: true },
      });
    });
  });

  describe('validateUserIdentifiersUnique', () => {
    /**
     * Scenario: validateUserIdentifiersUnique validates both username and email
     * Expected outcome: both validations are performed in sequence
     * Contract: postcondition (both constraints validated atomically)
     */
    it('validates both username and email uniqueness', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(
        userValidationService.validateUserIdentifiersUnique('newuser', 'new@example.com'),
      ).resolves.not.toThrow();

      // Should call findFirst twice - once for username, once for email
      expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(2);
      expect(mockPrisma.user.findFirst).toHaveBeenNthCalledWith(1, {
        where: { username: 'newuser' },
        select: { id: true },
      });
      expect(mockPrisma.user.findFirst).toHaveBeenNthCalledWith(2, {
        where: { email: 'new@example.com' },
        select: { id: true },
      });
    });

    /**
     * Scenario: validateUserIdentifiersUnique fails fast on username conflict
     * Expected outcome: throws on username conflict without checking email
     * Contract: precondition (fail fast for performance)
     */
    it('fails fast when username already exists', async () => {
      mockPrisma.user.findFirst.mockResolvedValueOnce({ id: 'existing-user' });

      await expect(
        userValidationService.validateUserIdentifiersUnique('existinguser', 'new@example.com'),
      ).rejects.toThrow(
        new HttpException(409, 'USERNAME_ALREADY_EXISTS', 'Username is already taken'),
      );

      // Should only call findFirst once for username validation
      expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(1);
    });

    /**
     * Scenario: validateUserIdentifiersUnique fails on email conflict after username passes
     * Expected outcome: throws on email conflict after username validation succeeds
     * Contract: postcondition (both validations performed in sequence)
     */
    it('fails on email conflict after username validation passes', async () => {
      mockPrisma.user.findFirst
        .mockResolvedValueOnce(null) // username check passes
        .mockResolvedValueOnce({ id: 'existing-user' }); // email check fails

      await expect(
        userValidationService.validateUserIdentifiersUnique('newuser', 'existing@example.com'),
      ).rejects.toThrow(
        new HttpException(409, 'EMAIL_ALREADY_EXISTS', 'Email address is already registered'),
      );

      expect(mockPrisma.user.findFirst).toHaveBeenCalledTimes(2);
    });

    /**
     * Scenario: validateUserIdentifiersUnique excludes user ID for both validations
     * Expected outcome: both validations exclude the specified user ID
     * Contract: invariant (consistent exclusion across both validations)
     */
    it('excludes user ID for both username and email validations', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await userValidationService.validateUserIdentifiersUnique(
        'testuser',
        'test@example.com',
        'user-123',
      );

      expect(mockPrisma.user.findFirst).toHaveBeenNthCalledWith(1, {
        where: {
          username: 'testuser',
          id: { not: 'user-123' },
        },
        select: { id: true },
      });
      expect(mockPrisma.user.findFirst).toHaveBeenNthCalledWith(2, {
        where: {
          email: 'test@example.com',
          id: { not: 'user-123' },
        },
        select: { id: true },
      });
    });
  });

  describe('findUserByIdentifier', () => {
    /**
     * Scenario: findUserByIdentifier finds user by username
     * Expected outcome: returns user when username matches exactly
     * Contract: postcondition (case-sensitive username search)
     */
    it('finds user by username with case-sensitive search', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUsers.activeUser);

      const result = await userValidationService.findUserByIdentifier('testuser');

      expect(result).toEqual(testUsers.activeUser);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ username: 'testuser' }, { email: 'testuser' }],
        },
      });
    });

    /**
     * Scenario: findUserByIdentifier finds user by email
     * Expected outcome: returns user when email matches (case-insensitive)
     * Contract: invariant (case-insensitive email search)
     */
    it('finds user by email with case-insensitive search', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUsers.activeUser);

      const result = await userValidationService.findUserByIdentifier('TEST@EXAMPLE.COM');

      expect(result).toEqual(testUsers.activeUser);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ username: 'TEST@EXAMPLE.COM' }, { email: 'test@example.com' }],
        },
      });
    });

    /**
     * Scenario: findUserByIdentifier detects email format by @ symbol
     * Expected outcome: normalizes email when identifier contains @
     * Contract: invariant (automatic email detection and normalization)
     */
    it('automatically detects and normalizes email format', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUsers.activeUser);

      await userValidationService.findUserByIdentifier('user@example.com');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: 'user@example.com' },
            { email: 'user@example.com' }, // normalized to lowercase
          ],
        },
      });
    });

    /**
     * Scenario: findUserByIdentifier returns null when no user found
     * Expected outcome: returns null when no matching user exists
     * Contract: postcondition (null returned for non-existent users)
     */
    it('returns null when no user is found', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await userValidationService.findUserByIdentifier('nonexistent');

      expect(result).toBeNull();
    });

    /**
     * Scenario: findUserByIdentifier trims whitespace from identifier
     * Expected outcome: leading and trailing whitespace is removed
     * Contract: invariant (input normalization)
     */
    it('trims whitespace from identifier input', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testUsers.activeUser);

      await userValidationService.findUserByIdentifier('  testuser  ');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ username: 'testuser' }, { email: 'testuser' }],
        },
      });
    });

    /**
     * Scenario: findUserByIdentifier handles empty identifier input
     * Expected outcome: searches for empty string without throwing
     * Contract: precondition (accepts any string input)
     */
    it('handles empty identifier input gracefully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await userValidationService.findUserByIdentifier('');

      expect(result).toBeNull();
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ username: '' }, { email: '' }],
        },
      });
    });
  });

  describe('validateUserExistsAndActive', () => {
    /**
     * Scenario: validateUserExistsAndActive returns user when valid and active
     * Expected outcome: returns User object for existing activated user
     * Contract: postcondition (returns valid User for active users)
     */
    it('returns user when user exists and is activated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(testUsers.activeUser);

      const result = await userValidationService.validateUserExistsAndActive('user-123');

      expect(result).toEqual(testUsers.activeUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
      });
    });

    /**
     * Scenario: validateUserExistsAndActive throws when user not found
     * Expected outcome: throws HttpException with 404 status for non-existent user
     * Contract: precondition (user must exist)
     */
    it('throws HttpException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        userValidationService.validateUserExistsAndActive('nonexistent-id'),
      ).rejects.toThrow(new HttpException(404, 'USER_NOT_FOUND', 'User not found'));
    });

    /**
     * Scenario: validateUserExistsAndActive throws when user is not activated
     * Expected outcome: throws HttpException with 403 status for inactive user
     * Contract: precondition (user must be activated)
     */
    it('throws HttpException when user exists but is not activated', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(testUsers.inactiveUser);

      await expect(userValidationService.validateUserExistsAndActive('user-456')).rejects.toThrow(
        new HttpException(403, 'USER_NOT_ACTIVATED', 'User account is not activated'),
      );
    });

    /**
     * Scenario: validateUserExistsAndActive propagates database errors
     * Expected outcome: database errors are propagated for proper error handling
     * Contract: invariant (database errors propagated to caller)
     */
    it('propagates database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.user.findUnique.mockRejectedValue(dbError);

      await expect(userValidationService.validateUserExistsAndActive('user-123')).rejects.toThrow(
        dbError,
      );
    });
  });

  describe('userExistsByEmail', () => {
    /**
     * Scenario: userExistsByEmail returns true when user exists
     * Expected outcome: returns true for existing email address
     * Contract: postcondition (boolean indicating existence)
     */
    it('returns true when user exists with given email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-123' });

      const result = await userValidationService.userExistsByEmail('test@example.com');

      expect(result).toBe(true);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true },
      });
    });

    /**
     * Scenario: userExistsByEmail returns false when user does not exist
     * Expected outcome: returns false for non-existent email address
     * Contract: postcondition (false for non-existent users)
     */
    it('returns false when no user exists with given email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await userValidationService.userExistsByEmail('nonexistent@example.com');

      expect(result).toBe(false);
    });

    /**
     * Scenario: userExistsByEmail normalizes email to lowercase
     * Expected outcome: email is converted to lowercase for case-insensitive search
     * Contract: invariant (case-insensitive email handling)
     */
    it('normalizes email to lowercase for case-insensitive search', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await userValidationService.userExistsByEmail('TEST@EXAMPLE.COM');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true },
      });
    });

    /**
     * Scenario: userExistsByEmail trims whitespace from email
     * Expected outcome: leading and trailing whitespace is removed
     * Contract: invariant (whitespace normalization)
     */
    it('trims whitespace from email input', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await userValidationService.userExistsByEmail('  test@example.com  ');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
        select: { id: true },
      });
    });
  });

  describe('userExistsByUsername', () => {
    /**
     * Scenario: userExistsByUsername returns true when user exists
     * Expected outcome: returns true for existing username
     * Contract: postcondition (boolean indicating existence)
     */
    it('returns true when user exists with given username', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-123' });

      const result = await userValidationService.userExistsByUsername('testuser');

      expect(result).toBe(true);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { username: 'testuser' },
        select: { id: true },
      });
    });

    /**
     * Scenario: userExistsByUsername returns false when user does not exist
     * Expected outcome: returns false for non-existent username
     * Contract: postcondition (false for non-existent users)
     */
    it('returns false when no user exists with given username', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await userValidationService.userExistsByUsername('nonexistent');

      expect(result).toBe(false);
    });

    /**
     * Scenario: userExistsByUsername performs case-sensitive search
     * Expected outcome: username comparison is case-sensitive
     * Contract: invariant (case-sensitive username comparison)
     */
    it('performs case-sensitive username search', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await userValidationService.userExistsByUsername('TestUser');

      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { username: 'TestUser' }, // Exact case preserved
        select: { id: true },
      });
    });

    /**
     * Scenario: userExistsByUsername handles empty username input
     * Expected outcome: searches for empty string without throwing
     * Contract: precondition (accepts any string input)
     */
    it('handles empty username input gracefully', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const result = await userValidationService.userExistsByUsername('');

      expect(result).toBe(false);
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: { username: '' },
        select: { id: true },
      });
    });
  });
});
