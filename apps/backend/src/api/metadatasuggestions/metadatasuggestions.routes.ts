import { RequestHandler, Router } from 'express';

import {
  adminOperationLimiter,
  authenticateUser,
  criticalOperationLimiter,
  requirePermission,
  searchOperationLimiter,
} from '../../middleware';
import { prisma } from '../../shared/database/prisma';

import { MetadataSuggestionsController } from './metadatasuggestions.controller';
import { MetadataSuggestionsService } from './metadatasuggestions.service';

/**
 * Metadata Suggestions management routes with comprehensive access control
 *
 * Provides CRUD operations for metadata suggestions with proper permission handling.
 * Implements moderation workflow and role-based access restrictions.
 *
 * Security Features:
 * - Authentication required for all routes
 * - Permission-based access control
 * - Metadata suggestion moderation workflow
 * - Request validation and rate limiting
 */

/**
 * Create and configure metadata suggestions routes
 *
 * @returns Configured router with metadata suggestions endpoints
 */
export const createMetadataSuggestionsRoutes = (): Router => {
  const router = Router();

  // Initialize services
  const metadataSuggestionsService = new MetadataSuggestionsService(prisma);
  const metadataSuggestionsController = new MetadataSuggestionsController(
    metadataSuggestionsService,
  );

  // Apply authentication middleware to all routes
  router.use(authenticateUser as RequestHandler);

  /**
   * @openapi
   * /api/v2/metadatasuggestions:
   *   post:
   *     summary: Create a new metadata suggestion
   *     description: |
   *       Creates a new metadata suggestion for a document. Suggestions start in PENDING state
   *       and require moderator/expert approval before being applied to document metadata.
   *
   *       **Required Permission**: `metadatasuggestions:create`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Metadata Suggestions']
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - documentId
   *               - fieldToChange
   *               - changedValue
   *             properties:
   *               documentId:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the document to suggest metadata changes for
   *               fieldToChange:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 500
   *                 description: JSON path or field name to modify
   *               changedValue:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 10000
   *                 description: Proposed new value for the field
   *     responses:
   *       201:
   *         description: Metadata suggestion created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/MetadataSuggestionWithUser'
   *                 message:
   *                   type: string
   *                   example: Metadata suggestion created successfully
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
    requirePermission('metadatasuggestions:create'),
    criticalOperationLimiter,
    metadataSuggestionsController.createMetadataSuggestion,
  );

  /**
   * @openapi
   * /api/v2/metadatasuggestions:
   *   get:
   *     summary: Get metadata suggestions with filtering and pagination
   *     description: |
   *       Retrieves metadata suggestions with optional filtering by document, user, state,
   *       and search terms. Access control is enforced based on user permissions.
   *
   *       **Required Permission**: `metadatasuggestions:read`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Metadata Suggestions']
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
   *         description: Number of suggestions per page
   *       - in: query
   *         name: documentId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by document ID
   *       - in: query
   *         name: suggestedById
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by user who made the suggestion
   *       - in: query
   *         name: state
   *         schema:
   *           type: string
   *           enum: [PENDING, APPROVED, VERIFIED, REJECTED]
   *         description: Filter by suggestion state
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search in field to change and changed value
   *     responses:
   *       200:
   *         description: Metadata suggestions retrieved successfully
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
   *                     metadataSuggestions:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/MetadataSuggestionWithUser'
   *                     pagination:
   *                       $ref: '#/components/schemas/Pagination'
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Access denied
   */
  router.get(
    '/',
    requirePermission('metadatasuggestions:read'),
    searchOperationLimiter,
    metadataSuggestionsController.getMetadataSuggestions,
  );

  /**
   * @openapi
   * /api/v2/metadatasuggestions/document/{documentId}:
   *   get:
   *     summary: Get all metadata suggestions for a specific document
   *     description: |
   *       Retrieves all metadata suggestions for a specific document with pagination.
   *       Access control is enforced based on user permissions and document access.
   *       Only approved/verified suggestions are visible to non-owners unless the user is a moderator/expert.
   *
   *       **Required Permission**: `metadatasuggestions:read`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Metadata Suggestions']
   *     parameters:
   *       - in: path
   *         name: documentId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Document ID to get suggestions for
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
   *         description: Number of suggestions per page
   *       - in: query
   *         name: state
   *         schema:
   *           type: string
   *           enum: [PENDING, APPROVED, VERIFIED, REJECTED]
   *         description: Filter by suggestion state (moderators/experts only)
   *     responses:
   *       200:
   *         description: Document metadata suggestions retrieved successfully
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
   *                     metadataSuggestions:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/MetadataSuggestionWithUser'
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
    requirePermission('metadatasuggestions:read'),
    searchOperationLimiter,
    metadataSuggestionsController.getMetadataSuggestionsByDocument,
  );

  /**
   * @openapi
   * /api/v2/metadatasuggestions/pending:
   *   get:
   *     summary: Get pending metadata suggestions for moderation
   *     description: |
   *       Retrieves only PENDING metadata suggestions for moderator/expert review.
   *       Only moderators and experts can access this endpoint.
   *
   *       **Required Permission**: `metadatasuggestions:moderate`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Metadata Suggestions']
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
   *         description: Number of suggestions per page
   *     responses:
   *       200:
   *         description: Pending metadata suggestions retrieved successfully
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
   *                     metadataSuggestions:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/MetadataSuggestionWithUser'
   *                     pagination:
   *                       $ref: '#/components/schemas/Pagination'
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Moderator or expert access required
   */
  router.get(
    '/pending',
    requirePermission('metadatasuggestions:moderate'),
    searchOperationLimiter,
    metadataSuggestionsController.getPendingMetadataSuggestions,
  );

  /**
   * @openapi
   * /api/v2/metadatasuggestions/{id}:
   *   get:
   *     summary: Get a metadata suggestion by ID
   *     description: |
   *       Retrieves a specific metadata suggestion by ID. Access control is enforced
   *       based on user permissions and suggestion state.
   *
   *       **Required Permission**: `metadatasuggestions:read`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Metadata Suggestions']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Metadata suggestion ID
   *     responses:
   *       200:
   *         description: Metadata suggestion retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/MetadataSuggestionWithUser'
   *       400:
   *         description: Invalid metadata suggestion ID
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Access denied to metadata suggestion
   *       404:
   *         description: Metadata suggestion not found
   */
  router.get(
    '/:id',
    requirePermission('metadatasuggestions:read'),
    metadataSuggestionsController.getMetadataSuggestionById,
  );

  /**
   * @openapi
   * /api/v2/metadatasuggestions/{id}:
   *   put:
   *     summary: Update a metadata suggestion
   *     description: |
   *       Updates a metadata suggestion. Users can only edit their own pending suggestions.
   *       Moderators and experts can edit any suggestion and change its state.
   *
   *       **Required Permission**: `metadatasuggestions:update` or `metadatasuggestions:moderate`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Metadata Suggestions']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Metadata suggestion ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               fieldToChange:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 500
   *                 description: Updated field to change
   *               changedValue:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 10000
   *                 description: Updated changed value
   *               state:
   *                 type: string
   *                 enum: [PENDING, APPROVED, VERIFIED, REJECTED]
   *                 description: New suggestion state (moderators/experts only)
   *               rejectionExplanation:
   *                 type: string
   *                 maxLength: 2000
   *                 description: Explanation for rejection (when state is REJECTED)
   *     responses:
   *       200:
   *         description: Metadata suggestion updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/MetadataSuggestionWithUser'
   *                 message:
   *                   type: string
   *                   example: Metadata suggestion updated successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Permission denied to modify metadata suggestion
   *       404:
   *         description: Metadata suggestion not found
   */
  router.put(
    '/:id',
    requirePermission('metadatasuggestions:update'),
    criticalOperationLimiter,
    metadataSuggestionsController.updateMetadataSuggestion,
  );

  /**
   * @openapi
   * /api/v2/metadatasuggestions/{id}/approve:
   *   post:
   *     summary: Approve a metadata suggestion
   *     description: |
   *       Approves a pending metadata suggestion, moving it to APPROVED state.
   *       Only moderators and experts can approve suggestions.
   *
   *       **Required Permission**: `metadatasuggestions:moderate`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Metadata Suggestions']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Metadata suggestion ID
   *     responses:
   *       200:
   *         description: Metadata suggestion approved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/MetadataSuggestionWithUser'
   *                 message:
   *                   type: string
   *                   example: Metadata suggestion approved successfully
   *       400:
   *         description: Invalid metadata suggestion ID
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Moderator or expert access required
   *       404:
   *         description: Metadata suggestion not found
   */
  router.post(
    '/:id/approve',
    requirePermission('metadatasuggestions:moderate'),
    adminOperationLimiter,
    metadataSuggestionsController.approveMetadataSuggestion,
  );

  /**
   * @openapi
   * /api/v2/metadatasuggestions/{id}/verify:
   *   post:
   *     summary: Verify a metadata suggestion
   *     description: |
   *       Verifies an approved metadata suggestion, moving it to VERIFIED state.
   *       Only experts can verify suggestions.
   *
   *       **Required Permission**: `metadatasuggestions:moderate`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Metadata Suggestions']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Metadata suggestion ID
   *     responses:
   *       200:
   *         description: Metadata suggestion verified successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/MetadataSuggestionWithUser'
   *                 message:
   *                   type: string
   *                   example: Metadata suggestion verified successfully
   *       400:
   *         description: Invalid metadata suggestion ID
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Expert access required
   *       404:
   *         description: Metadata suggestion not found
   */
  router.post(
    '/:id/verify',
    requirePermission('metadatasuggestions:moderate'),
    adminOperationLimiter,
    metadataSuggestionsController.verifyMetadataSuggestion,
  );

  /**
   * @openapi
   * /api/v2/metadatasuggestions/{id}/reject:
   *   post:
   *     summary: Reject a metadata suggestion
   *     description: |
   *       Rejects a pending metadata suggestion, moving it to REJECTED state.
   *       Only moderators and experts can reject suggestions.
   *
   *       **Required Permission**: `metadatasuggestions:moderate`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Metadata Suggestions']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Metadata suggestion ID
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               rejectionExplanation:
   *                 type: string
   *                 maxLength: 2000
   *                 description: Optional explanation for rejection
   *     responses:
   *       200:
   *         description: Metadata suggestion rejected successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/MetadataSuggestionWithUser'
   *                 message:
   *                   type: string
   *                   example: Metadata suggestion rejected successfully
   *       400:
   *         description: Invalid metadata suggestion ID
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Moderator or expert access required
   *       404:
   *         description: Metadata suggestion not found
   */
  router.post(
    '/:id/reject',
    requirePermission('metadatasuggestions:moderate'),
    adminOperationLimiter,
    metadataSuggestionsController.rejectMetadataSuggestion,
  );

  /**
   * @openapi
   * /api/v2/metadatasuggestions/{id}:
   *   delete:
   *     summary: Delete a metadata suggestion
   *     description: |
   *       Permanently deletes a metadata suggestion. Users can only delete their own
   *       pending suggestions. Moderators and experts can delete any suggestion.
   *
   *       **Required Permission**: `metadatasuggestions:delete` or `metadatasuggestions:moderate`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Metadata Suggestions']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Metadata suggestion ID
   *     responses:
   *       200:
   *         description: Metadata suggestion deleted successfully
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
   *                   example: Metadata suggestion deleted successfully
   *       400:
   *         description: Invalid metadata suggestion ID
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Permission denied to delete metadata suggestion
   *       404:
   *         description: Metadata suggestion not found
   */
  router.delete(
    '/:id',
    requirePermission('metadatasuggestions:delete'),
    criticalOperationLimiter,
    metadataSuggestionsController.deleteMetadataSuggestion,
  );

  return router;
};
