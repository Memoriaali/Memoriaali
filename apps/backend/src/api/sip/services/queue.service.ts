/**
 * Queue Service - Database-Backed Job Queue
 *
 * Thin service layer that delegates all persistence to SIPJobRepository.
 * Provides a clean API for job management with database as single source of truth.
 *
 * Key Changes from Previous Implementation:
 * - Removed in-memory Map storage
 * - Removed EventEmitter (replaced with database polling in controller)
 * - All operations delegate to repository
 * - State persisted in database via Prisma
 *
 * Design by Contract:
 * - Preconditions: Valid request data, authenticated users
 * - Postconditions: All state changes persisted to database
 * - Invariants: Database is always source of truth
 */

import type { SipJob } from '@memoriaali/database';
import { SipJobStage, SipJobStatus } from '@memoriaali/database/generated/client';
import { v4 as uuidv4 } from 'uuid';

import { ERROR_CODES } from '../../../shared/constants/error-codes';
import { HttpException } from '../../../shared/errors';
import { Logger } from '../../../shared/utils/logger';

import { sipJobRepository } from './sip-job.repository';
import type { CreateSIPRequest } from '../sip.schemas';

/**
 * Job Progress Event (for compatibility with existing controller code)
 */
export interface JobProgressEvent {
  jobId: string;
  status: SipJobStatus;
  stage: SipJobStage;
  progress: number;
  message?: string;
  details?: {
    totalDocuments?: number;
    processedDocuments?: number;
    currentFile?: string;
  };
}

/**
 * Queue Statistics
 */
export interface QueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  cancelled: number;
  total: number;
  isProcessing: boolean;
}

/**
 * Database-Backed Queue Service
 *
 * Manages SIP job lifecycle with all state persisted in database.
 * Provides simple interface for job operations without in-memory state.
 */
export class QueueService {
  private readonly logger = new Logger('QueueService');
  private readonly maxQueueSize = 100;
  private processor: ((job: SipJob) => Promise<void>) | null = null;

  constructor() {
    this.logger.info('🚀 Database-backed queue service initialized');
  }

  /**
   * Register the job processor function
   *
   * The processor will be called by the orchestrator for each job.
   */
  registerProcessor(processor: (job: SipJob) => Promise<void>): void {
    this.processor = processor;
    this.logger.info('📋 Job processor registered');
  }

  /**
   * Add a new job to the queue
   *
   * Creates job in database with PENDING status. The orchestrator
   * will pick it up for processing.
   *
   * @param data - SIP creation request data
   * @param userId - User creating the job
   * @returns External job ID (sip-uuid format)
   */
  async addJob(data: CreateSIPRequest, userId: string): Promise<string> {
    // Check queue size (count pending jobs)
    const pendingCount = await this.countJobsByStatus(SipJobStatus.PENDING);

    if (pendingCount >= this.maxQueueSize) {
      throw HttpException.tooManyRequests(
        ERROR_CODES.RATE_LIMIT.EXCEEDED,
        'Queue is full. Please try again later.',
      );
    }

    // Generate external ID
    const externalId = `sip-${uuidv4()}`;

    // Create job in database
    await sipJobRepository.createFromRequest(externalId, userId, data);

    this.logger.info(
      `📥 Job ${externalId} added to queue (position: ${pendingCount + 1}/${this.maxQueueSize})`,
    );

    return externalId;
  }

  /**
   * Get job by external ID
   */
  async getJob(jobId: string): Promise<SipJob | null> {
    return sipJobRepository.getByExternalId(jobId);
  }

  /**
   * Get all jobs with optional filtering
   */
  getJobs(options?: {
    status?: SipJobStatus;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: SipJob[]; total: number }> {
    const filters: {
      status?: SipJobStatus;
      userId?: string;
      limit?: number;
      offset?: number;
    } = {};

    if (options?.status !== undefined) filters.status = options.status;
    if (options?.userId !== undefined) filters.userId = options.userId;
    if (options?.limit !== undefined) filters.limit = options.limit;
    if (options?.offset !== undefined) filters.offset = options.offset;

    return sipJobRepository.getJobs(filters);
  }

  /**
   * Check if pending jobs exist
   */
  async hasPendingJobs(): Promise<boolean> {
    return sipJobRepository.hasPendingJobs();
  }

  /**
   * Cancel a pending job
   *
   * Only jobs in PENDING status can be cancelled.
   * Job ownership is verified in repository.
   *
   * @param jobId - External job ID
   * @param userId - User requesting cancellation
   */
  async cancelJob(jobId: string, userId: string): Promise<void> {
    try {
      await sipJobRepository.cancel(jobId, userId);
      this.logger.info(`🚫 Job ${jobId} cancelled by user ${userId}`);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          throw HttpException.notFound(ERROR_CODES.RESOURCE.NOT_FOUND, 'Job not found');
        }
        if (error.message.includes('does not own')) {
          throw HttpException.forbidden(ERROR_CODES.AUTH.ACCESS_DENIED, 'Access denied to job');
        }
        if (error.message.includes('Cannot cancel')) {
          throw HttpException.badRequest(ERROR_CODES.VALIDATION.INVALID_INPUT, error.message);
        }
      }
      throw error;
    }
  }

  /**
   * Update job progress
   *
   * Called by orchestrator during processing to update stage and progress.
   */
  updateProgress(
    jobId: string,
    stage: SipJobStage,
    progress: number,
    _message?: string,
    _details?: JobProgressEvent['details'],
  ): void {
    // Async update, don't await (fire and forget)
    sipJobRepository.updateProgress(jobId, { stage, progress }).catch((error) => {
      this.logger.error(`Failed to update progress for job ${jobId}:`, error);
    });
  }

  /**
   * Mark job as completed
   */
  completeJob(
    jobId: string,
    result: { sipPath: string; sipId: string; size: number; documentCount: number },
  ): void {
    // Async complete, don't await
    sipJobRepository.complete(jobId, result).catch((error) => {
      this.logger.error(`Failed to complete job ${jobId}:`, error);
    });
  }

  /**
   * Mark job as failed
   */
  failJob(jobId: string, error: Error | string, code?: string): void {
    const errorData: {
      code?: string;
      message: string;
      details?: unknown;
    } = {
      message: typeof error === 'string' ? error : error.message,
    };

    if (code !== undefined) errorData.code = code;
    if (error instanceof Error && error.stack !== undefined) errorData.details = error.stack;

    // Async fail, don't await
    sipJobRepository.fail(jobId, errorData).catch((err) => {
      this.logger.error(`Failed to mark job ${jobId} as failed:`, err);
    });
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const [pending, processing, completed, failed, cancelled, total] = await Promise.all([
      this.countJobsByStatus(SipJobStatus.PENDING),
      this.countJobsByStatus(SipJobStatus.PROCESSING),
      this.countJobsByStatus(SipJobStatus.COMPLETED),
      this.countJobsByStatus(SipJobStatus.FAILED),
      this.countJobsByStatus(SipJobStatus.CANCELLED),
      this.countAllJobs(),
    ]);

    return {
      pending,
      processing,
      completed,
      failed,
      cancelled,
      total,
      isProcessing: processing > 0,
    };
  }

  /**
   * Helper: Count jobs by status
   */
  private async countJobsByStatus(status: SipJobStatus): Promise<number> {
    const result = await sipJobRepository.getJobs({ status, limit: 0 });
    return result.total;
  }

  /**
   * Helper: Count all jobs
   */
  private async countAllJobs(): Promise<number> {
    const result = await sipJobRepository.getJobs({ limit: 0 });
    return result.total;
  }

  /**
   * Cleanup (no-op for database-backed queue)
   *
   * Kept for compatibility with previous interface.
   */
  destroy(): void {
    this.logger.info('Queue service destroyed');
  }
}

// Export singleton instance
export const queueService = new QueueService();

// Re-export SipJob type from database for convenience
export type { SipJob };
