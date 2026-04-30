/**
 * DOCUMENT QUALITY METADATA SCHEMAS
 * ==================================
 *
 * Strict TypeScript/Zod schemas for DocumentQuality JSON fields
 * Ensures type safety for error tracking and AI modification audit
 */

import { z } from 'zod';

// =============================================
// DOCUMENT ERROR TYPES
// =============================================

/** Document error type enum matching Prisma schema */
export const DocumentErrorTypeSchema = z.enum([
  'POST_IT',
  'FOLDED_CORNER',
  'EMPTY_PAGE',
  'BLURRED_TEXT',
  'POOR_QUALITY',
  'DAMAGED_ORIGINAL',
]);

// =============================================
// ERROR TRACKING SCHEMAS
// =============================================

/**
 * Individual error record with location information
 */
export const ErrorRecordSchema = z
  .object({
    /** Type of error detected */
    type: DocumentErrorTypeSchema,

    /** Page number where error occurs (1-based) */
    pageNumber: z.number().int().positive(),

    /** Confidence score from detection algorithm (0-1) */
    confidence: z.number().min(0).max(1).optional(),

    /** Bounding box coordinates for error location */
    boundingBox: z
      .object({
        x: z.number().min(0),
        y: z.number().min(0),
        width: z.number().positive(),
        height: z.number().positive(),
      })
      .optional(),

    /** Human-readable description */
    description: z.string().trim().max(500).optional(),

    /** Detection timestamp */
    detectedAt: z.string().datetime().optional(),
  })
  .strict();

/**
 * Error types array schema - list of error type enums
 */
export const ErrorTypesArraySchema = z.array(DocumentErrorTypeSchema);

/**
 * Error page numbers array schema - list of affected pages
 */
export const ErrorPageNumbersArraySchema = z.array(z.number().int().positive());

/**
 * Detailed error records array - complete error information
 */
export const DetailedErrorsArraySchema = z.array(ErrorRecordSchema);

// =============================================
// AI MODIFICATION TRACKING
// =============================================

/**
 * AI modification record for a specific field
 */
export const AiModificationSchema = z
  .object({
    /** JSON path of modified field (e.g., "$.archival.header") */
    fieldPath: z.string().trim().min(1),

    /** Original value before AI modification */
    originalValue: z.string().optional(),

    /** AI-generated value */
    aiValue: z.string(),

    /** Confidence score of AI modification (0-1) */
    confidence: z.number().min(0).max(1).optional(),

    /** AI model/service used */
    aiModel: z.string().trim().min(1).max(100),

    /** Modification timestamp */
    modifiedAt: z.string().datetime(),

    /** Human reviewer who approved/rejected */
    reviewedBy: z.number().int().positive().optional(),

    /** Review status */
    reviewStatus: z.enum(['pending', 'approved', 'rejected']).optional(),

    /** Review timestamp */
    reviewedAt: z.string().datetime().optional(),
  })
  .strict();

/**
 * AI modified fields array schema
 */
export const AiModifiedFieldsArraySchema = z.array(AiModificationSchema);

/**
 * Simple AI modified fields - just field paths
 */
export const SimpleAiModifiedFieldsSchema = z.array(z.string().trim().min(1));

// =============================================
// PLUGIN SYSTEM SCHEMAS
// =============================================

/**
 * Individual plugin configuration
 */
export const PluginConfigSchema = z
  .object({
    /** Plugin name/identifier */
    name: z.string().trim().min(1).max(100),

    /** Plugin version */
    version: z.string().trim().min(1).max(50),

    /** Plugin enabled status */
    enabled: z.boolean(),

    /** Plugin configuration parameters */
    config: z.record(z.string(), z.any()).optional(),

    /** Plugin execution timestamp */
    executedAt: z.string().datetime().optional(),

    /** Plugin execution duration (ms) */
    executionTime: z.number().positive().optional(),

    /** Plugin success status */
    success: z.boolean().optional(),

    /** Plugin error message */
    error: z.string().trim().max(1000).optional(),
  })
  .strict();

/**
 * Plugins enabled object schema
 */
export const PluginsEnabledSchema = z.record(z.string(), PluginConfigSchema);

/**
 * Simple plugins enabled - just boolean flags
 */
export const SimplePluginsEnabledSchema = z.record(z.string(), z.boolean());

// =============================================
// QUALITY ASSESSMENT SCHEMAS
// =============================================

/**
 * Image quality metrics
 */
export const ImageQualityMetricsSchema = z
  .object({
    /** Image sharpness score (0-1) */
    sharpness: z.number().min(0).max(1).optional(),

    /** Brightness level (0-1) */
    brightness: z.number().min(0).max(1).optional(),

    /** Contrast ratio */
    contrast: z.number().min(0).max(1).optional(),

    /** Noise level (0-1, lower is better) */
    noise: z.number().min(0).max(1).optional(),

    /** Overall quality score (0-1) */
    overallScore: z.number().min(0).max(1).optional(),

    /** Quality assessment timestamp */
    assessedAt: z.string().datetime().optional(),
  })
  .strict();

/**
 * Text quality metrics (for OCR assessment)
 */
export const TextQualityMetricsSchema = z
  .object({
    /** OCR confidence score (0-1) */
    ocrConfidence: z.number().min(0).max(1).optional(),

    /** Text readability score */
    readability: z.number().min(0).max(1).optional(),

    /** Character recognition accuracy */
    characterAccuracy: z.number().min(0).max(1).optional(),

    /** Word recognition accuracy */
    wordAccuracy: z.number().min(0).max(1).optional(),

    /** Language detection confidence */
    languageConfidence: z.number().min(0).max(1).optional(),

    /** Detected language code */
    detectedLanguage: z.string().trim().max(10).optional(),
  })
  .strict();

// =============================================
// COMPLETE QUALITY METADATA SCHEMAS
// =============================================

/**
 * Complete quality metadata for extended error tracking
 */
export const ExtendedQualityMetadataSchema = z
  .object({
    /** Detailed error records */
    detailedErrors: DetailedErrorsArraySchema.optional(),

    /** Image quality metrics */
    imageQuality: ImageQualityMetricsSchema.optional(),

    /** Text quality metrics */
    textQuality: TextQualityMetricsSchema.optional(),

    /** Quality assessment history */
    assessmentHistory: z
      .array(
        z.object({
          assessor: z.string().trim().min(1).max(100),
          assessedAt: z.string().datetime(),
          notes: z.string().trim().max(1000).optional(),
          approved: z.boolean(),
        }),
      )
      .optional(),
  })
  .strict();

// =============================================
// TYPE EXPORTS
// =============================================

export type DocumentErrorType = z.infer<typeof DocumentErrorTypeSchema>;
export type ErrorRecord = z.infer<typeof ErrorRecordSchema>;
export type ErrorTypesArray = z.infer<typeof ErrorTypesArraySchema>;
export type ErrorPageNumbersArray = z.infer<typeof ErrorPageNumbersArraySchema>;
export type DetailedErrorsArray = z.infer<typeof DetailedErrorsArraySchema>;
export type AiModification = z.infer<typeof AiModificationSchema>;
export type AiModifiedFieldsArray = z.infer<typeof AiModifiedFieldsArraySchema>;
export type SimpleAiModifiedFields = z.infer<typeof SimpleAiModifiedFieldsSchema>;
export type PluginConfig = z.infer<typeof PluginConfigSchema>;
export type PluginsEnabled = z.infer<typeof PluginsEnabledSchema>;
export type SimplePluginsEnabled = z.infer<typeof SimplePluginsEnabledSchema>;
export type ImageQualityMetrics = z.infer<typeof ImageQualityMetricsSchema>;
export type TextQualityMetrics = z.infer<typeof TextQualityMetricsSchema>;
export type ExtendedQualityMetadata = z.infer<typeof ExtendedQualityMetadataSchema>;

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Validates error types array with strict type checking
 *
 * Preconditions: data is any unknown value
 * Postconditions: returns valid DocumentErrorType[] or throws ZodError
 * Invariants: input data is not mutated
 *
 * @param data - Unknown data to validate as error types array
 * @returns Validated DocumentErrorType array
 * @throws ZodError if validation fails
 */
export const validateErrorTypes = (data: unknown): DocumentErrorType[] => {
  return ErrorTypesArraySchema.parse(data);
};

/**
 * Validates AI modified fields array with comprehensive metadata
 *
 * Preconditions: data is any unknown value
 * Postconditions: returns valid AiModification[] or throws ZodError
 * Invariants: input data is not mutated
 *
 * @param data - Unknown data to validate as AI modifications array
 * @returns Validated AiModification array
 * @throws ZodError if validation fails
 */
export const validateAiModifiedFields = (data: unknown): AiModification[] => {
  return AiModifiedFieldsArraySchema.parse(data);
};

/**
 * Validates plugins configuration with proper structure checking
 *
 * Preconditions: data is any unknown value
 * Postconditions: returns valid PluginsEnabled or throws ZodError
 * Invariants: input data is not mutated
 *
 * @param data - Unknown data to validate as plugins configuration
 * @returns Validated PluginsEnabled object
 * @throws ZodError if validation fails
 */
export const validatePluginsEnabled = (data: unknown): PluginsEnabled => {
  return PluginsEnabledSchema.parse(data);
};

/**
 * Creates an error record with optional metadata
 *
 * Preconditions: type is valid DocumentErrorType, pageNumber is positive integer
 * Postconditions: returns valid ErrorRecord with type, page, and optional fields
 * Invariants: required fields are preserved, optional fields merged safely
 *
 * @param type - Document error type
 * @param pageNumber - Page number where error occurs (1-based)
 * @param options - Optional additional error metadata
 * @returns Complete ErrorRecord object
 */
export const createErrorRecord = (
  type: DocumentErrorType,
  pageNumber: number,
  options?: Partial<Omit<ErrorRecord, 'type' | 'pageNumber'>>,
): ErrorRecord => {
  return ErrorRecordSchema.parse({
    type,
    pageNumber,
    ...options,
  });
};

/**
 * Creates an AI modification record with current timestamp
 *
 * Preconditions: fieldPath is non-empty, aiValue and aiModel are valid strings
 * Postconditions: returns valid AiModification with current timestamp
 * Invariants: current timestamp added, required fields preserved
 *
 * @param fieldPath - JSON path of modified field
 * @param aiValue - AI-generated value
 * @param aiModel - AI model/service identifier
 * @param options - Optional additional modification metadata
 * @returns Complete AiModification record
 */
export const createAiModification = (
  fieldPath: string,
  aiValue: string,
  aiModel: string,
  options?: Partial<Omit<AiModification, 'fieldPath' | 'aiValue' | 'aiModel' | 'modifiedAt'>>,
): AiModification => {
  return AiModificationSchema.parse({
    fieldPath,
    aiValue,
    aiModel,
    modifiedAt: new Date().toISOString(),
    ...options,
  });
};

/**
 * Checks if document has critical errors that require attention
 *
 * Preconditions: errorTypes is valid DocumentErrorType array
 * Postconditions: returns true if critical errors present, false otherwise
 * Invariants: errorTypes array is not mutated, check is consistent
 *
 * @param errorTypes - Array of document error types to check
 * @returns True if document has critical errors
 */
export const hasCriticalErrors = (errorTypes: DocumentErrorType[]): boolean => {
  const criticalTypes = ['DAMAGED_ORIGINAL', 'POOR_QUALITY', 'BLURRED_TEXT'];

  return errorTypes.some((type) => criticalTypes.includes(type));
};

/**
 * Gets error severity level for prioritization and handling
 *
 * Preconditions: errorType is valid DocumentErrorType
 * Postconditions: returns consistent severity level for given error type
 * Invariants: same error type always returns same severity
 *
 * @param errorType - Document error type to assess
 * @returns Severity level (low, medium, high)
 */
export const getErrorSeverity = (errorType: DocumentErrorType): 'low' | 'medium' | 'high' => {
  switch (errorType) {
    case 'POST_IT':
    case 'FOLDED_CORNER':
      return 'low';
    case 'EMPTY_PAGE':
    case 'BLURRED_TEXT':
      return 'medium';
    case 'POOR_QUALITY':
    case 'DAMAGED_ORIGINAL':
      return 'high';
    default:
      return 'medium';
  }
};
