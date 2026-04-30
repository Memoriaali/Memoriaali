import { CustomSchemas } from '@memoriaali/api-types';
import { z } from 'zod';

/**
 * Backend Metadata Suggestion Schemas
 *
 * These schemas import from the shared API types package and provide
 * additional backend-specific validation and response formatting.
 */

/**
 * Metadata suggestion moderation action schema
 *
 * Used for approve/reject/verify operations
 */
export const MetadataSuggestionModerationSchema = z.object({
  rejectionExplanation: z.string().max(2000, 'Rejection explanation too long').optional(),
});

/**
 * Metadata suggestion search schema
 *
 * Enhanced search with additional filters
 */
export const MetadataSuggestionSearchSchema = CustomSchemas.MetadataSuggestionQuerySchema.extend({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'suggestedBy']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Metadata suggestion statistics schema
 *
 * For moderation dashboard statistics
 */
export const MetadataSuggestionStatisticsSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    total: z.number(),
    pending: z.number(),
    approved: z.number(),
    verified: z.number(),
    rejected: z.number(),
    recentActivity: z.array(
      z.object({
        date: z.string(),
        count: z.number(),
      }),
    ),
  }),
});

// Type exports
export type CreateMetadataSuggestionInput = z.infer<
  typeof CustomSchemas.CreateMetadataSuggestionSchema
>;
export type UpdateMetadataSuggestionInput = z.infer<
  typeof CustomSchemas.UpdateMetadataSuggestionSchema
>;
export type MetadataSuggestionQueryInput = z.infer<
  typeof CustomSchemas.MetadataSuggestionQuerySchema
>;
export type MetadataSuggestionSearchInput = z.infer<typeof MetadataSuggestionSearchSchema>;
export type MetadataSuggestionModerationInput = z.infer<typeof MetadataSuggestionModerationSchema>;
export type MetadataSuggestionListResponse = z.infer<
  typeof CustomSchemas.MetadataSuggestionListResponseSchema
>;
export type MetadataSuggestionResponse = z.infer<
  typeof CustomSchemas.MetadataSuggestionResponseSchema
>;
export type CreateMetadataSuggestionResponse = z.infer<
  typeof CustomSchemas.CreateMetadataSuggestionResponseSchema
>;
export type UpdateMetadataSuggestionResponse = z.infer<
  typeof CustomSchemas.UpdateMetadataSuggestionResponseSchema
>;
export type DeleteMetadataSuggestionResponse = z.infer<
  typeof CustomSchemas.DeleteMetadataSuggestionResponseSchema
>;
export type MetadataSuggestionStatisticsResponse = z.infer<
  typeof MetadataSuggestionStatisticsSchema
>;
