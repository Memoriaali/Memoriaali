import * as fs from 'fs/promises';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UploadsService } from '../uploads.service';

// Mock fs module
vi.mock('fs/promises');

describe('UploadsService', () => {
  let uploadsService: UploadsService;
  const mockFs = vi.mocked(fs);

  beforeEach(() => {
    vi.clearAllMocks();
    uploadsService = new UploadsService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('processUploadedFiles', () => {
    const mockFile = {
      fieldname: 'files',
      originalname: 'test.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      size: 1024,
      destination: '/tmp',
      filename: 'temp_123_test.txt',
      path: '/tmp/temp_123_test.txt',
    } as Express.Multer.File;

    it('should process uploaded files successfully', async () => {
      // Mock fs.access to simulate directory exists
      mockFs.access.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);

      const result = await uploadsService.processUploadedFiles([mockFile]);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        originalName: 'test.txt',
        mimeType: 'text/plain',
        size: 1024,
        uploadedAt: expect.any(Date),
      });
      expect(result[0]?.filename).toMatch(/test_\d+_[a-z0-9]+\.txt/);
      expect(result[0]?.path).toContain('uploads');
    });

    it('should create upload directory if it does not exist', async () => {
      // Mock fs.access to simulate directory doesn't exist
      mockFs.access.mockRejectedValue(new Error('Directory not found'));
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);

      await uploadsService.processUploadedFiles([mockFile]);

      expect(mockFs.mkdir).toHaveBeenCalledWith(process.env.UPLOAD_DIR ?? './uploads', {
        recursive: true,
      });
    });

    it('should throw error if no files provided', async () => {
      await expect(uploadsService.processUploadedFiles([])).rejects.toThrow(
        'No files provided for upload',
      );
    });

    it('should throw error if files array is null/undefined', async () => {
      await expect(uploadsService.processUploadedFiles(null as any)).rejects.toThrow(
        'No files provided for upload',
      );
    });

    it('should handle file size validation', async () => {
      const largeFile = { ...mockFile, size: 20 * 1024 * 1024 }; // 20MB
      process.env.MAX_FILE_SIZE = '10485760'; // 10MB

      await expect(uploadsService.processUploadedFiles([largeFile])).rejects.toThrow(
        'File test.txt exceeds maximum size limit of 10485760 bytes',
      );
    });

    it('should handle file type validation when ALLOWED_MIME_TYPES is set', async () => {
      process.env.ALLOWED_MIME_TYPES = 'image/jpeg,image/png';
      const invalidFile = { ...mockFile, mimetype: 'text/plain' };

      await expect(uploadsService.processUploadedFiles([invalidFile])).rejects.toThrow(
        'File type text/plain is not allowed',
      );
    });

    it('should allow all file types when ALLOWED_MIME_TYPES is not set', async () => {
      delete process.env.ALLOWED_MIME_TYPES;
      mockFs.access.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);

      const result = await uploadsService.processUploadedFiles([mockFile]);
      expect(result).toHaveLength(1);
    });

    it('should clean up files on error', async () => {
      mockFs.access.mockResolvedValue(undefined);
      mockFs.rename.mockRejectedValue(new Error('Rename failed'));
      mockFs.unlink.mockResolvedValue(undefined);

      await expect(uploadsService.processUploadedFiles([mockFile])).rejects.toThrow(
        'Failed to process file test.txt: Rename failed',
      );

      expect(mockFs.unlink).toHaveBeenCalledWith('/tmp/temp_123_test.txt');
    });

    it('should handle multiple files', async () => {
      const mockFile2 = { ...mockFile, originalname: 'test2.txt', path: '/tmp/temp_456_test2.txt' };
      mockFs.access.mockResolvedValue(undefined);
      mockFs.rename.mockResolvedValue(undefined);

      const result = await uploadsService.processUploadedFiles([mockFile, mockFile2]);

      expect(result).toHaveLength(2);
      expect(result[0]?.originalName).toBe('test.txt');
      expect(result[1]?.originalName).toBe('test2.txt');
    });
  });

  describe('getUploadDirInfo', () => {
    it('should return directory info when directory exists and is writable', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const result = await uploadsService.getUploadDirInfo();

      expect(result).toEqual({
        path: process.env.UPLOAD_DIR ?? './uploads',
        exists: true,
        writable: true,
      });
    });

    it('should return directory info when directory does not exist or is not writable', async () => {
      mockFs.access.mockRejectedValue(new Error('Access denied'));

      const result = await uploadsService.getUploadDirInfo();

      expect(result).toEqual({
        path: process.env.UPLOAD_DIR ?? './uploads',
        exists: false,
        writable: false,
      });
    });
  });

  describe('environment variable handling', () => {
    it('should use default upload directory when UPLOAD_DIR is not set', () => {
      delete process.env.UPLOAD_DIR;
      const service = new UploadsService();

      // Access private property for testing
      expect((service as any).uploadDir).toBe('./uploads');
    });

    it('should use custom upload directory when UPLOAD_DIR is set', () => {
      process.env.UPLOAD_DIR = '/custom/uploads';
      const service = new UploadsService();

      // Access private property for testing
      expect((service as any).uploadDir).toBe('/custom/uploads');
    });
  });
});
