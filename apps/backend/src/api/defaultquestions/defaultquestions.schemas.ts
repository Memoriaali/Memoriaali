import { DefaultQuestionSchema } from '@memoriaali/api-types/generated';
import { z } from 'zod';

// ================================================================================================
// DEFAULT QUESTION SCHEMAS
// ================================================================================================
//
// CRITICAL: ALL schemas derive from DefaultQuestionSchema (single source of truth)
// This ensures type consistency between database, API, and frontend
//
// ================================================================================================

// INPUT VALIDATION SCHEMAS - DERIVED FROM BASE DEFAULTQUESTIONSCHEMA

/**
 * Input schema for creating a new default question
 *
 * **Purpose**: Validates input data for question creation
 * **Derives from**: DefaultQuestionSchema, omitting system-generated fields.
 * **Business Rules**:
 * - Question text required, max 2000 characters
 * - Sort index required, 1-9999 range, must be unique
 */
export const CreateDefaultQuestionInputSchema = z.object({
  text: z
    .string()
    .min(1, 'Question text is required')
    .max(2000, 'Question text must not exceed 2000 characters')
    .trim(),
  sortIndex: z
    .number()
    .int()
    .min(1, 'Sort index must be at least 1')
    .max(9999, 'Sort index must not exceed 9999'),
});

/**
 * Input schema for updating an existing default question
 *
 * **Purpose**: Validates input data for question updates
 * **Derives from**: DefaultQuestionSchema with all updateable fields optional.
 * **Business Rules**: Same validation as creation, but all fields optional
 */
export const UpdateDefaultQuestionInputSchema = z.object({
  text: z
    .string()
    .min(1, 'Question text is required')
    .max(2000, 'Question text must not exceed 2000 characters')
    .trim()
    .optional(),
  sortIndex: z
    .number()
    .int()
    .min(1, 'Sort index must be at least 1')
    .max(9999, 'Sort index must not exceed 9999')
    .optional(),
});

/**
 * Query parameters for listing default questions
 *
 * **Purpose**: Validates query parameters for pagination, sorting, and search
 * **Business Rules**:
 * - Page: 1-based pagination
 * - Limit: 1-100 items per page
 * - Sort: By sortIndex, createdAt, or updatedAt
 * - Search: Optional text search
 */
export const ListDefaultQuestionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['sortIndex', 'createdAt', 'updatedAt']).default('sortIndex'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  search: z.string().optional(),
});

// RESPONSE SCHEMAS WITH SECURITY FIELD-PICKING - DERIVED FROM GENERATED DEFAULTQUESTIONSCHEMA

/**
 * Response schema for public/default users (minimal data)
 *
 * **Purpose**: Safe for public exposure, minimal sensitive information
 * **Security**: Only includes public fields (id, text, sortIndex)
 * **Use Case**: Public question lists, unauthenticated access
 */
export const DefaultQuestionPublicSchema = DefaultQuestionSchema.pick({
  id: true,
  text: true,
  sortIndex: true,
});

/**
 * Response schema for authenticated users (includes audit info)
 *
 * **Purpose**: Enhanced data for authenticated users
 * **Security**: Includes audit timestamps but not user IDs
 * **Use Case**: User dashboard, question management
 */
export const DefaultQuestionOwnerSchema = DefaultQuestionSchema.pick({
  id: true,
  text: true,
  sortIndex: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * Response schema for admin users (full data including user IDs)
 *
 * **Purpose**: Complete data for administrative functions
 * **Security**: Full access including audit trail user IDs
 * **Use Case**: Admin panel, audit reports, user activity tracking
 */
export const DefaultQuestionAdminSchema = DefaultQuestionSchema;

/**
 * Helper function to select appropriate response schema based on user role
 *
 * **Purpose**: Dynamic schema selection for role-based data exposure
 * **Security**: Ensures users only see data appropriate for their role
 * **Business Logic**: ADMIN sees all, others see limited data
 */
export const selectDefaultQuestionResponseSchema = (userRole: string, isOwner: boolean = false) => {
  if (userRole === 'ADMIN') {
    return DefaultQuestionAdminSchema;
  }
  if (isOwner || userRole === 'MODERATOR' || userRole === 'EXPERT') {
    return DefaultQuestionOwnerSchema;
  }
  return DefaultQuestionPublicSchema;
};

// ================================================================================================
// TYPE EXPORTS - DERIVED FROM SCHEMAS FOR TYPE SAFETY
// ================================================================================================

/**
 * Type definitions derived from schemas for TypeScript type safety
 * These ensure consistency between runtime validation and compile-time types
 */

export type CreateDefaultQuestionInput = z.infer<typeof CreateDefaultQuestionInputSchema>;
export type UpdateDefaultQuestionInput = z.infer<typeof UpdateDefaultQuestionInputSchema>;
export type ListDefaultQuestionsQuery = z.infer<typeof ListDefaultQuestionsQuerySchema>;

// Response types based on user role
export type DefaultQuestionPublic = z.infer<typeof DefaultQuestionPublicSchema>;
export type DefaultQuestionOwner = z.infer<typeof DefaultQuestionOwnerSchema>;
export type DefaultQuestionAdmin = z.infer<typeof DefaultQuestionAdminSchema>;

// Union type for all possible response schemas
export type DefaultQuestionResponse =
  | DefaultQuestionPublic
  | DefaultQuestionOwner
  | DefaultQuestionAdmin;
