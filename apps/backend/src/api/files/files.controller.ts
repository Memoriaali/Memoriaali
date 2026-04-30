import { Request, Response } from 'express';
import * as fs from 'fs';

import { AuthenticatedUser } from '../../shared/types/authenticated-user';
import { FilesService } from './files.service.js';

interface AuthenticatedRequest extends Request {
  authenticatedUser: AuthenticatedUser;
}

/**
 * File download controller
 *
 * Handles HTTP requests for file downloads including:
 * - Request validation
 * - Service coordination
 * - File streaming response
 * - Error handling
 */
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * Download file for a given document ID
   *
   * Preconditions: Request contains valid document ID, user is authenticated
   * Postconditions: File is streamed to response or error is returned
   * Invariants: Response is properly formatted and closed
   */
  async downloadFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { document_id: documentId } = req.params;
    const currentUser = req.authenticatedUser; // Authentication middleware ensures this exists

    if (!documentId) {
      throw new Error('Document ID is required');
    }

    // Get file information and validate access
    const fileInfo = await this.filesService.getFileForDownload(documentId, currentUser);

    // Set appropriate headers for file download
    res.setHeader('Content-Type', fileInfo.mimeType ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="/file/${fileInfo.fileName}"`);
    res.setHeader('Content-Length', fileInfo.fileSize.toString());

    // Create read stream and pipe to response
    const fileStream = fs.createReadStream(fileInfo.filePath);

    // Handle stream errors
    fileStream.on('error', (error) => {
      console.error('File stream error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          status: 'error',
          error: 'File streaming error',
          details: 'Failed to read file from storage',
        });
      }
    });

    // Handle client disconnect
    req.on('close', () => {
      fileStream.destroy();
    });

    // Pipe file to response
    fileStream.pipe(res);
  }
}
