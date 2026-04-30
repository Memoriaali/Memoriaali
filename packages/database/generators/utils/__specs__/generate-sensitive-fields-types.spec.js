/* eslint-disable no-undef */
/**
 * Comprehensive unit tests for generate-sensitive-fields-types.js
 *
 * Test Contract:
 * - Tests validate real behavior of TypeScript type generation
 * - Uses actual field metadata structures and validates generated output
 * - Tests both individual model type generation and master type compilation
 * - Validates error conditions and edge cases
 * - Achieves comprehensive code coverage through real behavior testing
 */

import fs from 'fs';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { generateSensitiveFieldsTypes } from '../generate-sensitive-fields-types.js';

describe('generate-sensitive-fields-types.js', () => {
  let tempDir;
  let outputFile;

  beforeEach(() => {
    // Create temporary directory for test outputs
    tempDir = path.join(process.cwd(), 'temp-test-output');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    outputFile = path.join(tempDir, 'sensitive-fields.ts');
  });

  afterEach(() => {
    // Clean up test files
    if (fs.existsSync(outputFile)) {
      fs.unlinkSync(outputFile);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir, { recursive: true });
    }
  });

  describe('generateSensitiveFieldsTypes', () => {
    describe('Contract: Generate TypeScript types for field metadata', () => {
      it('should generate complete type definitions for single model', async () => {
        const fieldMetadataMap = {
          User: {
            modelName: 'User',
            allFields: ['id', 'email', 'hashedPassword'],
            fieldsWithAnnotations: [
              {
                name: 'email',
                type: 'String',
                isOptional: false,
                isList: false,
                securityLevel: 'sensitive',
                annotations: [
                  { type: 'sensitive', value: true, raw: '@sensitive' },
                  { type: 'gdpr.category', value: 'PERSONAL', raw: '@gdpr.category(PERSONAL)' },
                ],
                gdpr: { category: 'PERSONAL', purpose: null, retention: null },
                isSensitive: true,
                isNeverExpose: false,
                isAdminOnly: false,
              },
              {
                name: 'hashedPassword',
                type: 'String',
                isOptional: false,
                isList: false,
                securityLevel: 'never-expose',
                annotations: [{ type: 'never-expose', value: true, raw: '@never-expose' }],
                gdpr: { category: null, purpose: null, retention: null },
                isSensitive: false,
                isNeverExpose: true,
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: [{ name: 'email' }],
              adminOnly: [],
              neverExpose: [{ name: 'hashedPassword' }],
            },
            sensitiveFields: [{ name: 'email' }],
            neverExposeFields: [{ name: 'hashedPassword' }],
            adminOnlyFields: [],
            gdprFields: [
              {
                name: 'email',
                gdpr: { category: 'PERSONAL', purpose: null, retention: null },
              },
            ],
          },
        };

        await generateSensitiveFieldsTypes(tempDir, fieldMetadataMap);

        expect(fs.existsSync(outputFile)).toBe(true);
        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test type definitions
        expect(generatedContent).toContain("export type UserSensitiveFields = 'email';");
        expect(generatedContent).toContain("export type UserNeverExposeFields = 'hashedPassword';");
        expect(generatedContent).toContain('export type UserAdminOnlyFields = never;');
        expect(generatedContent).toContain("export type UserGdprFields = 'email';");

        // Test array exports
        expect(generatedContent).toContain(
          'export const userSensitiveFields: UserSensitiveFields[] = [',
        );
        expect(generatedContent).toContain("  'email'");
        expect(generatedContent).toContain(
          'export const userNeverExposeFields: UserNeverExposeFields[] = [',
        );
        expect(generatedContent).toContain("  'hashedPassword'");

        // Test interface definition
        expect(generatedContent).toContain('export interface UserFieldMetadata {');
        expect(generatedContent).toContain('name: string;');
        expect(generatedContent).toContain(
          "securityLevel: 'public' | 'sensitive' | 'admin-only' | 'never-expose';",
        );

        // Test metadata export
        expect(generatedContent).toContain('export const userFieldsMetadata: UserFieldMetadata[]');
      });

      it('should handle model with no fields of specific security levels', async () => {
        const fieldMetadataMap = {
          SimpleModel: {
            modelName: 'SimpleModel',
            allFields: ['id', 'title'],
            fieldsWithAnnotations: [],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: [],
              adminOnly: [],
              neverExpose: [],
            },
            sensitiveFields: [],
            neverExposeFields: [],
            adminOnlyFields: [],
            gdprFields: [],
          },
        };

        await generateSensitiveFieldsTypes(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test 'never' types for empty arrays
        expect(generatedContent).toContain('export type SimpleModelSensitiveFields = never;');
        expect(generatedContent).toContain('export type SimpleModelNeverExposeFields = never;');
        expect(generatedContent).toContain('export type SimpleModelAdminOnlyFields = never;');
        expect(generatedContent).toContain('export type SimpleModelGdprFields = never;');

        // Test empty arrays
        expect(generatedContent).toContain(
          'export const simplemodelSensitiveFields: SimpleModelSensitiveFields[] = [',
        );
        expect(generatedContent).toContain('];');
      });

      it('should generate multiple model types correctly', async () => {
        const fieldMetadataMap = {
          User: {
            modelName: 'User',
            allFields: ['id', 'email'],
            fieldsWithAnnotations: [
              {
                name: 'email',
                type: 'String',
                isOptional: false,
                isList: false,
                securityLevel: 'sensitive',
                annotations: [{ type: 'sensitive', value: true, raw: '@sensitive' }],
                gdpr: { category: null, purpose: null, retention: null },
                isSensitive: true,
                isNeverExpose: false,
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: [{ name: 'email' }],
              adminOnly: [],
              neverExpose: [],
            },
            sensitiveFields: [{ name: 'email' }],
            neverExposeFields: [],
            adminOnlyFields: [],
            gdprFields: [],
          },
          Document: {
            modelName: 'Document',
            allFields: ['id', 'content'],
            fieldsWithAnnotations: [
              {
                name: 'content',
                type: 'String',
                isOptional: false,
                isList: false,
                securityLevel: 'admin-only',
                annotations: [{ type: 'admin-only', value: true, raw: '@admin-only' }],
                gdpr: { category: null, purpose: null, retention: null },
                isSensitive: false,
                isNeverExpose: false,
                isAdminOnly: true,
              },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: [],
              adminOnly: [{ name: 'content' }],
              neverExpose: [],
            },
            sensitiveFields: [],
            neverExposeFields: [],
            adminOnlyFields: [{ name: 'content' }],
            gdprFields: [],
          },
        };

        await generateSensitiveFieldsTypes(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test both models are present
        expect(generatedContent).toContain('// User field annotations');
        expect(generatedContent).toContain('// Document field annotations');

        expect(generatedContent).toContain("export type UserSensitiveFields = 'email';");
        expect(generatedContent).toContain("export type DocumentAdminOnlyFields = 'content';");

        // Test master types include both models
        expect(generatedContent).toContain('export type AllSensitiveFields = {');
        expect(generatedContent).toContain('User: UserSensitiveFields[];');
        expect(generatedContent).toContain('Document: DocumentSensitiveFields[];');

        expect(generatedContent).toContain(
          'export const allSensitiveFields: AllSensitiveFields = {',
        );
        expect(generatedContent).toContain('User: userSensitiveFields,');
        expect(generatedContent).toContain('Document: documentSensitiveFields,');
      });

      it('should generate GDPR constants and master types correctly', async () => {
        const fieldMetadataMap = {
          TestModel: {
            modelName: 'TestModel',
            allFields: ['field1'],
            fieldsWithAnnotations: [
              {
                name: 'field1',
                type: 'String',
                isOptional: false,
                isList: false,
                securityLevel: 'sensitive',
                annotations: [],
                gdpr: { category: null, purpose: null, retention: null },
                isSensitive: true,
                isNeverExpose: false,
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: [{ name: 'field1' }],
              adminOnly: [],
              neverExpose: [],
            },
            sensitiveFields: [{ name: 'field1' }],
            neverExposeFields: [],
            adminOnlyFields: [],
            gdprFields: [],
          },
        };

        await generateSensitiveFieldsTypes(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test security level enum
        expect(generatedContent).toContain(
          "export type SecurityLevel = 'public' | 'sensitive' | 'admin-only' | 'never-expose';",
        );

        // Test GDPR constants
        expect(generatedContent).toContain('export const GDPR_CATEGORIES = {');
        expect(generatedContent).toContain("PERSONAL: 'PERSONAL',");
        expect(generatedContent).toContain("SENSITIVE_PERSONAL: 'SENSITIVE_PERSONAL',");
        expect(generatedContent).toContain("HEALTH: 'HEALTH',");

        expect(generatedContent).toContain('export const GDPR_PURPOSES = {');
        expect(generatedContent).toContain("AUTHENTICATION: 'AUTHENTICATION',");
        expect(generatedContent).toContain("COMMUNICATION: 'COMMUNICATION',");

        expect(generatedContent).toContain('export const GDPR_RETENTION_PERIODS = {');
        expect(generatedContent).toContain("INDEFINITE: 'INDEFINITE',");
        expect(generatedContent).toContain("UNTIL_DELETION_REQUEST: 'UNTIL_DELETION_REQUEST',");

        // Test enhanced field metadata by security level
        expect(generatedContent).toContain('export type AllFieldsBySecurityLevel = {');
        expect(generatedContent).toContain('TestModel: {');
        expect(generatedContent).toContain('public: string[];');
        expect(generatedContent).toContain('sensitive: string[];');
        expect(generatedContent).toContain('adminOnly: string[];');
        expect(generatedContent).toContain('neverExpose: string[];');

        expect(generatedContent).toContain(
          'export const allFieldsBySecurityLevel: AllFieldsBySecurityLevel = {',
        );
      });

      it('should handle complex GDPR field metadata correctly', async () => {
        const fieldMetadataMap = {
          ComplexModel: {
            modelName: 'ComplexModel',
            allFields: ['personal', 'technical', 'health'],
            fieldsWithAnnotations: [
              {
                name: 'personal',
                type: 'String',
                isOptional: false,
                isList: false,
                securityLevel: 'sensitive',
                annotations: [
                  { type: 'sensitive', value: true, raw: '@sensitive' },
                  { type: 'gdpr.category', value: 'PERSONAL', raw: '@gdpr.category(PERSONAL)' },
                  {
                    type: 'gdpr.purpose',
                    value: 'COMMUNICATION',
                    raw: '@gdpr.purpose(COMMUNICATION)',
                  },
                  { type: 'gdpr.retention', value: '1_YEAR', raw: '@gdpr.retention(1_YEAR)' },
                ],
                gdpr: {
                  category: 'PERSONAL',
                  purpose: 'COMMUNICATION',
                  retention: '1_YEAR',
                },
                isSensitive: true,
                isNeverExpose: false,
                isAdminOnly: false,
              },
              {
                name: 'technical',
                type: 'String',
                isOptional: true,
                isList: false,
                securityLevel: 'admin-only',
                annotations: [
                  { type: 'admin-only', value: true, raw: '@admin-only' },
                  { type: 'gdpr.category', value: 'TECHNICAL', raw: '@gdpr.category(TECHNICAL)' },
                ],
                gdpr: {
                  category: 'TECHNICAL',
                  purpose: null,
                  retention: null,
                },
                isSensitive: false,
                isNeverExpose: false,
                isAdminOnly: true,
              },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: [{ name: 'personal' }],
              adminOnly: [{ name: 'technical' }],
              neverExpose: [],
            },
            sensitiveFields: [{ name: 'personal' }],
            neverExposeFields: [],
            adminOnlyFields: [{ name: 'technical' }],
            gdprFields: [
              {
                name: 'personal',
                gdpr: { category: 'PERSONAL', purpose: 'COMMUNICATION', retention: '1_YEAR' },
              },
              {
                name: 'technical',
                gdpr: { category: 'TECHNICAL', purpose: null, retention: null },
              },
            ],
          },
        };

        await generateSensitiveFieldsTypes(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test GDPR field types
        expect(generatedContent).toContain(
          "export type ComplexModelGdprFields = 'personal' | 'technical';",
        );
        expect(generatedContent).toContain(
          'export const complexmodelGdprFields: ComplexModelGdprFields[] = [',
        );
        expect(generatedContent).toContain("'personal'");
        expect(generatedContent).toContain("'technical'");

        // Test comprehensive field metadata includes GDPR info
        expect(generatedContent).toContain(
          'export const complexmodelFieldsMetadata: ComplexModelFieldMetadata[]',
        );

        // The JSON.stringify should preserve the full metadata structure
        expect(generatedContent).toContain('"gdpr"');
        expect(generatedContent).toContain('"category":"PERSONAL"');
        expect(generatedContent).toContain('"purpose":"COMMUNICATION"');
        expect(generatedContent).toContain('"retention":"1_YEAR"');
      });
    });

    describe('Contract: Handle edge cases and validation', () => {
      it('should handle empty field metadata map', async () => {
        const emptyFieldMetadataMap = {};

        await generateSensitiveFieldsTypes(tempDir, emptyFieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Should still generate base types and constants
        expect(generatedContent).toContain('export type SecurityLevel');
        expect(generatedContent).toContain('export const GDPR_CATEGORIES');

        // Master types should be empty
        expect(generatedContent).toContain('export type AllSensitiveFields = {');
        expect(generatedContent).toContain(
          'export const allSensitiveFields: AllSensitiveFields = {',
        );
      });

      it('should handle model with all empty field arrays', async () => {
        const fieldMetadataMap = {
          EmptyModel: {
            modelName: 'EmptyModel',
            allFields: ['id', 'name'],
            fieldsWithAnnotations: [],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: [],
              adminOnly: [],
              neverExpose: [],
            },
            sensitiveFields: [],
            neverExposeFields: [],
            adminOnlyFields: [],
            gdprFields: [],
          },
        };

        await generateSensitiveFieldsTypes(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // All field types should be 'never'
        expect(generatedContent).toContain('export type EmptyModelSensitiveFields = never;');
        expect(generatedContent).toContain('export type EmptyModelNeverExposeFields = never;');
        expect(generatedContent).toContain('export type EmptyModelAdminOnlyFields = never;');
        expect(generatedContent).toContain('export type EmptyModelGdprFields = never;');

        // Arrays should be empty but well-formed
        expect(generatedContent).toContain(
          'export const emptymodelSensitiveFields: EmptyModelSensitiveFields[] = [',
        );
        expect(generatedContent).toContain('];');
      });

      it('should handle field names with special characters safely', async () => {
        const fieldMetadataMap = {
          SpecialModel: {
            modelName: 'SpecialModel',
            allFields: ['field_with_underscores', 'field-with-dashes'],
            fieldsWithAnnotations: [
              {
                name: 'field_with_underscores',
                type: 'String',
                isOptional: false,
                isList: false,
                securityLevel: 'sensitive',
                annotations: [],
                gdpr: { category: null, purpose: null, retention: null },
                isSensitive: true,
                isNeverExpose: false,
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: [{ name: 'field_with_underscores' }],
              adminOnly: [],
              neverExpose: [],
            },
            sensitiveFields: [{ name: 'field_with_underscores' }],
            neverExposeFields: [],
            adminOnlyFields: [],
            gdprFields: [],
          },
        };

        await generateSensitiveFieldsTypes(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Field names should be properly quoted in types
        expect(generatedContent).toContain(
          "export type SpecialModelSensitiveFields = 'field_with_underscores';",
        );
        expect(generatedContent).toContain("'field_with_underscores'");
      });

      it('should write file to correct output directory', async () => {
        const customOutputDir = path.join(process.cwd(), 'custom-temp-output');
        const customOutputFile = path.join(customOutputDir, 'sensitive-fields.ts');

        try {
          if (!fs.existsSync(customOutputDir)) {
            fs.mkdirSync(customOutputDir, { recursive: true });
          }

          const fieldMetadataMap = {
            TestModel: {
              modelName: 'TestModel',
              allFields: ['test'],
              fieldsWithAnnotations: [],
              fieldsBySecurityLevel: { public: [], sensitive: [], adminOnly: [], neverExpose: [] },
              sensitiveFields: [],
              neverExposeFields: [],
              adminOnlyFields: [],
              gdprFields: [],
            },
          };

          await generateSensitiveFieldsTypes(customOutputDir, fieldMetadataMap);

          expect(fs.existsSync(customOutputFile)).toBe(true);

          const generatedContent = fs.readFileSync(customOutputFile, 'utf-8');
          expect(generatedContent).toContain('// Generated by');
          expect(generatedContent).toContain(
            '// DO NOT EDIT - This file is automatically generated',
          );
        } finally {
          // Clean up custom directory
          if (fs.existsSync(customOutputFile)) {
            fs.unlinkSync(customOutputFile);
          }
          if (fs.existsSync(customOutputDir)) {
            fs.rmdirSync(customOutputDir);
          }
        }
      });

      it('should include correct generator attribution', async () => {
        const fieldMetadataMap = {
          TestModel: {
            modelName: 'TestModel',
            allFields: ['test'],
            fieldsWithAnnotations: [],
            fieldsBySecurityLevel: { public: [], sensitive: [], adminOnly: [], neverExpose: [] },
            sensitiveFields: [],
            neverExposeFields: [],
            adminOnlyFields: [],
            gdprFields: [],
          },
        };

        await generateSensitiveFieldsTypes(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test header attribution
        expect(generatedContent).toMatch(/^\/\/ Generated by .+/);
        expect(generatedContent).toContain('// DO NOT EDIT - This file is automatically generated');
      });
    });

    describe('Contract: Real-world generation scenarios', () => {
      it('should generate types for comprehensive archival system model', async () => {
        const fieldMetadataMap = {
          ArchivalDocument: {
            modelName: 'ArchivalDocument',
            allFields: ['id', 'title', 'personalNames', 'adminNotes', 'hash', 'metadata'],
            fieldsWithAnnotations: [
              {
                name: 'personalNames',
                type: 'Json',
                isOptional: true,
                isList: false,
                securityLevel: 'sensitive',
                annotations: [
                  { type: 'sensitive', value: true, raw: '@sensitive' },
                  { type: 'gdpr.category', value: 'PERSONAL', raw: '@gdpr.category(PERSONAL)' },
                  { type: 'gdpr.purpose', value: 'ARCHIVAL', raw: '@gdpr.purpose(ARCHIVAL)' },
                  {
                    type: 'gdpr.retention',
                    value: 'INDEFINITE',
                    raw: '@gdpr.retention(INDEFINITE)',
                  },
                ],
                gdpr: { category: 'PERSONAL', purpose: 'ARCHIVAL', retention: 'INDEFINITE' },
                isSensitive: true,
                isNeverExpose: false,
                isAdminOnly: false,
              },
              {
                name: 'adminNotes',
                type: 'String',
                isOptional: true,
                isList: false,
                securityLevel: 'admin-only',
                annotations: [{ type: 'admin-only', value: true, raw: '@admin-only' }],
                gdpr: { category: null, purpose: null, retention: null },
                isSensitive: false,
                isNeverExpose: false,
                isAdminOnly: true,
              },
              {
                name: 'hash',
                type: 'String',
                isOptional: false,
                isList: false,
                securityLevel: 'never-expose',
                annotations: [{ type: 'never-expose', value: true, raw: '@never-expose' }],
                gdpr: { category: null, purpose: null, retention: null },
                isSensitive: false,
                isNeverExpose: true,
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: [{ name: 'personalNames' }],
              adminOnly: [{ name: 'adminNotes' }],
              neverExpose: [{ name: 'hash' }],
            },
            sensitiveFields: [{ name: 'personalNames' }],
            neverExposeFields: [{ name: 'hash' }],
            adminOnlyFields: [{ name: 'adminNotes' }],
            gdprFields: [
              {
                name: 'personalNames',
                gdpr: { category: 'PERSONAL', purpose: 'ARCHIVAL', retention: 'INDEFINITE' },
              },
            ],
          },
          User: {
            modelName: 'User',
            allFields: ['id', 'email', 'role'],
            fieldsWithAnnotations: [
              {
                name: 'email',
                type: 'String',
                isOptional: false,
                isList: false,
                securityLevel: 'sensitive',
                annotations: [{ type: 'sensitive', value: true, raw: '@sensitive' }],
                gdpr: { category: null, purpose: null, retention: null },
                isSensitive: true,
                isNeverExpose: false,
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: [{ name: 'email' }],
              adminOnly: [],
              neverExpose: [],
            },
            sensitiveFields: [{ name: 'email' }],
            neverExposeFields: [],
            adminOnlyFields: [],
            gdprFields: [],
          },
        };

        await generateSensitiveFieldsTypes(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test archival document types
        expect(generatedContent).toContain(
          "export type ArchivalDocumentSensitiveFields = 'personalNames';",
        );
        expect(generatedContent).toContain(
          "export type ArchivalDocumentAdminOnlyFields = 'adminNotes';",
        );
        expect(generatedContent).toContain(
          "export type ArchivalDocumentNeverExposeFields = 'hash';",
        );
        expect(generatedContent).toContain(
          "export type ArchivalDocumentGdprFields = 'personalNames';",
        );

        // Test user types
        expect(generatedContent).toContain("export type UserSensitiveFields = 'email';");
        expect(generatedContent).toContain('export type UserGdprFields = never;');

        // Test master types include both models
        expect(generatedContent).toContain('ArchivalDocument: ArchivalDocumentSensitiveFields[];');
        expect(generatedContent).toContain('User: UserSensitiveFields[];');

        // Test security level organization
        expect(generatedContent).toContain('ArchivalDocument: {');
        expect(generatedContent).toContain("public: ['personalNames'];");
        expect(generatedContent).toContain("sensitive: ['personalNames'];");
        expect(generatedContent).toContain("adminOnly: ['adminNotes'];");
        expect(generatedContent).toContain("neverExpose: ['hash'];");

        // Test GDPR metadata preservation
        expect(generatedContent).toContain('"retention":"INDEFINITE"');
        expect(generatedContent).toContain('"purpose":"ARCHIVAL"');
      });

      it('should handle Finnish cultural heritage institution requirements', async () => {
        const fieldMetadataMap = {
          CulturalHeritageItem: {
            modelName: 'CulturalHeritageItem',
            allFields: ['id', 'description', 'donorInfo', 'restrictedContext', 'locationData'],
            fieldsWithAnnotations: [
              {
                name: 'donorInfo',
                type: 'Json',
                isOptional: true,
                isList: false,
                securityLevel: 'sensitive',
                annotations: [
                  { type: 'sensitive', value: true, raw: '@sensitive' },
                  { type: 'gdpr.category', value: 'PERSONAL', raw: '@gdpr.category(PERSONAL)' },
                  { type: 'gdpr.purpose', value: 'ARCHIVAL', raw: '@gdpr.purpose(ARCHIVAL)' },
                  {
                    type: 'gdpr.retention',
                    value: 'UNTIL_DELETION_REQUEST',
                    raw: '@gdpr.retention(UNTIL_DELETION_REQUEST)',
                  },
                ],
                gdpr: {
                  category: 'PERSONAL',
                  purpose: 'ARCHIVAL',
                  retention: 'UNTIL_DELETION_REQUEST',
                },
                isSensitive: true,
                isNeverExpose: false,
                isAdminOnly: false,
              },
              {
                name: 'restrictedContext',
                type: 'String',
                isOptional: true,
                isList: false,
                securityLevel: 'admin-only',
                annotations: [
                  { type: 'admin-only', value: true, raw: '@admin-only' },
                  {
                    type: 'gdpr.category',
                    value: 'SENSITIVE_PERSONAL',
                    raw: '@gdpr.category(SENSITIVE_PERSONAL)',
                  },
                ],
                gdpr: { category: 'SENSITIVE_PERSONAL', purpose: null, retention: null },
                isSensitive: false,
                isNeverExpose: false,
                isAdminOnly: true,
              },
              {
                name: 'locationData',
                type: 'String',
                isOptional: true,
                isList: false,
                securityLevel: 'sensitive',
                annotations: [
                  { type: 'sensitive', value: true, raw: '@sensitive' },
                  { type: 'gdpr.category', value: 'LOCATION', raw: '@gdpr.category(LOCATION)' },
                ],
                gdpr: { category: 'LOCATION', purpose: null, retention: null },
                isSensitive: true,
                isNeverExpose: false,
                isAdminOnly: false,
              },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: [{ name: 'donorInfo' }, { name: 'locationData' }],
              adminOnly: [{ name: 'restrictedContext' }],
              neverExpose: [],
            },
            sensitiveFields: [{ name: 'donorInfo' }, { name: 'locationData' }],
            neverExposeFields: [],
            adminOnlyFields: [{ name: 'restrictedContext' }],
            gdprFields: [
              {
                name: 'donorInfo',
                gdpr: {
                  category: 'PERSONAL',
                  purpose: 'ARCHIVAL',
                  retention: 'UNTIL_DELETION_REQUEST',
                },
              },
              {
                name: 'restrictedContext',
                gdpr: { category: 'SENSITIVE_PERSONAL', purpose: null, retention: null },
              },
              {
                name: 'locationData',
                gdpr: { category: 'LOCATION', purpose: null, retention: null },
              },
            ],
          },
        };

        await generateSensitiveFieldsTypes(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test heritage-specific field types
        expect(generatedContent).toContain(
          "export type CulturalHeritageItemSensitiveFields = 'donorInfo' | 'locationData';",
        );
        expect(generatedContent).toContain(
          "export type CulturalHeritageItemAdminOnlyFields = 'restrictedContext';",
        );
        expect(generatedContent).toContain(
          "export type CulturalHeritageItemGdprFields = 'donorInfo' | 'restrictedContext' | 'locationData';",
        );

        // Test comprehensive GDPR category handling
        expect(generatedContent).toContain('"category":"SENSITIVE_PERSONAL"');
        expect(generatedContent).toContain('"category":"LOCATION"');
        expect(generatedContent).toContain('"retention":"UNTIL_DELETION_REQUEST"');

        // Test arrays include all appropriate fields
        expect(generatedContent).toContain('export const culturalheritageiteiSensitiveFields');
        expect(generatedContent).toContain("'donorInfo',");
        expect(generatedContent).toContain("'locationData'");
      });
    });
  });
});
