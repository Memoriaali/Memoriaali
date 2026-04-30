import { z } from 'zod';

/**
 * Document Metadata Schema
 *
 * Consolidated metadata schema for documents with Finnish archival compliance
 */

//TODO: CHECK THIS IF PROBLEMS ARISE
export const DocumentMetadataSchema = z
  .object({
    archival: z
      .object({
        header: z.record(z.string(), z.any()).optional(),
        subjectIndexing: z.record(z.string(), z.any()).optional(),
        personNames: z.record(z.string(), z.any()).optional(),
      })
      .optional(),
    dublinCore: z.record(z.string(), z.any()).optional(),
    ead: z.record(z.string(), z.any()).optional(),
    visibility: z.record(z.string(), z.any()).optional(),
    linkedData: z.record(z.string(), z.any()).optional(),
    additional: z.record(z.string(), z.any()).optional(),
    exif: z.record(z.string(), z.any()).optional(),
    combined: z.record(z.string(), z.any()).optional(),
  })
  .default({});

/**
 * Error Types Array Schema
 *
 * Array of document error types for quality assessment
 */
export const ErrorTypesArraySchema = z
  .array(
    z.enum([
      'POST_IT',
      'FOLDED_CORNER',
      'EMPTY_PAGE',
      'BLURRED_TEXT',
      'POOR_QUALITY',
      'DAMAGED_ORIGINAL',
    ]),
  )
  .default([]);

/**
 * Error Page Numbers Array Schema
 *
 * Array of page numbers where errors were detected
 */
export const ErrorPageNumbersArraySchema = z.array(z.number().int()).default([]);

/**
 * AI Modified Fields Array Schema
 *
 * Array of field names that were modified by AI
 */
export const AiModifiedFieldsArraySchema = z.array(z.string()).default([]);

/**
 * Plugins Enabled Schema
 *
 * Object tracking which processing plugins were enabled
 */
export const PluginsEnabledSchema = z.record(z.string(), z.boolean()).default({});

/**
 * User Group Metadata Schema
 *
 * Metadata for user group memberships with role information
 */
export const UserGroupMetadataSchema = z
  .object({
    roles: z.array(z.string()).optional(),
    permissions: z.record(z.string(), z.any()).optional(),
    legacy_bits: z.number().optional(),
  })
  .default({});

/**
 * Questions Array Schema
 *
 * Array of interview questions for oral history
 */
export const QuestionsArraySchema = z
  .array(
    z.object({
      text: z.string(),
      timestamp: z.string().optional(),
      order: z.number().int().optional(),
    }),
  )
  .default([]);

/**
 * Keywords Array Schema
 *
 * Array of keywords for content categorization
 */
export const KeywordsArraySchema = z.array(z.string()).default([]);
