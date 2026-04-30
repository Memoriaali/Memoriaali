import * as fs from 'fs/promises';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpException } from '../../../shared/errors';
import { AuthenticatedUser } from '../../../shared/types/auth.type.js';
import { FilesService } from '../files.service.js';

// Mock fs module
vi.mock('fs/promises');
const mockFs = vi.mocked(fs);

// Mock Prisma client
const mockPrisma = {
  document: {
    findUnique: vi.fn(),
  },
} as any;

describe('FilesService', () => {
  let filesService: FilesService;
  let mockUser: AuthenticatedUser;

  beforeEach(() => {
    vi.clearAllMocks();
    filesService = new FilesService(mockPrisma);

    mockUser = {
      id: 'user-123',
      username: 'testuser',
      role: 'USER',
      email: 'test@example.com',
    } as AuthenticatedUser;
  });

  describe('getFileForDownload', () => {
    it('should return file info for public document', async () => {
      const mockDocument = {
        id: 'doc-123',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        documentPrivacy: 'PUBLIC',
        userId: 'other-user',
      };

      const mockFileStats = {
        isFile: () => true,
        size: 1024,
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockFs.stat.mockResolvedValue(mockFileStats as any);

      const result = await filesService.getFileForDownload('doc-123', mockUser);

      expect(result).toEqual({
        filePath: 'uploads/test.jpg',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
      });
      expect(mockPrisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        select: {
          id: true,
          fileName: true,
          mimeType: true,
          documentPrivacy: true,
          userId: true,
          groupToShare: true,
        },
      });
    });

    it('should throw forbidden when user tries to access their own private document', async () => {
      const mockDocument = {
        id: 'doc-123',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        documentPrivacy: 'PRIVATE',
        userId: 'user-123',
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);

      await expect(filesService.getFileForDownload('doc-123', mockUser)).rejects.toThrow(
        HttpException,
      );
    });

    it('should return file info for admin user', async () => {
      const adminUser = { ...mockUser, role: 'ADMIN' };
      const mockDocument = {
        id: 'doc-123',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        documentPrivacy: 'PRIVATE',
        userId: 'other-user',
      };

      const mockFileStats = {
        isFile: () => true,
        size: 1024,
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockFs.stat.mockResolvedValue(mockFileStats as any);

      const result = await filesService.getFileForDownload('doc-123', adminUser);

      expect(result).toEqual({
        filePath: 'uploads/test.jpg',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
      });
    });

    it('should return file info for moderator user', async () => {
      const moderatorUser = { ...mockUser, role: 'MODERATOR' };
      const mockDocument = {
        id: 'doc-123',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        documentPrivacy: 'PRIVATE',
        userId: 'other-user',
      };

      const mockFileStats = {
        isFile: () => true,
        size: 1024,
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockFs.stat.mockResolvedValue(mockFileStats as any);

      const result = await filesService.getFileForDownload('doc-123', moderatorUser);

      expect(result).toEqual({
        filePath: 'uploads/test.jpg',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1024,
      });
    });

    it('should throw not found when document does not exist', async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null);

      await expect(filesService.getFileForDownload('doc-123', mockUser)).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw forbidden when user cannot access document', async () => {
      const mockDocument = {
        id: 'doc-123',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        documentPrivacy: 'PRIVATE',
        userId: 'other-user',
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);

      await expect(filesService.getFileForDownload('doc-123', mockUser)).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw forbidden when document is private and user is not owner', async () => {
      const mockDocument = {
        id: 'doc-123',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        documentPrivacy: 'PRIVATE',
        userId: 'other-user',
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);

      await expect(filesService.getFileForDownload('doc-123', mockUser)).rejects.toThrow(
        HttpException,
      );
    });

    it('should deny access to private document even for document owner', async () => {
      const mockDocument = {
        id: 'doc-123',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        documentPrivacy: 'PRIVATE',
        userId: 'user-123', // Same as mockUser.id
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);

      await expect(filesService.getFileForDownload('doc-123', mockUser)).rejects.toThrow(
        HttpException,
      );
    });

    it('should deny access to private document for different user', async () => {
      const differentUser = {
        id: 'different-user-456',
        username: 'differentuser',
        role: 'USER',
        email: 'different@example.com',
      } as AuthenticatedUser;

      const mockDocument = {
        id: 'doc-123',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        documentPrivacy: 'PRIVATE',
        userId: 'user-123', // Belongs to mockUser, not differentUser
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);

      await expect(filesService.getFileForDownload('doc-123', differentUser)).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw not found when file does not exist on disk', async () => {
      const mockDocument = {
        id: 'doc-123',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        documentPrivacy: 'PUBLIC',
        userId: 'other-user',
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockFs.stat.mockRejectedValue(new Error('File not found'));

      await expect(filesService.getFileForDownload('doc-123', mockUser)).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw not found when file is not a regular file', async () => {
      const mockDocument = {
        id: 'doc-123',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        documentPrivacy: 'PUBLIC',
        userId: 'other-user',
      };

      const mockFileStats = {
        isFile: () => false,
        size: 1024,
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockFs.stat.mockResolvedValue(mockFileStats as any);

      await expect(filesService.getFileForDownload('doc-123', mockUser)).rejects.toThrow(
        HttpException,
      );
    });

    it('should use custom upload directory from environment', async () => {
      const originalEnv = process.env.UPLOAD_DIR;
      process.env.UPLOAD_DIR = '/custom/uploads';

      const mockDocument = {
        id: 'doc-123',
        fileName: 'test.jpg',
        mimeType: 'image/jpeg',
        documentPrivacy: 'PUBLIC',
        userId: 'other-user',
      };

      const mockFileStats = {
        isFile: () => true,
        size: 1024,
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockFs.stat.mockResolvedValue(mockFileStats as any);

      const result = await filesService.getFileForDownload('doc-123', mockUser);

      expect(result.filePath).toBe('/custom/uploads/test.jpg');

      // Restore environment
      process.env.UPLOAD_DIR = originalEnv;
    });
  });
});
