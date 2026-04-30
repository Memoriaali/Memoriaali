import { CustomSchemas } from '@memoriaali/api-types';
import { z } from 'zod';

/**
 * Request schema for adding a user to a group
 */
export const AddUserToGroupSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  groupId: z.string().uuid('Invalid group ID format'),
  metadata: CustomSchemas.UserGroupMetadataSchema.optional().default({}),
});

/**
 * Request schema for removing a user from a group
 */
export const RemoveUserFromGroupSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  groupId: z.string().uuid('Invalid group ID format'),
});

/**
 * Query schema for listing users in a group
 */
export const ListUsersInGroupQuerySchema = z.object({
  groupId: z.string().uuid('Invalid group ID format'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Query schema for listing groups for a user
 */
export const ListGroupsForUserQuerySchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Query-only schema for listing users in a group (path params handled separately)
 */
export const ListUsersInGroupQueryOnlySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Query-only schema for listing groups for a user (path params handled separately)
 */
export const ListGroupsForUserQueryOnlySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

/**
 * Response schema for users in groups operations
 */
export const UsersInGroupsResponseSchema = z.object({
  success: z.boolean(),
  data: z.any(),
  message: z.string(),
});

/**
 * Response schema for paginated users in groups
 */
export const PaginatedUsersInGroupsResponseSchema = z.object({
  success: z.boolean(),
  data: z.object({
    items: z.array(z.any()),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  }),
  message: z.string(),
});

// Export types
export type AddUserToGroupRequest = z.infer<typeof AddUserToGroupSchema>;
export type RemoveUserFromGroupRequest = z.infer<typeof RemoveUserFromGroupSchema>;
export type ListUsersInGroupQuery = z.infer<typeof ListUsersInGroupQuerySchema>;
export type ListGroupsForUserQuery = z.infer<typeof ListGroupsForUserQuerySchema>;
export type UsersInGroupsResponse = z.infer<typeof UsersInGroupsResponseSchema>;
export type PaginatedUsersInGroupsResponse = z.infer<typeof PaginatedUsersInGroupsResponseSchema>;
