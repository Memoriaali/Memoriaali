import { RequestHandler, Router } from 'express';

import { authenticateUser, criticalOperationLimiter, requirePermission } from '../../middleware';
import { EndpointServiceCall } from '../../shared/types/api.type';
import { asyncHandler } from '../../shared/utils/response.utils';

import { SIPController } from './sip.controller';

/**
 * SIP (Submission Information Package) routes
 *
 * Provides endpoints for creating E-ARK compliant archival packages
 * from selected documents with real-time progress monitoring.
 *
 * Security Features:
 * - Authentication required for all routes
 * - Permission-based access control
 * - Rate limiting for resource-intensive operations
 * - Job ownership validation
 */

/**
 * Create and configure SIP routes
 *
 * @returns Configured router with SIP endpoints
 */
export const createSIPRoutes = (): Router => {
  const router = Router();

  // Initialize controller
  const sipController = new SIPController();

  // Apply authentication middleware to all routes
  router.use(authenticateUser as RequestHandler);

  /**
   * @openapi
   * /api/v2/sip/create:
   *   post:
   *     operationId: createSIPPackage
   *     summary: Create SIP archival package
   *     description: |
   *       Creates a new SIP (Submission Information Package) from selected documents.
   *       The package is E-ARK compliant and includes all necessary metadata.
   *
   *       **Required Permission**: `documents:publish`
   *
   *       The process includes:
   *       - Document validation and access verification
   *       - Metadata generation (Dublin Core, PREMIS, EAD)
   *       - Java-based package creation
   *       - Asynchronous processing with job queue
   *     security:
   *       - BearerAuth: []
   *     x-permissions:
   *       - sip:write
   *     tags:
   *       - SIP
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateSIPRequest'
   *     responses:
   *       201:
   *         description: SIP job created successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CreateSIPResponse'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       503:
   *         description: Queue is full
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.post(
    '/create',
    requirePermission('sip:write'),
    criticalOperationLimiter,
    asyncHandler(sipController.createSIP.bind(sipController) as EndpointServiceCall),
  );

  /**
   * @openapi
   * /api/v2/sip/progress/{jobId}:
   *   get:
   *     operationId: streamSIPProgress
   *     summary: Stream job progress updates
   *     description: |
   *       Server-Sent Events endpoint for real-time SIP job progress monitoring.
   *       Streams progress updates until the job completes, fails, or is cancelled.
   *
   *       **Note**: This is an SSE endpoint that streams data continuously.
   *       Clients should use EventSource API or similar to consume the stream.
   *
   *       **Authorization**: Users can only access their own jobs unless they have admin privileges.
   *     security:
   *       - BearerAuth: []
   *     x-permissions:
   *       - sip:read
   *     tags:
   *       - SIP
   *     parameters:
   *       - in: path
   *         name: jobId
   *         required: true
   *         schema:
   *           type: string
   *         description: SIP job identifier
   *         example: sip-abc123
   *     responses:
   *       200:
   *         description: SSE stream established
   *         content:
   *           text/event-stream:
   *             schema:
   *               type: string
   *               description: |
   *                 Server-Sent Events stream with progress updates.
   *                 Events include: progress, heartbeat, close
   *               example: |
   *                 event: progress
   *                 data: {"jobId":"sip-abc123","stage":"validating","progress":25,"message":"Validating documents"}
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         description: Access denied to job
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Job not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.get(
    '/progress/:jobId',
    requirePermission('sip:read'),
    asyncHandler(sipController.streamProgress.bind(sipController) as EndpointServiceCall),
  );

  /**
   * @openapi
   * /api/v2/sip/jobs:
   *   get:
   *     operationId: listSIPJobs
   *     summary: List SIP jobs
   *     description: |
   *       Retrieves a paginated list of SIP jobs with optional filtering.
   *       Regular users can only see their own jobs, while administrators
   *       can view all jobs in the system.
   *
   *       **Required Permission**: `documents:read`
   *     security:
   *       - BearerAuth: []
   *     x-permissions:
   *       - documents:read
   *     tags:
   *       - SIP
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
   *         description: Number of jobs per page
   *       - in: query
   *         name: status
   *         schema:
   *           type: string
   *           enum: [pending, processing, completed, failed, cancelled]
   *         description: Filter by job status
   *       - in: query
   *         name: userId
   *         schema:
   *           type: string
   *         description: Filter by user ID (admin only)
   *       - in: query
   *         name: sortBy
   *         schema:
   *           type: string
   *           enum: [createdAt, startedAt, completedAt, status]
   *           default: createdAt
   *         description: Sort field
   *       - in: query
   *         name: sortOrder
   *         schema:
   *           type: string
   *           enum: [asc, desc]
   *           default: desc
   *         description: Sort order
   *     responses:
   *       200:
   *         description: Jobs retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ListSIPJobsResponse'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   */
  router.get(
    '/jobs',
    requirePermission('sip:read'),
    asyncHandler(sipController.listJobs.bind(sipController) as EndpointServiceCall),
  );

  /**
   * @openapi
   * /api/v2/sip/jobs/{jobId}:
   *   get:
   *     operationId: getSIPJob
   *     summary: Get SIP job details
   *     description: |
   *       Retrieves detailed information about a specific SIP job.
   *       Users can only access their own jobs unless they have admin privileges.
   *
   *       **Authorization**: Job ownership or admin role required
   *     security:
   *       - BearerAuth: []
   *     x-permissions:
   *       - sip:read
   *     tags:
   *       - SIP
   *     parameters:
   *       - in: path
   *         name: jobId
   *         required: true
   *         schema:
   *           type: string
   *         description: SIP job identifier
   *         example: sip-abc123
   *     responses:
   *       200:
   *         description: Job details retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GetSIPJobResponse'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         description: Access denied to job
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Job not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.get(
    '/jobs/:jobId',
    requirePermission('sip:read'),
    asyncHandler(sipController.getJobDetails.bind(sipController) as EndpointServiceCall),
  );

  /**
   * @openapi
   * /api/v2/sip/jobs/{jobId}:
   *   delete:
   *     operationId: cancelSIPJob
   *     summary: Cancel SIP job
   *     description: |
   *       Cancels a pending SIP job. Only jobs in 'pending' status can be cancelled.
   *       Users can only cancel their own jobs unless they have admin privileges.
   *
   *       **Authorization**: Job ownership or admin role required
   *     security:
   *       - BearerAuth: []
   *     x-permissions:
   *       - sip:write
   *     tags:
   *       - SIP
   *     parameters:
   *       - in: path
   *         name: jobId
   *         required: true
   *         schema:
   *           type: string
   *         description: SIP job identifier
   *         example: sip-abc123
   *     responses:
   *       200:
   *         description: Job cancelled successfully
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/CancelSIPJobResponse'
   *       400:
   *         description: Job cannot be cancelled (wrong status)
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         description: Access denied to job
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   *       404:
   *         description: Job not found
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.delete(
    '/jobs/:jobId',
    requirePermission('sip:write'),
    asyncHandler(sipController.cancelJob.bind(sipController) as EndpointServiceCall),
  );

  return router;
};

export default createSIPRoutes;
