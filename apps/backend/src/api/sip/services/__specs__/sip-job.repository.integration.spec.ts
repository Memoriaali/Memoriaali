/**
 * SIP Job Repository Integration Tests
 *
 * Integration tests for database-backed job persistence including:
 * - Atomic job claiming with locking
 * - Job status transitions
 * - Concurrent access scenarios
 * - Stale job recovery
 * - Transaction rollback on errors
 *
 * These tests use a real test database instance to verify
 * database-level guarantees and transaction boundaries.
 */

import { SipJobStatus, SipJobStage } from '@memoriaali/database/generated/client';
import { beforeEach, describe, expect, it } from 'vitest';

import { prisma } from '../../../../shared/database/prisma';
import { SIPJobRepository } from '../sip-job.repository';
import type { CreateSIPRequest } from '../../sip.schemas';

describe('SIPJobRepository Integration Tests', () => {
  let repository: SIPJobRepository;
  const TEST_USER_ID = 'test-user-sip-integration';
  const TEST_USER_OTHER_ID = 'test-user-sip-other';

  beforeEach(async () => {
    repository = new SIPJobRepository();

    // Clean up test data before each test
    // Note: SipJob userId foreign key constraint is relaxed, so we don't need to create test users
    await prisma.sipJob.deleteMany({
      where: {
        externalId: {
          startsWith: 'test-sip-',
        },
      },
    });
  });

  describe('Job Creation and Retrieval', () => {
    it('should create job and retrieve by external ID', async () => {
      // Arrange
      const externalId = 'test-sip-create-001';
      const requestData: CreateSIPRequest = {
        documentIds: ['doc-1', 'doc-2'],
        packageMode: 'single',
      };

      // Act
      const createdExternalId = await repository.createFromRequest(
        externalId,
        TEST_USER_ID,
        requestData,
      );

      const retrievedJob = await repository.getByExternalId(externalId);

      // Assert
      expect(createdExternalId).toBe(externalId);
      expect(retrievedJob).toBeDefined();
      expect(retrievedJob?.externalId).toBe(externalId);
      expect(retrievedJob?.userId).toBe(TEST_USER_ID);
      expect(retrievedJob?.status).toBe(SipJobStatus.PENDING);
      expect(retrievedJob?.stage).toBe(SipJobStage.QUEUED);
      expect(retrievedJob?.progress).toBe(0);
      expect(retrievedJob?.documentIds).toEqual(['doc-1', 'doc-2']);
    });

    it('should retrieve job by internal ID', async () => {
      // Arrange
      const externalId = 'test-sip-internal-001';
      const userId = TEST_USER_ID;
      const requestData: CreateSIPRequest = {
        documentIds: ['doc-1'],
        packageMode: 'single',
      };

      await repository.createFromRequest(externalId, userId, requestData);
      const jobByExternal = await repository.getByExternalId(externalId);

      // Act
      const jobByInternal = await repository.getById(jobByExternal!.id);

      // Assert
      expect(jobByInternal).toBeDefined();
      expect(jobByInternal?.id).toBe(jobByExternal!.id);
      expect(jobByInternal?.externalId).toBe(externalId);
    });

    it('should return null for non-existent job', async () => {
      // Act
      const job = await repository.getByExternalId('nonexistent-job');

      // Assert
      expect(job).toBeNull();
    });
  });

  describe('Atomic Job Claiming', () => {
    it('should claim next pending job atomically', async () => {
      // Arrange - Create two pending jobs
      await repository.createFromRequest('test-sip-claim-001', TEST_USER_ID, {
        documentIds: ['doc-1'],
        packageMode: 'single',
      });
      await repository.createFromRequest('test-sip-claim-002', TEST_USER_ID, {
        documentIds: ['doc-2'],
        packageMode: 'single',
      });

      // Wait a tiny bit to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Act
      const claimedJob = await repository.claimNextPendingJob();

      // Assert
      expect(claimedJob).toBeDefined();
      expect(claimedJob?.status).toBe(SipJobStatus.PROCESSING);
      expect(claimedJob?.stage).toBe(SipJobStage.VALIDATING);
      expect(claimedJob?.startedAt).toBeDefined();

      // Verify first job was claimed (oldest first)
      expect(claimedJob?.externalId).toBe('test-sip-claim-001');
    });

    it('should return null when no pending jobs exist', async () => {
      // Act
      const claimedJob = await repository.claimNextPendingJob();

      // Assert
      expect(claimedJob).toBeNull();
    });

    it('should prevent concurrent claiming of same job', async () => {
      // Arrange - Create TWO jobs to properly test concurrent claiming
      await repository.createFromRequest('test-sip-concurrent-001', TEST_USER_ID, {
        documentIds: ['doc-1'],
        packageMode: 'single',
      });
      await repository.createFromRequest('test-sip-concurrent-002', TEST_USER_ID, {
        documentIds: ['doc-2'],
        packageMode: 'single',
      });

      // Act - Attempt to claim jobs concurrently
      const [job1, job2] = await Promise.all([
        repository.claimNextPendingJob(),
        repository.claimNextPendingJob(),
      ]);

      // Assert - Both should succeed (2 jobs, 2 claims)
      expect(job1).toBeDefined();
      expect(job2).toBeDefined();

      // CRITICAL: They must be DIFFERENT jobs (no double-claiming)
      expect(job1!.id).not.toBe(job2!.id);
      expect(job1!.externalId).not.toBe(job2!.externalId);

      // Both should be in PROCESSING status
      expect(job1!.status).toBe('PROCESSING');
      expect(job2!.status).toBe('PROCESSING');
    });
  });

  describe('Job Filtering and Pagination', () => {
    it('should filter jobs by status', async () => {
      // Arrange - Create jobs with different statuses
      await repository.createFromRequest('test-sip-filter-pending-001', TEST_USER_ID, {
        documentIds: ['doc-1'],
        packageMode: 'single',
      });
      await repository.createFromRequest('test-sip-filter-pending-002', TEST_USER_ID, {
        documentIds: ['doc-2'],
        packageMode: 'single',
      });

      // Claim one job to set it to PROCESSING
      await repository.claimNextPendingJob();

      // Act
      const pendingJobs = await repository.getJobs({ status: SipJobStatus.PENDING });
      const processingJobs = await repository.getJobs({ status: SipJobStatus.PROCESSING });

      // Assert
      expect(pendingJobs.total).toBe(1);
      expect(processingJobs.total).toBe(1);
    });

    it('should filter jobs by user ID', async () => {
      // Arrange
      await repository.createFromRequest('test-sip-user-001', TEST_USER_ID, {
        documentIds: ['doc-1'],
        packageMode: 'single',
      });
      await repository.createFromRequest('test-sip-user-002', TEST_USER_OTHER_ID, {
        documentIds: ['doc-2'],
        packageMode: 'single',
      });

      // Act
      const user1Jobs = await repository.getJobs({ userId: TEST_USER_ID });
      const user2Jobs = await repository.getJobs({ userId: TEST_USER_OTHER_ID });

      // Assert
      expect(user1Jobs.total).toBe(1);
      expect(user2Jobs.total).toBe(1);
      expect(user1Jobs.jobs[0]?.userId).toBe(TEST_USER_ID);
      expect(user2Jobs.jobs[0]?.userId).toBe(TEST_USER_OTHER_ID);
    });

    it('should support pagination with limit and offset', async () => {
      // Arrange - Create 5 jobs
      for (let i = 1; i <= 5; i++) {
        await repository.createFromRequest(
          `test-sip-page-${i.toString().padStart(3, '0')}`,
          TEST_USER_ID,
          {
            documentIds: [`doc-${i}`],
            packageMode: 'single',
          },
        );
      }

      // Act - Get page 1 (first 2 jobs)
      const page1 = await repository.getJobs({ limit: 2, offset: 0 });
      // Act - Get page 2 (next 2 jobs)
      const page2 = await repository.getJobs({ limit: 2, offset: 2 });

      // Assert
      expect(page1.jobs).toHaveLength(2);
      expect(page2.jobs).toHaveLength(2);
      expect(page1.total).toBe(5);
      expect(page2.total).toBe(5);
      // Jobs are ordered by createdAt desc, so newest first
      expect(page1.jobs[0]?.externalId).not.toBe(page2.jobs[0]?.externalId);
    });
  });

  describe('Job Status Transitions', () => {
    it('should update job progress', async () => {
      // Arrange
      const externalId = 'test-sip-progress-001';
      await repository.createFromRequest(externalId, TEST_USER_ID, {
        documentIds: ['doc-1'],
        packageMode: 'single',
      });

      // Act
      await repository.updateProgress(externalId, {
        stage: SipJobStage.VALIDATING,
        progress: 50,
      });

      const job = await repository.getByExternalId(externalId);

      // Assert
      expect(job?.stage).toBe(SipJobStage.VALIDATING);
      expect(job?.progress).toBe(50);
    });

    it('should clamp progress to 0-100 range', async () => {
      // Arrange
      const externalId = 'test-sip-progress-clamp-001';
      await repository.createFromRequest(externalId, TEST_USER_ID, {
        documentIds: ['doc-1'],
        packageMode: 'single',
      });

      // Act - Try to set progress > 100
      await repository.updateProgress(externalId, { progress: 150 });
      const job1 = await repository.getByExternalId(externalId);

      // Act - Try to set progress < 0
      await repository.updateProgress(externalId, { progress: -10 });
      const job2 = await repository.getByExternalId(externalId);

      // Assert
      expect(job1?.progress).toBe(100);
      expect(job2?.progress).toBe(0);
    });

    it('should complete job with result data', async () => {
      // Arrange
      const externalId = 'test-sip-complete-001';
      await repository.createFromRequest(externalId, TEST_USER_ID, {
        documentIds: ['doc-1'],
        packageMode: 'single',
      });

      const result = {
        sipPath: '/app/sips/sip-123.zip',
        sipId: 'sip-123',
        size: 1024000,
        documentCount: 1,
      };

      // Act
      await repository.complete(externalId, result);
      const job = await repository.getByExternalId(externalId);

      // Assert
      expect(job?.status).toBe(SipJobStatus.COMPLETED);
      expect(job?.stage).toBe(SipJobStage.COMPLETE);
      expect(job?.progress).toBe(100);
      expect(job?.result).toEqual(result);
      expect(job?.completedAt).toBeDefined();
    });

    it('should fail job with error details', async () => {
      // Arrange
      const externalId = 'test-sip-fail-001';
      await repository.createFromRequest(externalId, TEST_USER_ID, {
        documentIds: ['doc-1'],
        packageMode: 'single',
      });

      const errorData = {
        code: 'FILE_NOT_FOUND',
        message: 'Document file not found',
        details: 'File path: /missing/file.pdf',
      };

      // Act
      await repository.fail(externalId, errorData);
      const job = await repository.getByExternalId(externalId);

      // Assert
      expect(job?.status).toBe(SipJobStatus.FAILED);
      expect(job?.stage).toBe(SipJobStage.ERROR);
      expect(job?.error).toEqual(errorData);
      expect(job?.completedAt).toBeDefined();
    });
  });

  describe('Job Cancellation', () => {
    it('should cancel pending job successfully', async () => {
      // Arrange
      const externalId = 'test-sip-cancel-001';
      await repository.createFromRequest(externalId, TEST_USER_ID, {
        documentIds: ['doc-1'],
        packageMode: 'single',
      });

      // Act
      await repository.cancel(externalId, TEST_USER_ID);
      const job = await repository.getByExternalId(externalId);

      // Assert
      expect(job?.status).toBe(SipJobStatus.CANCELLED);
      expect(job?.completedAt).toBeDefined();
    });

    it('should throw error when job not found', async () => {
      // Act & Assert
      await expect(repository.cancel('nonexistent-job', TEST_USER_ID)).rejects.toThrow('not found');
    });

    it('should throw error when user does not own job', async () => {
      // Arrange
      const externalId = 'test-sip-cancel-owner-001';
      await repository.createFromRequest(externalId, TEST_USER_ID, {
        documentIds: ['doc-1'],
        packageMode: 'single',
      });

      // Act & Assert - Try to cancel with different user
      await expect(repository.cancel(externalId, TEST_USER_OTHER_ID)).rejects.toThrow(
        'does not own',
      );
    });

    it('should throw error when job not in PENDING status', async () => {
      // Arrange
      const externalId = 'test-sip-cancel-status-001';
      await repository.createFromRequest(externalId, TEST_USER_ID, {
        documentIds: ['doc-1'],
        packageMode: 'single',
      });

      // Claim the job to set it to PROCESSING
      await repository.claimNextPendingJob();

      // Act & Assert
      await expect(repository.cancel(externalId, TEST_USER_ID)).rejects.toThrow('Cannot cancel');
    });
  });

  describe('Stale Job Recovery', () => {
    it('should reset stale PROCESSING jobs to PENDING', async () => {
      // Arrange - Create job and claim it
      const externalId = 'test-sip-stale-001';
      await repository.createFromRequest(externalId, TEST_USER_ID, {
        documentIds: ['doc-1'],
        packageMode: 'single',
      });

      const claimedJob = await repository.claimNextPendingJob();
      expect(claimedJob?.status).toBe(SipJobStatus.PROCESSING);

      // Manually set startedAt to 31 minutes ago (stale)
      await prisma.sipJob.update({
        where: { externalId },
        data: {
          startedAt: new Date(Date.now() - 31 * 60 * 1000), // 31 minutes ago
        },
      });

      // Act
      const resetCount = await repository.resetStaleJobs(30 * 60 * 1000); // 30 minutes

      // Assert
      expect(resetCount).toBe(1);

      const job = await repository.getByExternalId(externalId);
      expect(job?.status).toBe(SipJobStatus.PENDING);
      expect(job?.stage).toBe(SipJobStage.QUEUED);
      expect(job?.startedAt).toBeNull();
    });

    it('should not reset recent PROCESSING jobs', async () => {
      // Arrange - Create and claim job
      const externalId = 'test-sip-recent-001';
      await repository.createFromRequest(externalId, TEST_USER_ID, {
        documentIds: ['doc-1'],
        packageMode: 'single',
      });

      await repository.claimNextPendingJob();

      // Act - Reset with default threshold (30 minutes)
      const resetCount = await repository.resetStaleJobs();

      // Assert
      expect(resetCount).toBe(0);

      const job = await repository.getByExternalId(externalId);
      expect(job?.status).toBe(SipJobStatus.PROCESSING);
    });

    it('should not reset completed or failed jobs', async () => {
      // Arrange
      const completedId = 'test-sip-completed-001';
      const failedId = 'test-sip-failed-001';

      await repository.createFromRequest(completedId, TEST_USER_ID, {
        documentIds: ['doc-1'],
        packageMode: 'single',
      });
      await repository.createFromRequest(failedId, TEST_USER_ID, {
        documentIds: ['doc-2'],
        packageMode: 'single',
      });

      await repository.complete(completedId, {
        sipPath: '/path',
        sipId: 'sip-1',
        size: 1000,
        documentCount: 1,
      });
      await repository.fail(failedId, { message: 'Failed' });

      // Act
      const resetCount = await repository.resetStaleJobs(0); // Reset all stale

      // Assert
      expect(resetCount).toBe(0);
    });
  });

  describe('hasPendingJobs', () => {
    it('should return true when pending jobs exist', async () => {
      // Arrange
      await repository.createFromRequest('test-sip-pending-check-001', TEST_USER_ID, {
        documentIds: ['doc-1'],
        packageMode: 'single',
      });

      // Act
      const hasPending = await repository.hasPendingJobs();

      // Assert
      expect(hasPending).toBe(true);
    });

    it('should return false when no pending jobs', async () => {
      // Act
      const hasPending = await repository.hasPendingJobs();

      // Assert
      expect(hasPending).toBe(false);
    });
  });
});
