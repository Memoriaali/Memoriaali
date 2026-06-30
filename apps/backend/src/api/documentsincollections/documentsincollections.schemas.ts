/**
 * DocumentsInCollections API Schemas
 *
 * Input validation schemas for document-collection relationship management.
 * Provides type-safe validation for adding and removing documents from collections.
 *
 * Design by Contract:
 * - Preconditions: Valid document and collection IDs, proper authentication
 * - Postconditions: Consistent database state, audit trail creation
 * - Invariants: No duplicate document-collection pairs
 */

import { DocumentsInCollectionsSchema } from '@memoriaali/api-types';
import { z } from 'zod';

// ================================================================================================
// INPUT SCHEMAS
// ================================================================================================

/**
 * Add document to collection input schema
 *
 * Preconditions: documentId and collectionId are valid UUIDs
 * Postconditions: Document added to collection if not already present
 * Invariants: Unique constraint on documentId + collectionId pair
 */
export const AddDocumentToCollectionSchema = z.object({
  documentId: z.string().uuid('Document ID must be a valid UUID'),
  collectionId: z.string().uuid('Collection ID must be a valid UUID'),
});

export type AddDocumentToCollectionInput = z.infer<typeof AddDocumentToCollectionSchema>;

/**
 * Remove document from collection input schema
 *
 * Preconditions: documentId and collectionId are valid UUIDs
 * Postconditions: Document removed from collection if relationship exists
 * Invariants: No orphaned relationships
 */
export const RemoveDocumentFromCollectionSchema = z.object({
  documentId: z.string().uuid('Document ID must be a valid UUID'),
  collectionId: z.string().uuid('Collection ID must be a valid UUID'),
});

export type RemoveDocumentFromCollectionInput = z.infer<typeof RemoveDocumentFromCollectionSchema>;

// ================================================================================================
// RESPONSE SCHEMAS
// ================================================================================================

/**
 * DocumentsInCollections response schema
 *
 * Returns the created relationship with audit information
 */
export const DocumentsInCollectionsResponseSchema = DocumentsInCollectionsSchema;

export type DocumentsInCollectionsResponse = z.infer<typeof DocumentsInCollectionsResponseSchema>;

/**
 * Success response for DELETE operations
 */
export const DeleteSuccessResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type DeleteSuccessResponse = z.infer<typeof DeleteSuccessResponseSchema>;

/**
 * Document in collection with additional metadata
 */
export const DocumentInCollectionSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  metadata: z.any(),
  documentPrivacy: z.string(),
  shareToGroup: z.boolean().nullable(),
  groupToShare: z.string().nullable(),
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
  addedToCollectionAt: z.date(),
  addedBy: z.string(),
  mimeType: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
  }),
});

export type DocumentInCollection = z.infer<typeof DocumentInCollectionSchema>;

/**
 * Pagination metadata schema
 */
export const PaginationSchema = z.object({
  page: z.number(),
  limit: z.number(),
  totalCount: z.number(),
  totalPages: z.number(),
  hasNextPage: z.boolean(),
  hasPreviousPage: z.boolean(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Response schema for getting documents in a collection
 */
export const GetDocumentsInCollectionResponseSchema = z.object({
  collection: z.object({
    id: z.string(),
    collectionName: z.string(),
    collectionDescription: z.string(),
  }),
  documents: z.array(DocumentInCollectionSchema),
  pagination: PaginationSchema,
});

export type GetDocumentsInCollectionResponse = z.infer<
  typeof GetDocumentsInCollectionResponseSchema
>;

// ================================================================================================
// QUERY SCHEMAS
// ================================================================================================

/**
 * Query parameters for listing documents in a collection
 */
export const ListDocumentsInCollectionQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListDocumentsInCollectionQuery = z.infer<typeof ListDocumentsInCollectionQuerySchema>;

/**
 * Path parameters for listing documents in a collection
 */
export const ListDocumentsInCollectionPathSchema = z.object({
  collectionId: z.string().uuid('Collection ID must be a valid UUID'),
});

export type ListDocumentsInCollectionPath = z.infer<typeof ListDocumentsInCollectionPathSchema>;

/**
 * Query parameters for listing collections containing a document
 */
export const ListCollectionsForDocumentQuerySchema = z.object({
  documentId: z.string().uuid('Document ID must be a valid UUID'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListCollectionsForDocumentQuery = z.infer<typeof ListCollectionsForDocumentQuerySchema>;
