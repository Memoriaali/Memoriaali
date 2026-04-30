import type { Prisma as DbPrisma, SipJob } from '@memoriaali/database';
import { SipJobStage, SipJobStatus } from '@memoriaali/database/generated/client';
import { prisma } from '../../../shared/database/prisma';
import { Logger } from '../../../shared/utils/logger';
import type { CreateSIPRequest } from '../sip.schemas';

/**
 * SIP Job Repository - Single Source of Truth for Job Persistence
 *
 * Provides database-backed storage for all SIP job operations with:
 * - Transactional job claiming with SELECT FOR UPDATE locking
 * - Full CRUD operations for job lifecycle
 * - Atomic state transitions
 * - Query and filtering capabilities
 */
export class SIPJobRepository {
  private readonly logger = new Logger('SIPJobRepository');

  /**
   * Create a new SIP job from request data
   *
   * @param externalId - Public-facing job identifier (e.g., sip-uuid)
   * @param userId - User who created the job
   * @param data - SIP creation request data
   * @returns Created job's externalId
   */
  async createFromRequest(
    externalId: string,
    userId: string,
    data: CreateSIPRequest,
  ): Promise<string> {
    const job = await prisma.sipJob.create({
      data: {
        externalId,
        userId,
        status: SipJobStatus.PENDING,
        stage: SipJobStage.QUEUED,
        progress: 0,
        documentIds: data.documentIds as unknown as DbPrisma.InputJsonValue,
        archiveId: data.archiveId ?? null,
        metadata: (data.metadata ?? {}) as unknown as DbPrisma.InputJsonValue,
      },
    });

    this.logger.info(`Created SIP job ${externalId} for user ${userId}`);
    return job.externalId;
  }

  /**
   * Atomically claim the next pending job for processing
   *
   * Uses database-level locking (SELECT FOR UPDATE) to prevent
   * multiple workers from claiming the same job.
   *
   * @returns Next pending job or null if none available
   */
  async claimNextPendingJob(): Promise<SipJob | null> {
    // Retry mechanism for optimistic locking conflicts
    const MAX_RETRIES = 3;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        // Use optimistic concurrency control with updateMany
        // This approach: find oldest pending job, attempt to claim it atomically
        // If another process claims it first, updateMany returns 0 and we retry

        const pending = await prisma.sipJob.findFirst({
          where: { status: SipJobStatus.PENDING },
          orderBy: { createdAt: 'asc' },
          select: { id: true, externalId: true },
        });

        if (!pending) {
          return null;
        }

        // Atomically update only if still PENDING (optimistic locking)
        const updated = await prisma.sipJob.updateMany({
          where: {
            id: pending.id,
            status: SipJobStatus.PENDING, // Only update if still pending
          },
          data: {
            status: SipJobStatus.PROCESSING,
            stage: SipJobStage.VALIDATING,
            startedAt: new Date(),
          },
        });

        // If count is 0, another process claimed it first - retry with next job
        if (updated.count === 0) {
          // Another worker claimed this job, retry to find the next one
          // Add small delay to let the other worker's transaction complete
          await new Promise((resolve) => setTimeout(resolve, 5));
          continue;
        }

        // Fetch the updated job to return
        const claimedJob = await prisma.sipJob.findUnique({
          where: { id: pending.id },
        });

        if (claimedJob) {
          this.logger.info(`Claimed job ${claimedJob.externalId} for processing`);
        }

        return claimedJob;
      } catch (error) {
        this.logger.error(
          `Failed to claim next pending job (attempt ${attempt + 1}/${MAX_RETRIES}):`,
          error,
        );

        // On last attempt, return null
        if (attempt === MAX_RETRIES - 1) {
          return null;
        }

        // Brief backoff before retry
        await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
      }
    }

    return null;
  }

  /**
   * Get job by external ID
   */
  async getByExternalId(externalId: string): Promise<SipJob | null> {
    return prisma.sipJob.findUnique({
      where: { externalId },
    });
  }

  /**
   * Get job by internal ID
   */
  async getById(id: string): Promise<SipJob | null> {
    return prisma.sipJob.findUnique({
      where: { id },
    });
  }

  /**
   * List jobs with filtering and pagination
   */
  async getJobs(options: {
    status?: SipJobStatus;
    userId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ jobs: SipJob[]; total: number }> {
    const where: DbPrisma.SipJobWhereInput = {};

    if (options.status) {
      where.status = options.status;
    }
    if (options.userId) {
      where.userId = options.userId;
    }

    const findManyOptions: {
      where: typeof where;
      orderBy: { createdAt: 'desc' };
      skip?: number;
      take?: number;
    } = {
      where,
      orderBy: { createdAt: 'desc' },
    };

    if (options.offset !== undefined) findManyOptions.skip = options.offset;
    if (options.limit !== undefined) findManyOptions.take = options.limit;

    const [jobs, total] = await Promise.all([
      prisma.sipJob.findMany(findManyOptions),
      prisma.sipJob.count({ where }),
    ]);

    return { jobs, total };
  }

  /**
   * Check if any pending jobs exist
   */
  async hasPendingJobs(): Promise<boolean> {
    const count = await prisma.sipJob.count({
      where: { status: SipJobStatus.PENDING },
    });
    return count > 0;
  }

  /**
   * Update job progress
   */
  async updateProgress(
    externalId: string,
    update: { stage?: SipJobStage; progress?: number },
  ): Promise<void> {
    const data: DbPrisma.SipJobUpdateInput = {};

    if (update.stage !== undefined) {
      data.stage = update.stage;
    }
    if (typeof update.progress === 'number') {
      data.progress = Math.max(0, Math.min(100, update.progress));
    }

    await prisma.sipJob.update({
      where: { externalId },
      data,
    });
  }

  /**
   * Mark job as completed
   */
  async complete(
    externalId: string,
    result: { sipPath: string; sipId: string; size: number; documentCount: number },
  ): Promise<void> {
    await prisma.sipJob.update({
      where: { externalId },
      data: {
        status: SipJobStatus.COMPLETED,
        stage: SipJobStage.COMPLETE,
        progress: 100,
        result: result as unknown as DbPrisma.InputJsonValue,
        completedAt: new Date(),
      },
    });

    this.logger.info(`Job ${externalId} completed successfully`);
  }

  /**
   * Mark job as failed
   */
  async fail(
    externalId: string,
    error: { code?: string; message: string; details?: unknown },
  ): Promise<void> {
    await prisma.sipJob.update({
      where: { externalId },
      data: {
        status: SipJobStatus.FAILED,
        stage: SipJobStage.ERROR,
        error: error as unknown as DbPrisma.InputJsonValue,
        completedAt: new Date(),
      },
    });

    this.logger.error(`Job ${externalId} failed: ${error.message}`);
  }

  /**
   * Cancel a pending job
   */
  async cancel(externalId: string, userId: string): Promise<void> {
    const job = await this.getByExternalId(externalId);

    if (!job) {
      throw new Error(`Job ${externalId} not found`);
    }

    if (job.userId !== userId) {
      throw new Error(`User ${userId} does not own job ${externalId}`);
    }

    if (job.status !== SipJobStatus.PENDING) {
      throw new Error(`Cannot cancel job in status ${job.status}`);
    }

    await prisma.sipJob.update({
      where: { externalId },
      data: {
        status: SipJobStatus.CANCELLED,
        completedAt: new Date(),
      },
    });

    this.logger.info(`Job ${externalId} cancelled by user ${userId}`);
  }

  /**
   * Reset stale PROCESSING jobs back to PENDING
   *
   * Used during startup recovery to handle jobs that were
   * interrupted by server crash or restart.
   *
   * @param staleThresholdMs - Jobs older than this are considered stale (default: 30 minutes)
   * @returns Number of jobs reset
   */
  async resetStaleJobs(staleThresholdMs = 30 * 60 * 1000): Promise<number> {
    const staleTime = new Date(Date.now() - staleThresholdMs);

    const result = await prisma.sipJob.updateMany({
      where: {
        status: SipJobStatus.PROCESSING,
        startedAt: { lt: staleTime },
      },
      data: {
        status: SipJobStatus.PENDING,
        stage: SipJobStage.QUEUED,
        startedAt: null,
      },
    });

    if (result.count > 0) {
      this.logger.info(`Reset ${result.count} stale jobs to PENDING`);
    }

    return result.count;
  }
}

export const sipJobRepository = new SIPJobRepository();
