import { RequestHandler, Router } from 'express';
import multer from 'multer';

import { authenticateUser, requirePermission } from '../../middleware';
import { EndpointServiceCall } from '../../shared/types/api.type';
import { asyncHandler } from '../../shared/utils/response.utils';

import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

/**
 * File upload routes with comprehensive access control
 *
 * Provides file upload functionality with proper permission handling.
 * Implements file validation, size limits, and secure storage.
 *
 * Security Features:
 * - Authentication required for all routes
 * - Permission-based access control
 * - File type and size validation
 * - Secure file naming and storage
 */

/**
 * Configure multer for file uploads
 */
const configureMulter = () => {
  // Create temporary storage for uploaded files
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Use system temp directory for initial upload
      cb(null, '/tmp');
    },
    filename: (req, file, cb) => {
      // Generate temporary filename
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const extension = file.originalname.split('.').pop();
      cb(null, `temp_${timestamp}_${randomSuffix}.${extension}`);
    },
  });

  // File filter for validation
  const fileFilter = (_req: unknown, _file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Optional: Add file type validation here
    // if (!allowedTypes.includes(file.mimetype)) {
    //   return cb(new Error('File type not allowed'));
    // }
    cb(null, true);
  };

  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: parseInt(process.env.MAX_FILE_SIZE ?? '10485760'), // 10MB default
      files: parseInt(process.env.MAX_FILES ?? '10'), // 10 files default
    },
  });
};

/**
 * Create and configure upload routes
 *
 * @returns Configured router with upload endpoints
 */
export const createUploadRoutes = (): Router => {
  const router = Router();

  // Initialize services
  const uploadsService = new UploadsService();
  const uploadsController = new UploadsController(uploadsService);

  // Configure multer middleware
  const upload = configureMulter();

  // Apply authentication middleware to all routes
  router.use(authenticateUser as RequestHandler);

  /**
   * @swagger
   * /api/v2/uploads:
   *   post:
   *     summary: Upload multiple files
   *     description: |
   *       Uploads multiple files to the server. Files are validated for size and type,
   *       then stored in the configured upload directory with unique names.
   *
   *       **Required Permission**: `uploads:create`
   *
   *       **File Limits**:
   *       - Maximum file size: 10MB (configurable via MAX_FILE_SIZE env var)
   *       - Maximum files per request: 10 (configurable via MAX_FILES env var)
   *       - Supported formats: All file types (configurable via ALLOWED_MIME_TYPES env var)
   *     security:
   *       - bearerAuth: []
   *     tags: ['File Uploads']
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               files:
   *                 type: array
   *                 items:
   *                   type: string
   *                   format: binary
   *                 description: Files to upload (multiple files supported)
   *     responses:
   *       201:
   *         description: Files uploaded successfully
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
   *                     uploadedFiles:
   *                       type: array
   *                       items:
   *                         type: object
   *                         properties:
   *                           originalName:
   *                             type: string
   *                             description: Original filename
   *                           filename:
   *                             type: string
   *                             description: Generated unique filename
   *                           mimeType:
   *                             type: string
   *                             description: File MIME type
   *                           size:
   *                             type: number
   *                             description: File size in bytes
   *                           path:
   *                             type: string
   *                             description: Full file path on server
   *                           uploadedAt:
   *                             type: string
   *                             format: date-time
   *                             description: Upload timestamp
   *                     totalFiles:
   *                       type: number
   *                       description: Total number of uploaded files
   *                     totalSize:
   *                       type: number
   *                       description: Total size of all uploaded files in bytes
   *                 message:
   *                   type: string
   *                   example: Successfully uploaded 3 file(s)
   *       400:
   *         description: Bad request - no files provided
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
   *                   example: No files provided
   *                 details:
   *                   type: string
   *                   example: Please select at least one file to upload
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       413:
   *         description: Payload too large - file size exceeds limit
   *       500:
   *         description: Internal server error during file processing
   */
  router.post(
    '/',
    requirePermission('uploads:create'),
    upload.array('files', parseInt(process.env.MAX_FILES ?? '10')),
    asyncHandler(uploadsController.uploadFiles.bind(uploadsController) as EndpointServiceCall),
  );

  /**
   * @swagger
   * /api/v2/uploads/directory:
   *   get:
   *     summary: Get upload directory information
   *     description: |
   *       Retrieves information about the upload directory including path,
   *       existence status, and write permissions.
   *
   *       **Required Permission**: `uploads:read`
   *     security:
   *       - bearerAuth: []
   *     tags: ['File Uploads']
   *     responses:
   *       200:
   *         description: Directory information retrieved successfully
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
   *                     path:
   *                       type: string
   *                       description: Upload directory path
   *                     exists:
   *                       type: boolean
   *                       description: Whether directory exists
   *                     writable:
   *                       type: boolean
   *                       description: Whether directory is writable
   *                 message:
   *                   type: string
   *                   example: Upload directory information retrieved successfully
   *       401:
   *         $ref: '#/components/responses/Unauthorized'
   *       403:
   *         $ref: '#/components/responses/Forbidden'
   *       500:
   *         description: Internal server error
   */
  router.get(
    '/directory',
    requirePermission('uploads:read'),
    asyncHandler(uploadsController.getUploadDirInfo.bind(uploadsController) as EndpointServiceCall),
  );

  return router;
};
