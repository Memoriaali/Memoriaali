/**
 * SIP Metadata Type Definitions
 *
 * Comprehensive type-safe interfaces for document metadata structures.
 * Replaces unsafe Record<string, unknown> with proper documented interfaces.
 *
 * Single Source of Truth: These interfaces define the contract for metadata
 * stored in the database and used throughout the SIP module.
 */

import { z } from 'zod';

// ================================================================================================
// DUBLIN CORE METADATA
// ================================================================================================

/**
 * Dublin Core Metadata Schema
 * Standard 15 elements for digital resource description
 * @see https://www.dublincore.org/specifications/dublin-core/dcmi-terms/
 */
export const DublinCoreMetadataSchema = z.object({
  title: z.string().optional(),
  creator: z.string().optional(),
  subject: z.string().optional(),
  description: z.string().optional(),
  publisher: z.string().optional(),
  contributor: z.string().optional(),
  date: z.string().optional(),
  type: z.string().optional(),
  format: z.string().optional(),
  identifier: z.string().optional(),
  source: z.string().optional(),
  language: z.string().optional(),
  relation: z.string().optional(),
  coverage: z.string().optional(),
  rights: z.string().optional(),
  // Extended fields
  author: z.string().optional(), // Alias for creator
  interviewer: z.string().optional(), // For oral history
  interviewee: z.string().optional(), // For oral history
  location: z.string().optional(), // Alias for coverage
  header: z.string().optional(), // Title alternative
});

export type DublinCoreMetadata = z.infer<typeof DublinCoreMetadataSchema>;

// ================================================================================================
// ARCHIVAL METADATA
// ================================================================================================

/**
 * Archival Header Metadata
 * High-level archival description fields
 */
export const ArchivalHeaderSchema = z.object({
  title: z.string().optional(),
  location: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
});

export type ArchivalHeader = z.infer<typeof ArchivalHeaderSchema>;

/**
 * Subject Indexing Metadata
 * Controlled vocabulary terms for classification
 */
export const SubjectIndexingSchema = z.object({
  subject: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  classification: z.string().optional(),
  category: z.string().optional(),
});

export type SubjectIndexing = z.infer<typeof SubjectIndexingSchema>;

/**
 * Person Names Metadata
 * Individual person identifiers and roles
 */
export const PersonNamesSchema = z.object({
  creator: z.string().optional(),
  interviewer: z.string().optional(),
  interviewee: z.string().optional(),
  contributor: z.string().optional(),
  author: z.string().optional(),
});

export type PersonNames = z.infer<typeof PersonNamesSchema>;

/**
 * Complete Archival Metadata Structure
 * Finnish archival standards compliant
 */
export const ArchivalMetadataSchema = z.object({
  header: ArchivalHeaderSchema.optional(),
  subjectIndexing: SubjectIndexingSchema.optional(),
  personNames: PersonNamesSchema.optional(),
});

export type ArchivalMetadata = z.infer<typeof ArchivalMetadataSchema>;

// ================================================================================================
// EAD (ENCODED ARCHIVAL DESCRIPTION) METADATA
// ================================================================================================

/**
 * EAD2002 Metadata Schema
 * Standard for encoding archival finding aids
 * @see https://www.loc.gov/ead/
 */
export const EADMetadataSchema = z.object({
  titleproper: z.string().optional(),
  unittitle: z.string().optional(),
  unitdate: z.string().optional(),
  unitid: z.string().optional(),
  abstract: z.string().optional(),
  extent: z.string().optional(),
  repository: z.string().optional(),
  langmaterial: z.string().optional(),
});

export type EADMetadata = z.infer<typeof EADMetadataSchema>;

// ================================================================================================
// VISIBILITY METADATA
// ================================================================================================

/**
 * Visibility and Access Control Metadata
 * Controls who can access the document
 */
export const VisibilityMetadataSchema = z.object({
  public: z.boolean().optional(),
  restricted: z.boolean().optional(),
  embargoDate: z.string().optional(),
  accessLevel: z.enum(['public', 'restricted', 'private']).optional(),
  allowedRoles: z.array(z.string()).optional(),
});

export type VisibilityMetadata = z.infer<typeof VisibilityMetadataSchema>;

// ================================================================================================
// LINKED DATA METADATA
// ================================================================================================

/**
 * Linked Data URIs
 * Semantic web identifiers for entities
 */
export const LinkedDataMetadataSchema = z.object({
  creator_iri: z.string().url().optional(),
  subject_iri: z.string().url().optional(),
  location_iri: z.string().url().optional(),
  organization_iri: z.string().url().optional(),
});

export type LinkedDataMetadata = z.infer<typeof LinkedDataMetadataSchema>;

// ================================================================================================
// EXIF METADATA
// ================================================================================================

/**
 * EXIF Metadata from Images
 * Technical image metadata
 */
export const EXIFMetadataSchema = z.object({
  make: z.string().optional(),
  model: z.string().optional(),
  dateTime: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  orientation: z.number().optional(),
  software: z.string().optional(),
  gpsLatitude: z.string().optional(),
  gpsLongitude: z.string().optional(),
});

export type EXIFMetadata = z.infer<typeof EXIFMetadataSchema>;

// ================================================================================================
// COMPLETE DOCUMENT METADATA
// ================================================================================================

/**
 * Complete Document Metadata Schema
 * Aggregates all metadata types for a document
 */
export const DocumentMetadataSchema = z.object({
  archival: ArchivalMetadataSchema.optional(),
  dublinCore: DublinCoreMetadataSchema.optional(),
  ead: EADMetadataSchema.optional(),
  visibility: VisibilityMetadataSchema.optional(),
  linkedData: LinkedDataMetadataSchema.optional(),
  exif: EXIFMetadataSchema.optional(),
  additional: z.record(z.string(), z.unknown()).optional(),
  combined: z.record(z.string(), z.unknown()).optional(),
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;

// ================================================================================================
// HELPER FUNCTIONS
// ================================================================================================

/**
 * Safely extract string value from metadata object
 */
export function getString(obj: Record<string, unknown>, key: string): string | undefined {
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Safely extract string value from nested metadata object
 */
export function getNestedString(
  obj: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  if (!obj) return undefined;
  const value = obj[key];
  return typeof value === 'string' ? value : undefined;
}

/**
 * Validate and parse document metadata with runtime safety
 */
export function parseDocumentMetadata(metadata: unknown): DocumentMetadata {
  const validated = DocumentMetadataSchema.safeParse(metadata);

  if (!validated.success) {
    // Return empty but valid metadata structure
    return {};
  }

  return validated.data;
}
