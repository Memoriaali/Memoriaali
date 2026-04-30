import { RequestHandler, Router } from 'express';

import { authenticateUser } from '../../middleware';
import { prisma } from '../../shared/database/prisma';
import { asyncHandler } from '../../shared/utils/response.utils';

import { CollectionsController } from './collections.controller';
import { CollectionsService } from './collections.service';

/**
 * Collection management routes with role-based permission control
 *
 * Provides comprehensive collection management endpoints with proper permission handling.
 * Only authenticated users with appropriate permissions can access these routes.
 *
 * Security Features:
 * - Authentication required for all routes
 * - Permission-based access control
 * - Request validation
 * - Comprehensive error handling
 */

/**
 * Create and configure collection routes
 *
 * @returns Configured router with collection endpoints
 */
export const createCollectionRoutes = (): Router => {
  const router = Router();

  // Initialize services
  const collectionsService = new CollectionsService(prisma);
  const collectionsController = new CollectionsController(collectionsService);

  // Apply authentication middleware to all routes
  router.use(authenticateUser as RequestHandler);

  /**
   * @openapi
   * /api/v2/collections:
   *   post:
   *     summary: Create new collection
   *     operationId: createCollection
   *     x-permissions:
   *       - collections:create
   *     description: |
   *       Creates a new collection for organizing documents.
   *       Users can create collections to group related documents together.
   *
   *       **Required Permission**: `collections:create`
   *
   *       The endpoint validates:
   *       - Collection name uniqueness
   *       - Required fields (name, description)
   *       - Field length limits
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Collections
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - collectionName
   *               - collectionDescription
   *             properties:
   *               collectionName:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 500
   *                 description: Name of the collection (must be unique)
   *               collectionDescription:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 2000
   *                 description: Detailed description of the collection
   *     responses:
   *       201:
   *         description: Collection created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/Collection'
   *                 message:
   *                   type: string
   *                   example: Collection created successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Authentication required
   *       409:
   *         description: Collection name already exists
   *       500:
   *         description: Internal server error
   */
  router.post('/', asyncHandler(collectionsController.createCollection));

  /**
   * @openapi
   * /api/v2/collections:
   *   get:
   *     summary: List collections
   *     operationId: listCollections
   *     x-permissions:
   *       - collections:read
   *     description: |
   *       Retrieves a paginated list of collections that the user has access to.
   *       Users can see collections they created, and admins can see all collections.
   *
   *       **Required Permission**: `collections:read`
   *
   *       Supports:
   *       - Pagination
   *       - Search by name or description
   *       - Sorting by various fields
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Collections
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
   *           default: 20
   *         description: Number of items per page
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Search term for collection name or description
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [createdAt, updatedAt, collectionName]
   *           default: createdAt
   *         description: Field to sort by
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: Sort order
   *     responses:
   *       200:
   *         description: Collections retrieved successfully
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
   *                     data:
   *                       type: array
   *                       items:
   *                         $ref: '#/components/schemas/Collection'
   *                     meta:
   *                       $ref: '#/components/schemas/PaginationMetadata'
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Internal server error
   */
  router.get('/', asyncHandler(collectionsController.listCollections));

  /**
   * @openapi
   * /api/v2/collections/count:
   *   get:
   *     summary: Get collection count
   *     operationId: getCollectionCount
   *     x-permissions:
   *       - collections:read
   *     description: |
   *       Returns the total number of collections that the user has access to.
   *       Users see count of their own collections, admins see total count.
   *
   *       **Required Permission**: `collections:read`
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Collections
   *     responses:
   *       200:
   *         description: Collection count retrieved successfully
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
   *                     count:
   *                       type: integer
   *                       example: 5
   *       401:
   *         description: Authentication required
   *       500:
   *         description: Internal server error
   */
  router.get('/count', asyncHandler(collectionsController.getCollectionCount));

  /**
   * @openapi
   * /api/v2/collections/{id}:
   *   get:
   *     summary: Get collection by ID
   *     operationId: getCollectionById
   *     x-permissions:
   *       - collections:read
   *     description: |
   *       Retrieves a specific collection by its ID.
   *       Users can only access collections they created, admins can access all.
   *
   *       **Required Permission**: `collections:read`
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Collections
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Collection ID
   *     responses:
   *       200:
   *         description: Collection retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/Collection'
   *       400:
   *         description: Invalid collection ID
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Access denied
   *       404:
   *         description: Collection not found
   *       500:
   *         description: Internal server error
   */
  router.get('/:id', asyncHandler(collectionsController.getCollectionById));

  /**
   * @openapi
   * /api/v2/collections/{id}:
   *   put:
   *     summary: Update collection
   *     operationId: updateCollection
   *     x-permissions:
   *       - collections:update
   *     description: |
   *       Updates an existing collection.
   *       Users can only update collections they created, admins can update any.
   *
   *       **Required Permission**: `collections:update`
   *
   *       The endpoint validates:
   *       - Collection name uniqueness (if name is being updated)
   *       - Required fields
   *       - Field length limits
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Collections
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Collection ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               collectionName:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 500
   *                 description: Name of the collection (must be unique)
   *               collectionDescription:
   *                 type: string
   *                 minLength: 1
   *                 maxLength: 2000
   *                 description: Detailed description of the collection
   *     responses:
   *       200:
   *         description: Collection updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/Collection'
   *                 message:
   *                   type: string
   *                   example: Collection updated successfully
   *       400:
   *         description: Invalid input data
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Access denied
   *       404:
   *         description: Collection not found
   *       409:
   *         description: Collection name already exists
   *       500:
   *         description: Internal server error
   */
  router.put('/:id', asyncHandler(collectionsController.updateCollection));

  /**
   * @openapi
   * /api/v2/collections/{id}:
   *   delete:
   *     summary: Delete collection
   *     operationId: deleteCollection
   *     x-permissions:
   *       - collections:delete
   *     description: |
   *       Deletes a collection. Collections with documents cannot be deleted.
   *       Users can only delete collections they created, admins can delete any.
   *
   *       **Required Permission**: `collections:delete`
   *
   *       **Note**: Collections that contain documents cannot be deleted.
   *       Remove all documents from the collection first.
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Collections
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Collection ID
   *     responses:
   *       200:
   *         description: Collection deleted successfully
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
   *                   example: Collection deleted successfully
   *       400:
   *         description: Collection contains documents and cannot be deleted
   *       401:
   *         description: Authentication required
   *       403:
   *         description: Access denied
   *       404:
   *         description: Collection not found
   *       500:
   *         description: Internal server error
   */
  router.delete('/:id', asyncHandler(collectionsController.deleteCollection));

  return router;
};
