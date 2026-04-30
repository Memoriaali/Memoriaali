/**
 * Collections API Schema Definitions
 *
 * Provides comprehensive Zod validation schemas for collection management endpoints.
 * Implements security field-picking and references Prisma-generated types as single source of truth.
 *
 * Design by Contract:
 * - Preconditions: Valid input data conforming to schema rules
 * - Postconditions: Type-safe validated data objects
 * - Invariants: Security field omission, data type consistency
 *
 * CRITICAL: ALL schemas derive from CollectionSchema (single source of truth)
 * NEVER manually recreate field definitions - always use .omit() and .extend()
 */

import { CollectionSchema } from '@memoriaali/api-types/generated';
import { z } from 'zod';

// ================================================================================================
// INPUT VALIDATION SCHEMAS - DERIVED FROM BASE COLLECTIONSCHEMA
// ================================================================================================

/**
 * Schema for creating new collections
 *
 * Derives from CollectionSchema, omitting system-generated fields.
 * Follows single source of truth principle - field definitions come from Prisma schema.
 *
 * Preconditions: collectionName uniqueness validated separately
 * Postconditions: Returns validated collection creation data
 * Invariants: Collection name requirements enforced
 */
export const CreateCollectionInputSchema = CollectionSchema.omit({
  // Omit system-generated fields
  id: true,
  createdAt: true, // Auto-generated timestamp
  updatedAt: true, // Auto-generated timestamp
  createdById: true, // @admin-only - set by system
  updatedById: true, // @admin-only - set by system
}).extend({
  // Add input-specific validation
  collectionName: z
    .string()
    .min(1, 'Collection name is required')
    .max(500, 'Collection name must not exceed 500 characters')
    .trim(),
  collectionDescription: z
    .string()
    .min(1, 'Collection description is required')
    .max(2000, 'Collection description must not exceed 2000 characters')
    .trim(),
});

/**
 * Schema for updating existing collections
 *
 * Derives from CollectionSchema with all updateable fields optional.
 * Omits immutable and system-controlled fields.
 *
 * Preconditions: Collection exists and requester has permission
 * Postconditions: Returns validated update data
 * Invariants: Collection name updates handled with uniqueness validation
 */
export const UpdateCollectionInputSchema = CollectionSchema.omit({
  // Omit immutable fields
  id: true,
  createdAt: true, // Immutable creation timestamp
  updatedAt: true, // Auto-generated
  createdById: true, // @admin-only - immutable
  updatedById: true, // @admin-only - set by system
}).partial(); // Make all remaining fields optional for updates

/**
 * Schema for collection listing/search requests
 *
 * Uses the shared pagination validation with collection-specific extensions.
 * Leverages the project's standardized pagination system for consistency.
 *
 * Preconditions: Requester has appropriate permissions
 * Postconditions: Returns validated query parameters with proper pagination
 * Invariants: Pagination limits enforced, search validation consistent
 */
export const ListCollectionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().min(1).optional(), // Search by collection name or description
  sortBy: z.enum(['createdAt', 'updatedAt', 'collectionName']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ListCollectionsQuery = z.infer<typeof ListCollectionsQuerySchema>;

// ================================================================================================
// RESPONSE SCHEMAS WITH SECURITY FIELD-PICKING - DERIVED FROM GENERATED COLLECTIONSCHEMA
// ================================================================================================

/**
 * Public collection response schema - SECURE BY DEFAULT
 *
 * Security: Uses explicit field picking to prevent accidental exposure of new sensitive fields
 * Used for: Public collection browsing, non-owner access
 * Postconditions: Only explicitly approved fields exposed
 */
export const PublicCollectionResponseSchema = CollectionSchema.pick({
  id: true,
  collectionName: true,
  collectionDescription: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  _count: z.object({
    documents: z.number(),
  }),
});

/**
 * Owner collection response schema - FULL ACCESS
 *
 * Security: Includes all fields for collection owners and administrators
 * Used for: Collection management, administrative functions
 * Postconditions: Full collection data exposed to authorized users
 */
export const OwnerCollectionResponseSchema = CollectionSchema.pick({
  id: true,
  collectionName: true,
  collectionDescription: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  updatedById: true,
}).extend({
  _count: z.object({
    documents: z.number(),
  }),
});

/**
 * Admin collection response schema - COMPLETE ACCESS
 *
 * Security: Includes all fields for system administrators
 * Used for: Administrative oversight, audit functions
 * Postconditions: Complete collection data exposed to administrators
 */
export const AdminCollectionResponseSchema = CollectionSchema.extend({
  _count: z.object({
    documents: z.number(),
  }),
});

// ================================================================================================
// RESPONSE SELECTION UTILITIES
// ================================================================================================

/**
 * Select appropriate response schema based on user role and ownership
 *
 * Preconditions: User is authenticated and collection exists
 * Postconditions: Returns appropriate security-filtered schema
 * Invariants: Security level appropriate for user context
 */
export const selectCollectionResponseSchema = (userRole: string, isOwner: boolean) => {
  if (userRole === 'ADMIN') {
    return AdminCollectionResponseSchema;
  }
  if (isOwner) {
    return OwnerCollectionResponseSchema;
  }
  return PublicCollectionResponseSchema;
};

// ================================================================================================
// TYPE EXPORTS
// ================================================================================================

export type CreateCollectionInput = z.infer<typeof CreateCollectionInputSchema>;
export type UpdateCollectionInput = z.infer<typeof UpdateCollectionInputSchema>;
export type PublicCollectionResponse = z.infer<typeof PublicCollectionResponseSchema>;
export type OwnerCollectionResponse = z.infer<typeof OwnerCollectionResponseSchema>;
export type AdminCollectionResponse = z.infer<typeof AdminCollectionResponseSchema>;
