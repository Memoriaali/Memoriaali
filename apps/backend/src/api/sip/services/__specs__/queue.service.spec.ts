/**
 * Queue Service Unit Tests
 *
 * Comprehensive test coverage for database-backed job queue including:
 * - Job creation with queue limits
 * - Job retrieval and filtering
 * - Job cancellation with ownership verification
 * - Job status updates
 * - Queue statistics calculation
 * - Error handling and validation
 *
 * Tests verify business logic with mocked repository layer.
 */

import { SipJobStatus } from '@memoriaali/database/generated/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ERROR_CODES } from '../../../../shared/constants/error-codes';
import { HttpException } from '../../../../shared/errors';
import { QueueService } from '../queue.service';
import type { CreateSIPRequest } from '../../sip.schemas';

// Mock the repository
vi.mock('../sip-job.repository', () => ({
  sipJobRepository: {
    createFromRequest: vi.fn(),
    getByExternalId: vi.fn(),
    getJobs: vi.fn(),
    hasPendingJobs: vi.fn(),
    cancel: vi.fn(),
    updateProgress: vi.fn(),
    complete: vi.fn(),
    fail: vi.fn(),
  },
}));

describe('QueueService', () => {
  let queueService: QueueService;
  let mockRepository: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const repositoryModule = await import('../sip-job.repository');
    mockRepository = repositoryModule.sipJobRepository;

    queueService = new QueueService();
  });

  describe('addJob', () => {
    it('should create job successfully when queue not full', async () => {
      // Arrange
      const requestData: CreateSIPRequest = {
        documentIds: ['doc-1', 'doc-2'],
        packageMode: 'single',
      };
      const userId = 'user-123';

      mockRepository.getJobs.mockResolvedValue({ jobs: Array(5).fill({}), total: 5 });
      mockRepository.createFromRequest.mockResolvedValue('sip-abc-123');

      // Act
      const result = await queueService.addJob(requestData, userId);

      // Assert
      expect(result).toMatch(/^sip-[a-f0-9-]+$/);
      expect(mockRepository.createFromRequest).toHaveBeenCalledWith(
        expect.stringMatching(/^sip-/),
        userId,
        requestData,
      );
    });

    it('should throw error when queue is full', async () => {
      // Arrange
      const requestData: CreateSIPRequest = {
        documentIds: ['doc-1'],
        packageMode: 'single',
      };
      const userId = 'user-123';

      // Mock queue full (100 pending jobs)
      mockRepository.getJobs.mockResolvedValue({ jobs: Array(100).fill({}), total: 100 });

      // Act & Assert
      await expect(queueService.addJob(requestData, userId)).rejects.toThrow(HttpException);
      await expect(queueService.addJob(requestData, userId)).rejects.toThrow('Queue is full');
      expect(mockRepository.createFromRequest).not.toHaveBeenCalled();
    });

    it('should allow adding job when queue at limit - 1', async () => {
      // Arrange
      const requestData: CreateSIPRequest = {
        documentIds: ['doc-1'],
        packageMode: 'single',
      };
      const userId = 'user-123';

      mockRepository.getJobs.mockResolvedValue({ jobs: Array(99).fill({}), total: 99 });
      mockRepository.createFromRequest.mockResolvedValue('sip-xyz');

      // Act
      const result = await queueService.addJob(requestData, userId);

      // Assert
      expect(result).toBeDefined();
      expect(mockRepository.createFromRequest).toHaveBeenCalled();
    });

    it('should generate unique external IDs for each job', async () => {
      // Arrange
      const requestData: CreateSIPRequest = {
        documentIds: ['doc-1'],
        packageMode: 'single',
      };
      const userId = 'user-123';

      mockRepository.getJobs.mockResolvedValue({ jobs: [], total: 0 });
      mockRepository.createFromRequest.mockResolvedValue('sip-1');

      // Act
      const id1 = await queueService.addJob(requestData, userId);
      const id2 = await queueService.addJob(requestData, userId);

      // Assert
      expect(id1).not.toBe(id2);
      expect(mockRepository.createFromRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe('getJob', () => {
    it('should retrieve job by external ID', async () => {
      // Arrange
      const jobId = 'sip-abc';
      const mockJob = {
        id: 'internal-id',
        externalId: jobId,
        userId: 'user-123',
        status: SipJobStatus.PENDING,
      };

      mockRepository.getByExternalId.mockResolvedValue(mockJob);

      // Act
      const result = await queueService.getJob(jobId);

      // Assert
      expect(result).toEqual(mockJob);
      expect(mockRepository.getByExternalId).toHaveBeenCalledWith(jobId);
    });

    it('should return null when job not found', async () => {
      // Arrange
      const jobId = 'nonexistent-job';
      mockRepository.getByExternalId.mockResolvedValue(null);

      // Act
      const result = await queueService.getJob(jobId);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('getJobs', () => {
    it('should retrieve jobs with filtering options', async () => {
      // Arrange
      const options = {
        status: SipJobStatus.COMPLETED,
        userId: 'user-123',
        limit: 10,
        offset: 0,
      };

      const mockJobs = [
        { id: 'job-1', externalId: 'sip-1', status: SipJobStatus.COMPLETED },
        { id: 'job-2', externalId: 'sip-2', status: SipJobStatus.COMPLETED },
      ];

      mockRepository.getJobs.mockResolvedValue({ jobs: mockJobs, total: 2 });

      // Act
      const result = await queueService.getJobs(options);

      // Assert
      expect(result.jobs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockRepository.getJobs).toHaveBeenCalledWith(options);
    });

    it('should handle optional filtering parameters', async () => {
      // Arrange
      mockRepository.getJobs.mockResolvedValue({ jobs: [], total: 0 });

      // Act - No filters
      await queueService.getJobs();

      // Assert
      expect(mockRepository.getJobs).toHaveBeenCalledWith({});
    });

    it('should support pagination', async () => {
      // Arrange
      const options = {
        limit: 5,
        offset: 10,
      };

      mockRepository.getJobs.mockResolvedValue({ jobs: [], total: 25 });

      // Act
      const result = await queueService.getJobs(options);

      // Assert
      expect(result.total).toBe(25);
      expect(mockRepository.getJobs).toHaveBeenCalledWith(options);
    });
  });

  describe('hasPendingJobs', () => {
    it('should return true when pending jobs exist', async () => {
      // Arrange
      mockRepository.hasPendingJobs.mockResolvedValue(true);

      // Act
      const result = await queueService.hasPendingJobs();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when no pending jobs', async () => {
      // Arrange
      mockRepository.hasPendingJobs.mockResolvedValue(false);

      // Act
      const result = await queueService.hasPendingJobs();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('cancelJob', () => {
    it('should cancel job successfully when user is owner', async () => {
      // Arrange
      const jobId = 'sip-abc';
      const userId = 'user-123';

      mockRepository.cancel.mockResolvedValue(undefined);

      // Act
      await queueService.cancelJob(jobId, userId);

      // Assert
      expect(mockRepository.cancel).toHaveBeenCalledWith(jobId, userId);
    });

    it('should throw NotFound error when job does not exist', async () => {
      // Arrange
      const jobId = 'nonexistent-job';
      const userId = 'user-123';

      mockRepository.cancel.mockRejectedValue(new Error('Job not found'));

      // Act & Assert
      await expect(queueService.cancelJob(jobId, userId)).rejects.toThrow(HttpException);
      await expect(queueService.cancelJob(jobId, userId)).rejects.toThrow('Job not found');
    });

    it('should throw Forbidden error when user does not own job', async () => {
      // Arrange
      const jobId = 'sip-abc';
      const userId = 'user-456';

      mockRepository.cancel.mockRejectedValue(new Error('User does not own'));

      // Act & Assert
      await expect(queueService.cancelJob(jobId, userId)).rejects.toThrow(HttpException);
      await expect(queueService.cancelJob(jobId, userId)).rejects.toThrow('Access denied');
    });

    it('should throw BadRequest error when job cannot be cancelled', async () => {
      // Arrange
      const jobId = 'sip-abc';
      const userId = 'user-123';

      mockRepository.cancel.mockRejectedValue(new Error('Cannot cancel job in status COMPLETED'));

      // Act & Assert
      await expect(queueService.cancelJob(jobId, userId)).rejects.toThrow(HttpException);
      await expect(queueService.cancelJob(jobId, userId)).rejects.toThrow('Cannot cancel');
    });
  });

  describe('updateProgress', () => {
    it('should update job progress asynchronously', () => {
      // Arrange
      const jobId = 'sip-abc';
      const stage = 'VALIDATING' as any;
      const progress = 50;
      const message = 'Validating documents...';
      const details = { totalDocuments: 5, processedDocuments: 2 };

      mockRepository.updateProgress.mockResolvedValue(undefined);

      // Act - Fire and forget
      queueService.updateProgress(jobId, stage, progress, message, details);

      // Assert - Called asynchronously
      expect(mockRepository.updateProgress).toHaveBeenCalledWith(jobId, {
        stage,
        progress,
      });
    });

    it('should not throw error if update fails (fire and forget)', () => {
      // Arrange
      const jobId = 'sip-abc';
      const stage = 'VALIDATING' as any;
      const progress = 50;

      mockRepository.updateProgress.mockRejectedValue(new Error('Update failed'));

      // Act & Assert - Should not throw
      expect(() => {
        queueService.updateProgress(jobId, stage, progress);
      }).not.toThrow();
    });
  });

  describe('completeJob', () => {
    it('should mark job as completed with result', () => {
      // Arrange
      const jobId = 'sip-abc';
      const result = {
        sipPath: '/app/sips/sip-abc.zip',
        sipId: 'sip-abc',
        size: 1024000,
        documentCount: 5,
      };

      mockRepository.complete.mockResolvedValue(undefined);

      // Act - Fire and forget
      queueService.completeJob(jobId, result);

      // Assert
      expect(mockRepository.complete).toHaveBeenCalledWith(jobId, result);
    });

    it('should not throw error if complete fails (fire and forget)', () => {
      // Arrange
      const jobId = 'sip-abc';
      const result = {
        sipPath: '/app/sips/sip-abc.zip',
        sipId: 'sip-abc',
        size: 1024000,
        documentCount: 5,
      };

      mockRepository.complete.mockRejectedValue(new Error('Complete failed'));

      // Act & Assert - Should not throw
      expect(() => {
        queueService.completeJob(jobId, result);
      }).not.toThrow();
    });
  });

  describe('failJob', () => {
    it('should mark job as failed with error details', () => {
      // Arrange
      const jobId = 'sip-abc';
      const error = new Error('Processing failed');
      const code = ERROR_CODES.SYSTEM.INTERNAL_ERROR;

      mockRepository.fail.mockResolvedValue(undefined);

      // Act - Fire and forget
      queueService.failJob(jobId, error, code);

      // Assert
      expect(mockRepository.fail).toHaveBeenCalledWith(
        jobId,
        expect.objectContaining({
          message: 'Processing failed',
          code,
          details: expect.any(String),
        }),
      );
    });

    it('should handle string errors', () => {
      // Arrange
      const jobId = 'sip-abc';
      const error = 'Something went wrong';

      mockRepository.fail.mockResolvedValue(undefined);

      // Act
      queueService.failJob(jobId, error);

      // Assert
      expect(mockRepository.fail).toHaveBeenCalledWith(
        jobId,
        expect.objectContaining({
          message: 'Something went wrong',
        }),
      );
    });

    it('should not throw error if fail operation fails (fire and forget)', () => {
      // Arrange
      const jobId = 'sip-abc';
      const error = new Error('Processing failed');

      mockRepository.fail.mockRejectedValue(new Error('Fail update failed'));

      // Act & Assert - Should not throw
      expect(() => {
        queueService.failJob(jobId, error);
      }).not.toThrow();
    });
  });

  describe('getStats', () => {
    it('should calculate queue statistics correctly', async () => {
      // Arrange
      mockRepository.getJobs
        .mockResolvedValueOnce({ jobs: [], total: 5 }) // pending
        .mockResolvedValueOnce({ jobs: [], total: 2 }) // processing
        .mockResolvedValueOnce({ jobs: [], total: 10 }) // completed
        .mockResolvedValueOnce({ jobs: [], total: 1 }) // failed
        .mockResolvedValueOnce({ jobs: [], total: 0 }) // cancelled
        .mockResolvedValueOnce({ jobs: [], total: 18 }); // total

      // Act
      const stats = await queueService.getStats();

      // Assert
      expect(stats).toEqual({
        pending: 5,
        processing: 2,
        completed: 10,
        failed: 1,
        cancelled: 0,
        total: 18,
        isProcessing: true, // processing > 0
      });
    });

    it('should set isProcessing to false when no jobs processing', async () => {
      // Arrange
      mockRepository.getJobs
        .mockResolvedValueOnce({ jobs: [], total: 0 }) // pending
        .mockResolvedValueOnce({ jobs: [], total: 0 }) // processing
        .mockResolvedValueOnce({ jobs: [], total: 5 }) // completed
        .mockResolvedValueOnce({ jobs: [], total: 0 }) // failed
        .mockResolvedValueOnce({ jobs: [], total: 0 }) // cancelled
        .mockResolvedValueOnce({ jobs: [], total: 5 }); // total

      // Act
      const stats = await queueService.getStats();

      // Assert
      expect(stats.isProcessing).toBe(false);
    });

    it('should handle empty queue', async () => {
      // Arrange
      mockRepository.getJobs.mockResolvedValue({ jobs: [], total: 0 });

      // Act
      const stats = await queueService.getStats();

      // Assert
      expect(stats).toEqual({
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        total: 0,
        isProcessing: false,
      });
    });
  });

  describe('registerProcessor', () => {
    it('should register job processor function', () => {
      // Arrange
      const mockProcessor = vi.fn();

      // Act
      queueService.registerProcessor(mockProcessor);

      // Assert - Processor is registered (internal state)
      expect((queueService as any).processor).toBe(mockProcessor);
    });
  });

  describe('destroy', () => {
    it('should cleanup service resources', () => {
      // Act & Assert - Should not throw
      expect(() => {
        queueService.destroy();
      }).not.toThrow();
    });
  });
});
