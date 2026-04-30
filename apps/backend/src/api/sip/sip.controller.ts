/**
 * SIP (Submission Information Package) Controller
 *
 * Handles HTTP requests for SIP creation and job management operations.
 * Implements Server-Sent Events for real-time progress streaming.
 * Validates input data and delegates business logic to the service layer.
 *
 * Design by Contract:
 * - Preconditions: Valid authentication and input validation
 * - Postconditions: Type-safe responses with proper HTTP status codes
 * - Invariants: Security field omission, progress event streaming
 */

import type { SipJobStageType, SipJobStatusType } from '@memoriaali/api-types/generated';
import type { SipJob } from '@memoriaali/database';
import type { Response } from 'express';
import { z } from 'zod';

import { ERROR_CODES } from '../../shared/constants/error-codes';
import { HttpException } from '../../shared/errors';
import type { AuthenticatedRequest } from '../../shared/types/AuthenticatedRequest';
import { Logger } from '../../shared/utils/logger';
import {
  createPaginationMeta,
  sendPaginatedResponse,
  sendSuccess,
} from '../../shared/utils/response.utils';

import { resolveRelativePaths } from './services/document-path.resolver';
import { queueService } from './services/queue.service';
import { sipOrchestrator } from './services/sip-orchestrator.service';
import {
  CreateSIPRequestSchema,
  SIPJobQuerySchema,
  SIPPackageModeSchema,
  type SIPJobQuery,
  type SIPJobResponse,
  type SIPProgress,
} from './sip.schemas';

/**
 * Runtime validation schemas for database JsonValue fields
 *
 * These schemas validate application data stored in Json columns.
 * They are controller-level implementation details, not database models.
 */
const JobPayloadSchema = z.object({
  documentIds: z.array(z.string().uuid()).default([]),
  packageMode: SIPPackageModeSchema.optional(),
  relativePaths: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const JobResultSchema = z.object({
  sipPath: z.string(),
  sipId: z.string(),
  size: z.number(),
  documentCount: z.number(),
});

const JobErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string(),
  details: z.unknown().optional(),
});

/**
 * Type-safe interfaces for database JsonValue fields
 */
type JobPayload = z.infer<typeof JobPayloadSchema>;
type JobResult = z.infer<typeof JobResultSchema>;
type JobError = z.infer<typeof JobErrorSchema>;

/**
 * SIP Controller
 *
 * Handles HTTP requests for SIP package generation and management.
 * Provides endpoints for creating SIP packages, monitoring progress,
 * and managing job queues with real-time updates via Server-Sent Events.
 */
export class SIPController {
  private readonly logger = new Logger('SIPController');

  /**
   * Extract payload from database job's JsonValue metadata field with runtime validation
   */
  private extractPayload(job: SipJob): JobPayload {
    const validated = JobPayloadSchema.safeParse(job.metadata);

    if (!validated.success) {
      this.logger.warn('Invalid job metadata structure', {
        jobId: job.id,
        errors: validated.error.issues,
      });
      return { documentIds: [] }; // Safe fallback
    }

    return validated.data;
  }

  /**
   * Extract result from database job's JsonValue result field with runtime validation
   */
  private extractResult(job: SipJob): JobResult | undefined {
    if (!job.result) {
      return undefined;
    }

    const validated = JobResultSchema.safeParse(job.result);

    if (!validated.success) {
      this.logger.warn('Invalid job result structure', {
        jobId: job.id,
        errors: validated.error.issues,
      });
      return undefined;
    }

    return validated.data;
  }

  /**
   * Extract error from database job's JsonValue error field with runtime validation
   */
  private extractError(job: SipJob): JobError | undefined {
    if (!job.error) {
      return undefined;
    }

    const validated = JobErrorSchema.safeParse(job.error);

    if (!validated.success) {
      this.logger.warn('Invalid job error structure', {
        jobId: job.id,
        errors: validated.error.issues,
      });
      return undefined;
    }

    return validated.data;
  }
  /**
   * Create a new SIP package request
   *
   * @param req - Express request object containing document IDs and options
   * @param res - Express response object
   */
  createSIP = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const input = CreateSIPRequestSchema.parse(req.body);
    const currentUser = req.authenticatedUser;

    if (!currentUser) {
      throw HttpException.unauthorized('Authentication required');
    }

    // Add computed relative paths if not provided
    const relativePaths = input.relativePaths ?? resolveRelativePaths(input.documentIds);

    // Add job via orchestrator
    const jobId = await sipOrchestrator.addJob({ ...input, relativePaths }, currentUser.id);

    // Get job details from queue
    const job = await sipOrchestrator.getJob(jobId);
    if (!job) {
      throw HttpException.internalServerError(
        ERROR_CODES.SYSTEM.INTERNAL_ERROR,
        'Failed to retrieve created job',
      );
    }

    // Convert internal job format to API response format
    const payload = this.extractPayload(job);
    const result = this.extractResult(job);
    const err = this.extractError(job);

    const responseJob: SIPJobResponse = {
      externalId: job.externalId,
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      documentIds: payload.documentIds,
      packageMode: payload.packageMode ?? 'single', // Default to single if not set
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      downloadUrl: result ? `/api/v2/sip/download/${job.id}` : undefined,
      downloadExpiresAt: job.completedAt
        ? new Date(job.completedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      error: err
        ? {
            code: err.code ?? ERROR_CODES.SYSTEM.INTERNAL_ERROR,
            message: err.message,
            details: err.details,
            occurredAt: job.completedAt?.toISOString() ?? new Date().toISOString(),
          }
        : undefined,
      metadata: {
        packageMode: payload.packageMode ?? 'single', // Default to single if not set
        documentCount: payload.documentIds.length,
        ...(payload.metadata ?? {}),
      },
    };

    sendSuccess(
      res,
      {
        job: responseJob,
        sseUrl: `/api/v2/sip/progress/${jobId}`,
      },
      201,
    );
  };

  /**
   * Stream job progress updates via Server-Sent Events with database polling
   *
   * Polls database every 2 seconds for job updates instead of using EventEmitter.
   * This approach:
   * - Survives server restarts (no in-memory state)
   * - Works with database as single source of truth
   * - Simple and reliable
   *
   * @param req - Express request object with job ID parameter
   * @param res - Express response object for SSE streaming
   */
  streamProgress = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { jobId } = req.params;
    const currentUser = req.authenticatedUser;

    if (!currentUser) {
      throw HttpException.unauthorized('Authentication required');
    }

    if (!jobId) {
      throw HttpException.badRequest('Job ID is required');
    }

    // Verify job exists and user has access
    const job = await queueService.getJob(jobId);
    if (!job) {
      throw HttpException.notFound('Job not found');
    }

    if (job.userId !== currentUser.id) {
      throw HttpException.forbidden('Access denied to this job');
    }

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    });

    // Send initial job state
    this.sendJobProgressEvent(res, job);

    // Declare interval IDs (must declare before use in closures)
    // Send heartbeat every 30 seconds to keep connection alive (already started above)
    const heartbeat: NodeJS.Timeout = setInterval(() => {
      this.sendSSEEvent(res, 'heartbeat', { timestamp: new Date().toISOString() });
    }, 30000);

    const pollInterval = setInterval(async () => {
      try {
        const updatedJob = await queueService.getJob(jobId);

        if (!updatedJob) {
          // Job was deleted
          clearInterval(pollInterval);
          clearInterval(heartbeat);
          this.sendSSEEvent(res, 'close', { reason: 'Job not found' });
          res.end();
          return;
        }

        // Send progress update
        this.sendJobProgressEvent(res, updatedJob);

        // Close connection when job reaches terminal state
        if (
          updatedJob.status === 'COMPLETED' ||
          updatedJob.status === 'FAILED' ||
          updatedJob.status === 'CANCELLED'
        ) {
          setTimeout(() => {
            clearInterval(pollInterval);
            clearInterval(heartbeat);
            this.sendSSEEvent(res, 'close', { reason: `Job ${updatedJob.status}` });
            res.end();
          }, 1000); // Give client 1 second to receive final update
        }
      } catch (error) {
        // Continue polling even on transient errors
        console.error('Error polling job status:', error);
      }
    }, 2000); // Poll every 2 seconds

    // Cleanup on client disconnect
    req.on('close', () => {
      clearInterval(pollInterval);
      clearInterval(heartbeat);
    });

    // Handle connection errors
    res.on('error', () => {
      clearInterval(pollInterval);
      clearInterval(heartbeat);
    });
  };

  /**
   * Helper: Send job progress as SSE event
   */
  private sendJobProgressEvent(res: Response, job: SipJob): void {
    const payload = this.extractPayload(job);
    const err = this.extractError(job);

    const progressEvent: SIPProgress = {
      externalId: job.externalId,
      jobId: job.externalId,
      stage: job.stage as SipJobStageType,
      progress: job.progress,
      message: `Job ${job.status}`,
      timestamp: new Date().toISOString(),
      details: {
        totalDocuments: payload.documentIds.length,
        documentsProcessed: Math.floor((payload.documentIds.length * job.progress) / 100),
      },
      error: err
        ? {
            code: err.code ?? ERROR_CODES.SYSTEM.INTERNAL_ERROR,
            message: err.message,
            details: err.details,
          }
        : undefined,
    };

    this.sendSSEEvent(res, 'progress', progressEvent);
  }

  /**
   * List SIP jobs with filtering and pagination
   *
   * @param req - Express request object with query parameters
   * @param res - Express response object
   */
  listJobs = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const query: SIPJobQuery = SIPJobQuerySchema.parse(req.query);
    const currentUser = req.authenticatedUser;

    if (!currentUser) {
      throw HttpException.unauthorized('Authentication required');
    }

    // Calculate pagination
    const offset = (query.page - 1) * query.limit;

    // Prepare filter options
    const filterOptions: Parameters<typeof queueService.getJobs>[0] = {
      ...(query.status && { status: query.status }),
      userId: query.userId ?? currentUser.id, // Non-admin users can only see their own jobs
      limit: query.limit,
      offset,
    };

    // Admin users can see all jobs if userId is not specified
    if (query.userId && currentUser.role !== 'ADMIN') {
      throw HttpException.forbidden('Only administrators can view other users jobs');
    }

    const { jobs, total } = await queueService.getJobs(filterOptions);

    // Convert jobs to API format
    const responseJobs: SIPJobResponse[] = jobs.map((job): SIPJobResponse => {
      const payload = this.extractPayload(job);
      const result = this.extractResult(job);
      const err = this.extractError(job);

      return {
        externalId: job.externalId,
        jobId: job.id,
        status: job.status as SipJobStatusType,
        progress: job.progress,
        stage: job.stage as SipJobStageType,
        documentIds: payload.documentIds,
        packageMode: payload.packageMode ?? 'single', // Default to single if not set
        createdAt: job.createdAt.toISOString(),
        startedAt: job.startedAt?.toISOString(),
        completedAt: job.completedAt?.toISOString(),
        downloadUrl: result ? `/api/v2/sip/download/${job.id}` : undefined,
        downloadExpiresAt: job.completedAt
          ? new Date(job.completedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
          : undefined,
        error: err
          ? {
              code: err.code ?? ERROR_CODES.SYSTEM.INTERNAL_ERROR,
              message: err.message,
              details: err.details,
              occurredAt: job.completedAt?.toISOString() ?? new Date().toISOString(),
            }
          : undefined,
        metadata: {
          packageMode: payload.packageMode ?? 'single', // Default to single if not set
          documentCount: payload.documentIds.length,
          ...(payload.metadata ?? {}),
        },
      };
    });

    const pagination = createPaginationMeta(total, query.page, query.limit);

    sendPaginatedResponse(res, responseJobs, pagination);
  };

  /**
   * Get specific job details
   *
   * @param req - Express request object with job ID parameter
   * @param res - Express response object
   */
  getJobDetails = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    return this.getJobById(req, res);
  };

  getJobById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { jobId } = req.params;
    const currentUser = req.authenticatedUser;

    if (!currentUser) {
      throw HttpException.unauthorized('Authentication required');
    }

    if (!jobId) {
      throw HttpException.badRequest('Job ID is required');
    }

    const job = await queueService.getJob(jobId);
    if (!job) {
      throw HttpException.notFound('Job not found');
    }

    // Check access permissions
    if (job.userId !== currentUser.id && currentUser.role !== 'ADMIN') {
      throw HttpException.forbidden('Access denied to this job');
    }

    // Convert to API format
    const payload = this.extractPayload(job);
    const result = this.extractResult(job);
    const err = this.extractError(job);

    const responseJob: SIPJobResponse = {
      externalId: job.externalId,
      jobId: job.id,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      documentIds: payload.documentIds,
      packageMode: payload.packageMode ?? 'single', // Default to single if not set
      createdAt: job.createdAt.toISOString(),
      startedAt: job.startedAt?.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      downloadUrl: result ? `/api/v2/sip/download/${job.id}` : undefined,
      downloadExpiresAt: job.completedAt
        ? new Date(job.completedAt.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      error: err
        ? {
            code: err.code ?? ERROR_CODES.SYSTEM.INTERNAL_ERROR,
            message: err.message,
            details: err.details,
            occurredAt: job.completedAt?.toISOString() ?? new Date().toISOString(),
          }
        : undefined,
      metadata: {
        packageMode: payload.packageMode ?? 'single', // Default to single if not set
        documentCount: payload.documentIds.length,
        ...(payload.metadata ?? {}),
      },
    };

    sendSuccess(res, responseJob);
  };

  /**
   * Cancel a pending job
   *
   * @param req - Express request object with job ID parameter
   * @param res - Express response object
   */
  cancelJob = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { jobId } = req.params;
    const currentUser = req.authenticatedUser;

    if (!currentUser) {
      throw HttpException.unauthorized('Authentication required');
    }

    if (!jobId) {
      throw HttpException.badRequest('Job ID is required');
    }

    // Cancel the job (includes permission checks)
    await queueService.cancelJob(jobId, currentUser.id);

    sendSuccess(res, {
      message: 'Job cancelled successfully',
      jobId,
    });
  };

  /**
   * Send Server-Sent Event to client
   *
   * @param res - Response object
   * @param event - Event name
   * @param data - Event data
   */
  private sendSSEEvent(res: Response, event: string, data: unknown): void {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}
