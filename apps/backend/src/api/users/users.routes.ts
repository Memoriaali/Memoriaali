import { RequestHandler, Router } from 'express';

import {
  adminOperationLimiter,
  authenticateUser,
  criticalOperationLimiter,
  passwordChangeLimiter,
  requirePermission,
  userCreationLimiter,
} from '../../middleware';
import { prisma } from '../../shared/database/prisma';
import { EndpointServiceCall } from '../../shared/types/api.type';
import { asyncHandler } from '../../shared/utils/response.utils';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

/**
 * User admin routes with role-based permission control
 *
 * Provides comprehensive user management endpoints with proper permission handling.
 * Only authenticated users with appropriate permissions can access these routes.
 *
 * Security Features:
 * - Authentication required for all routes
 * - Permission-based access control
 * - Request validation
 * - Comprehensive error handling
 */

/**
 * Create and configure user routes
 *
 * @returns Configured router with user endpoints
 */
export const createUserRoutes = (): Router => {
  const router = Router();

  // Initialize services
  const usersService = new UsersService(prisma);
  const usersController = new UsersController(usersService);

  // Apply authentication middleware to all routes
  router.use(authenticateUser as RequestHandler);

  /**
   * @openapi
   * /api/v2/users:
   *   post:
   *     summary: Create new user account
   *     operationId: createUser
   *     x-permissions:
   *       - users:create
   *     description: |
   *       Creates a new user account with comprehensive validation.
   *       Only authenticated users with appropriate permissions can access this endpoint.
   *
   *       **Required Permission**: `users:create`
   *
   *       The endpoint validates:
   *       - Email uniqueness
   *       - Username availability
   *       - Password strength requirements
   *       - Required contact information
   *       - Cultural sensitivity markers
   *
   *       Note: Users created via this endpoint are activated immediately
   *       and no email verification is required.
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Users
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *               - username
   *               - firstName
   *               - lastName
   *               - role
   *               - accountType
   *               - streetAddress
   *               - postalCode
   *               - postOffice
   *               - telephone
   *               - profession
   *               - companyName
   *               - companyEmail
   *               - companyTelephone
   *               - companyContactPerson
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: User's email address (must be unique)
   *               password:
   *                 type: string
   *                 minLength: 8
   *                 description: User's password (must meet strength requirements)
   *               username:
   *                 type: string
   *                 description: Unique username for the user
   *               firstName:
   *                 type: string
   *                 description: User's first name
   *               lastName:
   *                 type: string
   *                 description: User's last name
   *               role:
   *                 type: string
   *                 enum: [USER, MODERATOR, ADMIN, EXPERT]
   *                 description: User's role in the system
   *               accountType:
   *                 type: string
   *                 enum: [PRIVATE, COMPANY]
   *                 description: Type of account (private individual or company)
   *               streetAddress:
   *                 type: string
   *                 description: Street address
   *               postalCode:
   *                 type: string
   *                 description: Postal code
   *               postOffice:
   *                 type: string
   *                 description: Post office / city
   *               telephone:
   *                 type: string
   *                 description: Phone number
   *               profession:
   *                 type: string
   *                 description: User's profession
   *               companyName:
   *                 type: string
   *                 description: Company name
   *               companyEmail:
   *                 type: string
   *                 format: email
   *                 description: Company email address
   *               companyTelephone:
   *                 type: string
   *                 description: Company phone number
   *               companyContactPerson:
   *                 type: string
   *                 description: Company contact person
   *     responses:
   *       201:
   *         description: User created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *                 message:
   *                   type: string
   *                   example: User account created successfully
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       409:
   *         description: Username or email already exists
   */
  router.post(
    '/',
    requirePermission('users:create'),
    userCreationLimiter, // Rate limit user creation
    asyncHandler(usersController.createUser.bind(usersController)),
  );

  /**
   * @openapi
   * /api/v2/users:
   *   get:
   *     summary: List users with pagination and filtering
   *     operationId: listUsers
   *     x-permissions:
   *       - users:read
   *     description: |
   *       Retrieves a paginated list of users with optional filtering capabilities.
   *       Only administrators and moderators can access this endpoint.
   *
   *       **Required Permission**: Admin or Moderator role
   *
   *       Filtering capabilities:
   *       - Search by name, email, or username
   *       - Filter by role, account type, and activation status
   *       - Pagination with configurable limits
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Users
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number for pagination
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: Number of users per page
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *           minLength: 1
   *         description: Search term for name, email, or username
   *       - in: query
   *         name: role
   *         schema:
   *           type: string
   *           enum: [USER, MODERATOR, ADMIN, EXPERT]
   *         description: Filter by user role
   *       - in: query
   *         name: accountType
   *         schema:
   *           type: string
   *           enum: [PRIVATE, COMPANY]
   *         description: Filter by account type
   *       - in: query
   *         name: isActivated
   *         schema:
   *           type: boolean
   *         description: Filter by activation status
   *     responses:
   *       200:
   *         description: Users retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/User'
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     currentPage:
   *                       type: integer
   *                       example: 1
   *                     limit:
   *                       type: integer
   *                       example: 10
   *                     totalCount:
   *                       type: integer
   *                       example: 150
   *                     totalPages:
   *                       type: integer
   *                       example: 15
   *                     hasNextPage:
   *                       type: boolean
   *                       example: true
   *                     hasPreviousPage:
   *                       type: boolean
   *                       example: false
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   */
  router.get(
    '/',
    requirePermission('users:read'),
    asyncHandler(usersController.listUsers.bind(usersController) as EndpointServiceCall),
  );

  /**
   * @openapi
   * /api/v2/users/me:
   *   get:
   *     summary: Get current user's profile
   *     operationId: getOwnProfile
   *     x-permissions: []
   *     description: Retrieves the authenticated user's own profile information
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Users
   *     responses:
   *       200:
   *         description: Profile retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   */
  router.get('/me', asyncHandler(usersController.getOwnProfile.bind(usersController)));

  /**
   * @openapi
   * /api/v2/users/{id}:
   *   get:
   *     summary: Get user by ID
   *     operationId: getUserById
   *     x-permissions:
   *       - users:read
   *     description: |
   *       Retrieves a user by their unique identifier.
   *       Users can only access their own profile unless they have admin/moderator permissions.
   *
   *       **Required Permission**: `users:read` (for own profile) or `users:read:others` (for other profiles)
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Users
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: User's unique identifier
   *     responses:
   *       200:
   *         description: User retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.get('/:id', asyncHandler(usersController.getUserById.bind(usersController)));

  /**
   * @openapi
   * /api/v2/users/me:
   *   put:
   *     summary: Update current user's profile
   *     operationId: updateOwnProfile
   *     x-permissions: []
   *     description: Updates the authenticated user's own profile information
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Users
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               firstName:
   *                 type: string
   *                 description: User's first name
   *               lastName:
   *                 type: string
   *                 description: User's last name
   *               accountType:
   *                 type: string
   *                 enum: [PRIVATE, COMPANY]
   *                 description: Account type
   *               streetAddress:
   *                 type: string
   *                 description: Street address
   *               postalCode:
   *                 type: string
   *                 description: Postal code
   *               postOffice:
   *                 type: string
   *                 description: Post office / city
   *               telephone:
   *                 type: string
   *                 description: Phone number
   *               profession:
   *                 type: string
   *                 description: User's profession
   *               companyName:
   *                 type: string
   *                 description: Company name
   *               companyEmail:
   *                 type: string
   *                 format: email
   *                 description: Company email address
   *               companyTelephone:
   *                 type: string
   *                 description: Company phone number
   *               companyContactPerson:
   *                 type: string
   *                 description: Company contact person
   *     responses:
   *       200:
   *         description: Profile updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *                 message:
   *                   type: string
   *                   example: Profile updated successfully
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   */
  router.put(
    '/me',
    asyncHandler(usersController.updateOwnProfile.bind(usersController) as EndpointServiceCall),
  );

  /**
   * @openapi
   * /api/v2/users/{id}:
   *   put:
   *     summary: Update user account
   *     operationId: updateUser
   *     x-permissions:
   *       - users:update
   *     description: |
   *       Updates a user account. Users can update their own profile,
   *       administrators can update any user account.
   *
   *       **Required Permission**: Own profile or `users:update`
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Users
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: User's unique identifier
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               firstName:
   *                 type: string
   *                 description: User's first name
   *               lastName:
   *                 type: string
   *                 description: User's last name
   *               role:
   *                 type: string
   *                 enum: [USER, MODERATOR, ADMIN, EXPERT]
   *                 description: User's role (admin only)
   *               accountType:
   *                 type: string
   *                 enum: [PRIVATE, COMPANY]
   *                 description: Account type
   *               streetAddress:
   *                 type: string
   *                 description: Street address
   *               postalCode:
   *                 type: string
   *                 description: Postal code
   *               postOffice:
   *                 type: string
   *                 description: Post office / city
   *               telephone:
   *                 type: string
   *                 description: Phone number
   *               profession:
   *                 type: string
   *                 description: User's profession
   *               companyName:
   *                 type: string
   *                 description: Company name
   *               companyEmail:
   *                 type: string
   *                 format: email
   *                 description: Company email address
   *               companyTelephone:
   *                 type: string
   *                 description: Company phone number
   *               companyContactPerson:
   *                 type: string
   *                 description: Company contact person
   *     responses:
   *       200:
   *         description: User updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/User'
   *                 message:
   *                   type: string
   *                   example: User account updated successfully
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.put(
    '/:id',
    adminOperationLimiter, // Rate limit admin operations
    asyncHandler(usersController.updateUser.bind(usersController) as EndpointServiceCall),
  );

  /**
   * @openapi
   * /api/v2/users/{id}/password:
   *   put:
   *     summary: Change user password
   *     operationId: changeUserPassword
   *     x-permissions:
   *       - users:update
   *     description: |
   *       Changes a user's password. Users can change their own password,
   *       administrators can change any user's password.
   *
   *       **Required Permission**: Own account or `users:update`
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Users
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: User's unique identifier
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - currentPassword
   *               - newPassword
   *             properties:
   *               currentPassword:
   *                 type: string
   *                 description: Current password for verification
   *               newPassword:
   *                 type: string
   *                 minLength: 8
   *                 description: New password (must meet strength requirements)
   *     responses:
   *       200:
   *         description: Password changed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 message:
   *                   type: string
   *                   example: Password changed successfully
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.put(
    '/:id/password',
    passwordChangeLimiter, // Rate limit password changes
    asyncHandler(usersController.changePassword.bind(usersController)),
  );

  /**
   * @openapi
   * /api/v2/users/{id}:
   *   delete:
   *     summary: Delete user account
   *     operationId: deleteUser
   *     x-permissions:
   *       - users:delete
   *     description: |
   *       Deletes a user account permanently. This is an irreversible operation.
   *       Only administrators can delete user accounts.
   *       Users cannot delete their own account for security reasons.
   *
   *       **Required Permission**: `users:delete`
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Users
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: User's unique identifier
   *     responses:
   *       200:
   *         description: User deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 message:
   *                   type: string
   *                   example: User account deleted successfully
   *       400:
   *         description: Cannot delete own account
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 error:
   *                   type: string
   *                   example: INVALID_OPERATION
   *                 message:
   *                   type: string
   *                   example: Cannot delete your own account
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.delete(
    '/:id',
    requirePermission('users:delete'), // Only users with 'users:delete' permission (ADMIN)
    criticalOperationLimiter, // Rate limit critical operations
    asyncHandler(usersController.deleteUser.bind(usersController)),
  );

  /**
   * @openapi
   * /api/v2/users/{id}/activate:
   *   post:
   *     summary: Activate user account
   *     operationId: activateUser
   *     x-permissions:
   *       - users:manage
   *     description: |
   *       Activates a user account, bypassing any verification code requirements.
   *       This is an administrative action that directly sets the user's activation status.
   *
   *       **Required Permission**: `users:manage`
   *
   *       Use cases:
   *       - Manual activation for users who cannot verify their email
   *       - Bulk activation processes
   *       - Administrative account recovery
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Users
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: User ID to activate
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reason
   *             properties:
   *               reason:
   *                 type: string
   *                 minLength: 1
   *                 description: Reason for manual activation
   *                 example: Email verification not working for user
   *     responses:
   *       200:
   *         description: User successfully activated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 message:
   *                   type: string
   *                   example: User account activated successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       format: uuid
   *                     isActivated:
   *                       type: boolean
   *                       example: true
   *       400:
   *         description: Invalid request data or user already activated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 message:
   *                   type: string
   *                   example: User account is already activated
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.post(
    '/:id/activate',
    requirePermission('users:manage'), // Only users with 'users:manage' permission (ADMIN)
    criticalOperationLimiter, // Rate limit critical operations
    asyncHandler(usersController.activateUser.bind(usersController)),
  );

  /**
   * @openapi
   * /api/v2/users/{id}/deactivate:
   *   post:
   *     summary: Deactivate user account
   *     operationId: deactivateUser
   *     x-permissions:
   *       - users:manage
   *     description: |
   *       Deactivates a user account, preventing login and access to the system.
   *       This is an administrative action for account suspension or termination.
   *
   *       **Required Permission**: `users:manage`
   *
   *       Use cases:
   *       - Temporary account suspension
   *       - Security incident response
   *       - Policy violation enforcement
   *       - Account termination workflows
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Users
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: User ID to deactivate
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - reason
   *             properties:
   *               reason:
   *                 type: string
   *                 minLength: 1
   *                 description: Reason for deactivation
   *                 example: Policy violation - inappropriate content uploaded
   *     responses:
   *       200:
   *         description: User successfully deactivated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 message:
   *                   type: string
   *                   example: User account deactivated successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       format: uuid
   *                     isActivated:
   *                       type: boolean
   *                       example: false
   *       400:
   *         description: Invalid request data or user already deactivated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 message:
   *                   type: string
   *                   example: User account is already deactivated
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.post(
    '/:id/deactivate',
    requirePermission('users:manage'), // Only users with 'users:manage' permission (ADMIN)
    criticalOperationLimiter, // Rate limit critical operations
    asyncHandler(usersController.deactivateUser.bind(usersController)),
  );

  return router;
};
