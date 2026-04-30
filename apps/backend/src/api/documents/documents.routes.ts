import { RequestHandler, Router } from 'express';

import {
  adminOperationLimiter,
  authenticateUser,
  criticalOperationLimiter,
  requirePermission,
  searchOperationLimiter,
} from '../../middleware';
import { prisma } from '../../shared/database/prisma';
import { EndpointServiceCall } from '../../shared/types/api.type';
import { asyncHandler } from '../../shared/utils/response.utils';

import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

/**
 * Document management routes with comprehensive access control
 *
 * Provides CRUD operations for documents with proper permission handling.
 * Implements privacy controls and role-based access restrictions.
 *
 * Security Features:
 * - Authentication required for all routes
 * - Permission-based access control
 * - Document privacy enforcement
 * - Request validation and rate limiting
 */

/**
 * Create and configure document routes
 *
 * @returns Configured router with document endpoints
 */
export const createDocumentRoutes = (): Router => {
  const router = Router();

  // Initialize services
  const documentsService = new DocumentsService(prisma);
  const documentsController = new DocumentsController(documentsService);

  // Apply authentication middleware to all routes
  router.use(authenticateUser as RequestHandler);

  /**
   * @openapi
   * /api/v2/documents:
   *   post:
   *     summary: Create a new document
   *     operationId: createDocument
   *     x-permissions:
   *       - documents:create
   *     description: |
   *       Creates a new document with the specified metadata and privacy settings.
   *       The document will be associated with the authenticated user.
   *
   *       **Required Permission**: `documents:create`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Documents']
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - fileName
   *             properties:
   *               fileName:
   *                 type: string
   *                 description: Current filename in storage
   *               originalFileName:
   *                 type: string
   *                 description: Original upload filename
   *               mimeType:
   *                 type: string
   *                 description: File MIME type
   *               documentPrivacy:
   *                 type: string
   *                 enum: [PUBLIC, PRIVATE, GROUP, RESEARCH_ONLY]
   *                 default: PUBLIC
   *                 description: Document privacy level
   *               shareToGroup:
   *                 type: boolean
   *                 description: Enable group sharing
   *               groupToShare:
   *                 type: string
   *                 format: uuid
   *                 description: Specific group ID for sharing
   *               metadata:
   *                 type: object
   *                 description: Document metadata (JSON)
   *               aiModified:
   *                 type: boolean
   *                 description: Indicates if AI modified any fields
   *                 example: false
   *               aiModifiedFields:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: List of fields modified by AI
   *                 example: ["subjectIndexing", "events"]
   *               hasErrors:
   *                 type: boolean
   *                 description: Indicated if AI found errors in file
   *                 example: false
   *               errorTypes:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: List of error types
   *                 example: ["postIt"]
   *               errorPageNumbers:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: List of files page numbers where error was found
   *     responses:
   *       201:
   *         description: Document created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/Document'
   *                 message:
   *                   type: string
   *                   example: Document created successfully
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   */
  router.post(
    '/',
    requirePermission('documents:create'),
    asyncHandler(
      documentsController.createDocument.bind(documentsController) as EndpointServiceCall,
    ),
  );

  /**
   * @openapi
   * /api/v2/documents:
   *   get:
   *     summary: List and search documents
   *     operationId: listDocuments
   *     x-permissions:
   *       - documents:read
   *     description: |
   *       Retrieves a paginated list of documents with optional filtering and search capabilities.
   *       Results are filtered based on user permissions and document privacy settings.
   *
   *       **Required Permission**: `documents:read`
   *
   *       Search capabilities:
   *       - Text search across filename, metadata, and OCR text
   *       - Dot notation for single metadata field search: field.value
   *       - Targeted search using bracket notation: [field.value, field2.value2]
   *       - Filter by privacy level, user, and MIME type
   *       - Pagination with configurable limits or bypass pagination entirely
   *     security:
   *       - bearerAuth: []
   *     tags: ['Documents']
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
   *         description: Number of documents per page
   *       - in: query
   *         name: noLimit
   *         schema:
   *           type: boolean
   *           default: false
   *         description: |
   *           When true, bypasses pagination and returns all documents matching the filters.
   *           When enabled, the page and limit parameters are ignored.
   *           Use with caution as this can return large datasets.
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: Sort direction based on creation date
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *           minLength: 1
   *         description: |
   *           Search term for filename, metadata, or OCR text. Supports multiple search formats:
   *           - General search: "Saarinen" (searches across all fields)
   *           - Single field search: "author.Saarinen" (searches only in author field)
   *           - Multi-field search: "[author.Saarinen, personNames.Saarinen]" (searches in specific fields)
   *           - Date range search: "[exactDate.2025-09-13:2025-09-15]" (searches for dates within range)
   *         examples:
   *           general:
   *             value: "Saarinen"
   *             summary: General search across all fields
   *           single_field:
   *             value: "author.Saarinen"
   *             summary: Search only in author field
   *           multi_field:
   *             value: "[author.Saarinen, personNames.Saarinen]"
   *             summary: Search in multiple specific fields
   *           date_range:
   *             value: "[exactDate.2025-09-13:2025-09-15]"
   *             summary: Search for documents with dates within the specified range
   *       - in: query
   *         name: documentPrivacy
   *         schema:
   *           type: string
   *           enum: [PUBLIC, PRIVATE, GROUP, RESEARCH_ONLY]
   *         description: Filter by document privacy level
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by document owner
   *       - in: query
   *         name: groupId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by group share target
   *       - in: query
   *         name: mimeType
   *         schema:
   *           type: string
   *         description: Filter by MIME type
   *     responses:
   *       200:
   *         description: Documents retrieved successfully
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
   *                     documents:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Document'
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
    requirePermission('documents:read'),
    searchOperationLimiter,
    asyncHandler(
      documentsController.listDocuments.bind(documentsController) as EndpointServiceCall,
    ),
  );

  /**
   * @openapi
   * /api/v2/documents/{id}:
   *   get:
   *     summary: Get document by ID
   *     operationId: getDocumentById
   *     x-permissions:
   *       - documents:read
   *     description: |
   *       Retrieves a document by its unique identifier.
   *       Access is controlled by document privacy settings and user permissions.
   *
   *       **Required Permission**: `documents:read` (for accessible documents)
   *     security:
   *       - bearerAuth: []
   *     tags: ['Documents']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Document's unique identifier
   *     responses:
   *       200:
   *         description: Document retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/Document'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.get('/:id', asyncHandler(documentsController.getDocumentById.bind(documentsController)));

  /**
   * @openapi
   * /api/v2/documents/{id}:
   *   put:
   *     summary: Update document
   *     operationId: updateDocument
   *     x-permissions:
   *       - documents:update
   *     description: |
   *       Updates a document's metadata and settings.
   *       Users can only update their own documents unless they have admin/moderator permissions.
   *
   *       **Required Permission**: Own document or `documents:update`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Documents']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Document's unique identifier
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               fileName:
   *                 type: string
   *                 description: Current filename in storage
   *               originalFileName:
   *                 type: string
   *                 description: Original upload filename
   *               mimeType:
   *                 type: string
   *                 description: File MIME type
   *               documentPrivacy:
   *                 type: string
   *                 enum: [PUBLIC, PRIVATE, GROUP, RESEARCH_ONLY]
   *                 description: Document privacy level
   *               shareToGroup:
   *                 type: boolean
   *                 description: Enable group sharing
   *               groupToShare:
   *                 type: string
   *                 format: uuid
   *                 description: Specific group ID for sharing
   *               metadata:
   *                 type: object
   *                 description: Document metadata (JSON)
   *               aiModified:
   *                 type: boolean
   *                 description: Indicates if AI modified any fields
   *                 example: true
   *               aiModifiedFields:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: List of fields modified by AI
   *                 example: ["author", "keywords"]
   *               hasErrors:
   *                 type: boolean
   *                 description: Indicated if AI found errors in file
   *                 example: false
   *               errorTypes:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: List of error types
   *                 example: ["postIt"]
   *               errorPageNumbers:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: List of files page numbers where error was found
   *     responses:
   *       200:
   *         description: Document updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/Document'
   *                 message:
   *                   type: string
   *                   example: Document updated successfully
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
    asyncHandler(
      documentsController.updateDocument.bind(documentsController) as EndpointServiceCall,
    ),
  );

  /**
   * @openapi
   * /api/v2/documents/{id}:
   *   delete:
   *     summary: Delete document
   *     operationId: deleteDocument
   *     x-permissions:
   *       - documents:delete
   *     description: |
   *       Deletes a document permanently. This is an irreversible operation.
   *       Users can only delete their own documents unless they have admin/moderator permissions.
   *
   *       **Required Permission**: Own document or `documents:delete`
   *     security:
   *       - bearerAuth: []
   *     tags: ['Documents']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Document's unique identifier
   *     responses:
   *       200:
   *         description: Document deleted successfully
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
   *                   example: Document deleted successfully
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.delete(
    '/:id',
    requirePermission('documents:delete'),
    criticalOperationLimiter,
    asyncHandler(documentsController.deleteDocument.bind(documentsController)),
  );

  return router;
};
