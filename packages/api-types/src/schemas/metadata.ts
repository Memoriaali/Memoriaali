/**
 * MEMORIAALI V2.0 - METADATA SCHEMA DEFINITIONS
 * =============================================
 *
 * Strict TypeScript/Zod schemas for document metadata JSON fields
 * Based on official international and Finnish archival standards
 *
 * STANDARDS COMPLIANCE:
 * - Dublin Core Metadata Terms (DCMI-Terms) - https://www.dublincore.org/specifications/dublin-core/dcmi-terms/
 * - EAD3 (Encoded Archival Description) - https://www.loc.gov/ead/EAD3taglib/index.html
 * - Finnish National Digital Library (KDK) specifications
 * - Finnish Digital Preservation Service (DPS) metadata requirements v1.7.6
 *
 * SOURCES:
 * - Finnish National Archives metadata specification: https://digitalpreservation.fi/en/specifications/metadata
 * - DCMI Metadata Terms: https://www.dublincore.org/specifications/dublin-core/dcmi-terms/
 * - EAD3 Tag Library: https://www.loc.gov/ead/EAD3taglib/index.html
 *
 * WHY THIS MATTERS:
 * - Replaces 64-column legacy metadata nightmare with standards-compliant types
 * - Ensures interoperability with international archival systems
 * - Provides compile-time and runtime validation against official schemas
 * - Enables metadata exchange with Finnish cultural heritage institutions
 * - Facilitates compliance with Finnish Act on Cultural Materials (1433/2007)
 */

import { z } from 'zod';

// =============================================
// BASE VALIDATION SCHEMAS
// =============================================

/** Basic text field - non-empty string with reasonable length limits */
const TextFieldSchema = z.string().trim().min(1).max(1000);

/** Optional text field - can be empty or undefined */
const OptionalTextFieldSchema = z.string().trim().max(1000).optional();

/** Long text field for descriptions */
const LongTextFieldSchema = z.string().trim().min(1).max(5000);

/** Optional long text field */
const OptionalLongTextFieldSchema = z.string().trim().max(5000).optional();

/** Date string in ISO format or Finnish locale */
const DateStringSchema = z.string().trim().min(1).max(50);

/** Optional date string */
const OptionalDateStringSchema = z.string().trim().max(50).optional();

/** Language code (ISO 639-1 or Finnish locale) */
const LanguageCodeSchema = z
  .enum(['fi', 'sv', 'en', 'de', 'ru', 'other'])
  .or(z.string().trim().min(2).max(10));

/** Array of names/terms */
const NamesArraySchema = z.array(z.string().trim().min(1).max(200)).optional();

/** Business identity code (Y-tunnus) validation */
const BusinessIdSchema = z
  .string()
  .trim()
  .regex(/^\d{7}-\d$/)
  .optional();

/** URI/IRI validation */
const UriSchema = z.string().trim().url();

/** Optional URI/IRI validation */
const OptionalUriSchema = z.string().trim().url().optional();

// =============================================
// FINNISH ARCHIVAL SPECIFICATION SCHEMA
// =============================================

/**
 * Official Finnish Archival Metadata Schema
 * Based on Finnish National Archives specification
 * All fields are optional but strictly typed when present
 */
export const ArchivalMetadataSchema = z
  .object({
    /** Otsikko - Document title/header */
    header: OptionalTextFieldSchema,

    /** Asiasanat - Subject indexing keywords */
    subjectIndexing: OptionalTextFieldSchema,

    /** Tapahtumat - Events described in document */
    events: OptionalTextFieldSchema,

    /** Paikat - Locations mentioned in document */
    locations: OptionalTextFieldSchema,

    /** Vapaasana kuvaus - Free-form description */
    description: OptionalLongTextFieldSchema,

    /** Tekijä - Author/creator of document */
    author: OptionalTextFieldSchema,

    /** Tarkka päivämäärä - Exact date (ISO or Finnish format) */
    exactDate: OptionalDateStringSchema,

    /** Arvioitu päivämäärä - Estimated date */
    estimatedDate: OptionalDateStringSchema,

    /** Tiedoston tyyppi - Document type */
    type: OptionalTextFieldSchema,

    /** Kieli - Primary language */
    language: LanguageCodeSchema.optional(),

    /** Muuta tietoa - Additional information */
    other: OptionalLongTextFieldSchema,

    /** Henkilöiden nimet - Person names mentioned */
    personNames: NamesArraySchema,

    /** Organisaatioiden nimet - Organization names */
    organizations: NamesArraySchema,

    /** Y-tunnus - Business identity code */
    businessIdentityCode: BusinessIdSchema,

    /** Diaarinumero - Journal/registry number */
    journalNumber: OptionalTextFieldSchema,

    /** Tuotteet - Products mentioned */
    products: NamesArraySchema,

    /** Kansallisuus, uskonnolliset ja poliittiset ryhmät */
    nationalityReligiousPolitical: OptionalTextFieldSchema,
  })
  .strict();

// =============================================
// DUBLIN CORE METADATA SCHEMA
// =============================================

/**
 * Dublin Core Metadata Schema (DCMI-Terms compliant)
 * Based on Dublin Core Metadata Terms specification
 * Source: https://www.dublincore.org/specifications/dublin-core/dcmi-terms/
 *
 * Core Elements (Dublin Core Metadata Element Set):
 * All 15 core elements from the original Dublin Core specification
 */
export const DublinCoreMetadataSchema = z
  .object({
    // ===== CORE DUBLIN CORE ELEMENTS (15 elements) =====

    /** dc:title - A name given to the resource */
    title: OptionalTextFieldSchema,

    /** dc:creator - An entity responsible for making the resource */
    creator: OptionalTextFieldSchema,

    /** dc:subject - The topic of the resource (use controlled vocabulary when possible) */
    subject: OptionalTextFieldSchema,

    /** dc:description - An account of the resource */
    description: OptionalLongTextFieldSchema,

    /** dc:publisher - An entity responsible for making the resource available */
    publisher: OptionalTextFieldSchema,

    /** dc:contributor - An entity responsible for making contributions to the resource */
    contributor: OptionalTextFieldSchema,

    /** dc:date - A point or period of time associated with event in lifecycle (ISO 8601 recommended) */
    date: OptionalDateStringSchema,

    /** dc:type - The nature or genre of the resource (use DCMI Type Vocabulary) */
    type: OptionalTextFieldSchema,

    /** dc:format - File format, physical medium, or dimensions (use MIME types) */
    format: OptionalTextFieldSchema,

    /** dc:identifier - An unambiguous reference to the resource (URIs preferred) */
    identifier: OptionalTextFieldSchema,

    /** dc:source - A related resource from which the described resource is derived */
    source: OptionalTextFieldSchema,

    /** dc:language - A language of the resource (use RFC 4646/ISO 639) */
    language: LanguageCodeSchema.optional(),

    /** dc:relation - A related resource */
    relation: OptionalTextFieldSchema,

    /** dc:coverage - Spatial or temporal topic, spatial applicability, or jurisdiction */
    coverage: OptionalTextFieldSchema,

    /** dc:rights - Information about rights held in and over the resource */
    rights: OptionalTextFieldSchema,

    // ===== DCMI TERMS REFINEMENTS =====
    // Additional elements from DCMI Metadata Terms

    /** dcterms:created - Date of creation of the resource (W3CDTF/ISO 8601) */
    created: OptionalDateStringSchema,

    /** dcterms:modified - Date on which the resource was changed */
    modified: OptionalDateStringSchema,

    /** dcterms:issued - Date of formal issuance of the resource */
    issued: OptionalDateStringSchema,

    /** dcterms:available - Date that the resource became or will become available */
    available: OptionalDateStringSchema,

    /** dcterms:spatial - Spatial characteristics of the resource */
    spatial: OptionalTextFieldSchema,

    /** dcterms:temporal - Temporal characteristics of the resource */
    temporal: OptionalTextFieldSchema,

    /** dcterms:audience - A class of entity for whom the resource is intended */
    audience: OptionalTextFieldSchema,

    /** dcterms:extent - The size or duration of the resource */
    extent: OptionalTextFieldSchema,

    /** dcterms:medium - The material or physical carrier of the resource */
    medium: OptionalTextFieldSchema,

    /** dcterms:provenance - A statement of changes in ownership of the resource */
    provenance: OptionalTextFieldSchema,
  })
  .strict();

// =============================================
// EAD (ENCODED ARCHIVAL DESCRIPTION) SCHEMA
// =============================================

/**
 * EAD3 Metadata Schema (Encoded Archival Description version 3)
 * Based on official EAD3 Tag Library specification
 * Source: https://www.loc.gov/ead/EAD3taglib/index.html
 *
 * Core elements from <archdesc> and <did> sections for archival description
 * Designed for "greater conceptual and semantic consistency" in archival metadata
 */
export const EadMetadataSchema = z
  .object({
    // ===== CORE DESCRIPTIVE IDENTIFICATION (did) ELEMENTS =====

    /** unittitle - Title of the archival unit (required in most contexts) */
    unitTitle: OptionalTextFieldSchema,

    /** unitdate - Dates associated with the materials (@normal attribute recommended) */
    unitDate: OptionalDateStringSchema,

    /** unitdatestructured - Structured date information (ISO 8601) */
    unitDateStructured: OptionalDateStringSchema,

    /** origination - Creator information (persons, families, corporate bodies) */
    origination: OptionalTextFieldSchema,

    /** repository - Institution holding the materials */
    repository: OptionalTextFieldSchema,

    /** physdesc - Physical description of materials */
    physicalDescription: OptionalTextFieldSchema,

    /** unitid - Unique identifier for the archival unit */
    unitId: OptionalTextFieldSchema,

    /** langmaterial - Language(s) of the materials */
    languageMaterial: OptionalTextFieldSchema,

    // ===== DESCRIPTIVE ELEMENTS =====

    /** abstract - Brief summary of the materials */
    abstract: OptionalLongTextFieldSchema,

    /** scopecontent - Scope and content note */
    scopeContent: OptionalLongTextFieldSchema,

    /** arrangement - Information about arrangement of materials */
    arrangement: OptionalTextFieldSchema,

    /** bioghist - Biographical or historical note */
    biographicalHistory: OptionalLongTextFieldSchema,

    // ===== ACCESS AND USE ELEMENTS =====

    /** accessrestrict - Conditions governing access */
    accessRestrict: OptionalTextFieldSchema,

    /** userestrict - Conditions governing use */
    useRestrict: OptionalTextFieldSchema,

    /** prefercite - Preferred citation note */
    preferredCitation: OptionalTextFieldSchema,

    /** processinfo - Processing information */
    processingInfo: OptionalTextFieldSchema,

    // ===== ADMINISTRATIVE ELEMENTS =====

    /** acqinfo - Acquisition information */
    acquisitionInfo: OptionalTextFieldSchema,

    /** appraisal - Appraisal information */
    appraisal: OptionalTextFieldSchema,

    /** accruals - Accruals information */
    accruals: OptionalTextFieldSchema,

    /** custodhist - Custodial history */
    custodialHistory: OptionalTextFieldSchema,

    // ===== TECHNICAL ELEMENTS =====

    /** phystech - Physical characteristics and technical requirements */
    physicalTechnical: OptionalTextFieldSchema,

    /** otherfindaid - Other finding aids */
    otherFindingAid: OptionalTextFieldSchema,

    /** originalsloc - Location of originals */
    originalsLocation: OptionalTextFieldSchema,

    /** altformavail - Alternative form available */
    alternativeFormAvailable: OptionalTextFieldSchema,

    // ===== RELATED MATERIALS =====

    /** relatedmaterial - Related materials */
    relatedMaterial: OptionalTextFieldSchema,

    /** separatedmaterial - Separated materials */
    separatedMaterial: OptionalTextFieldSchema,

    // ===== CONTROL ELEMENTS (from control section) =====

    /** Level of description (collection, fonds, series, file, item) */
    level: z
      .enum(['collection', 'fonds', 'series', 'subseries', 'file', 'item', 'otherlevel'])
      .optional(),

    /** Language of the finding aid description */
    descriptionLanguage: LanguageCodeSchema.optional(),

    /** Script of the finding aid description */
    descriptionScript: z.string().trim().max(10).optional(),
  })
  .strict();

// =============================================
// VISIBILITY CONTROL SCHEMA
// =============================================

/**
 * Field-level visibility controls
 * Determines which metadata fields are public/private
 */
export const VisibilityControlSchema = z
  .object({
    title: z.boolean().optional(),
    creator: z.boolean().optional(),
    subject: z.boolean().optional(),
    description: z.boolean().optional(),
    publisher: z.boolean().optional(),
    date: z.boolean().optional(),
    type: z.boolean().optional(),
    language: z.boolean().optional(),
    header: z.boolean().optional(),
    subjectIndexing: z.boolean().optional(),
    events: z.boolean().optional(),
    locations: z.boolean().optional(),
    author: z.boolean().optional(),
    personNames: z.boolean().optional(),
    organizations: z.boolean().optional(),
  })
  .strict();

// =============================================
// LINKED DATA SCHEMA
// =============================================

/**
 * Linked Data URIs for semantic web integration
 * Links to external authority files and knowledge bases
 */
export const LinkedDataSchema = z
  .object({
    /** Creator URI (Wikidata, VIAF, etc.) */
    creatorUri: OptionalUriSchema,

    /** Publisher URI */
    publisherUri: OptionalUriSchema,

    /** Event URI */
    eventUri: OptionalUriSchema,

    /** Spatial/location URI */
    spatialUri: OptionalUriSchema,

    /** Subject/concept URIs */
    subjectUris: z.array(UriSchema).optional(),

    /** Person URIs */
    personUris: z.array(UriSchema).optional(),

    /** Organization URIs */
    organizationUris: z.array(UriSchema).optional(),
  })
  .strict();

// =============================================
// TECHNICAL METADATA SCHEMA
// =============================================

/**
 * Technical metadata for digital preservation
 */
export const TechnicalMetadataSchema = z
  .object({
    /** Original file EXIF data */
    exif: z.record(z.string(), z.any()).optional(),

    /** File format details */
    formatDetails: z
      .object({
        mimeType: z.string().optional(),
        fileSize: z.number().positive().optional(),
        dimensions: z
          .object({
            width: z.number().positive().optional(),
            height: z.number().positive().optional(),
          })
          .optional(),
        colorProfile: z.string().optional(),
        resolution: z
          .object({
            x: z.number().positive().optional(),
            y: z.number().positive().optional(),
            unit: z.enum(['dpi', 'ppi', 'cm', 'inch']).optional(),
          })
          .optional(),
      })
      .optional(),

    /** OCR processing information */
    ocrInfo: z
      .object({
        engine: z.string().optional(),
        confidence: z.number().min(0).max(1).optional(),
        languages: z.array(LanguageCodeSchema).optional(),
        processedAt: z.string().datetime().optional(),
      })
      .optional(),

    /** Checksum for integrity verification */
    checksums: z
      .object({
        md5: z
          .string()
          .regex(/^[a-f0-9]{32}$/)
          .optional(),
        sha256: z
          .string()
          .regex(/^[a-f0-9]{64}$/)
          .optional(),
      })
      .optional(),
  })
  .strict();

// =============================================
// LEGACY FIELDS SCHEMA
// =============================================

/**
 * Legacy field mappings for migration compatibility
 * Preserves data from old 64-column system
 */
export const LegacyFieldsSchema = z
  .object({
    /** Legacy additional metadata (md1-md64) */
    additional: z.record(z.string(), z.string()).optional(),

    /** Combined metadata from legacy system */
    combined: z.any().optional(),

    /** Elasticsearch ID from legacy system */
    searchId: z.string().optional(),

    /** Legacy "no changes" flag */
    noChanges: z.boolean().optional(),

    /** Legacy creation timestamp */
    legacyCreatedAt: z.string().optional(),

    /** Legacy modification timestamp */
    legacyModifiedAt: z.string().optional(),

    /** Original legacy record ID */
    legacyId: z.string().optional(),
  })
  .strict();

// =============================================
// COMPLETE DOCUMENT METADATA SCHEMA
// =============================================

/**
 * Complete Document Metadata Schema
 * Combines all metadata standards into a single, strict type
 */

export const DocumentTypeSchema = z
  .enum([
    'object',
    'article',
    'map',
    'video',
    'text',
    'document',
    'book',
    'photo',
    'memoir',
    'letter',
    'recording',
    'postcard',
    'drawing',
    'other',
  ])
  .optional();
export const DocumentMetadataSchema = z
  .object({
    author: z.string().optional(),
    businessIdentityCode: z.string().optional(),
    description: z.string().optional(),
    estimatedDate: z.string().optional(),
    events: z.string().optional(),
    exactDate: z.string().optional(),
    header: z.string().optional(),
    journalNumber: z.string().optional(),
    language: z.enum(['fi', 'sv', 'en', 'de', 'ru', 'other']).optional(),
    locations: z.array(z.string()).optional(),
    nationalityReligiousPolitical: z.string().optional(),
    organizations: z.array(z.string()).optional(),
    other: z.string().optional(),
    personNames: z.string().optional(),
    products: z.string().optional(),
    subjectIndexing: z.array(z.string()).optional(),
    type: DocumentTypeSchema.optional(),

    // /** Finnish archival specification fields */
    // archival: ArchivalMetadataSchema.optional(),

    // /** Dublin Core metadata */
    // dublinCore: DublinCoreMetadataSchema.optional(),

    // /** EAD archival description */
    // ead: EadMetadataSchema.optional(),

    // /** Field visibility controls */
    // visibility: VisibilityControlSchema.optional(),

    // /** Linked data URIs */
    // linkedData: LinkedDataSchema.optional(),

    // /** Technical preservation metadata */
    // technical: TechnicalMetadataSchema.optional(),

    // /** Legacy field preservation */
    // legacy: LegacyFieldsSchema.optional(),

    // /** Custom institution-specific fields */
    // institutional: z.record(z.string(), z.any()).optional(),
  })
  .strict();

// TODO: Add more types and fields to the schema based on the specs
// (See: https://www.wikidata.org/wiki/Q123)
export const IrisSchema = z
  .object({
    type: z.enum(['PERSON', 'PLACE', 'EVENT', 'CONCEPT', 'ORGANIZATION']),
    uri: UriSchema,
  })
  .strict();

// =============================================
// TYPE EXPORTS
// =============================================

export type ArchivalMetadata = z.infer<typeof ArchivalMetadataSchema>;
export type DublinCoreMetadata = z.infer<typeof DublinCoreMetadataSchema>;
export type EadMetadata = z.infer<typeof EadMetadataSchema>;
export type VisibilityControl = z.infer<typeof VisibilityControlSchema>;
export type LinkedData = z.infer<typeof LinkedDataSchema>;
export type TechnicalMetadata = z.infer<typeof TechnicalMetadataSchema>;
export type LegacyFields = z.infer<typeof LegacyFieldsSchema>;
export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Validates document metadata and returns typed result
 *
 * Preconditions: data is any unknown value
 * Postconditions: returns valid DocumentMetadata or throws ZodError
 * Invariants: input data is not mutated
 *
 * @param data - Unknown data to validate
 * @returns Validated DocumentMetadata
 * @throws ZodError if validation fails
 */
export const validateDocumentMetadata = (data: unknown): DocumentMetadata => {
  return DocumentMetadataSchema.parse(data);
};

/**
 * Safely parses document metadata with comprehensive error handling
 *
 * Preconditions: data is any unknown value
 * Postconditions: returns success/error result with data or error details
 * Invariants: input data is not mutated
 *
 * @param data - Unknown data to validate
 * @returns Parsing result with success flag and data or errors
 */
export const parseDocumentMetadata = (
  data: unknown,
): {
  success: boolean;
  data?: DocumentMetadata;
  errors?: z.ZodError;
} => {
  const result = DocumentMetadataSchema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, errors: result.error };
};

/**
 * Creates empty metadata object with proper structure
 *
 * Preconditions: none
 * Postconditions: returns valid empty DocumentMetadata object
 * Invariants: always returns consistent empty structure
 *
 * @returns Empty DocumentMetadata object
 */
export const createEmptyMetadata = (): DocumentMetadata => {
  return {};
};

/**
 * Merges metadata objects with type safety and deep merge support
 *
 * Preconditions: base is valid DocumentMetadata, updates is partial DocumentMetadata
 * Postconditions: returns merged and validated DocumentMetadata
 * Invariants: original objects are not mutated, result is always valid
 *
 * @param base - Base metadata object
 * @param updates - Partial metadata updates to merge
 * @returns Merged and validated DocumentMetadata
 */
export const mergeMetadata = (
  base: DocumentMetadata,
  updates: Partial<DocumentMetadata>,
): DocumentMetadata => {
  return DocumentMetadataSchema.parse({
    ...base,
    ...updates,
    // Deep merge nested objects
    // archival: { ...base.archival, ...updates.archival },
    // dublinCore: { ...base.dublinCore, ...updates.dublinCore },
    // ead: { ...base.ead, ...updates.ead },
    // visibility: { ...base.visibility, ...updates.visibility },
    // linkedData: { ...base.linkedData, ...updates.linkedData },
    // technical: { ...base.technical, ...updates.technical },
    // legacy: { ...base.legacy, ...updates.legacy },
    // institutional: { ...base.institutional, ...updates.institutional },
  });
};

// =============================================
// VALIDATION PRESETS
// =============================================

/**
 * Minimal required fields for Finnish compliance
 */
export const MinimalFinnishMetadataSchema = z
  .object({
    archival: z
      .object({
        header: TextFieldSchema,
        language: LanguageCodeSchema,
        type: OptionalTextFieldSchema,
      })
      .strict(),
  })
  .strict();

/**
 * Complete Finnish archival compliance
 */
export const CompleteFinnishMetadataSchema = z
  .object({
    archival: ArchivalMetadataSchema.required({
      header: true,
      language: true,
      type: true,
    }),
    dublinCore: DublinCoreMetadataSchema.optional(),
  })
  .strict();

/**
 * Date validation schema for external use
 */
export const DateValidationSchema = DateStringSchema;

/**
 * Long text validation schema for external use
 */
export const LongTextValidationSchema = LongTextFieldSchema;

export type MinimalFinnishMetadata = z.infer<typeof MinimalFinnishMetadataSchema>;
export type CompleteFinnishMetadata = z.infer<typeof CompleteFinnishMetadataSchema>;
export type DocumentTypeEnum = z.infer<typeof DocumentTypeSchema>;
