import { RequestHandler, Router } from 'express';

import {
  adminOperationLimiter,
  authenticateUser,
  criticalOperationLimiter,
  requirePermission,
  searchOperationLimiter,
} from '../../middleware';
import { prisma } from '../../shared/database/prisma';

import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';

/**
 * Comment management routes with comprehensive access control
 *
 * Provides CRUD operations for comments with proper permission handling.
 * Implements moderation workflow and role-based access restrictions.
 *
 * Security Features:
 * - Authentication required for all routes
 * - Permission-based access control
 * - Comment moderation workflow
 * - Request validation and rate limiting
 */

/**
 * Create and configure comment routes
 *
 * @returns Configured router with comment endpoints
 */
export const createCommentRoutes = (): Router => {
  const router = Router();

  // Initialize services
  const commentsService = new CommentsService(prisma);
  const commentsController = new CommentsController(commentsService);

  // Apply authentication middleware to all routes
  router.use(authenticateUser as RequestHandler);

  /**
   * @openapi
   * /api/v2/comments:
   *   post:
   *     summary: Create a new comment
   *     operationId: createComment
   *     description: |
   *       Creates a new comment on a document. Comments start in PENDING state
   *       and require moderator approval before being publicly visible.
   *
   *       **Required Permission**: `comments:create`
   *     x-permissions:
   *       - comments:create
   *     security:
   *       - bearerAuth: []
   *     tags: ['Comments']
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - documentId
   *               - comment
   *             properties:
   *               documentId:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the document to comment on
   *               comment:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 10000
   *                 description: Comment content
   *     responses:
   *       201:
   *         description: Comment created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/CommentWithUser'
   *                 message:
   *                   type: string
   *                   example: Comment created successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Access denied to document
   *       404:
   *         description: Document not found
   */
  router.post(
    '/',
    requirePermission('comments:create'),
    criticalOperationLimiter,
    commentsController.createComment,
  );

  /**
   * @openapi
   * /api/v2/comments:
   *   get:
   *     summary: Get comments with filtering and pagination
   *     operationId: listComments
   *     x-permissions:
   *       - comments:read
   *     description: |
   *       Retrieves comments with optional filtering by document, user, state,
   *       and search terms. Access control is enforced based on user permissions.
   *
   *       **Required Permission**: `comments:read`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Comments']
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
   *         description: Number of comments per page
   *       - in: query
   *         name: documentId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by document ID
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by user ID
   *       - in: query
   *         name: state
   *         schema:
   *           type: string
   *           enum: [PENDING, APPROVED, REJECTED]
   *         description: Filter by comment state
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search in comment text
   *     responses:
   *       200:
   *         description: Comments retrieved successfully
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
   *                     comments:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/CommentWithUser'
   *                     pagination:
   *                       $ref: '#/components/schemas/Pagination'
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Access denied
   */
  router.get(
    '/',
    requirePermission('comments:read'),
    searchOperationLimiter,
    commentsController.getComments,
  );

  /**
   * @openapi
   * /api/v2/comments/document/{documentId}:
   *   get:
   *     summary: Get all comments for a specific document
   *     operationId: listCommentsByDocument
   *     x-permissions:
   *       - comments:read
   *     description: |
   *       Retrieves all comments for a specific document with pagination.
   *       Access control is enforced based on user permissions and document access.
   *       Only approved comments are visible to non-owners unless the user is a moderator.
   *
   *       **Required Permission**: `comments:read`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Comments']
   *     parameters:
   *       - in: path
   *         name: documentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Document ID to get comments for
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
   *         description: Number of comments per page
   *       - in: query
   *         name: state
   *         schema:
   *           type: string
   *           enum: [PENDING, APPROVED, REJECTED]
   *         description: Filter by comment state (moderators only)
   *     responses:
   *       200:
   *         description: Document comments retrieved successfully
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
   *                     comments:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/CommentWithUser'
   *                     pagination:
   *                       $ref: '#/components/schemas/Pagination'
   *       400:
   *         description: Invalid document ID
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Access denied to document
   *       404:
   *         description: Document not found
   */
  router.get(
    '/document/:documentId',
    requirePermission('comments:read'),
    searchOperationLimiter,
    commentsController.getCommentsByDocument,
  );

  /**
   * @openapi
   * /api/v2/comments/pending:
   *   get:
   *     summary: Get pending comments for moderation
   *     description: |
   *       Retrieves only PENDING comments for moderator review.
   *       Only moderators and admins can access this endpoint.
   *
   *       **Required Permission**: `comments:moderate`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Comments']
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
   *         description: Number of comments per page
   *     responses:
   *       200:
   *         description: Pending comments retrieved successfully
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
   *                     comments:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/CommentWithUser'
   *                     pagination:
   *                       $ref: '#/components/schemas/Pagination'
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Moderator access required
   */
  router.get(
    '/pending',
    requirePermission('comments:moderate'),
    searchOperationLimiter,
    commentsController.getPendingComments,
  );

  /**
   * @openapi
   * /api/v2/comments/{id}:
   *   get:
   *     summary: Get a comment by ID
   *     operationId: getCommentById
   *     x-permissions:
   *       - comments:read
   *     description: |
   *       Retrieves a specific comment by ID. Access control is enforced
   *       based on user permissions and comment state.
   *
   *       **Required Permission**: `comments:read`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Comments']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Comment ID
   *     responses:
   *       200:
   *         description: Comment retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/CommentWithUser'
   *       400:
   *         description: Invalid comment ID
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Access denied to comment
   *       404:
   *         description: Comment not found
   */
  router.get('/:id', requirePermission('comments:read'), commentsController.getCommentById);

  /**
   * @openapi
   * /api/v2/comments/{id}:
   *   put:
   *     summary: Update a comment
   *     operationId: updateComment
   *     x-permissions:
   *       - comments:update
   *     description: |
   *       Updates a comment. Users can only edit their own pending comments.
   *       Moderators can edit any comment and change its state.
   *
   *       **Required Permission**: `comments:update` or `comments:moderate`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Comments']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Comment ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               comment:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 10000
   *                 description: Updated comment content
   *               state:
   *                 type: string
   *                 enum: [PENDING, APPROVED, REJECTED]
   *                 description: New comment state (moderators only)
   *     responses:
   *       200:
   *         description: Comment updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/CommentWithUser'
   *                 message:
   *                   type: string
   *                   example: Comment updated successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Permission denied to modify comment
   *       404:
   *         description: Comment not found
   */
  router.put(
    '/:id',
    requirePermission('comments:update'),
    criticalOperationLimiter,
    commentsController.updateComment,
  );

  /**
   * @openapi
   * /api/v2/comments/{id}/approve:
   *   post:
   *     summary: Approve a comment
   *     operationId: approveComment
   *     x-permissions:
   *       - comments:moderate
   *     description: |
   *       Approves a pending comment, making it publicly visible.
   *       Only moderators and admins can approve comments.
   *
   *       **Required Permission**: `comments:moderate`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Comments']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Comment ID
   *     responses:
   *       200:
   *         description: Comment approved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/CommentWithUser'
   *                 message:
   *                   type: string
   *                   example: Comment approved successfully
   *       400:
   *         description: Invalid comment ID
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Moderator access required
   *       404:
   *         description: Comment not found
   */
  router.post(
    '/:id/approve',
    requirePermission('comments:moderate'),
    adminOperationLimiter,
    commentsController.approveComment,
  );

  /**
   * @openapi
   * /api/v2/comments/{id}/reject:
   *   post:
   *     summary: Reject a comment
   *     operationId: rejectComment
   *     x-permissions:
   *       - comments:moderate
   *     description: |
   *       Rejects a pending comment, keeping it hidden from public view.
   *       Only moderators and admins can reject comments.
   *
   *       **Required Permission**: `comments:moderate`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Comments']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Comment ID
   *     responses:
   *       200:
   *         description: Comment rejected successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/CommentWithUser'
   *                 message:
   *                   type: string
   *                   example: Comment rejected successfully
   *       400:
   *         description: Invalid comment ID
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Moderator access required
   *       404:
   *         description: Comment not found
   */
  router.post(
    '/:id/reject',
    requirePermission('comments:moderate'),
    adminOperationLimiter,
    commentsController.rejectComment,
  );

  /**
   * @openapi
   * /api/v2/comments/{id}:
   *   delete:
   *     summary: Delete a comment
   *     operationId: deleteComment
   *     x-permissions:
   *       - comments:delete
   *     description: |
   *       Permanently deletes a comment. Users can only delete their own
   *       pending comments. Moderators can delete any comment.
   *
   *       **Required Permission**: `comments:delete` or `comments:moderate`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Comments']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Comment ID
   *     responses:
   *       200:
   *         description: Comment deleted successfully
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
   *                   example: Comment deleted successfully
   *       400:
   *         description: Invalid comment ID
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Permission denied to delete comment
   *       404:
   *         description: Comment not found
   */
  router.delete(
    '/:id',
    requirePermission('comments:delete'),
    criticalOperationLimiter,
    commentsController.deleteComment,
  );

  return router;
};
