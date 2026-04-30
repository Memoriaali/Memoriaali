import { OralHistorySchema } from '@memoriaali/api-types/generated';
import { z } from 'zod';

/**
 * Schema for creating a new oral history
 */
export const CreateOralHistorySchema = z.object({
  fileName: z.string().min(1, 'File name is required'),
  person: z.string().min(1, 'Person name is required'),
  reporter: z.string().min(1, 'Reporter name is required'),
  event: z.string().min(1, 'Event description is required'),
  description: z.string().min(1, 'Description is required'),
  language: z.string().min(1, 'Language is required'),
  groupToShare: z.string().uuid().optional(),
  shareToGroup: z.boolean().optional(),
  questions: z
    .array(
      z.object({
        text: z.string().min(1, 'Question text is required'),
        timestamp: z.string().optional(),
        order: z.number().int().positive().optional(),
      }),
    )
    .default([]),
  keywords: z.array(z.string().min(1, 'Keyword cannot be empty')).default([]),
});

/**
 * Schema for updating an existing oral history
 */
export const UpdateOralHistorySchema = z.object({
  fileName: z.string().min(1, 'File name is required').optional(),
  person: z.string().min(1, 'Person name is required').optional(),
  reporter: z.string().min(1, 'Reporter name is required').optional(),
  event: z.string().min(1, 'Event description is required').optional(),
  description: z.string().min(1, 'Description is required').optional(),
  language: z.string().min(1, 'Language is required').optional(),
  groupToShare: z.string().uuid().optional(),
  shareToGroup: z.boolean().optional(),
  questions: z
    .array(
      z.object({
        text: z.string().min(1, 'Question text is required'),
        timestamp: z.string().optional(),
        order: z.number().int().positive().optional(),
      }),
    )
    .optional(),
  keywords: z.array(z.string().min(1, 'Keyword cannot be empty')).optional(),
});

/**
 * Schema for oral history query parameters
 */
export const OralHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  search: z.string().min(1).optional(),
  userId: z.string().uuid().optional(),
  language: z.string().optional(),
  person: z.string().optional(),
  reporter: z.string().optional(),
});

/**
 * Schema for oral history with user information
 */
export const OralHistoryWithUserSchema = OralHistorySchema.extend({
  user: z.object({
    id: z.string(),
    username: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
  }),
});

/**
 * Schema for oral history list response
 */
export const OralHistoryListResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    oralHistories: z.array(OralHistoryWithUserSchema),
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

export type CreateOralHistoryInput = z.infer<typeof CreateOralHistorySchema>;
export type UpdateOralHistoryInput = z.infer<typeof UpdateOralHistorySchema>;
export type OralHistoryQueryInput = z.infer<typeof OralHistoryQuerySchema>;
export type OralHistoryListResponse = z.infer<typeof OralHistoryListResponseSchema>;
export type OralHistoryWithUser = z.infer<typeof OralHistoryWithUserSchema>;
