/**
 * DocumentsInCollections Routes
 *
 * Express router configuration for document-collection relationship management.
 * Provides RESTful endpoints for adding and removing documents from collections.
 *
 * Design by Contract:
 * - Preconditions: Valid route configuration, proper middleware setup
 * - Postconditions: Routes properly mounted, middleware applied
 * - Invariants: Consistent route patterns, proper HTTP methods
 */

import { RequestHandler, Router } from 'express';

import { authenticateUser } from '../../middleware';
import { prisma } from '../../shared/database/prisma';
import type { AuthenticatedRequest } from '../../shared/types/AuthenticatedRequest';
import { asyncHandler } from '../../shared/utils/response.utils';

import { DocumentsInCollectionsController } from './documentsincollections.controller';
import { DocumentsInCollectionsService } from './documentsincollections.service';

/**
 * Create DocumentsInCollections routes
 *
 * Sets up Express router with authentication middleware and route handlers
 * for document-collection relationship management.
 *
 * Design by Contract:
 * - Preconditions: Valid route configuration, proper middleware setup
 * - Postconditions: Router configured with all endpoints and middleware
 * - Invariants: Consistent route patterns, proper HTTP methods
 */
export const createDocumentsInCollectionsRoutes = (): Router => {
  const router = Router();

  // Initialize service and controller
  const documentsInCollectionsService = new DocumentsInCollectionsService(prisma);
  const documentsInCollectionsController = new DocumentsInCollectionsController(
    documentsInCollectionsService,
  );

  // Apply authentication middleware to all routes
  router.use(authenticateUser as RequestHandler);

  // ================================================================================================
  // DOCUMENT-COLLECTION RELATIONSHIP ENDPOINTS
  // ================================================================================================

  /**
   * @openapi
   * /api/v2/documentsincollections/{collectionId}:
   *   get:
   *     summary: Get all documents in a collection
   *     operationId: listDocumentsInCollection
   *     x-permissions:
   *       - collections:read
   *     description: |
   *       Retrieves a paginated list of all documents that belong to a specific collection.
   *       This endpoint provides comprehensive document information including metadata,
   *       user details, and when the document was added to the collection.
   *
   *       **Required Permission**: User must have access to the collection
   *
   *       **Authorization Rules**:
   *       - Collection owner has full access to all documents in their collection
   *       - Admin and moderator users have access to all collections
   *       - Regular users can only see documents they have access to within the collection
   *         (public documents, their own documents, or group-shared documents they have access to)
   *
   *       **Document Access Rules**:
   *       - Document owners always see their documents
   *       - Public documents are visible to all users
   *       - Group-shared documents are only visible to group members
   *       - Admin/moderator users can see all documents
   *
   *       **Pagination**: Results are paginated with configurable page size
   *     security:
   *       - bearerAuth: []
   *     tags: ['Documents in Collections']
   *     parameters:
   *       - in: path
   *         name: collectionId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Unique identifier of the collection
   *         example: "550e8400-e29b-41d4-a716-446655440001"
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Page number for pagination
   *         example: 1
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 20
   *         description: Number of documents per page
   *         example: 20
   *     responses:
   *       200:
   *         description: Successfully retrieved documents in collection
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 collection:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       format: uuid
   *                       description: Collection ID
   *                       example: "550e8400-e29b-41d4-a716-446655440001"
   *                     collectionName:
   *                       type: string
   *                       description: Collection display name
   *                       example: "WWII Historical Photos"
   *                     collectionDescription:
   *                       type: string
   *                       description: Collection description
   *                       example: "Historical photographs from World War II period"
   *                 documents:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       id:
   *                         type: integer
   *                         description: Document ID
   *                         example: 123
   *                       fileName:
   *                         type: string
   *                         description: Document filename
   *                         example: "wwii_photo_1944.jpg"
   *                       metadata:
   *                         type: object
   *                         description: Document metadata (JSON)
   *                       documentPrivacy:
   *                         type: string
   *                         description: Document privacy level
   *                         example: "PUBLIC"
   *                       userId:
   *                         type: integer
   *                         description: Document owner ID
   *                         example: 456
   *                       createdAt:
   *                         type: string
   *                         format: date-time
   *                         description: Document creation timestamp
   *                       updatedAt:
   *                         type: string
   *                         format: date-time
   *                         description: Document last update timestamp
   *                       addedToCollectionAt:
   *                         type: string
   *                         format: date-time
   *                         description: When document was added to this collection
   *                       addedBy:
   *                         type: string
   *                         format: uuid
   *                         description: User ID who added document to collection
   *                       user:
   *                         type: object
   *                         properties:
   *                           id:
   *                             type: string
   *                             format: uuid
   *                             description: User ID
   *                           username:
   *                             type: string
   *                             description: Username
   *                           firstName:
   *                             type: string
   *                             nullable: true
   *                             description: User's first name
   *                           lastName:
   *                             type: string
   *                             nullable: true
   *                             description: User's last name
   *                 pagination:
   *                   type: object
   *                   properties:
   *                     page:
   *                       type: integer
   *                       description: Current page number
   *                       example: 1
   *                     limit:
   *                       type: integer
   *                       description: Documents per page
   *                       example: 20
   *                     totalCount:
   *                       type: integer
   *                       description: Total number of documents in collection
   *                       example: 150
   *                     totalPages:
   *                       type: integer
   *                       description: Total number of pages
   *                       example: 8
   *                     hasNextPage:
   *                       type: boolean
   *                       description: Whether there are more pages
   *                       example: true
   *                     hasPreviousPage:
   *                       type: boolean
   *                       description: Whether there are previous pages
   *                       example: false
   *             examples:
   *               wwiiCollection:
   *                 summary: WWII Collection documents
   *                 value:
   *                   collection:
   *                     id: "550e8400-e29b-41d4-a716-446655440001"
   *                     collectionName: "WWII Historical Photos"
   *                     collectionDescription: "Historical photographs from World War II period"
   *                   documents:
   *                     - id: 123
   *                       fileName: "wwii_photo_1944.jpg"
   *                       metadata: { "title": "Soldiers in Helsinki", "date": "1944" }
   *                       documentPrivacy: "PUBLIC"
   *                       userId: 456
   *                       createdAt: "2024-01-15T10:30:00Z"
   *                       updatedAt: "2024-01-15T10:30:00Z"
   *                       addedToCollectionAt: "2024-01-20T14:22:00Z"
   *                       addedBy: "550e8400-e29b-41d4-a716-446655440002"
   *                       user:
   *                         id: "550e8400-e29b-41d4-a716-446655440002"
   *                         username: "archivist"
   *                         firstName: "John"
   *                         lastName: "Doe"
   *                   pagination:
   *                     page: 1
   *                     limit: 20
   *                     totalCount: 150
   *                     totalPages: 8
   *                     hasNextPage: true
   *                     hasPreviousPage: false
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         description: Access denied to collection
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Access denied to collection"
   *                 code:
   *                   type: string
   *                   example: "ACCESS_DENIED"
   *       404:
   *         description: Collection not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Collection not found"
   *                 code:
   *                   type: string
   *                   example: "COLLECTION_NOT_FOUND"
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  router.get(
    '/:collectionId',
    asyncHandler<AuthenticatedRequest>(documentsInCollectionsController.getDocumentsInCollection),
  );

  /**
   * @openapi
   * /api/v2/documentsincollections:
   *   post:
   *     summary: Add a document to a collection
   *     operationId: addDocumentToCollection
   *     x-permissions:
   *       - collections:update
   *     description: |
   *       Creates a relationship between a document and a collection, allowing the document
   *       to be organized within the collection. This implements a many-to-many relationship
   *       between documents and collections with proper audit trails.
   *
   *       **Required Permission**: User must have access to both the document and collection
   *
   *       **Authorization Rules**:
   *       - Document owner always has access
   *       - Public documents are accessible to all users
   *       - Group-shared documents require group membership
   *       - Collection owner or admin can add documents to their collections
   *
   *       **Audit Trail**: The relationship creation is tracked with user ID and timestamp
   *     security:
   *       - bearerAuth: []
   *     tags: ['Documents in Collections']
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - documentId
   *               - collectionId
   *             properties:
   *               documentId:
   *                 type: string
   *                 format: uuid
   *                 description: Unique identifier of the document to add
   *                 example: "550e8400-e29b-41d4-a716-446655440000"
   *               collectionId:
   *                 type: string
   *                 format: uuid
   *                 description: Unique identifier of the collection to add the document to
   *                 example: "550e8400-e29b-41d4-a716-446655440001"
   *           examples:
   *             historicalPhoto:
   *               summary: Add historical photo to WWII collection
   *               value:
   *                 documentId: "550e8400-e29b-41d4-a716-446655440000"
   *                 collectionId: "550e8400-e29b-41d4-a716-446655440001"
   *     responses:
   *       201:
   *         description: Document successfully added to collection
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: string
   *                   format: uuid
   *                   description: Unique identifier of the relationship
   *                   example: "550e8400-e29b-41d4-a716-446655440002"
   *                 documentId:
   *                   type: string
   *                   format: uuid
   *                   description: Document identifier
   *                   example: "550e8400-e29b-41d4-a716-446655440000"
   *                 collectionId:
   *                   type: string
   *                   format: uuid
   *                   description: Collection identifier
   *                   example: "550e8400-e29b-41d4-a716-446655440001"
   *                 createdAt:
   *                   type: string
   *                   format: date-time
   *                   description: When the document was added to the collection
   *                   example: "2024-01-01T00:00:00.000Z"
   *                 updatedAt:
   *                   type: string
   *                   format: date-time
   *                   description: Last modification timestamp
   *                   example: "2024-01-01T00:00:00.000Z"
   *                 createdById:
   *                   type: string
   *                   format: uuid
   *                   description: User who added the document to the collection
   *                   example: "550e8400-e29b-41d4-a716-446655440003"
   *                 updatedById:
   *                   type: string
   *                   format: uuid
   *                   description: User who last modified this relationship
   *                   example: "550e8400-e29b-41d4-a716-446655440003"
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       404:
   *         description: Document or collection not found, or access denied
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Document or collection not found"
   *                 code:
   *                   type: string
   *                   example: "DOCUMENT_NOT_FOUND"
   *       409:
   *         description: Document is already in this collection
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Document is already in this collection"
   *                 code:
   *                   type: string
   *                   example: "DUPLICATE_RELATIONSHIP"
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  router.post(
    '/',
    asyncHandler<AuthenticatedRequest>(documentsInCollectionsController.addDocumentToCollection),
  );

  /**
   * @openapi
   * /api/v2/documentsincollections:
   *   delete:
   *     summary: Remove a document from a collection
   *     operationId: removeDocumentFromCollection
   *     x-permissions:
   *       - collections:update
   *     description: |
   *       Removes the relationship between a document and a collection, effectively
   *       removing the document from the collection. This operation maintains data
   *       integrity and provides audit trails for relationship management.
   *
   *       **Required Permission**: User must have access to both the document and collection
   *
   *       **Authorization Rules**:
   *       - Document owner can remove from any collection
   *       - Collection owner can remove any document from their collection
   *       - Admin users can remove any document from any collection
   *       - Regular users can only remove documents they have access to from collections they own
   *
   *       **Audit Trail**: The relationship removal is tracked with user ID and timestamp
   *     security:
   *       - bearerAuth: []
   *     tags: ['Documents in Collections']
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - documentId
   *               - collectionId
   *             properties:
   *               documentId:
   *                 type: string
   *                 format: uuid
   *                 description: Unique identifier of the document to remove
   *                 example: "550e8400-e29b-41d4-a716-446655440000"
   *               collectionId:
   *                 type: string
   *                 format: uuid
   *                 description: Unique identifier of the collection to remove the document from
   *                 example: "550e8400-e29b-41d4-a716-446655440001"
   *           examples:
   *             removeHistoricalPhoto:
   *               summary: Remove historical photo from WWII collection
   *               value:
   *                 documentId: "550e8400-e29b-41d4-a716-446655440000"
   *                 collectionId: "550e8400-e29b-41d4-a716-446655440001"
   *     responses:
   *       200:
   *         description: Document successfully removed from collection
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   description: Operation success status
   *                   example: true
   *                 message:
   *                   type: string
   *                   description: Success message
   *                   example: "Document removed from collection successfully"
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       404:
   *         description: Document or collection not found, or document not in collection
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 error:
   *                   type: string
   *                   example: "Document not found in collection"
   *                 code:
   *                   type: string
   *                   example: "RELATIONSHIP_NOT_FOUND"
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  router.delete(
    '/',
    asyncHandler<AuthenticatedRequest>(
      documentsInCollectionsController.removeDocumentFromCollection,
    ),
  );

  return router;
};
