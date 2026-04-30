import { GroupSchema } from '@memoriaali/api-types';
import { z } from 'zod';

/**
 * Schema for creating a new group
 */
export const CreateGroupSchema = z.object({
  groupName: z
    .string()
    .min(1, 'Group name is required')
    .max(255, 'Group name must be less than 255 characters'),
});

export type CreateGroupRequest = z.infer<typeof CreateGroupSchema>;

/**
 * Schema for updating an existing group
 */
export const UpdateGroupSchema = z.object({
  groupName: z
    .string()
    .min(1, 'Group name is required')
    .max(255, 'Group name must be less than 255 characters'),
});

export type UpdateGroupRequest = z.infer<typeof UpdateGroupSchema>;

/**
 * Schema for group query parameters
 */
export const GroupQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(['groupName', 'createdAt', 'updatedAt']).default('groupName'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type GroupQueryParams = z.infer<typeof GroupQuerySchema>;

/**
 * Schema for group response with audit information
 */
export const GroupResponseSchema = GroupSchema.extend({
  _count: z
    .object({
      users: z.number(),
    })
    .optional(),
});

export type GroupResponse = z.infer<typeof GroupResponseSchema>;

/**
 * Schema for paginated group list response
 */
export const GroupListResponseSchema = z.object({
  groups: z.array(GroupResponseSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export type GroupListResponse = z.infer<typeof GroupListResponseSchema>;
