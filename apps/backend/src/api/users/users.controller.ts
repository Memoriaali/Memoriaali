/**
 * Users Controller
 *
 * HTTP request/response layer for user management endpoints.
 * Simplified version that matches existing UsersService interface.
 *
 * Design by Contract:
 * - Preconditions: Valid HTTP requests with proper authentication
 * - Postconditions: Type-safe HTTP responses with security field filtering
 * - Invariants: No sensitive data exposure, consistent error handling
 */

import { PaginationResponse, UserListItem } from '@memoriaali/shared';
import { Request, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import {
  AccountActivationInputSchema,
  ChangePasswordInputSchema,
  CreateUserInputSchema,
  ListUsersQuerySchema,
  UpdateUserInputSchema,
  UserActivationInputSchema,
  selectUserResponseSchema,
  type AccountActivationInput,
  type ChangePasswordInput,
  type CreateUserInput,
  type ListUsersQuery,
  type UpdateUserInput,
} from './users.schemas';

import { ERROR_CODES, HttpException } from '../../shared/errors';
import { AuthenticatedRequest } from '../../shared/types/AuthenticatedRequest';

import { UsersService } from './users.service';

/**
 * Users Controller Class
 *
 * Orchestrates HTTP request handling for user management operations.
 */
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Create new user account
   */
  createUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // Authentication is now required - middleware ensures authenticatedUser exists
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }

    // Validation happens in middleware - ZodError should be caught there
    const userData: CreateUserInput = CreateUserInputSchema.parse(req.body);

    // Create user with authenticated user context
    const newUser = await this.usersService.createUser(userData, req.authenticatedUser);

    // Use the authenticated user's role-based schema for response filtering
    const responseSchema = selectUserResponseSchema(req.authenticatedUser.role, false);

    const response = responseSchema.parse(newUser);

    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: response,
      message: 'User account created successfully',
    });
  };

  /**
   * Get user by ID
   */
  getUserById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }

    const { id } = req.params;
    const viewer = req.authenticatedUser;

    if (!id) {
      throw HttpException.badRequest(
        ERROR_CODES.VALIDATION.MISSING_REQUIRED_FIELD,
        'User ID is required',
      );
    }

    const user = await this.usersService.getUserById(id);

    if (!user) {
      throw HttpException.notFound(ERROR_CODES.USER.NOT_FOUND, 'User not found');
    }

    // Authorization: Users can only see own profile unless they're admin/moderator
    const isOwner = viewer.id === id;
    if (!isOwner && !viewer.isModerator) {
      throw HttpException.forbidden(ERROR_CODES.AUTH.ACCESS_DENIED, 'Access denied');
    }

    const responseSchema = selectUserResponseSchema(viewer.role, isOwner);
    const response = responseSchema.parse(user);

    res.json({
      status: 'success',
      data: response,
    });
  };

  /**
   * Update user account
   */
  updateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }

    const { id } = req.params;
    const viewer = req.authenticatedUser;

    if (!id) {
      throw HttpException.badRequest(
        ERROR_CODES.VALIDATION.MISSING_REQUIRED_FIELD,
        'User ID is required',
      );
    }

    // Authorization: Users can update own profile, admins can update any
    const isOwner = viewer.id === id;
    if (!isOwner && !viewer.isAdmin) {
      throw HttpException.forbidden(ERROR_CODES.AUTH.ACCESS_DENIED, 'Access denied');
    }

    const updateData: UpdateUserInput = UpdateUserInputSchema.parse(req.body);

    // Business rule: Non-admins cannot change their role
    if (updateData.role && !viewer.isAdmin) {
      throw HttpException.forbidden(ERROR_CODES.AUTH.ACCESS_DENIED, 'You cannot change user roles');
    }

    const updatedUser = await this.usersService.updateUser(id, updateData, req.authenticatedUser);

    const responseSchema = selectUserResponseSchema(viewer.role, isOwner);
    const response = responseSchema.parse(updatedUser);

    res.json({
      status: 'success',
      data: response,
      message: 'User account updated successfully',
    });
  };

  /**
   * Delete user account
   */
  deleteUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }

    const { id } = req.params;
    const viewer = req.authenticatedUser;

    if (!id) {
      throw HttpException.badRequest(
        ERROR_CODES.VALIDATION.MISSING_REQUIRED_FIELD,
        'User ID is required',
      );
    }

    // Authorization check moved to middleware - this is backup validation
    if (!viewer.isAdmin) {
      throw HttpException.forbidden(ERROR_CODES.AUTH.ACCESS_DENIED, 'Admin privileges required');
    }

    // Business rule: Cannot delete own account
    if (viewer.id === id) {
      throw HttpException.badRequest(
        ERROR_CODES.BUSINESS.INVALID_OPERATION,
        'Cannot delete your own account',
      );
    }

    await this.usersService.deleteUser(id);

    res.json({
      status: 'success',
      message: 'User account deleted successfully',
    });
  };

  /**
   * Get current user's own profile
   */
  getOwnProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }

    const viewer = req.authenticatedUser;

    const user = await this.usersService.getUserById(viewer.id);

    if (!user) {
      throw HttpException.notFound(ERROR_CODES.USER.NOT_FOUND, 'User not found');
    }

    const responseSchema = selectUserResponseSchema(viewer.role, true);
    const response = responseSchema.parse(user);

    res.json({
      status: 'success',
      data: response,
    });
  };

  /**
   * Update current user's own profile
   */
  updateOwnProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }

    const viewer = req.authenticatedUser;

    const updateData: UpdateUserInput = UpdateUserInputSchema.parse(req.body);

    // Business rule: Users cannot change their own role
    if (updateData.role && updateData.role !== viewer.role) {
      throw HttpException.forbidden(
        ERROR_CODES.AUTH.ACCESS_DENIED,
        'You cannot change your own role',
      );
    }

    const updatedUser = await this.usersService.updateUser(
      viewer.id,
      updateData,
      req.authenticatedUser,
    );

    const responseSchema = selectUserResponseSchema(viewer.role, true);
    const response = responseSchema.parse(updatedUser);

    res.json({
      status: 'success',
      data: response,
      message: 'Profile updated successfully',
    });
  };

  /**
   * Change user password
   */
  changePassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }

    const { id } = req.params;
    const viewer = req.authenticatedUser;

    if (!id) {
      throw HttpException.badRequest(
        ERROR_CODES.VALIDATION.MISSING_REQUIRED_FIELD,
        'User ID is required',
      );
    }

    // Authorization: Users can only change their own password unless admin
    if (viewer.id !== id && !viewer.isAdmin) {
      throw HttpException.forbidden(
        ERROR_CODES.AUTH.ACCESS_DENIED,
        'You can only change your own password',
      );
    }

    const passwordData: ChangePasswordInput = ChangePasswordInputSchema.parse(req.body);

    await this.usersService.changeUserPassword(
      id,
      passwordData.currentPassword,
      passwordData.newPassword,
      req.authenticatedUser,
    );

    res.json({
      status: 'success',
      message: 'Password changed successfully',
    });
  };

  /**
   * List users with pagination and filtering
   */
  listUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }

    const viewer = req.authenticatedUser;

    // Authorization check moved to middleware - this is backup validation
    if (!viewer.isAdmin && !viewer.isModerator) {
      throw HttpException.forbidden(
        ERROR_CODES.AUTH.ACCESS_DENIED,
        'Insufficient permissions to list users',
      );
    }

    const queryParams: ListUsersQuery = ListUsersQuerySchema.parse(req.query);

    const result: PaginationResponse<UserListItem> = await this.usersService.listUsers(queryParams);

    // Apply security filtering to each user
    const responseSchema = selectUserResponseSchema(viewer.role, false);
    const secureUsers = result.data.map((user: UserListItem) => responseSchema.parse(user));

    // Return standardized pagination response
    res.json({
      status: 'success',
      data: secureUsers,
      pagination: result.pagination,
      links: result.links,
    });
  };

  /**
   * Activate user account
   *
   * Administrative action to activate a user account, bypassing verification code requirements.
   *
   * Preconditions: Admin privileges required, valid user ID, activation reason provided
   * Postconditions: User account activated, audit trail created
   * Invariants: Only admins can perform activation
   */
  activateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }

    // Authorization check moved to middleware - this is backup validation
    if (!req.authenticatedUser.isAdmin) {
      throw HttpException.forbidden(ERROR_CODES.AUTH.ACCESS_DENIED, 'Admin privileges required');
    }

    const userId = req.params.id;
    if (!userId) {
      throw HttpException.badRequest(
        ERROR_CODES.VALIDATION.MISSING_REQUIRED_FIELD,
        'User ID is required',
        {
          userId,
        },
      );
    }

    const validatedInput = UserActivationInputSchema.parse({
      ...(req.body as Record<string, unknown>),
      isActivated: true, // Force activation
    });

    const user = await this.usersService.adminActivateUser(
      userId,
      validatedInput,
      req.authenticatedUser.id,
    );

    res.json({
      status: 'success',
      message: 'User account activated successfully',
      data: {
        id: user.id,
        isActivated: user.isActivated,
      },
    });
  };

  /**
   * Deactivate user account
   *
   * Administrative action to deactivate a user account, preventing login and access.
   *
   * Preconditions: Admin privileges required, valid user ID, deactivation reason provided
   * Postconditions: User account deactivated, audit trail created
   * Invariants: Only admins can perform deactivation, user sessions invalidated
   */
  deactivateUser = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }

    // Authorization check moved to middleware - this is backup validation
    if (!req.authenticatedUser.isAdmin) {
      throw HttpException.forbidden(ERROR_CODES.AUTH.ACCESS_DENIED, 'Admin privileges required');
    }

    const userId = req.params.id;
    if (!userId) {
      throw HttpException.badRequest(
        ERROR_CODES.VALIDATION.MISSING_REQUIRED_FIELD,
        'User ID is required',
      );
    }

    // Prevent admins from deactivating themselves
    if (userId === req.authenticatedUser.id) {
      throw HttpException.badRequest(ERROR_CODES.USER.CANNOT_DEACTIVATE_SELF);
    }

    const validatedInput = UserActivationInputSchema.parse({
      ...(req.body as Record<string, unknown>),
      isActivated: false, // Force deactivation
    });

    const user = await this.usersService.adminDeactivateUser(
      userId,
      validatedInput,
      req.authenticatedUser.id,
    );

    res.json({
      status: 'success',
      message: 'User account deactivated successfully',
      data: {
        id: user.id,
        isActivated: user.isActivated,
      },
    });
  };

  /**
   * Activate account with verification code
   *
   * Public endpoint for users to activate their account using email and verification code.
   * This is the main user-facing activation endpoint.
   *
   * Preconditions: Valid email and verification code provided
   * Postconditions: User account activated if verification successful
   * Invariants: No authentication required, verification code validated
   */
  activateAccount = async (req: Request, res: Response): Promise<void> => {
    const validatedInput: AccountActivationInput = AccountActivationInputSchema.parse(req.body);

    const user = await this.usersService.activateAccountWithVerificationCode(
      validatedInput.email,
      validatedInput.verificationCode,
    );

    res.json({
      status: 'success',
      message: 'Account activated successfully',
      data: {
        id: user.id,
        email: user.email,
        isActivated: user.isActivated,
      },
    });
  };
}
