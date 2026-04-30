import { z } from 'zod';

/**
 * Metadata Suggestion Schemas
 *
 * Defines validation schemas for metadata suggestion operations.
 * Supports crowdsourced metadata improvement with approval workflow.
 */

/**
 * Create metadata suggestion schema
 */
export const CreateMetadataSuggestionSchema = z.object({
  documentId: z.string().uuid('Document ID must be a valid UUID'),
  fieldToChange: z
    .string()
    .min(1, 'Field to change is required')
    .max(500, 'Field to change too long'),
  changedValue: z.string().min(1, 'Changed value is required').max(10000, 'Changed value too long'),
});

/**
 * Update metadata suggestion schema
 */
export const UpdateMetadataSuggestionSchema = z.object({
  fieldToChange: z
    .string()
    .min(1, 'Field to change is required')
    .max(500, 'Field to change too long')
    .optional(),
  changedValue: z
    .string()
    .min(1, 'Changed value is required')
    .max(10000, 'Changed value too long')
    .optional(),
  state: z.enum(['PENDING', 'APPROVED', 'VERIFIED', 'REJECTED']).optional(),
  rejectionExplanation: z.string().max(2000, 'Rejection explanation too long').optional(),
});

/**
 * Metadata suggestion query schema
 */
export const MetadataSuggestionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  documentId: z.string().uuid('Document ID must be a valid UUID').optional(),
  suggestedById: z.string().uuid('Suggested by ID must be a valid UUID').optional(),
  state: z.enum(['PENDING', 'APPROVED', 'VERIFIED', 'REJECTED']).optional(),
  search: z.string().max(200, 'Search term too long').optional(),
});

/**
 * Metadata suggestion response schema
 */
export const MetadataSuggestionResponseSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  suggestedById: z.string().uuid(),
  approvedById: z.string().uuid().nullable(),
  state: z.enum(['PENDING', 'APPROVED', 'VERIFIED', 'REJECTED']),
  fieldToChange: z.string(),
  changedValue: z.string(),
  rejectionExplanation: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdById: z.string().uuid(),
  updatedById: z.string().uuid(),
  suggestedBy: z.object({
    id: z.string().uuid(),
    username: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
  }),
  createdBy: z.object({
    id: z.string().uuid(),
    username: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
  }),
  updatedBy: z.object({
    id: z.string().uuid(),
    username: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
  }),
});

/**
 * Create metadata suggestion response schema
 */
export const CreateMetadataSuggestionResponseSchema = z.object({
  status: z.literal('success'),
  data: MetadataSuggestionResponseSchema,
  message: z.string(),
});

/**
 * Update metadata suggestion response schema
 */
export const UpdateMetadataSuggestionResponseSchema = z.object({
  status: z.literal('success'),
  data: MetadataSuggestionResponseSchema,
  message: z.string(),
});

/**
 * Delete metadata suggestion response schema
 */
export const DeleteMetadataSuggestionResponseSchema = z.object({
  status: z.literal('success'),
  message: z.string(),
});

/**
 * Metadata suggestion list response schema
 */
export const MetadataSuggestionListResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    metadataSuggestions: z.array(MetadataSuggestionResponseSchema),
    pagination: z.object({
      limit: z.number(),
      totalCount: z.number(),
      hasNextPage: z.boolean(),
      hasPreviousPage: z.boolean(),
      currentPage: z.number(),
      totalPages: z.number(),
    }),
  }),
});

/**
 * Metadata suggestion moderation action schema
 */
export const MetadataSuggestionModerationSchema = z.object({
  rejectionExplanation: z.string().max(2000, 'Rejection explanation too long').optional(),
});

// Type exports
export type CreateMetadataSuggestionInput = z.infer<typeof CreateMetadataSuggestionSchema>;
export type UpdateMetadataSuggestionInput = z.infer<typeof UpdateMetadataSuggestionSchema>;
export type MetadataSuggestionQueryInput = z.infer<typeof MetadataSuggestionQuerySchema>;
export type MetadataSuggestionResponse = z.infer<typeof MetadataSuggestionResponseSchema>;
export type CreateMetadataSuggestionResponse = z.infer<
  typeof CreateMetadataSuggestionResponseSchema
>;
export type UpdateMetadataSuggestionResponse = z.infer<
  typeof UpdateMetadataSuggestionResponseSchema
>;
export type DeleteMetadataSuggestionResponse = z.infer<
  typeof DeleteMetadataSuggestionResponseSchema
>;
export type MetadataSuggestionListResponse = z.infer<typeof MetadataSuggestionListResponseSchema>;
export type MetadataSuggestionModerationInput = z.infer<typeof MetadataSuggestionModerationSchema>;
