import { z } from 'zod';
import 'zod-openapi'; // Import for TypeScript type augmentation
import {
  CreateSIPRequestSchema as BaseCreateSIPRequestSchema,
  SIPJobResponseSchema as BaseSIPJobResponseSchema,
  SIPProgressSchema,
} from '../api/sip/sip.schemas';

/**
 * SIP schemas for OpenAPI documentation using zod-openapi
 *
 * These schemas use native .meta() for OpenAPI metadata,
 * compatible with Zod v4 without requiring extendZodWithOpenApi.
 */

// Request schemas
export const CreateSIPRequestSchema = BaseCreateSIPRequestSchema.meta({
  description: 'Request body for creating a new SIP package',
  example: {
    documentIds: ['doc-123', 'doc-456', 'doc-789'],
    packageMode: 'combined',
    metadata: {
      archiveId: 'ARCHIVE-2024-001',
      title: 'Historical Documents Collection',
      description: 'Collection of historical documents from the 1950s',
      creator: 'John Doe',
      subject: 'Local History',
    },
  },
});

// Job schema for responses
export const SIPJobResponseSchema = BaseSIPJobResponseSchema.meta({
  description: 'SIP job information with processing status and metadata',
  example: {
    jobId: 'sip-550e8400-e29b-41d4-a716-446655440000',
    externalId: 'ext-123',
    status: 'PROCESSING',
    progress: 75,
    stage: 'PACKAGING',
    documentIds: ['doc-123', 'doc-456'],
    packageMode: 'combined',
    createdAt: '2024-01-15T10:30:00Z',
    startedAt: '2024-01-15T10:31:00Z',
    metadata: {
      packageMode: 'combined',
      documentCount: 2,
      archiveId: 'ARCHIVE-2024-001',
      title: 'Historical Documents Collection',
    },
  },
});

// Progress schema for SSE
export const SIPProgressResponseSchema = SIPProgressSchema.meta({
  description: 'Real-time progress update for SIP job processing',
  example: {
    jobId: 'sip-550e8400-e29b-41d4-a716-446655440000',
    externalId: 'ext-123',
    stage: 'PACKAGING',
    progress: 75,
    message: 'Creating ZIP archive',
    timestamp: '2024-01-15T10:32:30Z',
    details: {
      totalDocuments: 10,
      documentsProcessed: 7,
      currentDocument: 'doc-456.pdf',
    },
  },
});

// Create SIP response
export const CreateSIPResponseSchema = z
  .object({
    status: z.literal('success'),
    data: z.object({
      job: SIPJobResponseSchema,
      sseUrl: z.string().meta({ description: 'Server-Sent Events URL for progress monitoring' }),
    }),
  })
  .meta({
    description: 'Response after successfully creating a SIP job',
    example: {
      status: 'success',
      data: {
        job: {
          jobId: 'sip-550e8400-e29b-41d4-a716-446655440000',
          externalId: 'ext-123',
          status: 'PENDING',
          progress: 0,
          stage: 'VALIDATING',
          documentIds: ['doc-123', 'doc-456'],
          packageMode: 'combined',
          createdAt: '2024-01-15T10:30:00Z',
          metadata: {
            packageMode: 'combined',
            documentCount: 2,
          },
        },
        sseUrl: '/api/v2/sip/progress/sip-550e8400-e29b-41d4-a716-446655440000',
      },
    },
  });

// Job list response
export const ListSIPJobsResponseSchema = z
  .object({
    status: z.literal('success'),
    data: z.array(SIPJobResponseSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      pages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  })
  .meta({
    description: 'Paginated list of SIP jobs',
    example: {
      status: 'success',
      data: [
        {
          jobId: 'sip-550e8400-e29b-41d4-a716-446655440000',
          externalId: 'ext-123',
          status: 'COMPLETED',
          progress: 100,
          stage: 'COMPLETE',
          documentIds: ['doc-123', 'doc-456'],
          packageMode: 'combined',
          createdAt: '2024-01-15T10:30:00Z',
          startedAt: '2024-01-15T10:31:00Z',
          completedAt: '2024-01-15T10:35:00Z',
          downloadUrl: '/api/v2/sip/download/sip-550e8400',
          downloadExpiresAt: '2024-01-22T10:35:00Z',
        },
      ],
      pagination: {
        page: 1,
        limit: 20,
        total: 42,
        pages: 3,
        hasNext: true,
        hasPrev: false,
      },
    },
  });

// Get single job response
export const GetSIPJobResponseSchema = z
  .object({
    status: z.literal('success'),
    data: SIPJobResponseSchema,
  })
  .meta({
    description: 'Response containing detailed SIP job information',
    example: {
      status: 'success',
      data: {
        jobId: 'sip-550e8400-e29b-41d4-a716-446655440000',
        externalId: 'ext-123',
        status: 'COMPLETED',
        progress: 100,
        stage: 'COMPLETE',
        documentIds: ['doc-123', 'doc-456'],
        packageMode: 'combined',
        createdAt: '2024-01-15T10:30:00Z',
        startedAt: '2024-01-15T10:31:00Z',
        completedAt: '2024-01-15T10:35:00Z',
        downloadUrl: '/api/v2/sip/download/sip-550e8400',
        downloadExpiresAt: '2024-01-22T10:35:00Z',
        metadata: {
          packageMode: 'combined',
          documentCount: 2,
          archiveId: 'ARCHIVE-2024-001',
          title: 'Historical Documents Collection',
        },
      },
    },
  });

// Cancel job response
export const CancelSIPJobResponseSchema = z
  .object({
    status: z.literal('success'),
    data: z.object({
      message: z.string(),
      jobId: z.string(),
    }),
  })
  .meta({
    description: 'Response after successfully cancelling a SIP job',
    example: {
      status: 'success',
      data: {
        message: 'Job cancelled successfully',
        jobId: 'sip-550e8400-e29b-41d4-a716-446655440000',
      },
    },
  });

// Queue statistics response
export const QueueStatsResponseSchema = z
  .object({
    pending: z.number().meta({ description: 'Number of pending jobs' }),
    processing: z.number().meta({ description: 'Number of currently processing jobs' }),
    completed: z.number().meta({ description: 'Number of completed jobs' }),
    failed: z.number().meta({ description: 'Number of failed jobs' }),
    cancelled: z.number().meta({ description: 'Number of cancelled jobs' }),
    total: z.number().meta({ description: 'Total number of jobs' }),
    isProcessing: z.boolean().meta({ description: 'Whether a job is currently being processed' }),
    averageProcessingTime: z
      .number()
      .optional()
      .meta({ description: 'Average processing time in milliseconds' }),
  })
  .meta({
    description: 'SIP queue statistics and health metrics',
    example: {
      pending: 5,
      processing: 1,
      completed: 42,
      failed: 3,
      cancelled: 2,
      total: 53,
      isProcessing: true,
      averageProcessingTime: 45000,
    },
  });

// Export schemas for use in routes and component registration
export const sipSchemas = {
  CreateSIPRequest: CreateSIPRequestSchema,
  SIPJob: SIPJobResponseSchema,
  SIPProgress: SIPProgressResponseSchema,
  CreateSIPResponse: CreateSIPResponseSchema,
  ListSIPJobsResponse: ListSIPJobsResponseSchema,
  GetSIPJobResponse: GetSIPJobResponseSchema,
  CancelSIPJobResponse: CancelSIPJobResponseSchema,
  QueueStatsResponse: QueueStatsResponseSchema,
};

// Export empty registry
export const sipRegistry = {
  definitions: [] as unknown[],
};
