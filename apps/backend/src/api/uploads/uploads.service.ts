import * as fs from 'fs/promises';
import * as path from 'path';

import { UploadedFile } from './uploads.schemas';

/**
 * File upload service
 *
 * Handles file upload business logic including:
 * - File validation and processing
 * - Directory creation and file storage
 * - File metadata extraction
 * - Error handling and cleanup
 */
export class UploadsService {
  private readonly uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR ?? './uploads';
  }

  /**
   * Ensures the upload directory exists
   *
   * Preconditions: None
   * Postconditions: Upload directory exists and is writable
   * Invariants: Upload directory path remains constant
   */
  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Generates a unique filename to prevent conflicts
   *
   * Preconditions: originalName is a valid string
   * Postconditions: Returns a unique filename with timestamp and random suffix
   * Invariants: Original file extension is preserved
   */
  private generateUniqueFilename(originalName: string): string {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);

    return `${baseName}_${timestamp}_${randomSuffix}${extension}`;
  }

  /**
   * Validates file size and type
   *
   * Preconditions: file is a valid Express file object
   * Postconditions: Returns true if file is valid, throws error if invalid
   * Invariants: File object is not mutated
   */
  private validateFile(file: Express.Multer.File): void {
    // Check file size (default 10MB limit)
    const maxSize = parseInt(process.env.MAX_FILE_SIZE ?? '10485760');
    if (file.size > maxSize) {
      throw new Error(`File ${file.originalname} exceeds maximum size limit of ${maxSize} bytes`);
    }

    // Check file type (optional - can be configured via environment)
    const allowedMimeTypes = process.env.ALLOWED_MIME_TYPES?.split(',') ?? [];
    if (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`File type ${file.mimetype} is not allowed`);
    }
  }

  /**
   * Processes uploaded files and stores them
   *
   * Preconditions: files array contains valid Express file objects
   * Postconditions: Files are stored and metadata is returned
   * Invariants: Original files are not modified
   */
  async processUploadedFiles(files: Express.Multer.File[]): Promise<UploadedFile[]> {
    if (!files || files.length === 0) {
      throw new Error('No files provided for upload');
    }

    await this.ensureUploadDir();

    const uploadedFiles: UploadedFile[] = [];

    // Process files in parallel
    const results = await Promise.allSettled(
      files.map(async (file) => {
        try {
          // Validate file
          this.validateFile(file);

          // Generate unique filename
          const uniqueFilename = this.generateUniqueFilename(file.originalname);
          const filePath = path.join(this.uploadDir, uniqueFilename);

          // Move file to final destination
          await fs.rename(file.path, filePath);

          // Create file metadata
          const uploadedFile: UploadedFile = {
            originalName: file.originalname,
            filename: uniqueFilename,
            mimeType: file.mimetype,
            size: file.size,
            path: filePath,
            uploadedAt: new Date(),
          };

          return uploadedFile;
        } catch (error) {
          // Clean up any partially processed files
          if (file.path) {
            try {
              await fs.unlink(file.path);
            } catch (cleanupError) {
              // Log cleanup error but don't throw
              console.error('Failed to cleanup file:', cleanupError);
            }
          }

          throw new Error(
            `Failed to process file ${file.originalname}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }),
    );

    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled') {
        uploadedFiles.push(result.value);
      } else {
        // Determine what to do with failures. For now, we'll throw the first error we encounter
        // but ideally we might want to return partial success or specific error structure
        throw result.reason;
      }
    }

    return uploadedFiles;
  }

  /**
   * Gets upload directory information
   *
   * Preconditions: None
   * Postconditions: Returns upload directory path and stats
   * Invariants: Upload directory path remains constant
   */
  async getUploadDirInfo(): Promise<{ path: string; exists: boolean; writable: boolean }> {
    try {
      await fs.access(this.uploadDir, fs.constants.W_OK);
      return {
        path: this.uploadDir,
        exists: true,
        writable: true,
      };
    } catch {
      return {
        path: this.uploadDir,
        exists: false,
        writable: false,
      };
    }
  }
}
