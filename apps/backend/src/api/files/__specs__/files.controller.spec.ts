import { Response } from 'express';
import * as fs from 'fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpException } from '../../../shared/errors';
import { AuthenticatedUser } from '../../../shared/types/authenticated-user';
import { FilesController } from '../files.controller.js';

// Mock fs module
vi.mock('fs');
const mockFs = vi.mocked(fs);

describe('FilesController', () => {
  let filesController: FilesController;
  let mockFilesService: any;
  let mockRequest: any;
  let mockResponse: Partial<Response>;
  let mockUser: AuthenticatedUser;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFilesService = {
      getFileForDownload: vi.fn(),
    };

    filesController = new FilesController(mockFilesService);

    mockUser = new AuthenticatedUser(
      'user-123',
      'test@example.com',
      'Test',
      'User',
      'USER',
      true,
      true,
    );

    mockRequest = {
      params: { document_id: 'doc-123' },
      authenticatedUser: mockUser,
      on: vi.fn(),
    };

    mockResponse = {
      setHeader: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
  });

  describe('downloadFile', () => {
    it('should set correct headers and stream file', async () => {
      const mockFileInfo = {
        filePath: '/uploads/test.jpg',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
      };

      const mockFileStream = {
        on: vi.fn(),
        pipe: vi.fn(),
        destroy: vi.fn(),
      };

      mockFilesService.getFileForDownload.mockResolvedValue(mockFileInfo);
      mockFs.createReadStream.mockReturnValue(mockFileStream as any);

      await filesController.downloadFile(mockRequest, mockResponse as Response);

      expect(mockFilesService.getFileForDownload).toHaveBeenCalledWith('doc-123', mockUser);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="/file/test.jpg"',
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Length', '1024');
      expect(mockFs.createReadStream).toHaveBeenCalledWith('/uploads/test.jpg');
      expect(mockFileStream.pipe).toHaveBeenCalledWith(mockResponse);
    });

    it('should handle missing MIME type with default', async () => {
      const mockFileInfo = {
        filePath: '/uploads/test.jpg',
        fileName: 'test.jpg',
        mimeType: null,
        fileSize: 1024,
      };

      const mockFileStream = {
        on: vi.fn(),
        pipe: vi.fn(),
        destroy: vi.fn(),
      };

      mockFilesService.getFileForDownload.mockResolvedValue(mockFileInfo);
      mockFs.createReadStream.mockReturnValue(mockFileStream as any);

      await filesController.downloadFile(mockRequest, mockResponse as Response);

      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/octet-stream',
      );
    });

    it('should handle file stream errors', async () => {
      const mockFileInfo = {
        filePath: '/uploads/test.jpg',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
      };

      const mockFileStream = {
        on: vi.fn((event, callback) => {
          if (event === 'error') {
            // Simulate error event
            setTimeout(() => callback(new Error('Stream error')), 0);
          }
        }),
        pipe: vi.fn(),
        destroy: vi.fn(),
      };

      mockFilesService.getFileForDownload.mockResolvedValue(mockFileInfo);
      mockFs.createReadStream.mockReturnValue(mockFileStream as any);

      await filesController.downloadFile(mockRequest, mockResponse as Response);

      // Wait for async error handling
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockFileStream.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should handle client disconnect', async () => {
      const mockFileInfo = {
        filePath: '/uploads/test.jpg',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
      };

      const mockFileStream = {
        on: vi.fn(),
        pipe: vi.fn(),
        destroy: vi.fn(),
      };

      mockFilesService.getFileForDownload.mockResolvedValue(mockFileInfo);
      mockFs.createReadStream.mockReturnValue(mockFileStream as any);

      await filesController.downloadFile(mockRequest, mockResponse as Response);

      expect(mockRequest.on).toHaveBeenCalledWith('close', expect.any(Function));
    });

    it('should re-throw service errors', async () => {
      const serviceError = new HttpException(403, 'Access denied');
      mockFilesService.getFileForDownload.mockRejectedValue(serviceError);

      await expect(
        filesController.downloadFile(mockRequest, mockResponse as Response),
      ).rejects.toThrow(serviceError);

      expect(mockFilesService.getFileForDownload).toHaveBeenCalledWith('doc-123', mockUser);
    });

    it('should handle service errors properly', async () => {
      const serviceError = new HttpException(404, 'Document not found');
      mockFilesService.getFileForDownload.mockRejectedValue(serviceError);

      try {
        await filesController.downloadFile(mockRequest, mockResponse as Response);
      } catch (error) {
        expect(error).toBe(serviceError);
      }

      expect(mockFilesService.getFileForDownload).toHaveBeenCalledWith('doc-123', mockUser);
    });
  });
});
