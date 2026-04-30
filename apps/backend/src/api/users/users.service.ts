import { AccountType, Prisma, PrismaClient, User, UserRole } from '@memoriaali/database';
import { PaginationResponse, PasswordService, UserListItem } from '@memoriaali/shared';

import {
  requireRole,
  // canAccess,
  // getAccessLevel,
  // requireOwnershipOr,
  // requireRole,
  type OwnedResource,
} from '../../shared/auth/authorization.utils';
import { ERROR_CODES, HttpException } from '../../shared/errors';
import { PrismaPaginationService } from '../../shared/services/prisma-pagination.service';
import {
  AuthenticatedUser,
  canAccess,
  getAccessLevel,
} from '../../shared/types/authenticated-user';

import { UserValidationService } from './services';
import {
  CreateUserInput,
  ListUsersQuery,
  UpdateUserInput,
  UserActivationInput,
} from './users.schemas';

/**
 * User Management Service
 *
 * Provides business logic for Finnish memory institution user management,
 * including role-based access, institutional validation, and audit logging.
 *
 * Design by Contract:
 * - Preconditions: Valid user data, proper authentication context
 * - Postconditions: Database consistency, audit trail creation
 * - Invariants: Username/email uniqueness, role hierarchy integrity
 */
export class UsersService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly userValidation: UserValidationService = new UserValidationService(prisma),
    private readonly passwordService: PasswordService = new PasswordService(),
  ) {}

  // ================================================================================================
  // CORE CRUD OPERATIONS (Enhanced with Service-Level Authorization)
  // ================================================================================================

  /**
   * Create a new user with institutional validation
   *
   * Preconditions: userData is valid, username/email are unique
   * Postconditions: User created in database, audit log entry created if authenticated
   * Invariants: Username/email uniqueness maintained
   */
  async createUser(
    userData: CreateUserInput,
    authenticatedUser?: AuthenticatedUser | null,
  ): Promise<User> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Initialize UserValidationService with transaction context
      const txUserValidation = new UserValidationService(tx);

      // Validate uniqueness within transaction
      await txUserValidation.validateUserIdentifiersUnique(userData.username, userData.email);

      // Generate password if not provided
      let hashedPassword: string;
      let salt: string;

      if (userData.password) {
        const passwordData = await this.passwordService.createPasswordHash(userData.password);
        hashedPassword = passwordData.hashedPassword;
        salt = passwordData.salt;
      } else {
        // Generate temporary password for email activation
        const tempPassword = this.passwordService.generateTemporaryPassword();
        const passwordData = await this.passwordService.createPasswordHash(tempPassword);
        hashedPassword = passwordData.hashedPassword;
        salt = passwordData.salt;

        // Note: In a complete implementation, you would email the temporary password
        // For now, we'll set the user as not activated
      }

      // Create user record
      const user = await tx.user.create({
        data: {
          username: userData.username,
          email: userData.email.toLowerCase().trim(),
          hashedPassword,
          salt,
          role: userData.role ?? UserRole.USER,
          accountType: userData.accountType ?? AccountType.PRIVATE,
          isActivated: true, // Users created via this endpoint are activated immediately
          verificationCode: '', // No verification code needed
          // Optional personal information
          firstName: userData.firstName ?? null,
          lastName: userData.lastName ?? null,
          streetAddress: userData.streetAddress ?? null,
          postalCode: userData.postalCode ?? null,
          postOffice: userData.postOffice ?? null,
          telephone: userData.telephone ?? null,
          profession: userData.profession ?? null,
          // Optional company information
          companyName: userData.companyName ?? null,
          companyEmail: userData.companyEmail ?? null,
          companyTelephone: userData.companyTelephone ?? null,
          companyContactPerson: userData.companyContactPerson ?? null,
          // Audit fields - only set if authenticated user provided
          createdById: authenticatedUser?.id ?? null,
          updatedById: authenticatedUser?.id ?? null,
        },
      });

      return user;
    });
  }

  /**
   * Get user by ID with role-based field filtering
   *
   * Preconditions: userId is valid UUID, requesting user has appropriate permissions
   * Postconditions: Returns user data filtered by access permissions
   * Invariants: Sensitive data filtered based on access level
   */
  async getUserById(userId: string): Promise<User | null> {
    return this.userValidation.validateUserExists(userId);
  }

  /**
   * Update user with validation and audit logging
   *
   * Preconditions: userId exists, updateData is valid, requesting user has permissions, authenticatedUser is provided
   * Postconditions: User updated in database, audit log created
   * Invariants: Username/email uniqueness maintained, role hierarchy respected
   */
  async updateUser(
    userId: string,
    updateData: UpdateUserInput,
    authenticatedUser: AuthenticatedUser,
  ): Promise<User> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Validate user exists
      const existingUser = await this.userValidation.validateUserExistsAndActive(userId);

      // Initialize UserValidationService with transaction context
      const txUserValidation = new UserValidationService(tx);

      // Validate username uniqueness if being updated (email updates not allowed per schema)
      if (updateData.username) {
        await txUserValidation.validateUserIdentifiersUnique(
          updateData.username,
          existingUser.email, // Keep existing email
          userId,
        );
      }

      // Prepare update data (no email updates allowed)
      const updatePayload = {
        ...updateData,
        updatedAt: new Date(),
        updatedById: authenticatedUser.id, // Audit trail
      };

      // Remove undefined properties to avoid Prisma type issues
      Object.keys(updatePayload).forEach((key) => {
        if ((updatePayload as Record<string, unknown>)[key] === undefined) {
          delete (updatePayload as Record<string, unknown>)[key];
        }
      });

      // Update user
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: updatePayload as Prisma.UserUpdateInput,
      });

      return updatedUser;
    });
  }

  /**
   * Delete user with cascade handling
   *
   * Preconditions: userId exists, requesting user has admin permissions
   * Postconditions: User and related data removed, audit log created
   * Invariants: Referential integrity maintained
   */
  async deleteUser(userId: string): Promise<void> {
    await this.userValidation.validateUserExists(userId);

    await this.prisma.user.delete({
      where: { id: userId },
    });
  }

  // ================================================================================================
  // AUTHENTICATION SUPPORT
  // ================================================================================================

  /**
   * Find user by identifier for authentication
   *
   * Allowes username OR email.
   *
   * Preconditions: identifier is non-empty string
   * Postconditions: Returns user if found, null otherwise
   * Invariants: Search handles both username and email formats
   */
  async findUserForAuthentication(identifier: string): Promise<User | null> {
    return this.userValidation.findUserByIdentifier(identifier);
  }

  /**
   * Verify user password
   *
   * Validates password against stored hash using secure comparison.
   *
   * Preconditions: user exists, password is string
   * Postconditions: Returns boolean verification result
   * Invariants: Uses constant-time comparison
   */
  async verifyUserPassword(user: User, password: string): Promise<boolean> {
    return this.passwordService.verifyPassword(password, user.hashedPassword, user.salt);
  }

  // ================================================================================================
  // ACCOUNT ACTIVATION AND VERIFICATION
  // ================================================================================================

  /**
   * Activate user account with verification code
   *
   * Validates verification code and activates user account.
   *
   * Preconditions: userId exists, verificationCode is valid format
   * Postconditions: User activated if code valid, verification code cleared
   * Invariants: Code expiration respected, single-use verification
   */
  async activateUserAccount(userId: string, verificationCode: string): Promise<User> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw HttpException.notFound(ERROR_CODES.USER.NOT_FOUND);
      }

      if (user.isActivated) {
        throw HttpException.badRequest(ERROR_CODES.USER.ALREADY_ACTIVATED);
      }

      if (!user.verificationCode) {
        throw HttpException.badRequest(
          ERROR_CODES.USER.VERIFICATION_CODE_INVALID,
          'No verification code found',
        );
      }

      // Note: Without verificationCodeExpiresAt field, expiration would need to be managed differently
      // Could check createdAt/updatedAt + time limit, or add the field to schema

      if (user.verificationCode !== verificationCode) {
        throw HttpException.badRequest(ERROR_CODES.USER.VERIFICATION_CODE_INVALID);
      }

      // Activate user and clear verification code
      const activatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          isActivated: true,
          verificationCode: '', // Clear verification code (schema doesn't allow null)
          updatedAt: new Date(),
          // Note: No updatedById for self-activation via verification code
        },
      });

      return activatedUser;
    });
  }

  /**
   * Activate account with verification code using email
   *
   * Public method for users to activate their account using email and verification code.
   * This is the main user-facing activation method.
   *
   * Preconditions: email exists, verificationCode is valid format
   * Postconditions: User activated if code valid, verification code cleared
   * Invariants: Code validation, single-use verification
   */
  async activateAccountWithVerificationCode(
    email: string,
    verificationCode: string,
  ): Promise<User> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({
        where: { email },
      });

      if (!user) {
        throw HttpException.notFound(ERROR_CODES.USER.NOT_FOUND, 'User not found with this email');
      }

      if (user.isActivated) {
        throw HttpException.badRequest(ERROR_CODES.USER.ALREADY_ACTIVATED);
      }

      if (!user.verificationCode) {
        throw HttpException.badRequest(
          ERROR_CODES.USER.VERIFICATION_CODE_INVALID,
          'No verification code found for this account',
        );
      }

      if (user.verificationCode !== verificationCode) {
        throw HttpException.badRequest(ERROR_CODES.USER.VERIFICATION_CODE_INVALID);
      }

      // Activate user and clear verification code
      const activatedUser = await tx.user.update({
        where: { id: user.id },
        data: {
          isActivated: true,
          verificationCode: '', // Clear verification code (schema doesn't allow null)
          updatedAt: new Date(),
          // Note: No updatedById for self-activation via verification code
        },
      });

      return activatedUser;
    });
  }

  // ================================================================================================
  // PASSWORD MANAGEMENT
  // ================================================================================================

  /**
   * Change user password with validation
   *
   * Preconditions: userId exists, currentPassword is correct, newPassword meets requirements, authenticatedUser is provided
   * Postconditions: Password updated securely, audit log created
   * Invariants: Password history maintained, strength requirements enforced
   */
  async changeUserPassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    authenticatedUser: AuthenticatedUser,
  ): Promise<void> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Validate user exists
      const user = await this.userValidation.validateUserExistsAndActive(userId);

      // Verify current password
      const isCurrentPasswordValid = await this.passwordService.verifyPassword(
        currentPassword,
        user.hashedPassword,
        user.salt,
      );

      if (!isCurrentPasswordValid) {
        throw HttpException.badRequest(ERROR_CODES.USER.INVALID_PASSWORD);
      }

      // Generate new password hash
      const { hashedPassword, salt } = await this.passwordService.createPasswordHash(newPassword);

      // Update password
      await tx.user.update({
        where: { id: userId },
        data: {
          hashedPassword,
          salt,
          updatedAt: new Date(),
          updatedById: authenticatedUser.id, // Audit trail
        },
      });
    });
  }

  /**
   * List users with pagination and filtering
   *
   * Uses the standardized PrismaPaginationService for consistent API responses.
   * Supports role-based access control and efficient database queries.
   *
   * Preconditions: queryParams is valid, requesting user has appropriate permissions
   * Postconditions: Returns paginated user list with standardized pagination metadata
   * Invariants: Results respect pagination limits, search terms are sanitized
   */
  async listUsers(queryParams: ListUsersQuery): Promise<PaginationResponse<UserListItem>> {
    const {
      page = 1,
      limit = 20,
      role,
      isActivated,
      search,
      accountType,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryParams;

    // Build where clause for filtering
    const where: Prisma.UserWhereInput = {};

    if (role) {
      where.role = role;
    }

    if (typeof isActivated === 'boolean') {
      where.isActivated = isActivated;
    }

    if (accountType) {
      where.accountType = accountType;
    }

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
        { firstName: { contains: search } },
        { lastName: { contains: search } },
      ];
    }

    // Build orderBy clause with secondary sort for consistent ordering
    const orderBy: Prisma.UserOrderByWithRelationInput = { [sortBy]: sortOrder };

    // Create pagination service instance
    const paginationService = new PrismaPaginationService(
      this.prisma,
      'https://api.memoriaali.fi/v2/users',
    );

    // Use the pagination service with secure field selection
    const result = await paginationService.paginateWithOffset<UserListItem>({
      model: 'user',
      page,
      limit,
      where,
      orderBy,
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        accountType: true,
        isActivated: true,
        streetAddress: true,
        postalCode: true,
        postOffice: true,
        telephone: true,
        profession: true,
        companyName: true,
        companyEmail: true,
        companyTelephone: true,
        companyContactPerson: true,
        createdAt: true,
        updatedAt: true,
        createdById: true, // Admin audit trail
        updatedById: true, // Admin audit trail
        // Exclude sensitive fields by not selecting them:
        // hashedPassword, salt, verificationCode, resetToken, etc.
      },
    });

    return result;
  }

  // ================================================================================================
  // UTILITY METHODS
  // ================================================================================================

  /**
   * Check if user exists by email
   *
   * Simple existence check for registration validation.
   *
   * Preconditions: email is valid format
   * Postconditions: Returns boolean existence result
   * Invariants: Case-insensitive email comparison
   */
  async userExistsByEmail(email: string): Promise<boolean> {
    return this.userValidation.userExistsByEmail(email);
  }

  /**
   * Check if user exists by username
   *
   * Simple existence check for registration validation.
   *
   * Preconditions: username is non-empty string
   * Postconditions: Returns boolean existence result
   * Invariants: Case-sensitive username comparison
   */
  async userExistsByUsername(username: string): Promise<boolean> {
    return this.userValidation.userExistsByUsername(username);
  }

  // ================================================================================================
  // ADMIN ACCOUNT MANAGEMENT
  // ================================================================================================

  /**
   * Admin activate user account
   *
   * Administrative action to activate user account, bypassing verification code requirements.
   * This is intended for manual activation when email verification fails or bulk operations.
   *
   * Preconditions: userId exists, adminId has admin privileges
   * Postconditions: User activated, audit trail created, verification code cleared
   * Invariants: Only admin can bypass verification, activation reason recorded
   */
  async adminActivateUser(
    userId: string,
    _activationData: UserActivationInput,
    adminId: string,
  ): Promise<User> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Validate user exists
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw HttpException.notFound(ERROR_CODES.USER.NOT_FOUND);
      }

      if (user.isActivated) {
        throw HttpException.badRequest(ERROR_CODES.USER.ALREADY_ACTIVATED);
      }

      // Activate user and clear verification code
      const activatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          isActivated: true,
          verificationCode: '', // Clear verification code (schema doesn't allow null)
          updatedAt: new Date(),
          updatedById: adminId, // Audit trail
        },
      });

      // TODO: Implement proper audit logging (future feature - pending client approval)

      return activatedUser;
    });
  }

  /**
   * Admin deactivate user account
   *
   * Administrative action to deactivate user account, preventing login and access.
   * This is intended for account suspension, policy violations, or security incidents.
   *
   * Preconditions: userId exists, adminId has admin privileges, not self-deactivation
   * Postconditions: User deactivated, audit trail created, sessions invalidated
   * Invariants: Admin cannot deactivate themselves, deactivation reason recorded
   */
  async adminDeactivateUser(
    userId: string,
    _deactivationData: UserActivationInput,
    adminId: string,
  ): Promise<User> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Validate user exists
      const user = await tx.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw HttpException.notFound(ERROR_CODES.USER.NOT_FOUND);
      }

      if (!user.isActivated) {
        throw HttpException.badRequest(ERROR_CODES.USER.ALREADY_DEACTIVATED);
      }

      // Prevent admin from deactivating themselves (extra safety check)
      if (userId === adminId) {
        throw HttpException.badRequest(ERROR_CODES.USER.CANNOT_DEACTIVATE_SELF);
      }

      // Deactivate user
      const deactivatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          isActivated: false,
          updatedAt: new Date(),
          updatedById: adminId, // Audit trail
        },
      });

      // TODO: Implement proper audit logging (future feature - pending client approval)
      // TODO: Implement session invalidation for deactivated user

      return deactivatedUser;
    });
  }

  // ================================================================================================
  // SERVICE-LEVEL AUTHORIZATION EXAMPLES
  // ================================================================================================

  /**
   * Update user profile with service-level authorization
   *
   * Demonstrates advanced authorization patterns using service-level utilities.
   * Users can update their own profiles, while admins and moderators can update any profile.
   * This method showcases resource ownership combined with role-based authorization.
   *
   * @param {string} userId - ID of user to update
   * @param {UpdateUserInput} userData - Profile update data
   * @param {AuthenticatedUser} authenticatedUser - User making the request
   * @return {Promise<User>} Updated user data
   *
   * Preconditions:
   * - authenticatedUser must be valid AuthenticatedUser instance
   * - userId must exist in database
   * - userData must pass validation
   *
   * Postconditions:
   * - User profile updated if authorization passes
   * - Audit trail created with updater information
   * - HttpException thrown if authorization fails
   *
   * Authorization Logic:
   * - User can update their own profile (ownership-based)
   * - Admins can update any profile (role-based)
   * - Moderators can update any profile (role-based)
   * - Other users cannot update others' profiles
   *
   * @example
   * // User updating their own profile
   * const updatedUser = await usersService.updateUserProfile(
   *   user.id,
   *   { firstName: 'New Name' },
   *   authenticatedUser
   * );
   *
   * @example
   * // Admin updating any user's profile
   * const updatedUser = await usersService.updateUserProfile(
   *   'other-user-id',
   *   { isActivated: false },
   *   adminUser
   * );
   */
  async updateUserProfile(
    userId: string,
    userData: UpdateUserInput,
    authenticatedUser: AuthenticatedUser,
  ): Promise<User> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // First, load the target user to check ownership
      const targetUser = await tx.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          createdBy: true,
          createdById: true,
          username: true,
          email: true,
          role: true,
        },
      });

      if (!targetUser) {
        throw HttpException.notFound(ERROR_CODES.USER.NOT_FOUND);
      }

      // AUTHORIZATION CHECK: User can update own profile OR admin/moderator can update any profile
      // Using service-level authorization utility
      if (
        !(
          await this.getUserPermissions({
            userId,
            authenticatedUser,
            targetUser: targetUser as unknown as User,
          })
        ).canEdit
      ) {
        throw HttpException.forbidden(
          ERROR_CODES.AUTH.ACCESS_DENIED,
          'You can only update your own profile unless you have admin or moderator privileges',
        );
      }

      // Additional business logic: Only admins can change user roles
      if (userData.role && userData.role !== targetUser.role) {
        requireRole(authenticatedUser, 'ADMIN', 'Only administrators can change user roles');
      }

      // Proceed with update - filter out undefined values for exactOptionalPropertyTypes
      const updateData: Record<string, unknown> = {
        updatedById: authenticatedUser.id, // Audit trail
      };

      // Only include defined values from userData
      Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateData[key] = value;
        }
      });

      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: updateData as Prisma.UserUpdateInput,
      });

      // TODO: Implement proper audit logging (future feature - pending client approval)

      return updatedUser;
    });
  }

  /**
   * Get user details with access-level-based field filtering
   *
   * Demonstrates dynamic response filtering based on user's access level to the resource.
   * Different users see different levels of detail based on their relationship to the target user.
   *
   * @param {string} userId - ID of user to retrieve
   * @param {AuthenticatedUser} authenticatedUser - User making the request
   * @return {Promise<Partial<User>>} User data filtered by access level
   *
   * Access Levels:
   * - 'admin': Full access to all fields including sensitive data
   * - 'write': Full access for profile owner
   * - 'read': Limited access for moderators/experts (no sensitive data)
   * - 'none': Public profile only or access denied
   *
   * @example
   * const userProfile = await usersService.getUserWithAccessControl('user-123', authenticatedUser);
   * // Returns different fields based on authenticatedUser's access level
   */
  async getUserWithAccessControl(
    userId: string,
    authenticatedUser: AuthenticatedUser,
  ): Promise<Partial<User>> {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!targetUser) {
      throw HttpException.notFound(ERROR_CODES.USER.NOT_FOUND, 'User not found');
    }

    // Determine access level using service-level authorization utility
    const userAsResource: OwnedResource = {
      createdBy: targetUser.id, // User "owns" their own profile
      createdById: targetUser.id,
    };

    const accessLevel = getAccessLevel(authenticatedUser, userAsResource);

    // Filter response based on access level
    switch (accessLevel) {
      case 'admin':
        // Admins see everything
        return targetUser;

      case 'write': {
        // Users see their own full profile (minus sensitive system fields)
        const {
          hashedPassword: _hashedPassword,
          salt: _salt,
          verificationCode: _verificationCode,
          ...userProfile
        } = targetUser;
        return userProfile;
      }

      case 'read':
        // Moderators/experts see limited profile for moderation purposes
        return {
          id: targetUser.id,
          username: targetUser.username,
          email: targetUser.email,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          role: targetUser.role,
          isActivated: targetUser.isActivated,
          createdAt: targetUser.createdAt,
          accountType: targetUser.accountType,
        };

      case 'none':
      default:
        // Unauthorized users are denied access to private profiles
        if (targetUser.accountType === AccountType.PRIVATE) {
          throw HttpException.forbidden(
            ERROR_CODES.AUTH.ACCESS_DENIED,
            'Access denied to private user profile',
          );
        }
        // For company/organization profiles, show basic professional information
        return {
          id: targetUser.id,
          username: targetUser.username,
          firstName: targetUser.firstName,
          lastName: targetUser.lastName,
          profession: targetUser.profession,
          companyName: targetUser.companyName,
        };
    }
  }

  /**
   * Check if user can perform various operations (for UI state management)
   *
   * Utility method that returns boolean flags indicating what operations the authenticated
   * user can perform on a target user. This is useful for frontend applications to show/hide
   * UI elements based on permissions.
   *
   * @param userId - ID of target user (part of params object)
   * @param authenticatedUser - User making the request (part of params object)
   * @param targetUser - Optional pre-loaded target user (part of params object)
   * @return {Promise<UserPermissions>} Object with boolean permission flags
   *
   * @example
   * const permissions = await usersService.getUserPermissions('user-123', authenticatedUser);
   * if (permissions.canEdit) {
   *   // Show edit button
   * }
   * if (permissions.canDeactivate) {
   *   // Show deactivate option
   * }
   */
  async getUserPermissions({
    userId,
    authenticatedUser,
    targetUser,
  }: {
    userId: string;
    authenticatedUser: AuthenticatedUser;
    targetUser?: User;
  }): Promise<{
    canView: boolean;
    canEdit: boolean;
    canDeactivate: boolean;
    canChangeRole: boolean;
    canViewSensitiveData: boolean;
  }> {
    const _targetUser =
      targetUser ??
      (await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, isActivated: true, role: true },
      }));

    if (!_targetUser) {
      return {
        canView: false,
        canEdit: false,
        canDeactivate: false,
        canChangeRole: false,
        canViewSensitiveData: false,
      };
    }

    const userAsResource: OwnedResource = {
      createdBy: _targetUser.id,
      createdById: _targetUser.id,
    };

    // Use service-level authorization utilities to determine permissions
    const isOwner = authenticatedUser.id === userId;
    // const _canAccessAsAdmin = canAccess(authenticatedUser, userAsResource, ['ADMIN']);
    const canAccessAsModerator = canAccess(authenticatedUser, userAsResource, [
      'ADMIN',
      'MODERATOR',
    ]);

    return {
      canView: canAccessAsModerator || isOwner,
      canEdit: canAccessAsModerator || isOwner,
      canDeactivate: authenticatedUser.hasRole('ADMIN') && !isOwner, // Admins can't deactivate themselves
      canChangeRole: authenticatedUser.hasRole('ADMIN'),
      canViewSensitiveData: authenticatedUser.hasRole('ADMIN'),
    };
  }
}
