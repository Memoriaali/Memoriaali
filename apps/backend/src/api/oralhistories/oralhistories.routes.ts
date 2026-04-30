import { RequestHandler, Router } from 'express';

import {
  adminOperationLimiter,
  authenticateUser,
  criticalOperationLimiter,
  requirePermission,
  searchOperationLimiter,
} from '../../middleware';
import { prisma } from '../../shared/database/prisma';

import { asyncHandler } from '../../shared/utils/response.utils';

import { OralHistoriesController } from './oralhistories.controller';
import { OralHistoriesService } from './oralhistories.service';

/**
 * Oral History management routes with comprehensive access control
 *
 * Provides CRUD operations for oral history interviews with proper permission handling.
 * Implements privacy controls and role-based access restrictions.
 *
 * Security Features:
 * - Authentication required for all routes
 * - Permission-based access control
 * - Group sharing controls
 * - Request validation and rate limiting
 */

/**
 * Create and configure oral history routes
 *
 * @returns Configured router with oral history endpoints
 */
export const createOralHistoryRoutes = (): Router => {
  const router = Router();

  // Initialize services
  const oralHistoriesService = new OralHistoriesService(prisma);
  const oralHistoriesController = new OralHistoriesController(oralHistoriesService);

  // Apply authentication middleware to all routes
  router.use(authenticateUser as RequestHandler);

  /**
   * @openapi
   * /api/v2/oralhistories:
   *   post:
   *     summary: Create a new oral history
   *     operationId: createOralHistory
   *     x-permissions:
   *       - oralhistories:create
   *     description: |
   *       Creates a new oral history interview with the specified metadata and sharing settings.
   *       The oral history will be associated with the authenticated user.
   *
   *       **Required Permission**: `oralhistories:create`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Oral History']
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - fileName
   *               - person
   *               - reporter
   *               - event
   *               - description
   *               - language
   *             properties:
   *               fileName:
   *                 type: string
   *                 description: Audio/video filename
   *               person:
   *                 type: string
   *                 description: Interviewee name/identifier
   *               reporter:
   *                 type: string
   *                 description: Interviewer name/identifier
   *               event:
   *                 type: string
   *                 description: Historical event/topic discussed
   *               description:
   *                 type: string
   *                 description: Interview summary/description
   *               language:
   *                 type: string
   *                 description: Primary language of interview
   *               groupToShare:
   *                 type: string
   *                 format: uuid
   *                 description: Specific group ID for sharing
   *               shareToGroup:
   *                 type: boolean
   *                 description: Enable group sharing
   *               questions:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     text:
   *                       type: string
   *                       description: Question text
   *                     timestamp:
   *                       type: string
   *                       description: Optional timestamp in interview
   *                     order:
   *                       type: integer
   *                       description: Display order
   *                 description: Array of interview questions
   *               keywords:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of thematic keywords/tags
   *     responses:
   *       201:
   *         description: Oral history created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/OralHistory'
   *                 message:
   *                   type: string
   *                   example: Oral history created successfully
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   */
  router.post(
    '/',
    requirePermission('oralhistories:create'),
    asyncHandler(oralHistoriesController.createOralHistory.bind(oralHistoriesController)),
  );

  /**
   * @openapi
   * /api/v2/oralhistories/{id}:
   *   get:
   *     summary: Get oral history by ID
   *     operationId: getOralHistoryById
   *     x-permissions:
   *       - oralhistories:read
   *     description: |
   *       Retrieves an oral history by its unique identifier.
   *       Access is controlled by group sharing settings and user permissions.
   *
   *       **Required Permission**: `oralhistories:read` (for accessible oral histories)
   *     security:
   *       - bearerAuth: []
   *     tags: ['Oral History']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Oral history's unique identifier
   *     responses:
   *       200:
   *         description: Oral history retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/OralHistory'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.get(
    '/:id',
    asyncHandler(oralHistoriesController.getOralHistoryById.bind(oralHistoriesController)),
  );

  /**
   * @openapi
   * /api/v2/oralhistories/{id}:
   *   put:
   *     summary: Update oral history
   *     operationId: updateOralHistory
   *     x-permissions:
   *       - oralhistories:update
   *     description: |
   *       Updates an oral history's metadata and settings.
   *       Users can only update their own oral histories unless they have admin/moderator permissions.
   *
   *       **Required Permission**: Own oral history or `oralhistories:update`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Oral History']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Oral history's unique identifier
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               fileName:
   *                 type: string
   *                 description: Audio/video filename
   *               person:
   *                 type: string
   *                 description: Interviewee name/identifier
   *               reporter:
   *                 type: string
   *                 description: Interviewer name/identifier
   *               event:
   *                 type: string
   *                 description: Historical event/topic discussed
   *               description:
   *                 type: string
   *                 description: Interview summary/description
   *               language:
   *                 type: string
   *                 description: Primary language of interview
   *               groupToShare:
   *                 type: string
   *                 format: uuid
   *                 description: Specific group ID for sharing
   *               shareToGroup:
   *                 type: boolean
   *                 description: Enable group sharing
   *               questions:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     text:
   *                       type: string
   *                       description: Question text
   *                     timestamp:
   *                       type: string
   *                       description: Optional timestamp in interview
   *                     order:
   *                       type: integer
   *                       description: Display order
   *                 description: Array of interview questions
   *               keywords:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of thematic keywords/tags
   *     responses:
   *       200:
   *         description: Oral history updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/OralHistory'
   *                 message:
   *                   type: string
   *                   example: Oral history updated successfully
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
    adminOperationLimiter,
    asyncHandler(oralHistoriesController.updateOralHistory.bind(oralHistoriesController)),
  );

  /**
   * @openapi
   * /api/v2/oralhistories/{id}:
   *   delete:
   *     summary: Delete oral history
   *     operationId: deleteOralHistory
   *     x-permissions:
   *       - oralhistories:delete
   *     description: |
   *       Deletes an oral history permanently. This is an irreversible operation.
   *       Users can only delete their own oral histories unless they have admin/moderator permissions.
   *
   *       **Required Permission**: Own oral history or `oralhistories:delete`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Oral History']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Oral history's unique identifier
   *     responses:
   *       200:
   *         description: Oral history deleted successfully
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
   *                   example: Oral history deleted successfully
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.delete(
    '/:id',
    requirePermission('oralhistories:delete'),
    criticalOperationLimiter,
    asyncHandler(oralHistoriesController.deleteOralHistory.bind(oralHistoriesController)),
  );

  /**
   * @openapi
   * /api/v2/oralhistories:
   *   get:
   *     summary: List and search oral histories
   *     operationId: listOralHistories
   *     x-permissions:
   *       - oralhistories:read
   *     description: |
   *       Retrieves a paginated list of oral histories with optional filtering and search capabilities.
   *       Results are filtered based on user permissions and group sharing settings.
   *
   *       **Required Permission**: `oralhistories:read`
   *
   *       Search capabilities:
   *       - Text search across filename, person, reporter, event, and description
   *       - Filter by user, language, person, and reporter
   *       - Pagination with configurable limits
   *     security:
   *       - bearerAuth: []
   *     tags: ['Oral History']
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
   *         description: Number of oral histories per page
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *           minLength: 1
   *         description: Search term for filename, person, reporter, event, or description
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by oral history owner
   *       - in: query
   *         name: language
   *         schema:
   *           type: string
   *         description: Filter by interview language
   *       - in: query
   *         name: person
   *         schema:
   *           type: string
   *         description: Filter by interviewee name
   *       - in: query
   *         name: reporter
   *         schema:
   *           type: string
   *         description: Filter by interviewer name
   *     responses:
   *       200:
   *         description: Oral histories retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: object
   *                   properties:
   *                     oralHistories:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/OralHistory'
   *                     pagination:
   *                       type: object
   *                       properties:
   *                         page:
   *                           type: integer
   *                           example: 1
   *                         limit:
   *                           type: integer
   *                           example: 10
   *                         total:
   *                           type: integer
   *                           example: 150
   *                         pages:
   *                           type: integer
   *                           example: 15
   *                         hasNext:
   *                           type: boolean
   *                           example: true
   *                         hasPrev:
   *                           type: boolean
   *                           example: false
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   */
  router.get(
    '/',
    requirePermission('oralhistories:read'),
    searchOperationLimiter,
    asyncHandler(oralHistoriesController.listOralHistories.bind(oralHistoriesController)),
  );

  return router;
};
