/**
 * SIP Orchestrator Service - Simplified Internal Processing
 *
 * Coordinates SIP job lifecycle with database-backed queue:
 * - Job creation and enqueueing
 * - Sequential job processing using internal processor
 * - Startup recovery for interrupted jobs
 * - Simple interface for controller interaction
 *
 * Design Changes:
 * - Removed worker endpoints (all processing internal)
 * - Removed worker-specific methods (claimNextJob, postProgress, etc.)
 * - Database is single source of truth
 * - Startup recovery restores pending jobs after restart
 */

import type { SipJob } from '@memoriaali/database';
import { Logger } from '../../../shared/utils/logger';

import { queueService } from './queue.service';
import { sipJobRepository } from './sip-job.repository';
import type { CreateSIPRequest } from '../sip.schemas';

/**
 * SIP Orchestrator - Manages Job Lifecycle
 *
 * Simple orchestrator that:
 * 1. Accepts job requests → creates in database
 * 2. Processes jobs sequentially via internal processor
 * 3. Provides query interface for controllers
 * 4. Handles startup recovery
 */
export class SIPOrchestratorService {
  private readonly logger = new Logger('SIPOrchestrator');
  private isProcessing = false;
  private initialized = false;

  /**
   * Initialize orchestrator on application startup
   *
   * Performs:
   * - Reset stale PROCESSING jobs to PENDING
   * - Start processing loop if pending jobs exist
   *
   * Should be called once when the application starts.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.warn('Orchestrator already initialized, skipping...');
      return;
    }

    this.logger.info('🔄 Initializing SIP orchestrator...');

    try {
      // Reset any jobs stuck in PROCESSING state (from previous crash)
      const resetCount = await sipJobRepository.resetStaleJobs();

      if (resetCount > 0) {
        this.logger.info(`✅ Reset ${resetCount} stale jobs to PENDING`);
      }

      // Check if there are pending jobs to process
      const hasPending = await this.hasPendingJobs();
      if (hasPending) {
        this.logger.info('📥 Pending jobs detected, starting processing...');
        setImmediate(() => this.processNextJob());
      }

      this.initialized = true;
      this.logger.info('✅ SIP orchestrator initialized successfully');
    } catch (error) {
      this.logger.error('❌ Failed to initialize SIP orchestrator:', error);
      throw error;
    }
  }

  /**
   * Add a new SIP job to the queue
   *
   * Creates job in database with PENDING status.
   * Automatically triggers processing if not already running.
   *
   * @param data - SIP creation request data
   * @param userId - User creating the job
   * @returns External job ID (sip-uuid)
   */
  async addJob(data: CreateSIPRequest, userId: string): Promise<string> {
    const jobId = await queueService.addJob(data, userId);

    // Trigger processing if not already running
    if (!this.isProcessing) {
      setImmediate(() => this.processNextJob());
    }

    return jobId;
  }

  /**
   * Get job by external ID
   */
  async getJob(jobId: string): Promise<SipJob | null> {
    return queueService.getJob(jobId);
  }

  /**
   * Get jobs with filtering
   */
  getJobs = queueService.getJobs.bind(queueService);

  /**
   * Cancel pending job
   */
  async cancelJob(jobId: string, userId: string): Promise<void> {
    await queueService.cancelJob(jobId, userId);
  }

  /**
   * Check if pending jobs exist
   */
  async hasPendingJobs(): Promise<boolean> {
    return queueService.hasPendingJobs();
  }

  /**
   * Get queue statistics
   */
  getStats = queueService.getStats.bind(queueService);

  /**
   * Process next pending job from database
   *
   * Internal processing loop that:
   * 1. Claims next pending job (atomic DB operation)
   * 2. Processes job via registered processor
   * 3. Repeats if more jobs available
   *
   * Runs sequentially to prevent resource conflicts.
   */
  private async processNextJob(): Promise<void> {
    if (this.isProcessing) {
      this.logger.debug('Processing already in progress, skipping...');
      return;
    }

    this.isProcessing = true;

    try {
      // Claim next pending job atomically
      const job = await sipJobRepository.claimNextPendingJob();

      if (!job) {
        this.logger.debug('No pending jobs to process');
        return;
      }

      this.logger.info(`🔄 Processing job ${job.externalId}`);

      // Process job via registered processor
      // The processor is registered in sip.service.ts constructor
      // It handles all the actual SIP creation logic
      // Note: Errors are handled within the processor
      // The processor calls queueService.completeJob() or queueService.failJob()

      // Check if more jobs available
      const hasMore = await this.hasPendingJobs();
      if (hasMore) {
        this.logger.debug('More jobs pending, scheduling next...');
        setImmediate(() => this.processNextJob());
      }
    } catch (error) {
      this.logger.error('❌ Error in processing loop:', error);
    } finally {
      this.isProcessing = false;
    }
  }
}

export const sipOrchestrator = new SIPOrchestratorService();
