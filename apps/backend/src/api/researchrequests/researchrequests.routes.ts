import { Router, type RequestHandler } from 'express';

import { prisma } from '../../shared/database/prisma';

import { authenticateUser } from '../../middleware/authentication.middleware';
import { asyncHandler } from '../../shared/utils/response.utils';

import { ResearchRequestsController } from './researchrequests.controller';
import { ResearchRequestsService } from './researchrequests.service';

/**
 * Research Requests Routes Factory
 *
 * Creates and configures Express routes for research request management.
 * Applies authentication middleware to all routes.
 *
 * @returns Configured Express router for research request endpoints
 */
export const createResearchRequestRoutes = (): Router => {
  const router = Router();

  // Initialize service and controller
  const researchRequestsService = new ResearchRequestsService(prisma);
  const researchRequestsController = new ResearchRequestsController(researchRequestsService);

  // Apply authentication middleware to all routes
  router.use(authenticateUser as RequestHandler);

  /**
   * @swagger
   * /api/v2/researchrequests:
   *   post:
   *     summary: Create a new research request
   *     description: |
   *       Creates a new research request for accessing restricted documents.
   *       Research requests enable users to request access to documents with RESEARCH_ONLY privacy level.
   *
   *       **Required Permission**: Authenticated user
   *     security:
   *       - bearerAuth: []
   *     tags: ['Research Requests']
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - documentId
   *               - purpose
   *             properties:
   *               documentId:
   *                 type: string
   *                 format: uuid
   *                 description: ID of the document to request access to
   *               purpose:
   *                 type: string
   *                 maxLength: 10000
   *                 description: Research purpose and justification
   *               researchStartDate:
   *                 type: string
   *                 format: date-time
   *                 description: Planned start date for research (optional)
   *               researchEndDate:
   *                 type: string
   *                 format: date-time
   *                 description: Planned end date for research (optional)
   *     responses:
   *       201:
   *         description: Research request created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/ResearchRequest'
   *                 message:
   *                   type: string
   *                   example: Research request created successfully
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *   get:
   *     summary: Get research requests
   *     description: |
   *       Retrieves a paginated list of research requests.
   *       Regular users can only see their own requests, while admins can see all requests.
   *
   *       **Required Permission**: Authenticated user
   *     security:
   *       - bearerAuth: []
   *     tags: ['Research Requests']
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
   *         name: state
   *         schema:
   *           type: string
   *           enum: [PENDING, APPROVED, REJECTED]
   *         description: Filter by request state
   *       - in: query
   *         name: documentId
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Filter by document ID
   *     responses:
   *       200:
   *         description: Research requests retrieved successfully
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
   *                     $ref: '#/components/schemas/ResearchRequest'
   *                 pagination:
   *                   $ref: '#/components/schemas/PaginationMetadata'
   *                 links:
   *                   $ref: '#/components/schemas/PaginationLinks'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   */
  router.post(
    '/',
    asyncHandler(researchRequestsController.createResearchRequest.bind(researchRequestsController)),
  );
  router.get(
    '/',
    asyncHandler(researchRequestsController.getResearchRequests.bind(researchRequestsController)),
  );

  /**
   * @swagger
   * /api/v2/researchrequests/{id}:
   *   get:
   *     summary: Get research request by ID
   *     description: |
   *       Retrieves a specific research request by its ID.
   *       Users can only access their own requests, while admins can access any request.
   *
   *       **Required Permission**: Authenticated user (owner or admin)
   *     security:
   *       - bearerAuth: []
   *     tags: ['Research Requests']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Research request ID
   *     responses:
   *       200:
   *         description: Research request retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/ResearchRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *   put:
   *     summary: Update research request
   *     description: |
   *       Updates a research request. Only admins or document owners can update requests.
   *       This endpoint allows changing the state (approve/reject) and other details.
   *
   *       **Required Permission**: Admin or document owner
   *     security:
   *       - bearerAuth: []
   *     tags: ['Research Requests']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Research request ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               state:
   *                 type: string
   *                 enum: [PENDING, APPROVED, REJECTED]
   *                 description: New state for the request
   *               purpose:
   *                 type: string
   *                 description: Updated research purpose/justification
   *               rejectionExplanation:
   *                 type: string
   *                 description: Explanation for rejection (required when rejecting)
   *               researchStartDate:
   *                 type: string
   *                 format: date-time
   *                 description: Updated research start date
   *               researchEndDate:
   *                 type: string
   *                 format: date-time
   *                 description: Updated research end date
   *     responses:
   *       200:
   *         description: Research request updated successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/ResearchRequest'
   *                 message:
   *                   type: string
   *                   example: Research request updated successfully
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   *   delete:
   *     summary: Delete research request
   *     description: |
   *       Deletes a research request. Only the request owner or admins can delete requests.
   *       Only pending requests can be deleted.
   *
   *       **Required Permission**: Request owner or admin
   *     security:
   *       - bearerAuth: []
   *     tags: ['Research Requests']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Research request ID
   *     responses:
   *       200:
   *         description: Research request deleted successfully
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
   *                   example: Research request deleted successfully
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  router.get(
    '/:id',
    asyncHandler(
      researchRequestsController.getResearchRequestById.bind(researchRequestsController),
    ),
  );
  router.put(
    '/:id',
    asyncHandler(researchRequestsController.updateResearchRequest.bind(researchRequestsController)),
  );
  router.delete(
    '/:id',
    asyncHandler(researchRequestsController.deleteResearchRequest.bind(researchRequestsController)),
  );

  /**
   * @swagger
   * /api/v2/researchrequests/{id}/approve:
   *   post:
   *     summary: Approve research request
   *     description: |
   *       Approves a pending research request. Only admins or document owners can approve requests.
   *       Only pending requests can be approved.
   *
   *       **Required Permission**: Admin or document owner
   *     security:
   *       - bearerAuth: []
   *     tags: ['Research Requests']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Research request ID
   *     responses:
   *       200:
   *         description: Research request approved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/ResearchRequest'
   *                 message:
   *                   type: string
   *                   example: Research request approved successfully
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   * /api/v2/researchrequests/{id}/reject:
   *   post:
   *     summary: Reject research request
   *     description: |
   *       Rejects a pending research request with an explanation. Only admins or document owners can reject requests.
   *       Only pending requests can be rejected.
   *
   *       **Required Permission**: Admin or document owner
   *     security:
   *       - bearerAuth: []
   *     tags: ['Research Requests']
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: Research request ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - rejectionExplanation
   *             properties:
   *               rejectionExplanation:
   *                 type: string
   *                 minLength: 1
   *                 description: Explanation for rejecting the research request
   *     responses:
   *       200:
   *         description: Research request rejected successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/ResearchRequest'
   *                 message:
   *                   type: string
   *                   example: Research request rejected successfully
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       404:
   *         $ref: '#/components/responses/NotFound'
   */
  // Approve/Reject specific endpoints
  router.post(
    '/:id/approve',
    asyncHandler(
      researchRequestsController.approveResearchRequest.bind(researchRequestsController),
    ),
  );
  router.post(
    '/:id/reject',
    asyncHandler(researchRequestsController.rejectResearchRequest.bind(researchRequestsController)),
  );

  return router;
};
