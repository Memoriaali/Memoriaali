import { RequestHandler, Router } from 'express';

import { authenticateUser } from '../../middleware/index.js';
import { EndpointServiceCall } from '../../shared/types/api.type.js';
import { asyncHandler } from '../../shared/utils/response.utils.js';

import { prisma } from '../../shared/database/prisma.js';
import { FilesController } from './files.controller.js';
import { FilesService } from './files.service.js';

/**
 * File download routes with comprehensive access control
 *
 * Provides file download functionality with proper permission handling.
 * Implements document privacy checks and secure file delivery.
 *
 * Security Features:
 * - Authentication required for all routes
 * - Document privacy validation
 * - File access control based on user permissions
 * - Secure file streaming with proper headers
 */

/**
 * Create and configure file download routes
 *
 * @returns Configured router with file download endpoints
 */
export const createFilesRoutes = (): Router => {
  const router = Router();

  // Initialize services
  const filesService = new FilesService(prisma);
  const filesController = new FilesController(filesService);

  // Apply authentication middleware to all routes
  router.use(authenticateUser as RequestHandler);

  /**
   * @swagger
   * /api/v2/files/{document_id}:
   *   get:
   *     summary: Download file for a document
   *     description: |
   *       Downloads the file associated with a specific document ID.
   *       Access is controlled by document privacy settings and user permissions.
   *
   *       **Access Control**:
   *       - Document owner can always download their files
   *       - Public documents can be downloaded by any authenticated user
   *       - Private documents cannot be downloaded (access denied)
   *       - Group and research-only documents require specific permissions
   *       - Admins and moderators can download any accessible document
   *
   *       **File Delivery**:
   *       - Files are streamed directly from storage
   *       - Appropriate MIME type and content disposition headers are set
   *       - File size is included in response headers
   *       - Supports large files through streaming
   *     security:
   *       - bearerAuth: []
   *     tags: ['File Downloads']
   *     parameters:
   *       - name: document_id
   *         in: path
   *         required: true
   *         description: Document's unique identifier
   *         schema:
   *           type: string
   *           format: uuid
   *           example: "123e4567-e89b-12d3-a456-426614174000"
   *     responses:
   *       200:
   *         description: File downloaded successfully
   *         content:
   *           application/octet-stream:
   *             schema:
   *               type: string
   *               format: binary
   *             description: File content streamed as binary data
   *         headers:
   *           Content-Type:
   *             description: MIME type of the file
   *             schema:
   *               type: string
   *               example: "image/jpeg"
   *           Content-Disposition:
   *             description: File download disposition
   *             schema:
   *               type: string
   *               example: "attachment; filename=document.jpg"
   *           Content-Length:
   *             description: Size of the file in bytes
   *             schema:
   *               type: string
   *               example: "1048576"
   *       400:
   *         description: Bad request - invalid document ID
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 error:
   *                   type: string
   *                   example: Invalid document ID
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         description: Forbidden - access denied or document is private
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 error:
   *                   type: string
   *                   example: Access denied to this document
   *                 details:
   *                   type: string
   *                   example: Document is private or you lack required permissions
   *       404:
   *         description: Not found - document or file not found
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 error:
   *                   type: string
   *                   example: Document not found
   *                 details:
   *                   type: string
   *                   example: The requested document does not exist
   *       500:
   *         description: Internal server error during file processing
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 error:
   *                   type: string
   *                   example: File streaming error
   *                 details:
   *                   type: string
   *                   example: Failed to read file from storage
   */
  router.get(
    '/:document_id',
    asyncHandler(filesController.downloadFile.bind(filesController) as EndpointServiceCall),
  );

  return router;
};
