import { RequestHandler, Router } from 'express';

import {
  authenticateUser,
  criticalOperationLimiter,
  requirePermission,
  searchOperationLimiter,
} from '../../middleware';
import { prisma } from '../../shared/database/prisma';

import { AuthenticatedRequest } from '../../shared/types/AuthenticatedRequest';
import { UsersInGroupsController } from './usersingroups.controller';
import {
  AddUserToGroupSchema,
  ListGroupsForUserQueryOnlySchema,
  ListUsersInGroupQueryOnlySchema,
  RemoveUserFromGroupSchema,
} from './usersingroups.schemas';
import { UsersInGroupsService } from './usersingroups.service';

/**
 * Users in Groups management routes with role-based permission control
 *
 * Provides comprehensive user-group membership management endpoints with proper permission handling.
 * Only authenticated users with appropriate permissions can access these routes.
 *
 * Security Features:
 * - Authentication required for all routes
 * - Permission-based access control
 * - Request validation using Zod schemas
 * - Comprehensive error handling
 * - Rate limiting for sensitive operations
 */

/**
 * Create and configure users in groups routes
 *
 * @returns Configured router with users in groups endpoints
 */
export const createUsersInGroupsRoutes = (): Router => {
  const router = Router();

  // Initialize services
  const usersInGroupsService = new UsersInGroupsService(prisma);
  const usersInGroupsController = new UsersInGroupsController(usersInGroupsService);

  // Apply authentication middleware to all routes
  router.use(authenticateUser as RequestHandler);

  /**
   * @openapi
   * /api/v2/usersingroups:
   *   post:
   *     summary: Add user to group
   *     operationId: addUserToGroup
   *     x-permissions:
   *       - groups:manage
   *     description: |
   *       Adds a user to a group with optional metadata for role and permissions.
   *       Only users with appropriate permissions can add members to groups.
   *
   *       **Required Permission**: `groups:manage` or group-specific permissions
   *
   *       The endpoint validates:
   *       - User and group existence
   *       - No duplicate memberships
   *       - Required fields
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Users in Groups
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - groupId
   *             properties:
   *               userId:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the user to add to the group
   *               groupId:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the group to add the user to
   *               metadata:
   *                 type: object
   *                 description: Optional metadata for the membership (roles, permissions, etc.)
   *     responses:
   *       201:
   *         description: User added to group successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/UsersInGroups'
   *                 message:
   *                   type: string
   *                   example: User added to group successfully
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: User or group not found
   *       409:
   *         description: User is already a member of the group
   */
  router.post(
    '/',
    criticalOperationLimiter,
    requirePermission('groups:manage'),
    async (req, res) => {
      // Validate request body
      const validationResult = AddUserToGroupSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid request data',
          data: validationResult.error.issues,
        });
        return;
      }

      await usersInGroupsController.addUserToGroup(req as unknown as AuthenticatedRequest, res);
    },
  );

  /**
   * @openapi
   * /api/v2/usersingroups:
   *   delete:
   *     summary: Remove user from group
   *     operationId: removeUserFromGroup
   *     x-permissions:
   *       - groups:manage
   *     description: |
   *       Removes a user from a group. Only users with appropriate permissions
   *       can remove members from groups.
   *
   *       **Required Permission**: `groups:manage` or group-specific permissions
   *
   *       The endpoint validates:
   *       - User is a member of the group
   *       - Required fields
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Users in Groups
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - userId
   *               - groupId
   *             properties:
   *               userId:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the user to remove from the group
   *               groupId:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the group to remove the user from
   *     responses:
   *       200:
   *         description: User removed from group successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/UsersInGroups'
   *                 message:
   *                   type: string
   *                   example: User removed from group successfully
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: User is not a member of the group
   */
  router.delete(
    '/',
    criticalOperationLimiter,
    requirePermission('groups:manage'),
    async (req, res) => {
      // Validate request body
      const validationResult = RemoveUserFromGroupSchema.safeParse(req.body);
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid request data',
          data: validationResult.error.issues,
        });
        return;
      }

      await usersInGroupsController.removeUserFromGroup(
        req as unknown as AuthenticatedRequest,
        res,
      );
    },
  );

  /**
   * @openapi
   * /api/v2/usersingroups/group/{groupId}:
   *   get:
   *     summary: Get users in group
   *     operationId: listUsersInGroup
   *     x-permissions:
   *       - groups:read
   *     description: |
   *       Retrieves a paginated list of users in a specific group.
   *       Only users with appropriate permissions can view group members.
   *
   *       **Required Permission**: `groups:read` or group-specific permissions
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Users in Groups
   *     parameters:
   *       - in: path
   *         name: groupId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the group
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
   *           default: 20
   *         description: Number of items per page
   *     responses:
   *       200:
   *         description: Users in group retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     items:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/UsersInGroups'
   *                     pagination:
   *                       type: object
   *                       properties:
   *                         page:
   *                           type: integer
   *                         limit:
   *                           type: integer
   *                         total:
   *                           type: integer
   *                         totalPages:
   *                           type: integer
   *                         hasNext:
   *                           type: boolean
   *                         hasPrev:
   *                           type: boolean
   *                 message:
   *                   type: string
   *                   example: Users in group retrieved successfully
   *       400:
   *         description: Invalid request parameters
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Group not found
   */
  router.get(
    '/group/:groupId',
    searchOperationLimiter,
    requirePermission('groups:read'),
    async (req, res) => {
      // Validate path parameter
      const { groupId } = req.params;
      if (
        !groupId ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(groupId)
      ) {
        res.status(400).json({
          success: false,
          message: 'Invalid group ID format',
          data: null,
        });
        return;
      }

      // Validate query parameters
      const validationResult = ListUsersInGroupQueryOnlySchema.safeParse({
        page: req.query.page,
        limit: req.query.limit,
      });
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          data: validationResult.error.issues,
        });
        return;
      }

      await usersInGroupsController.getUsersInGroup(req as unknown as AuthenticatedRequest, res);
    },
  );

  /**
   * @openapi
   * /api/v2/usersingroups/user/{userId}:
   *   get:
   *     summary: Get groups for user
   *     operationId: listGroupsForUser
   *     x-permissions:
   *       - users:read
   *     description: |
   *       Retrieves a paginated list of groups that a specific user belongs to.
   *       Only users with appropriate permissions can view user's groups.
   *
   *       **Required Permission**: `users:read` or user-specific permissions
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Users in Groups
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the user
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
   *           default: 20
   *         description: Number of items per page
   *     responses:
   *       200:
   *         description: User groups retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     items:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Group'
   *                     pagination:
   *                       type: object
   *                       properties:
   *                         page:
   *                           type: integer
   *                         limit:
   *                           type: integer
   *                         total:
   *                           type: integer
   *                         totalPages:
   *                           type: integer
   *                         hasNext:
   *                           type: boolean
   *                         hasPrev:
   *                           type: boolean
   *                 message:
   *                   type: string
   *                   example: User groups retrieved successfully
   *       400:
   *         description: Invalid request parameters
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: User not found
   */
  router.get(
    '/user/:userId',
    searchOperationLimiter,
    requirePermission('users:read'),
    async (req, res) => {
      // Validate path parameter
      const { userId } = req.params;
      if (
        !userId ||
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId)
      ) {
        res.status(400).json({
          success: false,
          message: 'Invalid user ID format',
          data: null,
        });
        return;
      }

      // Validate query parameters
      const validationResult = ListGroupsForUserQueryOnlySchema.safeParse({
        page: req.query.page,
        limit: req.query.limit,
      });
      if (!validationResult.success) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          data: validationResult.error.issues,
        });
        return;
      }

      await usersInGroupsController.getGroupsForUser(req as unknown as AuthenticatedRequest, res);
    },
  );

  /**
   * @openapi
   * /api/v2/usersingroups/check/{userId}/{groupId}:
   *   get:
   *     summary: Check if user is in group
   *     operationId: isUserInGroup
   *     x-permissions:
   *       - groups:read
   *     description: |
   *       Checks if a specific user is a member of a specific group.
   *       Only users with appropriate permissions can check memberships.
   *
   *       **Required Permission**: `groups:read` or group-specific permissions
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Users in Groups
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the user
   *       - in: path
   *         name: groupId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the group
   *     responses:
   *       200:
   *         description: Membership check completed
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: object
   *                   properties:
   *                     isMember:
   *                       type: boolean
   *                       description: Whether the user is a member of the group
   *                 message:
   *                   type: string
   *                   example: Membership check completed
   *       400:
   *         description: Invalid request parameters
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Insufficient permissions
   */
  router.get(
    '/check/:userId/:groupId',
    searchOperationLimiter,
    requirePermission('groups:read'),
    async (req, res) => {
      await usersInGroupsController.isUserInGroup(req as unknown as AuthenticatedRequest, res);
    },
  );

  /**
   * @openapi
   * /api/v2/usersingroups/membership/{userId}/{groupId}:
   *   get:
   *     summary: Get user-group membership
   *     operationId: getUserGroupMembership
   *     x-permissions:
   *       - groups:read
   *     description: |
   *       Retrieves the specific membership record for a user in a group.
   *       Only users with appropriate permissions can view memberships.
   *
   *       **Required Permission**: `groups:read` or group-specific permissions
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Users in Groups
   *     parameters:
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the user
   *       - in: path
   *         name: groupId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID of the group
   *     responses:
   *       200:
   *         description: Membership retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/UsersInGroups'
   *                 message:
   *                   type: string
   *                   example: Membership retrieved successfully
   *       400:
   *         description: Invalid request parameters
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Membership not found
   */
  router.get(
    '/membership/:userId/:groupId',
    searchOperationLimiter,
    requirePermission('groups:read'),
    async (req, res) => {
      await usersInGroupsController.getUserGroupMembership(
        req as unknown as AuthenticatedRequest,
        res,
      );
    },
  );

  return router;
};
