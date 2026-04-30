import fs from 'fs';
import path from 'path';
import { GENERATOR_NAME } from '../sensitive-fields-generator.js';

/**
 * Generate TypeScript types for fields with security annotations
 * Supports multiple annotation types while maintaining backward compatibility
 */
export async function generateSensitiveFieldsTypes(outputDir, fieldMetadataMap) {
  // Generate types for each model
  const typeDefinitions = Object.entries(fieldMetadataMap)
    .map(([modelName, metadata]) => {
      // Extract field names by security level
      const sensitiveFieldNames = metadata.sensitiveFields.map((f) => `'${f.name}'`);
      const neverExposeFieldNames = metadata.neverExposeFields.map((f) => `'${f.name}'`);
      const adminOnlyFieldNames = metadata.adminOnlyFields.map((f) => `'${f.name}'`);
      const gdprFieldNames = metadata.gdprFields.map((f) => `'${f.name}'`);

      return `
// ${modelName} field annotations
export type ${modelName}SensitiveFields = ${sensitiveFieldNames.length > 0 ? sensitiveFieldNames.join(' | ') : 'never'};
export type ${modelName}NeverExposeFields = ${neverExposeFieldNames.length > 0 ? neverExposeFieldNames.join(' | ') : 'never'};
export type ${modelName}AdminOnlyFields = ${adminOnlyFieldNames.length > 0 ? adminOnlyFieldNames.join(' | ') : 'never'};
export type ${modelName}GdprFields = ${gdprFieldNames.length > 0 ? gdprFieldNames.join(' | ') : 'never'};

// ${modelName} field arrays
export const ${modelName.toLowerCase()}SensitiveFields: ${modelName}SensitiveFields[] = [
  ${sensitiveFieldNames.join(',\n  ')}${sensitiveFieldNames.length > 0 ? ',' : ''}
];
export const ${modelName.toLowerCase()}NeverExposeFields: ${modelName}NeverExposeFields[] = [
  ${neverExposeFieldNames.join(',\n  ')}${neverExposeFieldNames.length > 0 ? ',' : ''}
];
export const ${modelName.toLowerCase()}AdminOnlyFields: ${modelName}AdminOnlyFields[] = [
  ${adminOnlyFieldNames.join(',\n  ')}${adminOnlyFieldNames.length > 0 ? ',' : ''}
];
export const ${modelName.toLowerCase()}GdprFields: ${modelName}GdprFields[] = [
  ${gdprFieldNames.join(',\n  ')}${gdprFieldNames.length > 0 ? ',' : ''}
];

// ${modelName} comprehensive field metadata
export interface ${modelName}FieldMetadata {
  name: string;
  type: string;
  isOptional: boolean;
  isList: boolean;
  securityLevel: 'public' | 'sensitive' | 'admin-only' | 'never-expose';
  annotations: Array<{
    type: string;
    value: any;
    raw: string;
  }>;
  gdpr: {
    category?: string;
    purpose?: string;
    retention?: string;
  };
  isSensitive: boolean;
  isNeverExpose: boolean;
  isAdminOnly: boolean;
}

export const ${modelName.toLowerCase()}FieldsMetadata: ${modelName}FieldMetadata[] = ${JSON.stringify(
        metadata.fieldsWithAnnotations.map((field) => ({
          ...field,
          isOptional: field.isOptional ?? false, // Ensure isOptional is always present
        })),
        (_key, value) => {
          if (value === null) return undefined;
          return value;
        },
        2,
      ).replace(/"undefined"/g, 'undefined')};`;
    })
    .join('\n\n');

  // Generate master types and constants
  const masterTypes = `
// Security level enums
export type SecurityLevel = 'public' | 'sensitive' | 'admin-only' | 'never-expose';

// GDPR constants
export const GDPR_CATEGORIES = {
  PERSONAL: 'PERSONAL',
  SENSITIVE_PERSONAL: 'SENSITIVE_PERSONAL',
  BIOMETRIC: 'BIOMETRIC',
  HEALTH: 'HEALTH',
  FINANCIAL: 'FINANCIAL',
  LOCATION: 'LOCATION',
  BEHAVIORAL: 'BEHAVIORAL',
  TECHNICAL: 'TECHNICAL'
} as const;

export const GDPR_PURPOSES = {
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  COMMUNICATION: 'COMMUNICATION',
  ARCHIVAL: 'ARCHIVAL',
  RESEARCH: 'RESEARCH',
  ANALYTICS: 'ANALYTICS',
  COMPLIANCE: 'COMPLIANCE',
  SECURITY: 'SECURITY'
} as const;

export const GDPR_RETENTION_PERIODS = {
  INDEFINITE: 'INDEFINITE',
  '1_YEAR': '1_YEAR',
  '2_YEARS': '2_YEARS',
  '5_YEARS': '5_YEARS',
  '10_YEARS': '10_YEARS',
  'UNTIL_DELETION_REQUEST': 'UNTIL_DELETION_REQUEST'
} as const;

// Master type for all sensitive fields across models (legacy compatibility)
export type AllSensitiveFields = {
${Object.entries(fieldMetadataMap)
  .map(([modelName]) => `  ${modelName}: ${modelName}SensitiveFields[];`)
  .join('\n')}
};

export const allSensitiveFields: AllSensitiveFields = {
${Object.entries(fieldMetadataMap)
  .map(([modelName]) => `  ${modelName}: ${modelName.toLowerCase()}SensitiveFields,`)
  .join('\n')}
};

// Enhanced field metadata by security level
export type AllFieldsBySecurityLevel = {
${Object.entries(fieldMetadataMap)
  .map(
    ([modelName]) => `  ${modelName}: {
    public: string[];
    sensitive: string[];
    adminOnly: string[];
    neverExpose: string[];
  };`,
  )
  .join('\n')}
  [key: string]: {
    public: string[];
    sensitive: string[];
    adminOnly: string[];
    neverExpose: string[];
  };
};

export const allFieldsBySecurityLevel: AllFieldsBySecurityLevel = {
${Object.entries(fieldMetadataMap)
  .map(
    ([modelName, metadata]) => `  ${modelName}: {
    public: [${metadata.fieldsBySecurityLevel.public.map((fieldName) => `'${fieldName}'`).join(', ')}],
    sensitive: [${metadata.fieldsBySecurityLevel.sensitive.map((fieldName) => `'${fieldName}'`).join(', ')}],
    adminOnly: [${metadata.fieldsBySecurityLevel.adminOnly.map((fieldName) => `'${fieldName}'`).join(', ')}],
    neverExpose: [${metadata.fieldsBySecurityLevel.neverExpose.map((fieldName) => `'${fieldName}'`).join(', ')}]
  }`,
  )
  .join(',\n')}
};
`;

  const content = `/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
/* eslint-disable @typescript-eslint/strict-boolean-expressions */
// Generated by ${GENERATOR_NAME}
// DO NOT EDIT - This file is automatically generated

${typeDefinitions}

${masterTypes}
`;

  fs.writeFileSync(path.join(outputDir, 'sensitive-fields.ts'), content);
}
