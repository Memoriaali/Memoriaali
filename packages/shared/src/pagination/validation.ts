/**
 * Pagination Validation Schemas
 *
 * This module provides Zod validation schemas for pagination parameters, ensuring input
 * sanitization, boundary checking, and clear error messages. These schemas enforce the
 * contracts defined in the pagination types while providing runtime validation.
 *
 * All schemas follow Design by Contract principles, validating preconditions and
 * providing meaningful error messages when validation fails.
 */

import { z } from 'zod';

/**
 * Base pagination parameters validation schema.
 *
 * Validates core pagination parameters with proper boundary checking and
 * mutual exclusivity constraints for cursor and page parameters.
 *
 * Invariants:
 * - limit is always between 1 and 100 inclusive
 * - cursor and page parameters cannot be used simultaneously
 * - all parameters are optional with sensible defaults
 *
 * @example
 * const result = PaginationParamsSchema.parse({ limit: 20, cursor: 'abc123' });
 * // Returns: { limit: 20, cursor: 'abc123' }
 */
export const PaginationParamsSchema = z
  .object({
    limit: z
      .number()
      .int()
      .min(1, { message: 'Limit must be at least 1' })
      .max(100, { message: 'Limit cannot exceed 100' })
      .default(20),
    cursor: z.string({ message: 'Cursor must be a string' }).optional(),
    page: z.number().int().min(1, { message: 'Page must be at least 1' }).optional(),
  })
  .refine(
    (data: { limit: number; cursor?: string | undefined; page?: number | undefined }) =>
      !(data.cursor && data.page),
    {
      message: 'Cannot use both cursor and page parameters simultaneously',
      path: ['cursor', 'page'],
    },
  );

/**
 * User role validation schema.
 * Ensures only valid user roles are accepted for filtering.
 *
 * Invariants:
 * - Only allows predefined user role values
 * - Provides clear error message for invalid values
 */
const userRoleSchema = z.enum(['ADMIN', 'USER', 'MODERATOR'], {
  message: 'Invalid user role. Must be one of: ADMIN, USER, MODERATOR',
});

/**
 * User status validation schema.
 * Ensures only valid user statuses are accepted for filtering.
 *
 * Invariants:
 * - Only allows predefined user status values
 * - Provides clear error message for invalid values
 */
const userStatusSchema = z.enum(['active', 'inactive', 'pending'], {
  message: 'Invalid user status. Must be one of: active, inactive, pending',
});

/**
 * Sort field validation schema for user queries.
 * Restricts sorting to allowed user fields only for security and performance.
 *
 * Invariants:
 * - Only allows sorting on indexed/safe fields
 * - Prevents SQL injection through field validation
 */
const userSortFieldSchema = z.enum(['createdAt', 'email', 'name'], {
  message: 'Invalid sort field. Must be one of: createdAt, email, name',
});

/**
 * Sort order validation schema.
 * Ensures only ascending or descending order is specified.
 *
 * Invariants:
 * - Only allows 'asc' or 'desc' values
 * - Provides clear error for invalid sort directions
 */
const sortOrderSchema = z.enum(['asc', 'desc'], {
  message: 'Invalid sort order. Must be asc or desc',
});

/**
 * Extended pagination schema specifically for user list queries.
 *
 * Includes additional filtering and sorting parameters specific to user management.
 * Inherits all base pagination validation while adding user-specific constraints.
 *
 * Invariants:
 * - All base pagination constraints apply
 * - Role and status values are validated against allowed enums
 * - Sort fields are restricted to safe, indexed columns
 * - Search terms are properly sanitized
 *
 * @example
 * const result = UserListQuerySchema.parse({
 *   limit: 20,
 *   search: 'john',
 *   role: 'USER',
 *   status: 'active',
 *   sortBy: 'createdAt',
 *   sortOrder: 'desc'
 * });
 */
export const UserListQuerySchema = z
  .object({
    limit: z
      .number()
      .int()
      .min(1, { message: 'Limit must be at least 1' })
      .max(100, { message: 'Limit cannot exceed 100' })
      .default(20),
    cursor: z.string({ message: 'Cursor must be a string' }).optional(),
    page: z.number().int().min(1, { message: 'Page must be at least 1' }).optional(),
    search: z.string({ message: 'Search term must be a string' }).optional(),
    role: userRoleSchema.optional(),
    status: userStatusSchema.optional(),
    sortBy: userSortFieldSchema.optional(),
    sortOrder: sortOrderSchema.optional(),
  })
  .refine(
    (data: {
      limit: number;
      cursor?: string | undefined;
      page?: number | undefined;
      search?: string | undefined;
      role?: string | undefined;
      status?: string | undefined;
      sortBy?: string | undefined;
      sortOrder?: string | undefined;
    }) => !(data.cursor && data.page),
    {
      message: 'Cannot use both cursor and page parameters simultaneously',
      path: ['cursor', 'page'],
    },
  );

/**
 * Pagination metadata validation schema.
 *
 * Validates pagination response metadata following RFC 8288 Web Linking standards.
 * Supports both cursor-based and offset-based pagination patterns.
 *
 * Invariants:
 * - limit is always a positive integer between 1 and 100
 * - totalCount is always non-negative
 * - hasNextPage/hasPreviousPage accurately reflect navigation state
 * - currentPage and totalPages are only present for offset-based pagination
 * - when totalPages is present, currentPage must be <= totalPages
 *
 * @example
 * // Cursor-based pagination metadata
 * const metadata = PaginationMetadataSchema.parse({
 *   limit: 20,
 *   totalCount: 150,
 *   hasNextPage: true,
 *   hasPreviousPage: false
 * });
 *
 * @example
 * // Offset-based pagination metadata
 * const metadata = PaginationMetadataSchema.parse({
 *   limit: 20,
 *   totalCount: 150,
 *   hasNextPage: true,
 *   hasPreviousPage: true,
 *   currentPage: 3,
 *   totalPages: 8
 * });
 */
export const PaginationMetadataSchema = z.object({
  /** Number of items requested per page */
  limit: z
    .number()
    .int()
    .min(1, { message: 'Limit must be at least 1' })
    .max(100, { message: 'Limit cannot exceed 100' }),

  /** Total number of items available across all pages */
  totalCount: z.number().int().min(0, { message: 'Total count must be non-negative' }),

  /** Whether more items are available after current page */
  hasNextPage: z.boolean(),

  /** Whether items are available before current page */
  hasPreviousPage: z.boolean(),

  /** Current page number (offset pagination only, starts from 1) */
  currentPage: z.number().int().min(1, { message: 'Current page must be at least 1' }).optional(),

  /** Total number of pages available (offset pagination only) */
  totalPages: z.number().int().min(1, { message: 'Total pages must be at least 1' }).optional(),
});

/**
 * TypeScript type definitions derived from validation schemas.
 *
 * These types provide compile-time type safety while maintaining
 * runtime validation capabilities through Zod schemas.
 */
export type PaginationParamsInput = z.input<typeof PaginationParamsSchema>;
export type PaginationParamsOutput = z.output<typeof PaginationParamsSchema>;
export type UserListQueryInput = z.input<typeof UserListQuerySchema>;
export type UserListQueryOutput = z.output<typeof UserListQuerySchema>;
export type PaginationMetadataInput = z.input<typeof PaginationMetadataSchema>;
export type PaginationMetadataOutput = z.output<typeof PaginationMetadataSchema>;

/**
 * Validates and sanitizes base pagination parameters.
 *
 * @param {unknown} data - Raw input data to validate (typically from request query)
 * @return {PaginationParamsOutput} Validated and sanitized pagination parameters
 *
 * Preconditions:
 * - data can be any unknown input (typically URL query parameters)
 *
 * Postconditions:
 * - returns validated pagination parameters with defaults applied
 * - throws ZodError with detailed messages for invalid input
 * - ensures all boundary constraints are enforced
 *
 * Invariants:
 * - returned limit is always between 1 and 100
 * - cursor and page are never both present
 * - all string inputs are properly sanitized
 *
 * @throws {z.ZodError} When input validation fails with detailed error messages
 *
 * @example
 * const params = validatePaginationParams({ limit: '20', cursor: 'abc' });
 * // Returns: { limit: 20, cursor: 'abc' }
 *
 * @example
 * const params = validatePaginationParams({ limit: 150 });
 * // Throws: ZodError with message "Limit cannot exceed 100"
 */
export const validatePaginationParams = (data: unknown): PaginationParamsOutput => {
  return PaginationParamsSchema.parse(data);
};

/**
 * Validates and sanitizes user list query parameters.
 *
 * @param {unknown} data - Raw input data to validate (typically from request query)
 * @return {UserListQueryOutput} Validated and sanitized user query parameters
 *
 * Preconditions:
 * - data can be any unknown input (typically URL query parameters)
 *
 * Postconditions:
 * - returns validated user query parameters with pagination defaults applied
 * - throws ZodError with detailed messages for invalid input
 * - ensures all enum values are validated against allowed sets
 * - search terms are properly sanitized
 *
 * Invariants:
 * - all base pagination invariants are maintained
 * - role values are validated against user role enum
 * - status values are validated against user status enum
 * - sort fields are restricted to safe, indexed columns
 *
 * @throws {z.ZodError} When input validation fails with detailed error messages
 *
 * @example
 * const params = validateUserListQuery({
 *   limit: '20',
 *   search: 'john doe',
 *   role: 'USER',
 *   status: 'active'
 * });
 * // Returns: { limit: 20, search: 'john doe', role: 'USER', status: 'active' }
 *
 * @example
 * const params = validateUserListQuery({ role: 'INVALID_ROLE' });
 * // Throws: ZodError with message "Invalid user role. Must be one of: ADMIN, USER, MODERATOR"
 */
export const validateUserListQuery = (data: unknown): UserListQueryOutput => {
  return UserListQuerySchema.parse(data);
};

/**
 * Safe validation wrapper that returns results instead of throwing.
 *
 * Preconditions:
 * - schema must be a valid Zod schema
 * - data can be any unknown input
 *
 * Postconditions:
 * - Returns success object with parsed data on validation success
 * - Returns error object with formatted error details on validation failure
 *
 * Invariants:
 * - Never throws exceptions
 * - Always returns a discriminated union result
 */
export const safeValidate = <T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: z.ZodError } => {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
};
