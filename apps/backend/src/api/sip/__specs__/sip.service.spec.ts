/**
 * SIP Service Unit Tests
 *
 * Comprehensive test coverage for SIP orchestration service including:
 * - Job processing workflow orchestration
 * - Document validation and fetching
 * - File operations and workspace management
 * - Metadata generation
 * - Java bridge integration
 * - Error handling and cleanup guarantees
 * - Database persistence
 *
 * Tests verify business logic in isolation with mocked dependencies.
 */

import { join } from 'path';
import { SipJobStage, SipJobStatus } from '@memoriaali/database/generated/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpException } from '../../../shared/errors';
import { SIPService } from '../sip.service';
import type { CreateSIPRequest } from '../sip.schemas';
import type { SipJob } from '../services/queue.service';

// Mock dependencies
vi.mock('fs', () => ({
  promises: {
    access: vi.fn(),
    stat: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    copyFile: vi.fn(),
  },
}));

vi.mock('../../../shared/database/prisma', () => ({
  prisma: {
    document: {
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    $executeRaw: vi.fn(),
  },
}));

vi.mock('../services/queue.service', () => ({
  queueService: {
    updateProgress: vi.fn(),
    completeJob: vi.fn(),
    failJob: vi.fn(),
    registerProcessor: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      total: 0,
      isProcessing: false,
    }),
  },
}));

vi.mock('../services/temp-file.service', () => ({
  TempFileService: vi.fn().mockImplementation(() => ({
    createJobWorkspace: vi.fn(),
    copyFilesToTemp: vi.fn(),
    cleanup: vi.fn(),
    cleanupAll: vi.fn(),
    getActiveWorkspaces: vi.fn().mockReturnValue([]),
  })),
}));

vi.mock('../services/metadata.service', () => ({
  MetadataService: vi.fn().mockImplementation(() => ({
    generateDublinCoreXML: vi.fn(),
    generatePremisXML: vi.fn(),
  })),
}));

vi.mock('../services/java-bridge.service', () => ({
  JavaBridgeService: vi.fn().mockImplementation(() => ({
    createSIPPackage: vi.fn(),
  })),
}));

describe('SIPService', () => {
  let sipService: SIPService;
  let mockFs: any;
  let mockPrisma: any;
  let mockQueueService: any;
  let mockTempFileService: any;
  let mockMetadataService: any;
  let mockJavaBridge: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Get mocked modules
    const fsModule = await import('fs');
    mockFs = fsModule.promises;

    const prismaModule = await import('../../../shared/database/prisma');
    mockPrisma = prismaModule.prisma;

    const queueModule = await import('../services/queue.service');
    mockQueueService = queueModule.queueService;

    const tempFileModule = await import('../services/temp-file.service');
    const TempFileServiceClass = tempFileModule.TempFileService;
    mockTempFileService = new TempFileServiceClass();

    const metadataModule = await import('../services/metadata.service');
    const MetadataServiceClass = metadataModule.MetadataService;
    mockMetadataService = new MetadataServiceClass();

    const javaBridgeModule = await import('../services/java-bridge.service');
    const JavaBridgeServiceClass = javaBridgeModule.JavaBridgeService;
    mockJavaBridge = new JavaBridgeServiceClass();

    // Create service instance
    sipService = new SIPService();

    // Replace internal service instances with mocks
    (sipService as any).tempFileService = mockTempFileService;
    (sipService as any).metadataService = mockMetadataService;
    (sipService as any).javaBridgeService = mockJavaBridge;
  });

  describe('processSipJob - Complete Workflow', () => {
    it('should orchestrate complete SIP generation workflow successfully', async () => {
      // Arrange
      const mockJob: SipJob = {
        id: 'job-123',
        externalId: 'sip-abc',
        userId: 'user-123',
        status: SipJobStatus.PENDING,
        stage: SipJobStage.QUEUED,
        metadata: {
          documentIds: ['doc-1', 'doc-2'],
          packageMode: 'single',
        } as CreateSIPRequest,
        documentIds: ['doc-1', 'doc-2'],
        archiveId: null,
        result: null,
        error: null,
        progress: 0,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
      };

      const mockDocuments = [
        {
          id: 'doc-1',
          fileName: 'file1.pdf',
          filePath: '/uploads/file1.pdf',
          metadata: {},
          user: {
            id: 'user-123',
            username: 'testuser',
            email: 'test@example.com',
          },
        },
        {
          id: 'doc-2',
          fileName: 'file2.pdf',
          filePath: '/uploads/file2.pdf',
          metadata: {},
          user: {
            id: 'user-123',
            username: 'testuser',
            email: 'test@example.com',
          },
        },
      ];

      // Mock database operations
      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      });

      // Mock file system operations
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({
        isFile: () => true,
        size: 1024000,
      });
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.copyFile.mockResolvedValue(undefined);

      // Mock service operations
      mockTempFileService.createJobWorkspace.mockResolvedValue('/tmp/workspace-job-123');
      mockTempFileService.copyFilesToTemp.mockResolvedValue([
        { source: '/uploads/file1.pdf', destination: '/tmp/workspace-job-123/file1.pdf' },
        { source: '/uploads/file2.pdf', destination: '/tmp/workspace-job-123/file2.pdf' },
      ]);
      mockMetadataService.generateDublinCoreXML.mockReturnValue('<dc>metadata</dc>');
      mockMetadataService.generatePremisXML.mockReturnValue('<premis>metadata</premis>');
      mockJavaBridge.createSIPPackage.mockResolvedValue(undefined);

      // Act
      await sipService.processSipJob(mockJob);

      // Assert
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['doc-1', 'doc-2'] } },
        include: expect.any(Object),
      });
      expect(mockTempFileService.createJobWorkspace).toHaveBeenCalledWith('job-123');
      expect(mockTempFileService.copyFilesToTemp).toHaveBeenCalled();
      expect(mockMetadataService.generateDublinCoreXML).toHaveBeenCalledTimes(2);
      expect(mockJavaBridge.createSIPPackage).toHaveBeenCalled();
      expect(mockQueueService.completeJob).toHaveBeenCalledWith(
        'job-123',
        expect.objectContaining({
          sipPath: expect.any(String),
          sipId: expect.any(String),
          documentCount: 2,
        }),
      );
      expect(mockTempFileService.cleanup).toHaveBeenCalledWith('job-123', true);
    });

    it('should handle empty documentIds in job metadata', async () => {
      // Arrange
      const mockJob: SipJob = {
        id: 'job-123',
        externalId: 'sip-abc',
        userId: 'user-123',
        status: SipJobStatus.PENDING,
        stage: SipJobStage.QUEUED,
        metadata: { documentIds: [] } as CreateSIPRequest,
        documentIds: [],
        archiveId: null,
        result: null,
        error: null,
        progress: 0,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
      };

      // Act & Assert
      await expect(sipService.processSipJob(mockJob)).rejects.toThrow(
        'No document IDs found in job metadata',
      );
      expect(mockQueueService.failJob).toHaveBeenCalledWith(
        'job-123',
        expect.any(Error),
        expect.any(String),
      );
    });

    it('should guarantee cleanup on failure', async () => {
      // Arrange
      const mockJob: SipJob = {
        id: 'job-123',
        externalId: 'sip-abc',
        userId: 'user-123',
        status: SipJobStatus.PENDING,
        stage: SipJobStage.QUEUED,
        metadata: {
          documentIds: ['doc-1'],
          packageMode: 'single',
        } as CreateSIPRequest,
        documentIds: ['doc-1'],
        archiveId: null,
        result: null,
        error: null,
        progress: 0,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
      };

      mockTempFileService.createJobWorkspace.mockResolvedValue('/tmp/workspace-job-123');
      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          fileName: 'file1.pdf',
          metadata: {},
          user: { id: 'user-123', username: 'testuser', email: 'test@example.com' },
        },
      ]);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ isFile: () => true });

      // Simulate failure during Java bridge
      mockTempFileService.copyFilesToTemp.mockResolvedValue([
        { source: '/uploads/file1.pdf', destination: '/tmp/workspace-job-123/file1.pdf' },
      ]);
      mockJavaBridge.createSIPPackage.mockRejectedValue(new Error('Java bridge failed'));

      // Act
      await expect(sipService.processSipJob(mockJob)).rejects.toThrow();

      // Assert - Cleanup must be called even on failure
      expect(mockTempFileService.cleanup).toHaveBeenCalledWith('job-123', true);
      expect(mockQueueService.failJob).toHaveBeenCalledWith(
        'job-123',
        expect.any(Error),
        expect.any(String),
      );
    });
  });

  describe('validateAndFetchDocuments', () => {
    it('should fetch documents with file paths and validate file existence', async () => {
      // Arrange
      const documentIds = ['doc-1', 'doc-2'];
      const mockDocuments = [
        {
          id: 'doc-1',
          fileName: 'file1.pdf',
          metadata: {},
          user: { id: 'user-123', username: 'testuser', email: 'test@example.com' },
        },
        {
          id: 'doc-2',
          fileName: 'file2.pdf',
          metadata: {},
          user: { id: 'user-123', username: 'testuser', email: 'test@example.com' },
        },
      ];

      mockPrisma.document.findMany.mockResolvedValue(mockDocuments);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ isFile: () => true });

      // Act
      const result = await (sipService as any).validateAndFetchDocuments(documentIds);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('filePath');
      expect(mockPrisma.document.findMany).toHaveBeenCalledWith({
        where: { id: { in: documentIds } },
        include: expect.any(Object),
      });
      expect(mockFs.access).toHaveBeenCalledTimes(2);
    });

    it('should throw HttpException when documents not found in database', async () => {
      // Arrange
      const documentIds = ['doc-1', 'doc-2', 'doc-3'];
      mockPrisma.document.findMany.mockResolvedValue([
        { id: 'doc-1', fileName: 'file1.pdf', metadata: {}, user: {} },
      ]);

      // Act & Assert
      await expect((sipService as any).validateAndFetchDocuments(documentIds)).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw HttpException when file not found on filesystem', async () => {
      // Arrange
      const documentIds = ['doc-1'];
      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          fileName: 'file1.pdf',
          metadata: {},
          user: { id: 'user-123', username: 'testuser', email: 'test@example.com' },
        },
      ]);
      mockFs.access.mockRejectedValue(new Error('ENOENT'));

      // Act & Assert
      await expect((sipService as any).validateAndFetchDocuments(documentIds)).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw HttpException when path is not a file', async () => {
      // Arrange
      const documentIds = ['doc-1'];
      mockPrisma.document.findMany.mockResolvedValue([
        {
          id: 'doc-1',
          fileName: 'directory',
          metadata: {},
          user: { id: 'user-123', username: 'testuser', email: 'test@example.com' },
        },
      ]);
      mockFs.access.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ isFile: () => false });

      // Act & Assert
      await expect((sipService as any).validateAndFetchDocuments(documentIds)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('copyFilesToWorkspace', () => {
    it('should copy all files to workspace successfully', async () => {
      // Arrange
      const documents = [
        { id: 'doc-1', fileName: 'file1.pdf', filePath: '/uploads/file1.pdf' },
        { id: 'doc-2', fileName: 'file2.pdf', filePath: '/uploads/file2.pdf' },
      ] as any;
      const workspaceDir = '/tmp/workspace-job-123';
      const jobId = 'job-123';

      mockTempFileService.copyFilesToTemp.mockResolvedValue([
        { source: '/uploads/file1.pdf', destination: '/tmp/workspace-job-123/file1.pdf' },
        { source: '/uploads/file2.pdf', destination: '/tmp/workspace-job-123/file2.pdf' },
      ]);

      // Act
      const result = await (sipService as any).copyFilesToWorkspace(documents, workspaceDir, jobId);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('source');
      expect(result[0]).toHaveProperty('destination');
      expect(result[0]).toHaveProperty('document');
      expect(mockTempFileService.copyFilesToTemp).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ source: '/uploads/file1.pdf', filename: 'file1.pdf' }),
        ]),
        workspaceDir,
      );
    });

    it('should throw error when document missing for copy operation', async () => {
      // Arrange
      const documents = [{ id: 'doc-1', fileName: 'file1.pdf', filePath: '/uploads/file1.pdf' }];
      const workspaceDir = '/tmp/workspace-job-123';
      const jobId = 'job-123';

      // Mock returns more operations than documents
      mockTempFileService.copyFilesToTemp.mockResolvedValue([
        { source: '/uploads/file1.pdf', destination: '/tmp/workspace-job-123/file1.pdf' },
        { source: '/uploads/file2.pdf', destination: '/tmp/workspace-job-123/file2.pdf' },
      ]);

      // Act & Assert
      await expect(
        (sipService as any).copyFilesToWorkspace(documents, workspaceDir, jobId),
      ).rejects.toThrow('Document not found for copy operation');
    });
  });

  describe('generateMetadataFiles', () => {
    it('should generate metadata XML files for all documents', async () => {
      // Arrange
      const documents = [
        { id: 'doc-1', fileName: 'file1.pdf', metadata: {} },
        { id: 'doc-2', fileName: 'file2.pdf', metadata: {} },
      ] as any;
      const copiedFiles = [
        { source: '/uploads/file1.pdf', destination: '/tmp/file1.pdf', document: documents[0] },
        { source: '/uploads/file2.pdf', destination: '/tmp/file2.pdf', document: documents[1] },
      ];
      const workspaceDir = '/tmp/workspace-job-123';
      const jobData = {
        documentIds: ['doc-1', 'doc-2'],
        packageMode: 'single',
      } as CreateSIPRequest;
      const jobId = 'job-123';

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockMetadataService.generateDublinCoreXML.mockReturnValue('<dc>metadata</dc>');

      // Act
      const result = await (sipService as any).generateMetadataFiles(
        documents,
        copiedFiles,
        workspaceDir,
        jobData,
        jobId,
      );

      // Assert
      expect(result).toHaveLength(2);
      expect(mockFs.mkdir).toHaveBeenCalledWith(join(workspaceDir, 'metadata'), {
        recursive: true,
      });
      expect(mockFs.writeFile).toHaveBeenCalledTimes(2);
      expect(mockMetadataService.generateDublinCoreXML).toHaveBeenCalledTimes(2);
      expect(mockQueueService.updateProgress).toHaveBeenCalled();
    });

    it('should update progress for each metadata file generated', async () => {
      // Arrange
      const documents = [{ id: 'doc-1', fileName: 'file1.pdf', metadata: {} }] as any;
      const copiedFiles = [
        { source: '/uploads/file1.pdf', destination: '/tmp/file1.pdf', document: documents[0] },
      ];
      const workspaceDir = '/tmp/workspace-job-123';
      const jobData = { documentIds: ['doc-1'], packageMode: 'single' } as CreateSIPRequest;
      const jobId = 'job-123';

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.writeFile.mockResolvedValue(undefined);
      mockMetadataService.generateDublinCoreXML.mockReturnValue('<dc>metadata</dc>');

      // Act
      await (sipService as any).generateMetadataFiles(
        documents,
        copiedFiles,
        workspaceDir,
        jobData,
        jobId,
      );

      // Assert
      expect(mockQueueService.updateProgress).toHaveBeenCalledWith(
        jobId,
        SipJobStage.GENERATING,
        expect.any(Number),
        expect.stringContaining('file1.pdf'),
        expect.objectContaining({
          currentFile: 'file1.pdf',
          processedDocuments: 0,
          totalDocuments: 1,
        }),
      );
    });
  });

  describe('createSIPPackage', () => {
    it('should create SIP package with Java bridge service', async () => {
      // Arrange
      const documents = [
        {
          id: 'doc-1',
          fileName: 'file1.pdf',
          user: { id: 'user-123', username: 'testuser', firstName: 'Test', lastName: 'User' },
        },
      ] as any;
      const copiedFiles = [
        { source: '/uploads/file1.pdf', destination: '/tmp/file1.pdf', document: documents[0] },
      ];
      const metadataFiles = [
        { document: documents[0], metadataPath: '/tmp/metadata/doc-1_dc.xml' },
      ];
      const workspaceDir = '/tmp/workspace-job-123';
      const jobData = { documentIds: ['doc-1'], packageMode: 'single' } as CreateSIPRequest;
      const userId = 'user-123';

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-123',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      });
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 1024000 });
      mockMetadataService.generatePremisXML.mockReturnValue('<premis>metadata</premis>');
      mockJavaBridge.createSIPPackage.mockResolvedValue(undefined);

      // Act
      const result = await (sipService as any).createSIPPackage(
        documents,
        copiedFiles,
        metadataFiles,
        workspaceDir,
        jobData,
        userId,
      );

      // Assert
      expect(result).toHaveProperty('sipId');
      expect(result).toHaveProperty('sipPath');
      expect(result).toHaveProperty('documentCount', 1);
      expect(result).toHaveProperty('size', 1024000);
      expect(mockJavaBridge.createSIPPackage).toHaveBeenCalledWith(
        expect.objectContaining({
          sipId: expect.any(String),
          outputPath: expect.any(String),
          dcMetadataPath: expect.any(String),
          premisMetadataPath: expect.any(String),
          packageMode: 'single',
          files: expect.any(Array),
        }),
      );
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const documents = [{ id: 'doc-1', fileName: 'file1.pdf', user: {} }] as any;
      const copiedFiles = [
        { source: '/uploads/file1.pdf', destination: '/tmp/file1.pdf', document: documents[0] },
      ];
      const metadataFiles = [
        { document: documents[0], metadataPath: '/tmp/metadata/doc-1_dc.xml' },
      ];
      const workspaceDir = '/tmp/workspace-job-123';
      const jobData = { documentIds: ['doc-1'], packageMode: 'single' } as CreateSIPRequest;
      const userId = 'nonexistent-user';

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockMetadataService.generatePremisXML.mockReturnValue('<premis>metadata</premis>');
      mockFs.writeFile.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        (sipService as any).createSIPPackage(
          documents,
          copiedFiles,
          metadataFiles,
          workspaceDir,
          jobData,
          userId,
        ),
      ).rejects.toThrow(HttpException);
    });

    it('should use combined package mode when specified', async () => {
      // Arrange
      const documents = [
        { id: 'doc-1', fileName: 'file1.pdf', user: { username: 'testuser' } },
        { id: 'doc-2', fileName: 'file2.pdf', user: { username: 'testuser' } },
      ] as any;
      const copiedFiles = [
        { source: '/uploads/file1.pdf', destination: '/tmp/file1.pdf', document: documents[0] },
        { source: '/uploads/file2.pdf', destination: '/tmp/file2.pdf', document: documents[1] },
      ];
      const metadataFiles = [
        { document: documents[0], metadataPath: '/tmp/metadata/doc-1_dc.xml' },
        { document: documents[1], metadataPath: '/tmp/metadata/doc-2_dc.xml' },
      ];
      const workspaceDir = '/tmp/workspace-job-123';
      const jobData = {
        documentIds: ['doc-1', 'doc-2'],
        packageMode: 'combined',
      } as CreateSIPRequest;
      const userId = 'user-123';

      mockPrisma.user.findUnique.mockResolvedValue({ username: 'testuser' });
      mockMetadataService.generatePremisXML.mockReturnValue('<premis>metadata</premis>');
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 2048000 });
      mockJavaBridge.createSIPPackage.mockResolvedValue(undefined);

      // Act
      const result = await (sipService as any).createSIPPackage(
        documents,
        copiedFiles,
        metadataFiles,
        workspaceDir,
        jobData,
        userId,
      );

      // Assert
      expect(mockJavaBridge.createSIPPackage).toHaveBeenCalledWith(
        expect.objectContaining({
          packageMode: 'multi', // 'combined' maps to 'multi'
        }),
      );
      expect(result.documentCount).toBe(2);
    });
  });

  describe('finalizeSIPPackage', () => {
    it('should move SIP package to final storage location', async () => {
      // Arrange
      const sipResult = {
        sipId: 'sip-123',
        sipPath: '/tmp/workspace-job-123/output/sip-123.zip',
        documentCount: 2,
        size: 1024000,
        metadata: {
          packageMode: 'single',
          documentsProcessed: ['doc-1', 'doc-2'],
          createdAt: '2024-01-15T10:00:00Z',
          processingTimeMs: 5000,
        },
      };
      const jobData = {
        documentIds: ['doc-1', 'doc-2'],
        packageMode: 'single',
      } as CreateSIPRequest;
      const userId = 'user-123';

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.copyFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 1024000 });

      // Act
      const result = await (sipService as any).finalizeSIPPackage(sipResult, jobData, userId);

      // Assert
      expect(result).toContain('sip-123');
      expect(result).toMatch(/\.zip$/);
      expect(mockFs.mkdir).toHaveBeenCalled();
      expect(mockFs.copyFile).toHaveBeenCalledWith(
        sipResult.sipPath,
        expect.stringContaining('sip-123'),
      );
      expect(mockFs.stat).toHaveBeenCalled();
    });

    it('should throw error if size verification fails', async () => {
      // Arrange
      const sipResult = {
        sipId: 'sip-123',
        sipPath: '/tmp/workspace-job-123/output/sip-123.zip',
        documentCount: 2,
        size: 1024000,
        metadata: {
          packageMode: 'single',
          documentsProcessed: ['doc-1', 'doc-2'],
          createdAt: '2024-01-15T10:00:00Z',
          processingTimeMs: 5000,
        },
      };
      const jobData = {
        documentIds: ['doc-1', 'doc-2'],
        packageMode: 'single',
      } as CreateSIPRequest;
      const userId = 'user-123';

      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.copyFile.mockResolvedValue(undefined);
      mockFs.stat.mockResolvedValue({ size: 999999 }); // Different size

      // Act & Assert
      await expect(
        (sipService as any).finalizeSIPPackage(sipResult, jobData, userId),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('createSIPRecord', () => {
    it('should create SIP record in database', async () => {
      // Arrange
      const job: SipJob = {
        id: 'job-123',
        externalId: 'sip-abc',
        userId: 'user-123',
        status: SipJobStatus.PROCESSING,
        stage: SipJobStage.FINALIZING,
        metadata: { documentIds: ['doc-1'], packageMode: 'single' } as CreateSIPRequest,
        documentIds: ['doc-1'],
        archiveId: null,
        result: null,
        error: null,
        progress: 90,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
      };
      const documents = [{ id: 'doc-1', fileName: 'file1.pdf' }] as any;
      const finalSipPath = '/app/sips/sip-123_2024-01-15.zip';
      const sipResult = {
        sipId: 'sip-123',
        sipPath: '/tmp/workspace-job-123/output/sip-123.zip',
        documentCount: 1,
        size: 1024000,
        metadata: {
          packageMode: 'single',
          documentsProcessed: ['doc-1'],
          createdAt: '2024-01-15T10:00:00Z',
          processingTimeMs: 5000,
        },
      };

      mockPrisma.$executeRaw.mockResolvedValue(1);

      // Act
      await (sipService as any).createSIPRecord(job, documents, finalSipPath, sipResult);

      // Assert
      expect(mockPrisma.$executeRaw).toHaveBeenCalledWith(
        expect.anything(), // Raw SQL template
        sipResult.sipId,
        job.id,
        job.userId,
        sipResult.sipId,
        finalSipPath,
        sipResult.size,
        sipResult.documentCount,
        'single',
        expect.any(String), // JSON stringified metadata
      );
    });

    it('should not fail job on database error', async () => {
      // Arrange - Database persistence is not critical
      const job: SipJob = {
        id: 'job-123',
        externalId: 'sip-abc',
        userId: 'user-123',
        status: SipJobStatus.PROCESSING,
        stage: SipJobStage.FINALIZING,
        metadata: { documentIds: ['doc-1'], packageMode: 'single' } as CreateSIPRequest,
        documentIds: ['doc-1'],
        archiveId: null,
        result: null,
        error: null,
        progress: 90,
        startedAt: new Date(),
        completedAt: null,
        createdAt: new Date(),
      };
      const documents = [{ id: 'doc-1', fileName: 'file1.pdf' }] as any;
      const finalSipPath = '/app/sips/sip-123_2024-01-15.zip';
      const sipResult = {
        sipId: 'sip-123',
        sipPath: '/tmp/workspace-job-123/output/sip-123.zip',
        documentCount: 1,
        size: 1024000,
        metadata: {
          packageMode: 'single',
          documentsProcessed: ['doc-1'],
          createdAt: '2024-01-15T10:00:00Z',
          processingTimeMs: 5000,
        },
      };

      mockPrisma.$executeRaw.mockRejectedValue(new Error('Database error'));

      // Act & Assert - Should not throw
      await expect(
        (sipService as any).createSIPRecord(job, documents, finalSipPath, sipResult),
      ).resolves.not.toThrow();
    });
  });

  describe('Service Status and Cleanup', () => {
    it('should return service status with configuration', () => {
      // Act
      const status = sipService.getStatus();

      // Assert
      expect(status).toHaveProperty('service', 'SIPService');
      expect(status).toHaveProperty('version', '1.0.0');
      expect(status).toHaveProperty('status', 'active');
      expect(status).toHaveProperty('queueStats');
      expect(status).toHaveProperty('activeWorkspaces');
      expect(status).toHaveProperty('configuration');
    });

    it('should cleanup all resources on destroy', async () => {
      // Arrange
      mockTempFileService.cleanupAll.mockResolvedValue(undefined);

      // Act
      await sipService.destroy();

      // Assert
      expect(mockTempFileService.cleanupAll).toHaveBeenCalled();
    });

    it('should throw error if cleanup fails during destroy', async () => {
      // Arrange
      mockTempFileService.cleanupAll.mockRejectedValue(new Error('Cleanup failed'));

      // Act & Assert
      await expect(sipService.destroy()).rejects.toThrow('Cleanup failed');
    });
  });
});
