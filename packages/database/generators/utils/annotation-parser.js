/**
 * ENHANCED ANNOTATION PARSER
 * ==========================
 *
 * Orientation
 * -----------
 * This module parses structured annotations that are embedded in Prisma
 * schema comments (field-level triple-slash comments). The annotations
 * describe security and privacy semantics for individual fields and are
 * consumed by code generators to produce:
 * - type-safe metadata for field security levels
 * - role-aware field picking helpers in API layers
 * - GDPR-aware utilities for compliance features (consent, export, deletion)
 *
 * Why annotations at schema level
 * -------------------------------
 * - Single source of truth: Security and privacy intent stays co-located with
 *   the data model that owns the fields.
 * - Privacy by design: Generators can enforce fail-secure defaults and reduce
 *   accidental exposure by using explicit safe-field picking patterns.
 * - Compliance enablement: GDPR-related metadata (category, purpose, retention)
 *   supports data subject rights (access/portability/erasure) and retention
 *   policies without duplicating configuration across layers.
 *
 * Parsed annotation families
 * --------------------------
 * - @sensitive           → Field requires authorization to view (owner/admin).
 * - @admin-only          → Field visible to administrators only.
 * - @never-expose        → Field must never appear in any API response.
 * - @gdpr.category(X)    → GDPR data classification for the field.
 * - @gdpr.purpose(X)     → Declared processing purpose for the field.
 * - @gdpr.retention(X)   → Declared retention period/policy for the field.
 *
 * GDPR notes
 * ----------
 * - Category informs risk and handling (e.g., BIOMETRIC, HEALTH). It does not
 *   alone grant exposure; it documents sensitivity for downstream checks.
 * - Purpose connects processing to a legal basis and consent checks. It allows
 *   dynamic response shaping based on user consent or other lawful bases.
 * - Retention indicates how long data may be kept, enabling lifecycle controls
 *   and erasure workflows.
 *
 * Example (Prisma)
 * ----------------
 * model User {
 *   email           String  @unique  /// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(COMMUNICATION) @gdpr.retention(UNTIL_DELETION_REQUEST)
 *   hashedPassword  String           /// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(INDEFINITE)
 *   createdById     String?          /// @admin-only @gdpr.category(TECHNICAL) @gdpr.purpose(COMPLIANCE) @gdpr.retention(5_YEARS)
 * }
 */

/**
 * Supported annotation types
 *
 * @readonly
 * @enum {string}
 * @property {'sensitive'} SENSITIVE - Requires authorization (owner/admin) to view; excluded from public responses.
 * @property {'never-expose'} NEVER_EXPOSE - Must never be returned by the API under any circumstance (e.g., password hashes).
 * @property {'admin-only'} ADMIN_ONLY - Visible only to administrators; never included in public/user responses.
 * @property {'gdpr.category'} GDPR_CATEGORY - GDPR data classification annotation key.
 * @property {'gdpr.purpose'} GDPR_PURPOSE - GDPR processing purpose annotation key.
 * @property {'gdpr.retention'} GDPR_RETENTION - GDPR retention policy annotation key.
 */
export const ANNOTATION_TYPES = {
  SENSITIVE: 'sensitive',
  NEVER_EXPOSE: 'never-expose',
  ADMIN_ONLY: 'admin-only',
  GDPR_CATEGORY: 'gdpr.category',
  GDPR_PURPOSE: 'gdpr.purpose',
  GDPR_RETENTION: 'gdpr.retention',
};

/**
 * GDPR category constants
 *
 * Documents the general nature of the data. Categories are used to drive
 * downstream handling such as access risk, audit, and impact assessments.
 *
 * Notes:
 * - Category does not itself expose data; it informs enforcement.
 * - Choose the narrowest applicable category.
 *
 * @readonly
 * @enum {string}
 */
export const GDPR_CATEGORIES = {
  PERSONAL: 'PERSONAL',
  SENSITIVE_PERSONAL: 'SENSITIVE_PERSONAL',
  BIOMETRIC: 'BIOMETRIC',
  HEALTH: 'HEALTH',
  FINANCIAL: 'FINANCIAL',
  LOCATION: 'LOCATION',
  BEHAVIORAL: 'BEHAVIORAL',
  TECHNICAL: 'TECHNICAL',
  ARCHIVAL: 'ARCHIVAL',
};

/**
 * GDPR purpose constants
 *
 * Declares the intended processing purpose for a field. This connects the data
 * to a legal basis and enables consent-aware response shaping.
 *
 * Examples:
 * - AUTHENTICATION: credentials and security operations
 * - COMMUNICATION: messaging or notifications to the data subject
 * - COMPLIANCE: audit trails and regulatory reporting needs
 *
 * @readonly
 * @enum {string}
 */
export const GDPR_PURPOSES = {
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  COMMUNICATION: 'COMMUNICATION',
  ARCHIVAL: 'ARCHIVAL',
  RESEARCH: 'RESEARCH',
  ANALYTICS: 'ANALYTICS',
  COMPLIANCE: 'COMPLIANCE',
  SECURITY: 'SECURITY',
};

/**
 * GDPR retention period constants
 *
 * Declares the retention policy for the field. These values guide lifecycle
 * management (e.g., deletion scheduling) and facilitate the right to erasure.
 *
 * @readonly
 * @enum {string}
 */
export const GDPR_RETENTION_PERIODS = {
  INDEFINITE: 'INDEFINITE',
  '1_YEAR': '1_YEAR',
  '2_YEARS': '2_YEARS',
  '5_YEARS': '5_YEARS',
  '10_YEARS': '10_YEARS',
  UNTIL_DELETION_REQUEST: 'UNTIL_DELETION_REQUEST',
};

/**
 * @typedef {Object} Annotation
 * @property {string} type - One of ANNOTATION_TYPES or raw key.
 * @property {any} value - true for simple flags, or a validated enum value for GDPR annotations.
 * @property {string} raw - Original matched source snippet.
 */

/**
 * @typedef {Object} GdprInfo
 * @property {string | null} category - Value from GDPR_CATEGORIES, if present.
 * @property {string | null} purpose - Value from GDPR_PURPOSES, if present.
 * @property {string | null} retention - Value from GDPR_RETENTION_PERIODS, if present.
 */

/**
 * Parse a single annotation from a comment line
 *
 * Preconditions:
 * - comment is a string that may contain zero or more annotations.
 *
 * Postconditions:
 * - returns an array of parsed annotations with validated GDPR values.
 *
 * @param {string} comment - The comment string to parse.
 * @returns {Annotation[]} Array of parsed annotations.
 *
 * @example
 * parseAnnotations('/// @sensitive @gdpr.category(PERSONAL)')
 * // → [{ type: 'sensitive', value: true, raw: '@sensitive' },
 * //    { type: 'gdpr.category', value: 'PERSONAL', raw: '@gdpr.category(PERSONAL)' }]
 */
export function parseAnnotations(comment) {
  if (!comment || typeof comment !== 'string') {
    return [];
  }

  const annotations = [];

  // Regex patterns for different annotation types
  const patterns = {
    // Simple annotations without parameters
    simple: /@(sensitive|never-expose|admin-only)\b/g,
    // GDPR annotations with parameters
    gdprWithParams: /@gdpr\.(category|purpose|retention)\(([^)]+)\)/g,
  };

  // Parse simple annotations
  let match;
  while ((match = patterns.simple.exec(comment)) !== null) {
    const annotationType = match[1];
    annotations.push({
      type: annotationType,
      value: true,
      raw: match[0],
    });
  }

  // Reset regex state
  patterns.simple.lastIndex = 0;

  // Parse GDPR annotations with parameters
  while ((match = patterns.gdprWithParams.exec(comment)) !== null) {
    const gdprType = match[1]; // category, purpose, or retention
    const parameter = match[2].trim();

    // Validate parameter based on type
    const validatedParam = validateGdprParameter(gdprType, parameter);

    annotations.push({
      type: `gdpr.${gdprType}`,
      value: validatedParam,
      raw: match[0],
    });
  }

  // Reset regex state
  patterns.gdprWithParams.lastIndex = 0;

  return annotations;
}

/**
 * Validate GDPR annotation parameters
 *
 * Preconditions:
 * - gdprType is one of 'category' | 'purpose' | 'retention'.
 * - parameter is a non-empty string.
 *
 * Postconditions:
 * - returns the uppercased enum value if valid.
 *
 * @param {string} gdprType - The GDPR annotation type (category, purpose, retention).
 * @param {string} parameter - The parameter to validate.
 * @returns {string} The validated parameter.
 * @throws {Error} When the parameter is not part of the allowed enum for the given type.
 */
function validateGdprParameter(gdprType, parameter) {
  const cleanParam = parameter.replace(/["']/g, '').toUpperCase();

  switch (gdprType) {
    case 'category':
      if (!Object.values(GDPR_CATEGORIES).includes(cleanParam)) {
        throw new Error(
          `Invalid GDPR category '${parameter}'. Valid categories: ${Object.values(GDPR_CATEGORIES).join(', ')}`,
        );
      }
      return cleanParam;

    case 'purpose':
      if (!Object.values(GDPR_PURPOSES).includes(cleanParam)) {
        throw new Error(
          `Invalid GDPR purpose '${parameter}'. Valid purposes: ${Object.values(GDPR_PURPOSES).join(', ')}`,
        );
      }
      return cleanParam;

    case 'retention':
      if (!Object.values(GDPR_RETENTION_PERIODS).includes(cleanParam)) {
        throw new Error(
          `Invalid GDPR retention period '${parameter}'. Valid periods: ${Object.values(GDPR_RETENTION_PERIODS).join(', ')}`,
        );
      }
      return cleanParam;

    default:
      throw new Error(`Unknown GDPR annotation type: ${gdprType}`);
  }
}

/**
 * Check if a field has a specific annotation type
 *
 * @param {Annotation[]} annotations - Array of annotations.
 * @param {string} annotationType - The annotation type to check for.
 * @returns {boolean} True if the annotation exists.
 */
export function hasAnnotation(annotations, annotationType) {
  return annotations.some((ann) => ann.type === annotationType);
}

/**
 * Get the value of a specific annotation
 *
 * @param {Annotation[]} annotations - Array of annotations.
 * @param {string} annotationType - The annotation type to get value for.
 * @returns {any} The annotation value or null if not found.
 */
export function getAnnotationValue(annotations, annotationType) {
  const annotation = annotations.find((ann) => ann.type === annotationType);
  return annotation ? annotation.value : null;
}

/**
 * Determine the highest security level for a field based on its annotations
 *
 * Resolution order:
 * - never-expose > admin-only > sensitive > public
 *
 * @param {Annotation[]} annotations - Array of annotations.
 * @returns {('never-expose'|'admin-only'|'sensitive'|'public')} The security level.
 */
export function determineSecurityLevel(annotations) {
  if (hasAnnotation(annotations, ANNOTATION_TYPES.NEVER_EXPOSE)) {
    return 'never-expose';
  }
  if (hasAnnotation(annotations, ANNOTATION_TYPES.ADMIN_ONLY)) {
    return 'admin-only';
  }
  if (hasAnnotation(annotations, ANNOTATION_TYPES.SENSITIVE)) {
    return 'sensitive';
  }
  return 'public';
}

/**
 * Get GDPR-related annotations for a field
 *
 * @param {Annotation[]} annotations - Array of annotations.
 * @returns {GdprInfo} GDPR information grouped by key.
 */
export function extractGdprInfo(annotations) {
  return {
    category: getAnnotationValue(annotations, ANNOTATION_TYPES.GDPR_CATEGORY),
    purpose: getAnnotationValue(annotations, ANNOTATION_TYPES.GDPR_PURPOSE),
    retention: getAnnotationValue(annotations, ANNOTATION_TYPES.GDPR_RETENTION),
  };
}

/**
 * Validate annotations for consistency and conflicts
 *
 * Validates two dimensions:
 * 1) Security: only a single security annotation may exist (@sensitive | @admin-only | @never-expose).
 * 2) GDPR: if GDPR annotations exist without any security annotation, a warning is emitted to
 *    encourage adding a security annotation (privacy-by-default). This is advisory, not fatal.
 *
 * @param {Annotation[]} annotations - Array of annotations to validate.
 * @param {string} fieldName - Name of the field (for error messages).
 * @param {string} modelName - Name of the model (for error messages).
 * @returns {true} Returns true when validation passes.
 * @throws {Error} If conflicting security annotations are present.
 */
export function validateAnnotations(annotations, fieldName, modelName) {
  const securityLevel = determineSecurityLevel(annotations);

  // Check for conflicting security annotations
  const securityAnnotations = annotations.filter((ann) =>
    [
      ANNOTATION_TYPES.SENSITIVE,
      ANNOTATION_TYPES.NEVER_EXPOSE,
      ANNOTATION_TYPES.ADMIN_ONLY,
    ].includes(ann.type),
  );

  if (securityAnnotations.length > 1) {
    const types = securityAnnotations.map((ann) => ann.type).join(', ');
    throw new Error(
      `Field '${fieldName}' in model '${modelName}' has conflicting security annotations: ${types}. ` +
        'Use only one security annotation per field.',
    );
  }

  // Validate GDPR annotations consistency
  const gdprCategory = getAnnotationValue(annotations, ANNOTATION_TYPES.GDPR_CATEGORY);
  const gdprPurpose = getAnnotationValue(annotations, ANNOTATION_TYPES.GDPR_PURPOSE);
  const gdprRetention = getAnnotationValue(annotations, ANNOTATION_TYPES.GDPR_RETENTION);

  // If any GDPR annotation is present, recommend having all three
  const hasAnyGdpr = gdprCategory || gdprPurpose || gdprRetention;
  if (hasAnyGdpr && securityLevel === 'public') {
    // eslint-disable-next-line no-undef
    console.warn(
      `Warning: Field '${fieldName}' in model '${modelName}' has GDPR annotations but no security annotation. ` +
        'Consider adding @sensitive, @admin-only, or @never-expose for data protection.',
    );
  }

  return true;
}
