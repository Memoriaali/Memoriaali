/**
 * SIP (Submission Information Package) API Schema Definitions
 *
 * Provides comprehensive Zod validation schemas for SIP generation endpoints.
 * Implements security field-picking and follows project validation patterns.
 *
 * Single Source of Truth: Database enums are the master for shared types.
 *
 * Design by Contract:
 * - Preconditions: Valid input data conforming to schema rules
 * - Postconditions: Type-safe validated data objects
 * - Invariants: Security field omission, data type consistency
 */

import {
  SipJobSchema,
  SipJobStageSchema,
  SipJobStatusSchema,
} from '@memoriaali/api-types/generated';
import { z } from '../../openapi-schemas/zod.utils';

// ================================================================================================
// ENUMS AND CONSTANTS - Single Source of Truth from Generated Schemas
// ================================================================================================

/**
 * Re-export generated database enums for convenience
 * Single Source of Truth: @memoriaali/api-types/src/generated
 */
export { SipJobStageSchema, SipJobStatusSchema };

/**
 * SIP package creation modes
 * Note: These are application-level modes, not stored in database enum
 */
export const SIPPackageModeSchema = z
  .enum(['single', 'combined'])
  .describe('Package mode for SIP creation');

/**
 * Metadata format supported by legacy SIP creator
 */
export const SIPMetadataFormatSchema = z
  .enum(['dc', 'ead2002'])
  .describe('Descriptive metadata format (legacy compatibility)');

/**
 * Optional submitter information to override derived user data
 */
export const SIPSubmitterSchema = z
  .object({
    username: z.string().min(1).optional().describe('Submitter username'),
    name: z.string().min(1).optional().describe('Submitter display name'),
  })
  .describe('Optional submitter info to override derived user');

/**
 * Optional archivist information
 */
export const SIPArchivistSchema = z
  .object({
    name: z.string().min(1).optional().describe('Archivist or organization display name'),
    organization: z.string().min(1).optional().describe('Archivist organization'),
  })
  .describe('Optional archivist information');

/**
 * Per-document overrides to mirror legacy per-representation inputs
 */
export const SIPDocumentOverrideSchema = z
  .object({
    documentId: z.string().min(1).describe('Target document ID to override'),
    creatorName: z.string().min(1).optional().describe('Override creator display name'),
    creatorUsername: z.string().min(1).optional().describe('Override creator username'),
    relativeRename: z
      .string()
      .min(1)
      .optional()
      .describe('Desired path/filename inside the SIP package for this document'),
    metadataXmlPath: z
      .string()
      .min(1)
      .optional()
      .describe('Optional filesystem path to a pre-generated DC metadata XML for this document'),
  })
  .describe('Per-document override options');

// ================================================================================================
// INPUT VALIDATION SCHEMAS
// ================================================================================================

/**
 * Schema for creating a new SIP request
 *
 * Validates SIP creation parameters including document selection and packaging options.
 * Supports both individual and batch packaging modes.
 *
 * Preconditions: Valid document IDs and optional configuration
 * Postconditions: Returns validated SIP creation data
 * Invariants: Document ID validation and mode consistency
 */
export const CreateSIPRequestSchema = z.object({
  documentIds: z
    .array(z.string().uuid('Document ID must be a valid UUID'))
    .min(1, 'At least one document ID is required')
    .max(1000, 'Maximum 1000 documents per SIP package')
    .describe('Array of document UUIDs to include in the SIP package'),

  relativePaths: z
    .array(z.string())
    .min(1)
    .optional()
    .describe('Relative file paths under UPLOAD_DIR for each document (backend-resolved)'),

  archiveId: z
    .string()
    .uuid('Archive ID must be a valid UUID')
    .optional()
    .describe('Optional archive identifier for SIP metadata'),

  packageMode: SIPPackageModeSchema.default('single').describe(
    'Packaging mode: single (one SIP per document) or combined (all documents in one SIP)',
  ),

  metadata: z
    .record(z.string(), z.any())
    .optional()
    .describe('Additional metadata for the SIP package'),

  compressionLevel: z
    .number()
    .int()
    .min(0)
    .max(9)
    .default(6)
    .optional()
    .describe('ZIP compression level (0-9, higher = better compression)'),

  includePreservationMetadata: z
    .boolean()
    .default(true)
    .describe('Include preservation metadata in the SIP package'),

  // =========================
  // Legacy compatibility zone
  // =========================

  sipName: z
    .string()
    .min(1)
    .optional()
    .describe('Optional base name for the SIP package (legacy: output file name)'),

  metadataFormat: SIPMetadataFormatSchema.default('dc').describe(
    'Descriptive metadata format (legacy compatibility)',
  ),

  descriptiveMetadataPath: z
    .string()
    .min(1)
    .optional()
    .describe('Optional path to a SIP-level descriptive metadata XML (legacy)'),

  premisMetadataPath: z
    .string()
    .min(1)
    .optional()
    .describe('Optional path to a SIP-level PREMIS metadata XML (legacy)'),

  submitter: SIPSubmitterSchema.optional(),

  archivist: SIPArchivistSchema.optional(),

  documentOverrides: z
    .array(SIPDocumentOverrideSchema)
    .min(1)
    .optional()
    .describe('Per-document overrides for creator info, rename, and custom metadata XML'),
});

// ================================================================================================
// PROGRESS AND JOB TRACKING SCHEMAS
// ================================================================================================

/**
 * Schema for SIP progress events (Server-Sent Events)
 *
 * Uses fields from generated SipJobSchema where applicable.
 * Single Source of Truth: stage and progress fields from database.
 *
 * SSOT Pattern:
 * - Database fields: Use generated SipJobStageSchema
 * - SSE-specific fields: Extended for real-time updates (message, details, etc.)
 */
export const SIPProgressSchema = SipJobSchema.pick({
  externalId: true,
  stage: true,
  progress: true,
}).extend({
  // Transform externalId to jobId for API compatibility
  jobId: z.string().min(1).describe('Unique job identifier (maps to externalId)'),

  // SSE-specific fields
  message: z.string().describe('Human-readable progress message'),

  details: z
    .object({
      currentDocument: z.string().optional().describe('Currently processing document name'),
      documentsProcessed: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Number of documents processed'),
      totalDocuments: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Total number of documents to process'),
      estimatedTimeRemaining: z.number().optional().describe('Estimated time remaining in seconds'),
    })
    .optional()
    .describe('Additional progress details'),

  timestamp: z.string().datetime().describe('Progress event timestamp in ISO format'),

  error: z
    .object({
      code: z.string().describe('Error code'),
      message: z.string().describe('Error message'),
      details: z.any().optional().describe('Additional error details'),
    })
    .optional()
    .describe('Error information if stage is "error"'),
});

/**
 * Schema for SIP job API responses
 *
 * Extends database SipJobSchema with API-specific fields.
 * Single Source of Truth: Uses .pick() from generated SipJobSchema + .extend() for API fields.
 *
 * SSOT Pattern:
 * - Database fields: Picked from generated @memoriaali/api-types/src/generated
 * - API-only fields: Extended for response enhancement (downloadUrl, etc.)
 */
export const SIPJobResponseSchema = SipJobSchema.pick({
  externalId: true, // Public job identifier
  status: true,
  stage: true,
  progress: true,
}).extend({
  // Transform externalId to jobId for API compatibility
  jobId: z.string().min(1).describe('Unique job identifier (maps to externalId)'),

  // Transform Date fields to ISO strings for API response
  createdAt: z.string().datetime().describe('Job creation timestamp'),
  startedAt: z.string().datetime().optional().describe('Job start timestamp'),
  completedAt: z.string().datetime().optional().describe('Job completion timestamp'),

  // API-specific fields not in database
  downloadUrl: z.string().url().optional().describe('Download URL for completed SIP package'),
  downloadExpiresAt: z.string().datetime().optional().describe('Download URL expiration timestamp'),

  // Application-level fields (parsed from JSON columns)
  documentIds: z.array(z.string().uuid()).describe('Document IDs being processed'),
  packageMode: SIPPackageModeSchema.describe('Packaging mode used for this job'),

  // Structured error from JSON column
  error: z
    .object({
      code: z.string().describe('Error code'),
      message: z.string().describe('Error message'),
      details: z.any().optional().describe('Additional error details'),
      occurredAt: z.string().datetime().describe('Error occurrence timestamp'),
    })
    .optional()
    .describe('Error information if job failed'),

  // Additional metadata from JSON column
  metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe('Additional metadata for the job'),
});

// ================================================================================================
// RESPONSE SCHEMAS
// ================================================================================================

/**
 * Schema for SIP creation response
 *
 * Returns job tracking information after SIP creation request.
 * Follows standard API response patterns with success status.
 *
 * Preconditions: Successful SIP job creation
 * Postconditions: Returns job tracking data
 * Invariants: No sensitive data exposure
 */
export const SIPResponseSchema = z.object({
  status: z.literal('success').describe('Response status indicator'),

  data: z
    .object({
      job: SIPJobResponseSchema.describe('SIP job information'),
      sseUrl: z.string().url().optional().describe('Server-Sent Events URL for progress updates'),
    })
    .describe('Response data payload'),

  message: z
    .string()
    .default('SIP creation job started successfully')
    .describe('Human-readable response message'),
});

/**
 * Schema for SIP job list response
 *
 * Returns paginated list of SIP jobs with filtering support.
 * Follows standard pagination patterns.
 *
 * Preconditions: Valid query parameters
 * Postconditions: Returns paginated job list
 * Invariants: Pagination consistency
 */
export const SIPJobListResponseSchema = z.object({
  status: z.literal('success').describe('Response status indicator'),

  data: z
    .object({
      jobs: z.array(SIPJobResponseSchema).describe('Array of SIP jobs'),

      pagination: z
        .object({
          page: z.number().int().positive().describe('Current page number'),
          limit: z.number().int().positive().describe('Items per page'),
          total: z.number().int().min(0).describe('Total number of jobs'),
          pages: z.number().int().min(0).describe('Total number of pages'),
          hasNext: z.boolean().describe('Has next page indicator'),
          hasPrev: z.boolean().describe('Has previous page indicator'),
        })
        .describe('Pagination metadata'),
    })
    .describe('Response data payload'),
});

/**
 * Schema for SIP job query parameters
 *
 * Validates query parameters for SIP job listing and filtering.
 * Supports pagination, status filtering, and date range queries.
 *
 * Preconditions: Valid query parameter format
 * Postconditions: Returns validated query data
 * Invariants: Parameter validation rules enforced
 */
export const SIPJobQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1).describe('Page number for pagination'),

  limit: z.coerce
    .number()
    .int()
    .positive()
    .max(100)
    .default(10)
    .describe('Number of items per page (max 100)'),

  status: SipJobStatusSchema.optional().describe('Filter jobs by status'),

  packageMode: SIPPackageModeSchema.optional().describe('Filter jobs by package mode'),

  createdAfter: z
    .string()
    .datetime()
    .optional()
    .describe('Filter jobs created after this timestamp'),

  createdBefore: z
    .string()
    .datetime()
    .optional()
    .describe('Filter jobs created before this timestamp'),

  userId: z.string().min(1).optional().describe('Filter jobs by user ID (admin only)'),
});

// ================================================================================================
// TYPE EXPORTS FOR CONTROLLER USAGE
// ================================================================================================

export type CreateSIPRequest = z.infer<typeof CreateSIPRequestSchema>;
export type SIPProgress = z.infer<typeof SIPProgressSchema>;
export type SIPJobResponse = z.infer<typeof SIPJobResponseSchema>;
export type SIPResponse = z.infer<typeof SIPResponseSchema>;
export type SIPJobListResponse = z.infer<typeof SIPJobListResponseSchema>;
export type SIPJobQuery = z.infer<typeof SIPJobQuerySchema>;
export type SIPPackageMode = z.infer<typeof SIPPackageModeSchema>;
export type SIPStage = z.infer<typeof SipJobStageSchema>;
export type SIPJobStatus = z.infer<typeof SipJobStatusSchema>;
