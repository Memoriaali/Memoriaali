/* eslint-disable no-undef */
/**
 * Comprehensive unit tests for process-sensitive-fields.js
 *
 * Test Contract:
 * - Tests validate real behavior of DMMF processing and field metadata extraction
 * - Uses actual interfaces and data structures from the module
 * - Tests both happy path and error conditions
 * - Validates all security levels and GDPR information extraction
 * - Achieves comprehensive code coverage through real behavior testing
 */

import { describe, expect, it } from 'vitest';
import { processSensitiveFields } from '../process-sensitive-fields.js';

describe('process-sensitive-fields.js', () => {
  // Store original console methods to restore later
  const originalError = console.error;
  let consoleErrorCalls = [];

  // Simple mock without vitest vi
  function mockConsoleError() {
    consoleErrorCalls = [];
    console.error = (...args) => {
      consoleErrorCalls.push(args.join(' '));
    };
  }

  function restoreConsoleError() {
    console.error = originalError;
    consoleErrorCalls = [];
  }

  describe('processSensitiveFields', () => {
    describe('Contract: Process DMMF models to extract field annotations', () => {
      it('should process model with mixed annotation types correctly', () => {
        const mockDmmf = {
          datamodel: {
            models: [
              {
                name: 'User',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Primary key field',
                  },
                  {
                    name: 'email',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(COMMUNICATION) @gdpr.retention(UNTIL_DELETION_REQUEST)',
                  },
                  {
                    name: 'hashedPassword',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION)',
                  },
                  {
                    name: 'adminNotes',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation:
                      '/// @admin-only @gdpr.category(TECHNICAL) @gdpr.purpose(COMPLIANCE)',
                  },
                ],
              },
            ],
          },
        };

        const result = processSensitiveFields(mockDmmf);

        expect(result).toHaveProperty('User');
        const userMetadata = result.User;

        // Test basic model structure
        expect(userMetadata.modelName).toBe('User');
        expect(userMetadata.allFields).toEqual(['id', 'email', 'hashedPassword', 'adminNotes']);

        // Test fieldsWithAnnotations
        expect(userMetadata.fieldsWithAnnotations).toHaveLength(3);

        // Test email field metadata
        const emailField = userMetadata.fieldsWithAnnotations.find((f) => f.name === 'email');
        expect(emailField).toEqual({
          name: 'email',
          type: 'String',
          isOptional: false,
          isList: false,
          securityLevel: 'sensitive',
          annotations: [
            { type: 'sensitive', value: true, raw: '@sensitive' },
            { type: 'gdpr.category', value: 'PERSONAL', raw: '@gdpr.category(PERSONAL)' },
            { type: 'gdpr.purpose', value: 'COMMUNICATION', raw: '@gdpr.purpose(COMMUNICATION)' },
            {
              type: 'gdpr.retention',
              value: 'UNTIL_DELETION_REQUEST',
              raw: '@gdpr.retention(UNTIL_DELETION_REQUEST)',
            },
          ],
          gdpr: {
            category: 'PERSONAL',
            purpose: 'COMMUNICATION',
            retention: 'UNTIL_DELETION_REQUEST',
          },
          isSensitive: true,
          isNeverExpose: false,
          isAdminOnly: false,
        });

        // Test hashedPassword field metadata
        const passwordField = userMetadata.fieldsWithAnnotations.find(
          (f) => f.name === 'hashedPassword',
        );
        expect(passwordField.securityLevel).toBe('never-expose');
        expect(passwordField.isNeverExpose).toBe(true);
        expect(passwordField.isSensitive).toBe(false);

        // Test adminNotes field metadata
        const adminField = userMetadata.fieldsWithAnnotations.find((f) => f.name === 'adminNotes');
        expect(adminField.securityLevel).toBe('admin-only');
        expect(adminField.isAdminOnly).toBe(true);
        expect(adminField.isSensitive).toBe(false);
      });

      it('should organize fields by security level correctly', () => {
        const mockDmmf = {
          datamodel: {
            models: [
              {
                name: 'Document',
                fields: [
                  {
                    name: 'title',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Document title - no annotations (public)',
                  },
                  {
                    name: 'content',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive Document content',
                  },
                  {
                    name: 'internalNotes',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation: '/// @admin-only Internal processing notes',
                  },
                  {
                    name: 'hash',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @never-expose File integrity hash',
                  },
                ],
              },
            ],
          },
        };

        const result = processSensitiveFields(mockDmmf);
        const documentMetadata = result.Document;

        expect(documentMetadata.fieldsBySecurityLevel).toEqual({
          public: ['title'], // Unannotated fields are public by default
          sensitive: ['content'],
          adminOnly: ['internalNotes'],
          neverExpose: ['hash'],
        });
      });

      it('should handle models with no annotations', () => {
        const mockDmmf = {
          datamodel: {
            models: [
              {
                name: 'SimpleModel',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Simple ID field',
                  },
                  {
                    name: 'name',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                  },
                ],
              },
            ],
          },
        };

        const result = processSensitiveFields(mockDmmf);

        // Model metadata is always created for security consistency
        expect(result).toHaveProperty('SimpleModel');
        expect(result.SimpleModel.allFields).toEqual(['id', 'name']);
        expect(result.SimpleModel.fieldsWithAnnotations).toEqual([]);
        expect(result.SimpleModel.fieldsBySecurityLevel.public).toEqual(['id', 'name']);
      });

      it('should handle fields without documentation', () => {
        const mockDmmf = {
          datamodel: {
            models: [
              {
                name: 'MixedModel',
                fields: [
                  {
                    name: 'regularField',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    // No documentation property
                  },
                  {
                    name: 'annotatedField',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive Sensitive field',
                  },
                ],
              },
            ],
          },
        };

        const result = processSensitiveFields(mockDmmf);
        const mixedMetadata = result.MixedModel;

        expect(mixedMetadata.fieldsWithAnnotations).toHaveLength(1);
        expect(mixedMetadata.fieldsWithAnnotations[0].name).toBe('annotatedField');
        expect(mixedMetadata.allFields).toEqual(['regularField', 'annotatedField']);
      });

      it('should extract GDPR fields correctly', () => {
        const mockDmmf = {
          datamodel: {
            models: [
              {
                name: 'GdprModel',
                fields: [
                  {
                    name: 'personalData',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(COMMUNICATION)',
                  },
                  {
                    name: 'technicalData',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @admin-only @gdpr.category(TECHNICAL)',
                  },
                  {
                    name: 'nonGdprField',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive No GDPR annotations',
                  },
                ],
              },
            ],
          },
        };

        const result = processSensitiveFields(mockDmmf);
        const gdprMetadata = result.GdprModel;

        expect(gdprMetadata.gdprFields).toHaveLength(2);

        const personalDataField = gdprMetadata.gdprFields.find((f) => f.name === 'personalData');
        expect(personalDataField.gdpr).toEqual({
          category: 'PERSONAL',
          purpose: 'COMMUNICATION',
          retention: null,
        });

        const technicalDataField = gdprMetadata.gdprFields.find((f) => f.name === 'technicalData');
        expect(technicalDataField.gdpr).toEqual({
          category: 'TECHNICAL',
          purpose: null,
          retention: null,
        });
      });

      it('should populate legacy compatibility arrays correctly', () => {
        const mockDmmf = {
          datamodel: {
            models: [
              {
                name: 'LegacyModel',
                fields: [
                  {
                    name: 'sensitive1',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive First sensitive field',
                  },
                  {
                    name: 'sensitive2',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive Second sensitive field',
                  },
                  {
                    name: 'neverExpose1',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @never-expose Secret field',
                  },
                  {
                    name: 'admin1',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @admin-only Admin field',
                  },
                ],
              },
            ],
          },
        };

        const result = processSensitiveFields(mockDmmf);
        const legacyMetadata = result.LegacyModel;

        // Test legacy arrays
        expect(legacyMetadata.sensitiveFields).toHaveLength(2);
        expect(legacyMetadata.sensitiveFields.map((f) => f.name)).toEqual([
          'sensitive1',
          'sensitive2',
        ]);

        expect(legacyMetadata.neverExposeFields).toHaveLength(1);
        expect(legacyMetadata.neverExposeFields[0].name).toBe('neverExpose1');

        expect(legacyMetadata.adminOnlyFields).toHaveLength(1);
        expect(legacyMetadata.adminOnlyFields[0].name).toBe('admin1');
      });

      it('should handle optional and list fields correctly', () => {
        const mockDmmf = {
          datamodel: {
            models: [
              {
                name: 'TypeModel',
                fields: [
                  {
                    name: 'optionalField',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation: '/// @sensitive Optional field',
                  },
                  {
                    name: 'listField',
                    type: 'String',
                    isOptional: false,
                    isList: true,
                    documentation: '/// @admin-only List field',
                  },
                  {
                    name: 'optionalListField',
                    type: 'String',
                    isOptional: true,
                    isList: true,
                    documentation: '/// @never-expose Optional list field',
                  },
                ],
              },
            ],
          },
        };

        const result = processSensitiveFields(mockDmmf);
        const typeMetadata = result.TypeModel;

        const optionalField = typeMetadata.fieldsWithAnnotations.find(
          (f) => f.name === 'optionalField',
        );
        expect(optionalField.isOptional).toBe(true);
        expect(optionalField.isList).toBe(false);

        const listField = typeMetadata.fieldsWithAnnotations.find((f) => f.name === 'listField');
        expect(listField.isOptional).toBe(false);
        expect(listField.isList).toBe(true);

        const optionalListField = typeMetadata.fieldsWithAnnotations.find(
          (f) => f.name === 'optionalListField',
        );
        expect(optionalListField.isOptional).toBe(true);
        expect(optionalListField.isList).toBe(true);
      });
    });

    describe('Contract: Handle error conditions and validation failures', () => {
      it('should handle invalid GDPR annotations and propagate error', () => {
        const mockDmmf = {
          datamodel: {
            models: [
              {
                name: 'ErrorModel',
                fields: [
                  {
                    name: 'invalidField',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive @gdpr.category(INVALID_CATEGORY)',
                  },
                ],
              },
            ],
          },
        };

        mockConsoleError();

        expect(() => processSensitiveFields(mockDmmf)).toThrow(
          /Invalid GDPR category 'INVALID_CATEGORY'/,
        );

        restoreConsoleError();
      });

      it('should handle conflicting security annotations and propagate error', () => {
        const mockDmmf = {
          datamodel: {
            models: [
              {
                name: 'ConflictModel',
                fields: [
                  {
                    name: 'conflictField',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive @admin-only Conflicting annotations',
                  },
                ],
              },
            ],
          },
        };

        mockConsoleError();

        expect(() => processSensitiveFields(mockDmmf)).toThrow(
          /has conflicting security annotations: sensitive, admin-only/,
        );

        restoreConsoleError();
      });

      it('should log error with field and model context before re-throwing', () => {
        const mockDmmf = {
          datamodel: {
            models: [
              {
                name: 'TestModel',
                fields: [
                  {
                    name: 'testField',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @gdpr.purpose(INVALID_PURPOSE)',
                  },
                ],
              },
            ],
          },
        };

        mockConsoleError();

        expect(() => processSensitiveFields(mockDmmf)).toThrow();

        expect(consoleErrorCalls).toHaveLength(1);
        expect(consoleErrorCalls[0]).toContain(
          "Error processing field 'testField' in model 'TestModel':",
        );

        restoreConsoleError();
      });

      it('should handle empty DMMF gracefully', () => {
        const emptyDmmf = {
          datamodel: {
            models: [],
          },
        };

        const result = processSensitiveFields(emptyDmmf);
        expect(result).toEqual({});
      });

      it('should handle models with no fields gracefully', () => {
        const mockDmmf = {
          datamodel: {
            models: [
              {
                name: 'EmptyModel',
                fields: [],
              },
            ],
          },
        };

        const result = processSensitiveFields(mockDmmf);
        // Model metadata is always created for consistency
        expect(result).toHaveProperty('EmptyModel');
        expect(result.EmptyModel.allFields).toEqual([]);
        expect(result.EmptyModel.fieldsWithAnnotations).toEqual([]);
      });
    });

    describe('Contract: Process multiple models correctly', () => {
      it('should process multiple models independently', () => {
        const mockDmmf = {
          datamodel: {
            models: [
              {
                name: 'User',
                fields: [
                  {
                    name: 'email',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive User email',
                  },
                ],
              },
              {
                name: 'Document',
                fields: [
                  {
                    name: 'content',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @admin-only Document content',
                  },
                ],
              },
            ],
          },
        };

        const result = processSensitiveFields(mockDmmf);

        expect(result).toHaveProperty('User');
        expect(result).toHaveProperty('Document');

        expect(result.User.fieldsWithAnnotations).toHaveLength(1);
        expect(result.User.fieldsWithAnnotations[0].name).toBe('email');
        expect(result.User.fieldsWithAnnotations[0].securityLevel).toBe('sensitive');

        expect(result.Document.fieldsWithAnnotations).toHaveLength(1);
        expect(result.Document.fieldsWithAnnotations[0].name).toBe('content');
        expect(result.Document.fieldsWithAnnotations[0].securityLevel).toBe('admin-only');
      });

      it('should skip models without annotated fields', () => {
        const mockDmmf = {
          datamodel: {
            models: [
              {
                name: 'AnnotatedModel',
                fields: [
                  {
                    name: 'sensitiveField',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// @sensitive Annotated field',
                  },
                ],
              },
              {
                name: 'PlainModel',
                fields: [
                  {
                    name: 'plainField',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// No annotations here',
                  },
                ],
              },
            ],
          },
        };

        const result = processSensitiveFields(mockDmmf);

        // Both models should be in the result for consistency
        expect(result).toHaveProperty('AnnotatedModel');
        expect(result).toHaveProperty('PlainModel');
        // PlainModel has no annotations, so all fields are public
        expect(result.PlainModel.fieldsWithAnnotations).toEqual([]);
        expect(result.PlainModel.fieldsBySecurityLevel.public).toEqual(['plainField']);
      });
    });

    describe('Contract: Real-world archival metadata scenarios', () => {
      it('should handle comprehensive archival document field processing', () => {
        const mockDmmf = {
          datamodel: {
            models: [
              {
                name: 'ArchivalDocument',
                fields: [
                  {
                    name: 'id',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Document identifier',
                  },
                  {
                    name: 'title',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Document title - public information',
                  },
                  {
                    name: 'personalNames',
                    type: 'Json',
                    isOptional: true,
                    isList: false,
                    documentation:
                      '/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(ARCHIVAL) @gdpr.retention(INDEFINITE)',
                  },
                  {
                    name: 'internalProcessingNotes',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation:
                      '/// @admin-only @gdpr.category(TECHNICAL) @gdpr.purpose(COMPLIANCE) @gdpr.retention(5_YEARS)',
                  },
                  {
                    name: 'originalUploadHash',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation:
                      '/// @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(SECURITY) @gdpr.retention(INDEFINITE)',
                  },
                  {
                    name: 'researchPermissions',
                    type: 'Json',
                    isOptional: true,
                    isList: false,
                    documentation:
                      '/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(RESEARCH) @gdpr.retention(10_YEARS)',
                  },
                ],
              },
            ],
          },
        };

        const result = processSensitiveFields(mockDmmf);
        const archivalMetadata = result.ArchivalDocument;

        // Verify all annotated fields are processed
        expect(archivalMetadata.fieldsWithAnnotations).toHaveLength(4);
        expect(archivalMetadata.allFields).toHaveLength(6);

        // Verify security level organization
        expect(archivalMetadata.fieldsBySecurityLevel).toEqual({
          public: ['id', 'title'], // Unannotated fields are public
          sensitive: ['personalNames', 'researchPermissions'],
          adminOnly: ['internalProcessingNotes'],
          neverExpose: ['originalUploadHash'],
        });

        // Verify GDPR field classification
        expect(archivalMetadata.gdprFields).toHaveLength(4);
        const gdprCategories = archivalMetadata.gdprFields.map((f) => f.gdpr.category);
        expect(gdprCategories).toContain('PERSONAL');
        expect(gdprCategories).toContain('TECHNICAL');

        // Verify legacy compatibility
        expect(archivalMetadata.sensitiveFields).toHaveLength(2);
        expect(archivalMetadata.adminOnlyFields).toHaveLength(1);
        expect(archivalMetadata.neverExposeFields).toHaveLength(1);
      });

      it('should handle Finnish cultural heritage data privacy requirements', () => {
        const mockDmmf = {
          datamodel: {
            models: [
              {
                name: 'CulturalHeritageItem',
                fields: [
                  {
                    name: 'culturalDescription',
                    type: 'String',
                    isOptional: false,
                    isList: false,
                    documentation: '/// Public cultural information',
                  },
                  {
                    name: 'donorPersonalInfo',
                    type: 'Json',
                    isOptional: true,
                    isList: false,
                    documentation:
                      '/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(ARCHIVAL) @gdpr.retention(UNTIL_DELETION_REQUEST)',
                  },
                  {
                    name: 'restrictedCulturalContext',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation:
                      '/// @admin-only @gdpr.category(SENSITIVE_PERSONAL) @gdpr.purpose(RESEARCH) @gdpr.retention(INDEFINITE)',
                  },
                  {
                    name: 'locationCoordinates',
                    type: 'String',
                    isOptional: true,
                    isList: false,
                    documentation:
                      '/// @sensitive @gdpr.category(LOCATION) @gdpr.purpose(RESEARCH) @gdpr.retention(10_YEARS)',
                  },
                ],
              },
            ],
          },
        };

        const result = processSensitiveFields(mockDmmf);
        const heritageMetadata = result.CulturalHeritageItem;

        // Verify sensitive data categorization
        const sensitivePersonal = heritageMetadata.gdprFields.find(
          (f) => f.gdpr.category === 'SENSITIVE_PERSONAL',
        );
        expect(sensitivePersonal.name).toBe('restrictedCulturalContext');
        expect(sensitivePersonal.securityLevel).toBe('admin-only');

        const locationData = heritageMetadata.gdprFields.find(
          (f) => f.gdpr.category === 'LOCATION',
        );
        expect(locationData.name).toBe('locationCoordinates');
        expect(locationData.securityLevel).toBe('sensitive');

        // Verify retention policies for cultural heritage
        const indefiniteRetention = heritageMetadata.gdprFields.filter(
          (f) => f.gdpr.retention === 'INDEFINITE',
        );
        expect(indefiniteRetention).toHaveLength(1);

        const deletionRequestRetention = heritageMetadata.gdprFields.filter(
          (f) => f.gdpr.retention === 'UNTIL_DELETION_REQUEST',
        );
        expect(deletionRequestRetention).toHaveLength(1);
      });
    });
  });
});
