/* eslint-disable no-undef */
import {
  ANNOTATION_TYPES,
  determineSecurityLevel,
  extractGdprInfo,
  hasAnnotation,
  parseAnnotations,
  validateAnnotations,
} from './annotation-parser.js';

/**
 * Process DMMF to extract multiple annotation types from comments
 * Supports: @sensitive, @never-expose, @admin-only, @gdpr.category(), @gdpr.purpose(), @gdpr.retention()
 */
export function processSensitiveFields(dmmf) {
  const fieldMetadata = {};

  dmmf.datamodel.models.forEach((model) => {
    const fieldsWithAnnotations = [];
    const sensitiveFields = []; // Backward compatibility
    const neverExposeFields = [];
    const adminOnlyFields = [];

    model.fields.forEach((field) => {
      if (!field.documentation) {
        return; // Skip fields without documentation
      }

      try {
        // Parse all annotations from field documentation
        const annotations = parseAnnotations(field.documentation);

        if (annotations.length === 0) {
          return; // Skip fields without annotations
        }

        // Validate annotations for conflicts and consistency
        validateAnnotations(annotations, field.name, model.name);

        // Determine security level and extract GDPR info
        const securityLevel = determineSecurityLevel(annotations);
        const gdprInfo = extractGdprInfo(annotations);

        // Create comprehensive field metadata
        const fieldMetadata = {
          name: field.name,
          type: field.type,
          isOptional: field.isOptional,
          isList: field.isList,
          securityLevel,
          annotations,
          gdpr: gdprInfo,
          // Legacy support
          isSensitive: hasAnnotation(annotations, ANNOTATION_TYPES.SENSITIVE),
          isNeverExpose: hasAnnotation(annotations, ANNOTATION_TYPES.NEVER_EXPOSE),
          isAdminOnly: hasAnnotation(annotations, ANNOTATION_TYPES.ADMIN_ONLY),
        };

        fieldsWithAnnotations.push(fieldMetadata);

        // Populate security-level specific arrays for backward compatibility
        if (fieldMetadata.isSensitive) {
          sensitiveFields.push(fieldMetadata);
        }
        if (fieldMetadata.isNeverExpose) {
          neverExposeFields.push(fieldMetadata);
        }
        if (fieldMetadata.isAdminOnly) {
          adminOnlyFields.push(fieldMetadata);
        }
      } catch (error) {
        console.error(
          `Error processing field '${field.name}' in model '${model.name}':`,
          error.message,
        );
        throw error; // Re-throw to stop generation on validation errors
      }
    });

    // SECURITY CRITICAL: Always create metadata structure for every model
    // This ensures field-picking helpers can always access fieldsBySecurityLevel
    // Even models without annotations need secure defaults
    const allFieldNames = model.fields.map((f) => f.name);
    const annotatedFieldNames = fieldsWithAnnotations.map((f) => f.name);
    const publicFieldNames = allFieldNames.filter((name) => !annotatedFieldNames.includes(name));

    fieldMetadata[model.name] = {
      modelName: model.name,
      allFields: allFieldNames,

      // Enhanced metadata structure
      fieldsWithAnnotations,
      fieldsBySecurityLevel: {
        // Fields without annotations are considered public (fail-safe default)
        public: [
          ...publicFieldNames,
          ...fieldsWithAnnotations.filter((f) => f.securityLevel === 'public').map((f) => f.name),
        ],
        sensitive: fieldsWithAnnotations
          .filter((f) => f.securityLevel === 'sensitive')
          .map((f) => f.name),
        adminOnly: fieldsWithAnnotations
          .filter((f) => f.securityLevel === 'admin-only')
          .map((f) => f.name),
        neverExpose: fieldsWithAnnotations
          .filter((f) => f.securityLevel === 'never-expose')
          .map((f) => f.name),
      },
      gdprFields: fieldsWithAnnotations.filter(
        (f) => f.gdpr.category || f.gdpr.purpose || f.gdpr.retention,
      ),

      // Legacy compatibility - keep existing structure
      sensitiveFields,
      neverExposeFields,
      adminOnlyFields,
    };
  });

  return fieldMetadata;
}
