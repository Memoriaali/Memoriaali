import { RequestHandler, Router } from 'express';

import {
  adminOperationLimiter,
  authenticateUser,
  criticalOperationLimiter,
  requirePermission,
  searchOperationLimiter,
} from '../../middleware';
import { prisma } from '../../shared/database/prisma';

import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';

/**
 * Groups management routes with role-based permission control
 *
 * Provides comprehensive group management endpoints with proper permission handling.
 * Only authenticated users with appropriate permissions can access these routes.
 *
 * Security Features:
 * - Authentication required for all routes
 * - Permission-based access control
 * - Request validation
 * - Comprehensive error handling
 * - Rate limiting for sensitive operations
 */

/**
 * Create and configure groups routes
 *
 * @returns Configured router with groups endpoints
 */
export const createGroupsRoutes = (): Router => {
  const router = Router();

  // Initialize services
  const groupsService = new GroupsService(prisma);
  const groupsController = new GroupsController(groupsService);

  // Apply authentication middleware to all routes
  router.use(authenticateUser as RequestHandler);

  /**
   * @openapi
   * /api/v2/groups:
   *   post:
   *     summary: Create new group
   *     operationId: createGroup
   *     x-permissions:
   *       - groups:create
   *     description: |
   *       Creates a new group for organizing users by institution, department, or access level.
   *       Only administrators can create new groups.
   *
   *       **Required Permission**: `groups:create`
   *
   *       The endpoint validates:
   *       - Group name uniqueness
   *       - Group name format and length
   *       - Required fields
   *     security:
   *       - bearerAuth: []
   *     tags:
   *       - Groups
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - groupName
   *             properties:
   *               groupName:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 255
   *                 description: Display name for the group
   *     responses:
   *       201:
   *         description: Group created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Group'
   *                 message:
   *                   type: string
   *                   example: Group created successfully
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Insufficient permissions
   *       409:
   *         description: Group name already exists
   *       500:
   *         description: Internal server error
   */
  router.post(
    '/',
    requirePermission('groups:create'),
    adminOperationLimiter,
    groupsController.createGroup,
  );

  /**
   * @openapi
   * /api/v2/groups:
   *   get:
   *     summary: Get paginated list of groups
   *     operationId: listGroups
   *     x-permissions:
   *       - groups:read
   *     description: |
   *       Retrieves a paginated list of groups with optional search and filtering.
   *       Moderators can read groups, administrators have full access.
   *
   *       **Required Permission**: `groups:read`
   *
   *       Query Parameters:
   *       - `page`: Page number (default: 1)
   *       - `limit`: Items per page (default: 20, max: 100)
   *       - `search`: Search term for group name
   *       - `sortBy`: Sort field (groupName, createdAt, updatedAt)
   *       - `sortOrder`: Sort direction (asc, desc)
   *     security:
   *       - bearerAuth: []
   *     tags:
   *       - Groups
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Items per page
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search term for group name
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [groupName, createdAt, updatedAt]
   *           default: groupName
   *         description: Sort field
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: asc
   *         description: Sort direction
   *     responses:
   *       200:
   *         description: Groups retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   type: array
   *                   items:
   *                     $ref: '#/components/schemas/Group'
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                       example: 1
   *                     limit:
   *                       type: integer
   *                       example: 20
   *                     total:
   *                       type: integer
   *                       example: 50
   *                     totalPages:
   *                       type: integer
   *                       example: 3
   *                     hasNext:
   *                       type: boolean
   *                       example: true
   *                     hasPrev:
   *                       type: boolean
   *                       example: false
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Insufficient permissions
   *       500:
   *         description: Internal server error
   */
  router.get(
    '/',
    requirePermission('groups:read'),
    searchOperationLimiter,
    groupsController.getGroups,
  );

  /**
   * @openapi
   * /api/v2/groups/{groupId}:
   *   get:
   *     summary: Get group by ID
   *     operationId: getGroupById
   *     x-permissions:
   *       - groups:read
   *     description: |
   *       Retrieves a specific group by its ID with member count information.
   *       Moderators can read groups, administrators have full access.
   *
   *       **Required Permission**: `groups:read`
   *     security:
   *       - bearerAuth: []
   *     tags:
   *       - Groups
   *     parameters:
   *       - in: path
   *         name: groupId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Group ID
   *     responses:
   *       200:
   *         description: Group retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Group'
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Group not found
   *       500:
   *         description: Internal server error
   */
  router.get('/:groupId', requirePermission('groups:read'), groupsController.getGroupById);

  /**
   * @openapi
   * /api/v2/groups/{groupId}:
   *   put:
   *     summary: Update group
   *     operationId: updateGroup
   *     x-permissions:
   *       - groups:update
   *     description: |
   *       Updates an existing group's information.
   *       Only administrators can update groups.
   *
   *       **Required Permission**: `groups:update`
   *
   *       The endpoint validates:
   *       - Group name uniqueness (excluding current group)
   *       - Group name format and length
   *       - Required fields
   *     security:
   *       - bearerAuth: []
   *     tags:
   *       - Groups
   *     parameters:
   *       - in: path
   *         name: groupId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Group ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - groupName
   *             properties:
   *               groupName:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 255
   *                 description: New display name for the group
   *     responses:
   *       200:
   *         description: Group updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Group'
   *                 message:
   *                   type: string
   *                   example: Group updated successfully
   *       400:
   *         description: Invalid request data
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Group not found
   *       409:
   *         description: Group name already exists
   *       500:
   *         description: Internal server error
   */
  router.put(
    '/:groupId',
    requirePermission('groups:update'),
    adminOperationLimiter,
    groupsController.updateGroup,
  );

  /**
   * @openapi
   * /api/v2/groups/{groupId}:
   *   delete:
   *     summary: Delete group
   *     operationId: deleteGroup
   *     x-permissions:
   *       - groups:delete
   *     description: |
   *       Deletes a group. Groups with members cannot be deleted.
   *       Only administrators can delete groups.
   *
   *       **Required Permission**: `groups:delete`
   *
   *       **Important**: Groups with members cannot be deleted.
   *       Remove all members from the group before deletion.
   *     security:
   *       - bearerAuth: []
   *     tags:
   *       - Groups
   *     parameters:
   *       - in: path
   *         name: groupId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Group ID
   *     responses:
   *       200:
   *         description: Group deleted successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 data:
   *                   $ref: '#/components/schemas/Group'
   *                 message:
   *                   type: string
   *                   example: Group deleted successfully
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Insufficient permissions
   *       404:
   *         description: Group not found
   *       409:
   *         description: Group has members and cannot be deleted
   *       500:
   *         description: Internal server error
   */
  router.delete(
    '/:groupId',
    requirePermission('groups:delete'),
    criticalOperationLimiter,
    groupsController.deleteGroup,
  );

  return router;
};
