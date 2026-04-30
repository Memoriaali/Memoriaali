import { Request, Response } from 'express';
import { Mock, Mocked, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { UploadsController } from '../uploads.controller';
import { UploadsService } from '../uploads.service';

// Mock the service
vi.mock('../uploads.service');

describe('UploadsController', () => {
  let uploadsController: UploadsController;
  let mockUploadsService: Mocked<UploadsService>;
  let mockRequest: Request;
  let mockResponse: Partial<Response>;
  let mockJson: Mock;
  let mockStatus: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    mockUploadsService = {
      processUploadedFiles: vi.fn(),
      getUploadDirInfo: vi.fn(),
    } as any;

    mockJson = vi.fn();
    mockStatus = vi.fn().mockReturnValue({ json: mockJson });

    mockRequest = {} as Request;
    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };

    uploadsController = new UploadsController(mockUploadsService);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('uploadFiles', () => {
    const mockFile = {
      fieldname: 'files',
      originalname: 'test.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      size: 1024,
      destination: '/tmp',
      filename: 'temp_123_test.txt',
      path: '/tmp/temp_123_test.txt',
    } as unknown as Express.Multer.File;

    it('should handle successful file upload', async () => {
      const mockUploadedFiles = [
        {
          originalName: 'test.txt',
          filename: 'test_123_abc123.txt',
          mimeType: 'text/plain',
          size: 1024,
          path: '/uploads/test_123_abc123.txt',
          uploadedAt: new Date(),
        },
      ];

      mockRequest.files = [mockFile];
      mockUploadsService.processUploadedFiles.mockResolvedValue(mockUploadedFiles);

      await uploadsController.uploadFiles(mockRequest, mockResponse as Response);

      expect(mockUploadsService.processUploadedFiles).toHaveBeenCalledWith([mockFile]);
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: {
          uploadedFiles: mockUploadedFiles,
          totalFiles: 1,
          totalSize: 1024,
        },
        message: 'Successfully uploaded 1 file(s)',
      });
    });

    it('should handle multiple files upload', async () => {
      const mockFile2 = { ...mockFile, originalname: 'test2.txt', size: 2048 };
      const mockUploadedFiles = [
        {
          originalName: 'test.txt',
          filename: 'test_123_abc123.txt',
          mimeType: 'text/plain',
          size: 1024,
          path: '/uploads/test_123_abc123.txt',
          uploadedAt: new Date(),
        },
        {
          originalName: 'test2.txt',
          filename: 'test2_456_def456.txt',
          mimeType: 'text/plain',
          size: 2048,
          path: '/uploads/test2_456_def456.txt',
          uploadedAt: new Date(),
        },
      ];

      mockRequest.files = [mockFile, mockFile2];
      mockUploadsService.processUploadedFiles.mockResolvedValue(mockUploadedFiles);

      await uploadsController.uploadFiles(mockRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: {
          uploadedFiles: mockUploadedFiles,
          totalFiles: 2,
          totalSize: 3072,
        },
        message: 'Successfully uploaded 2 file(s)',
      });
    });

    it('should handle single file upload (non-array)', async () => {
      const mockUploadedFiles = [
        {
          originalName: 'test.txt',
          filename: 'test_123_abc123.txt',
          mimeType: 'text/plain',
          size: 1024,
          path: '/uploads/test_123_abc123.txt',
          uploadedAt: new Date(),
        },
      ];

      mockRequest.files = { files: [mockFile] }; // Single file, not array
      mockUploadsService.processUploadedFiles.mockResolvedValue(mockUploadedFiles);

      await uploadsController.uploadFiles(mockRequest, mockResponse as Response);

      expect(mockUploadsService.processUploadedFiles).toHaveBeenCalledWith([mockFile]);
      expect(mockStatus).toHaveBeenCalledWith(201);
    });

    it('should handle no files provided', async () => {
      mockRequest.files = [];

      await uploadsController.uploadFiles(mockRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        error: 'No files provided',
        details: 'Please select at least one file to upload',
      });
    });

    it('should handle null files', async () => {
      mockRequest.files = null as any;

      await uploadsController.uploadFiles(mockRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        error: 'No files provided',
        details: 'Please select at least one file to upload',
      });
    });

    it('should handle service errors', async () => {
      mockRequest.files = [mockFile];
      mockUploadsService.processUploadedFiles.mockRejectedValue(
        new Error('File processing failed'),
      );

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await uploadsController.uploadFiles(mockRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        error: 'File upload failed',
        details: 'File processing failed',
      });

      consoleSpy.mockRestore();
    });

    it('should handle unknown errors', async () => {
      mockRequest.files = [mockFile];
      mockUploadsService.processUploadedFiles.mockRejectedValue('Unknown error');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await uploadsController.uploadFiles(mockRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        error: 'File upload failed',
        details: 'Unknown error occurred',
      });

      consoleSpy.mockRestore();
    });
  });

  describe('getUploadDirInfo', () => {
    it('should handle successful directory info retrieval', async () => {
      const mockDirInfo = {
        path: '/uploads',
        exists: true,
        writable: true,
      };

      mockUploadsService.getUploadDirInfo.mockResolvedValue(mockDirInfo);

      await uploadsController.getUploadDirInfo(mockRequest, mockResponse as Response);

      expect(mockUploadsService.getUploadDirInfo).toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'success',
        data: mockDirInfo,
        message: 'Upload directory information retrieved successfully',
      });
    });

    it('should handle service errors', async () => {
      mockUploadsService.getUploadDirInfo.mockRejectedValue(new Error('Directory access failed'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await uploadsController.getUploadDirInfo(mockRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        error: 'Failed to get upload directory information',
        details: 'Directory access failed',
      });

      consoleSpy.mockRestore();
    });

    it('should handle unknown errors', async () => {
      mockUploadsService.getUploadDirInfo.mockRejectedValue('Unknown error');

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await uploadsController.getUploadDirInfo(mockRequest, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({
        status: 'error',
        error: 'Failed to get upload directory information',
        details: 'Unknown error',
      });

      consoleSpy.mockRestore();
    });
  });
});
