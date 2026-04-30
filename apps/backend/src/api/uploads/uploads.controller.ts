import { Request, Response } from 'express';

import { FileUploadResponse } from './uploads.schemas';
import { UploadsService } from './uploads.service';

/**
 * File upload controller
 *
 * Handles HTTP requests for file uploads:
 * - Receives multipart form data
 * - Delegates to service layer for processing
 * - Returns standardized API responses
 * - Handles errors gracefully
 */
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  /**
   * Handles file upload requests
   *
   * Preconditions: Request contains files in multipart form data
   * Postconditions: Files are uploaded and response is sent
   * Invariants: Request and response objects are not mutated
   */
  async uploadFiles(req: Request, res: Response): Promise<void> {
    try {
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        res.status(400).json({
          status: 'error',
          error: 'No files provided',
          details: 'Please select at least one file to upload',
        });
        return;
      }

      // Convert files to array if it's not already
      const files = Array.isArray(req.files) ? req.files : [req.files];

      // Process uploaded files
      const uploadedFiles = await this.uploadsService.processUploadedFiles(
        files as Express.Multer.File[],
      );

      // Calculate totals
      const totalSize = uploadedFiles.reduce((sum, file) => sum + file.size, 0);

      // Prepare response
      const response: FileUploadResponse = {
        status: 'success',
        data: {
          uploadedFiles,
          totalFiles: uploadedFiles.length,
          totalSize,
        },
        message: `Successfully uploaded ${uploadedFiles.length} file(s)`,
      };

      res.status(201).json(response);
    } catch (error) {
      console.error('File upload error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

      res.status(500).json({
        status: 'error',
        error: 'File upload failed',
        details: errorMessage,
      });
    }
  }

  /**
   * Gets upload directory information
   *
   * Preconditions: None
   * Postconditions: Directory info is returned
   * Invariants: Response object is not mutated
   */
  async getUploadDirInfo(req: Request, res: Response): Promise<void> {
    try {
      const dirInfo = await this.uploadsService.getUploadDirInfo();

      res.status(200).json({
        status: 'success',
        data: dirInfo,
        message: 'Upload directory information retrieved successfully',
      });
    } catch (error) {
      console.error('Error getting upload directory info:', error);

      res.status(500).json({
        status: 'error',
        error: 'Failed to get upload directory information',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
