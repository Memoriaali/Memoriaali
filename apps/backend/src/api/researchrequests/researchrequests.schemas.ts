import { z } from 'zod';
import { RequestStateSchema } from '@memoriaali/api-types';

/**
 * Research Requests API Schemas
 *
 * Backend-specific schemas that import from the shared API types package.
 * This ensures consistency between frontend and backend validation.
 */

// Define schemas locally since they're not properly exported from api-types
export const CreateResearchRequestSchema = z.object({
  documentId: z.string().min(1, 'Document ID is required'),
  purpose: z.string().min(1, 'Research purpose is required').max(10000, 'Purpose too long'),
  researchStartDate: z.string().datetime().optional(),
  researchEndDate: z.string().datetime().optional(),
});

export const UpdateResearchRequestSchema = z.object({
  state: RequestStateSchema,
  purpose: z.string().optional(),
  rejectionExplanation: z.string().optional(),
  researchStartDate: z.string().datetime().optional(),
  researchEndDate: z.string().datetime().optional(),
});

export const ResearchRequestQuerySchema = z.object({
  documentId: z.string().optional(),
  requestedById: z.string().optional(),
  state: RequestStateSchema.optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// Export types
export type CreateResearchRequestInput = z.infer<typeof CreateResearchRequestSchema>;
export type UpdateResearchRequestInput = z.infer<typeof UpdateResearchRequestSchema>;
export type ResearchRequestQueryInput = z.infer<typeof ResearchRequestQuerySchema>;
