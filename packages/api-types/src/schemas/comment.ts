import { z } from 'zod';

/**
 * Comment State Enum Schema
 *
 * Represents the moderation workflow states for user comments
 */
export const CommentStateSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

/**
 * Base Comment Schema
 *
 * Core comment structure with all fields from the database model
 */
export const CommentSchema = z.object({
  id: z.string().uuid(),
  documentId: z.string().uuid(),
  userId: z.string().uuid(),
  comment: z.string(),
  state: CommentStateSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  createdById: z.string().uuid(),
  updatedById: z.string().uuid(),
});

/**
 * Comment with User Information Schema
 *
 * Includes basic user information for display purposes
 */
export const CommentWithUserSchema = CommentSchema.extend({
  user: z.object({
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
 * Create Comment Schema
 *
 * Schema for creating a new comment
 */
export const CreateCommentSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
  comment: z.string().min(1, 'Comment cannot be empty').max(10000, 'Comment too long'),
});

/**
 * Update Comment Schema
 *
 * Schema for updating an existing comment (admin/moderator only)
 */
export const UpdateCommentSchema = z.object({
  comment: z.string().min(1, 'Comment cannot be empty').max(10000, 'Comment too long').optional(),
  state: CommentStateSchema.optional(),
});

/**
 * Comment Query Schema
 *
 * Schema for querying comments with filtering and pagination
 */
export const CommentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  documentId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  state: CommentStateSchema.optional(),
  search: z.string().optional(),
});

/**
 * Comment List Response Schema
 *
 * Schema for paginated comment list responses
 */
export const CommentListResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    comments: z.array(CommentWithUserSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      pages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  }),
});

/**
 * Single Comment Response Schema
 *
 * Schema for single comment responses
 */
export const CommentResponseSchema = z.object({
  status: z.literal('success'),
  data: CommentWithUserSchema,
});

/**
 * Comment Creation Response Schema
 *
 * Schema for comment creation responses
 */
export const CreateCommentResponseSchema = z.object({
  status: z.literal('success'),
  data: CommentWithUserSchema,
  message: z.string(),
});

/**
 * Comment Update Response Schema
 *
 * Schema for comment update responses
 */
export const UpdateCommentResponseSchema = z.object({
  status: z.literal('success'),
  data: CommentWithUserSchema,
  message: z.string(),
});

/**
 * Comment Deletion Response Schema
 *
 * Schema for comment deletion responses
 */
export const DeleteCommentResponseSchema = z.object({
  status: z.literal('success'),
  message: z.string(),
});

// Type exports
export type Comment = z.infer<typeof CommentSchema>;
export type CommentWithUser = z.infer<typeof CommentWithUserSchema>;
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;
export type UpdateCommentInput = z.infer<typeof UpdateCommentSchema>;
export type CommentQueryInput = z.infer<typeof CommentQuerySchema>;
export type CommentListResponse = z.infer<typeof CommentListResponseSchema>;
export type CommentResponse = z.infer<typeof CommentResponseSchema>;
export type CreateCommentResponse = z.infer<typeof CreateCommentResponseSchema>;
export type UpdateCommentResponse = z.infer<typeof UpdateCommentResponseSchema>;
export type DeleteCommentResponse = z.infer<typeof DeleteCommentResponseSchema>;
export type CommentState = z.infer<typeof CommentStateSchema>;
