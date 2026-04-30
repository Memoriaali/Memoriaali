import { z } from 'zod';

import { RequestStateSchema } from '../generated';

/**
 * Research Request API Schemas
 *
 * Defines the API contract for research request operations including:
 * - Creating new research requests
 * - Updating request status (approval/rejection)
 * - Querying requests with filtering and pagination
 * - Response schemas with appropriate field selection
 */

// ===== INPUT SCHEMAS =====

/**
 * Create Research Request Input Schema
 *
 * Used for creating new research access requests for restricted documents
 */
export const CreateResearchRequestSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  purpose: z.string().min(1, 'Research purpose is required').max(10000, 'Purpose too long'),
  researchStartDate: z.string().datetime().optional(),
  researchEndDate: z.string().datetime().optional(),
});

export type CreateResearchRequestInput = z.infer<typeof CreateResearchRequestSchema>;

/**
 * Update Research Request Input Schema
 *
 * Used for updating research request status (approval/rejection)
 */
export const UpdateResearchRequestSchema = z.object({
  state: RequestStateSchema,
  purpose: z.string().optional(),
  rejectionExplanation: z.string().optional(),
  researchStartDate: z.string().datetime().optional(),
  researchEndDate: z.string().datetime().optional(),
});

export type UpdateResearchRequestInput = z.infer<typeof UpdateResearchRequestSchema>;

/**
 * Research Request Query Schema
 *
 * Used for filtering and paginating research request queries
 */
export const ResearchRequestQuerySchema = z.object({
  documentId: z.string().optional(),
  requestedById: z.string().optional(),
  state: RequestStateSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export type ResearchRequestQueryInput = z.infer<typeof ResearchRequestQuerySchema>;

// ===== RESPONSE SCHEMAS =====

/**
 * Research Request Response Schema
 *
 * Public response schema with appropriate field selection
 * Excludes sensitive fields and includes only necessary information
 */
export const ResearchRequestResponseSchema = z.object({
  id: z.string(),
  documentId: z.string(),
  requestedById: z.string(),
  state: RequestStateSchema,
  purpose: z.string(),
  approvedById: z.string().nullable(),
  rejectionExplanation: z.string().nullable(),
  researchStartDate: z.string().datetime().nullable(),
  researchEndDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdById: z.string(),
  updatedById: z.string(),
});

export type ResearchRequestResponse = z.infer<typeof ResearchRequestResponseSchema>;

/**
 * Research Request with Relations Response Schema
 *
 * Extended response schema including related document and user information
 */
export const ResearchRequestWithRelationsResponseSchema = ResearchRequestResponseSchema.extend({
  document: z.object({
    id: z.string(),
    fileName: z.string(),
    documentPrivacy: z.string(),
  }),
  requestedBy: z.object({
    id: z.string(),
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
  approvedBy: z
    .object({
      id: z.string(),
      username: z.string(),
      firstName: z.string(),
      lastName: z.string(),
    })
    .nullable(),
  createdBy: z.object({
    id: z.string(),
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
  updatedBy: z.object({
    id: z.string(),
    username: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  }),
});

export type ResearchRequestWithRelationsResponse = z.infer<
  typeof ResearchRequestWithRelationsResponseSchema
>;
