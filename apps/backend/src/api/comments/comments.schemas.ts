import { CustomSchemas } from '@memoriaali/api-types';
import { z } from 'zod';

/**
 * Backend Comment Schemas
 *
 * These schemas import from the shared API types package and provide
 * additional backend-specific validation and response formatting.
 */

/**
 * Comment moderation action schema
 *
 * Used for approve/reject operations
 */
export const CommentModerationSchema = z.object({
  reason: z.string().optional(),
});

/**
 * Comment search schema
 *
 * Enhanced search with additional filters
 */
export const CommentSearchSchema = CustomSchemas.CommentQuerySchema.extend({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'user']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Comment statistics schema
 *
 * For moderation dashboard statistics
 */
export const CommentStatisticsSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    total: z.number(),
    pending: z.number(),
    approved: z.number(),
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
export type CreateCommentInput = z.infer<typeof CustomSchemas.CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof CustomSchemas.UpdateCommentSchema>;
export type CommentQueryInput = z.infer<typeof CustomSchemas.CommentQuerySchema>;
export type CommentSearchInput = z.infer<typeof CommentSearchSchema>;
export type CommentModerationInput = z.infer<typeof CommentModerationSchema>;
export type CommentListResponse = z.infer<typeof CustomSchemas.CommentListResponseSchema>;
export type CommentResponse = z.infer<typeof CustomSchemas.CommentResponseSchema>;
export type CreateCommentResponse = z.infer<typeof CustomSchemas.CreateCommentResponseSchema>;
export type UpdateCommentResponse = z.infer<typeof CustomSchemas.UpdateCommentResponseSchema>;
export type DeleteCommentResponse = z.infer<typeof CustomSchemas.DeleteCommentResponseSchema>;
export type CommentStatisticsResponse = z.infer<typeof CommentStatisticsSchema>;
