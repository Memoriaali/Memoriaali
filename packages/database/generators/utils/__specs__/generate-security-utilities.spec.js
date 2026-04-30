/* eslint-disable no-undef */
/**
 * Comprehensive unit tests for generate-security-utilities.js
 *
 * Test Contract:
 * - Tests validate real behavior of security utility function generation
 * - Uses actual field metadata structures and validates generated TypeScript output
 * - Tests security filtering functions, role-based access, and type safety
 * - Validates error conditions and edge cases
 * - Achieves comprehensive code coverage through real behavior testing
 */

import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generateSecurityUtilities } from '../generate-security-utilities.js';

describe('generate-security-utilities.js', () => {
  let tempDir;
  let outputFile;

  beforeEach(() => {
    // Create temporary directory for test outputs
    tempDir = path.join(process.cwd(), 'temp-security-utils-output');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    outputFile = path.join(tempDir, 'security-utils.ts');
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

  describe('generateSecurityUtilities', () => {
    describe('Contract: Generate comprehensive security utility functions', () => {
      it('should generate complete utility functions for single model', async () => {
        const fieldMetadataMap = {
          User: {
            modelName: 'User',
            allFields: ['id', 'email', 'hashedPassword', 'adminNotes'],
            fieldsWithAnnotations: [
              {
                name: 'email',
                securityLevel: 'sensitive',
                isSensitive: true,
                isNeverExpose: false,
                isAdminOnly: false,
              },
              {
                name: 'hashedPassword',
                securityLevel: 'never-expose',
                isSensitive: false,
                isNeverExpose: true,
                isAdminOnly: false,
              },
              {
                name: 'adminNotes',
                securityLevel: 'admin-only',
                isSensitive: false,
                isNeverExpose: false,
                isAdminOnly: true,
              },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: ['email'],
              adminOnly: ['adminNotes'],
              neverExpose: ['hashedPassword'],
            },
          },
        };

        await generateSecurityUtilities(tempDir, fieldMetadataMap);

        expect(fs.existsSync(outputFile)).toBe(true);
        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test imports
        expect(generatedContent).toContain("import type { Prisma } from '../client';");
        expect(generatedContent).toContain('import {');
        expect(generatedContent).toContain('allSensitiveFields,');
        expect(generatedContent).toContain('allFieldsBySecurityLevel,');
        expect(generatedContent).toContain('SecurityLevel,');
        expect(generatedContent).toContain("} from './sensitive-fields';");

        // Test type definitions
        expect(generatedContent).toContain('type ScalarFieldEnumByModel = {');
        expect(generatedContent).toContain('User: Prisma.UserScalarFieldEnum;');

        expect(generatedContent).toContain(
          "type UserRole = 'ADMIN' | 'MODERATOR' | 'EXPERT' | 'USER' | 'ANONYMOUS';",
        );

        // Test core utility functions
        expect(generatedContent).toContain('export const hasSecurityLevel = <M extends AnyModel>');
        expect(generatedContent).toContain('export const isSensitiveField = <M extends AnyModel>');
        expect(generatedContent).toContain(
          'export const isNeverExposeField = <M extends AnyModel>',
        );
        expect(generatedContent).toContain('export const isAdminOnlyField = <M extends AnyModel>');
        expect(generatedContent).toContain(
          'export const getFieldSecurityLevel = <M extends AnyModel>',
        );

        // Test field filtering functions
        expect(generatedContent).toContain('export const omitFieldsBySecurityLevel = <');
        expect(generatedContent).toContain('export const omitSensitiveFields = <');
        expect(generatedContent).toContain('export const omitNeverExposeFields = <');
        expect(generatedContent).toContain('export const omitAdminOnlyFields = <');
        expect(generatedContent).toContain('export const pickSafeFields = <');

        // Test role-based access functions
        expect(generatedContent).toContain(
          'export const getRoleBasedFieldAccess = <M extends AnyModel>',
        );
        expect(generatedContent).toContain(
          'export const createSecureSelector = <M extends AnyModel>',
        );
      });

      it('should generate security utility functions with proper logic', async () => {
        const fieldMetadataMap = {
          Document: {
            modelName: 'Document',
            allFields: ['id', 'title', 'content', 'metadata'],
            fieldsWithAnnotations: [
              {
                name: 'content',
                securityLevel: 'sensitive',
                isSensitive: true,
                isNeverExpose: false,
                isAdminOnly: false,
              },
              {
                name: 'metadata',
                securityLevel: 'admin-only',
                isSensitive: false,
                isNeverExpose: false,
                isAdminOnly: true,
              },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: ['content'],
              adminOnly: ['metadata'],
              neverExpose: [],
            },
          },
        };

        await generateSecurityUtilities(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test hasSecurityLevel function logic
        expect(generatedContent).toContain(
          'const modelFields = allFieldsBySecurityLevel[modelName as string];',
        );
        expect(generatedContent).toContain("if (!modelFields) return securityLevel === 'public';");
        expect(generatedContent).toContain(
          "const fields = modelFields[securityLevel === 'admin-only' ? 'adminOnly' : securityLevel === 'never-expose' ? 'neverExpose' : securityLevel];",
        );
        expect(generatedContent).toContain('return fields.includes(fieldName as string);');

        // Test getFieldSecurityLevel priority logic
        expect(generatedContent).toContain(
          "if (hasSecurityLevel(modelName, fieldName, 'never-expose')) return 'never-expose';",
        );
        expect(generatedContent).toContain(
          "if (hasSecurityLevel(modelName, fieldName, 'admin-only')) return 'admin-only';",
        );
        expect(generatedContent).toContain(
          "if (hasSecurityLevel(modelName, fieldName, 'sensitive')) return 'sensitive';",
        );
        expect(generatedContent).toContain("return 'public';");

        // Test omitFieldsBySecurityLevel function
        expect(generatedContent).toContain(
          "excludeSecurityLevels: SecurityLevel[] = ['sensitive', 'admin-only', 'never-expose']",
        );
        expect(generatedContent).toContain('excludeSecurityLevels.forEach(level => {');
        expect(generatedContent).toContain(
          "const fieldsToRemove = modelFields[level === 'admin-only' ? 'adminOnly' : level === 'never-expose' ? 'neverExpose' : level] || [];",
        );
        expect(generatedContent).toContain('fieldsToRemove.forEach(fieldName => {');
        expect(generatedContent).toContain(
          'delete (result as Record<string, unknown>)[fieldName];',
        );

        // Test role-based access logic
        expect(generatedContent).toContain(
          'const roleSecurityAccess: Record<UserRole, SecurityLevel[]> = {',
        );
        expect(generatedContent).toContain("ADMIN: ['public', 'sensitive', 'admin-only'],");
        expect(generatedContent).toContain("MODERATOR: ['public', 'sensitive'],");
        expect(generatedContent).toContain("USER: ['public'],");
        expect(generatedContent).toContain("ANONYMOUS: ['public'],");
      });

      it('should handle multiple models in scalar field enum mapping', async () => {
        const fieldMetadataMap = {
          User: {
            modelName: 'User',
            allFields: ['id', 'email'],
            fieldsWithAnnotations: [{ name: 'email', securityLevel: 'sensitive' }],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: ['email'],
              adminOnly: [],
              neverExpose: [],
            },
          },
          Document: {
            modelName: 'Document',
            allFields: ['id', 'content'],
            fieldsWithAnnotations: [{ name: 'content', securityLevel: 'admin-only' }],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: [],
              adminOnly: ['content'],
              neverExpose: [],
            },
          },
          Comment: {
            modelName: 'Comment',
            allFields: ['id', 'text'],
            fieldsWithAnnotations: [],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: [],
              adminOnly: [],
              neverExpose: [],
            },
          },
        };

        await generateSecurityUtilities(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test all models are included in scalar field enum mapping
        expect(generatedContent).toContain('type ScalarFieldEnumByModel = {');
        expect(generatedContent).toContain('User: Prisma.UserScalarFieldEnum;');
        expect(generatedContent).toContain('Document: Prisma.DocumentScalarFieldEnum;');
        expect(generatedContent).toContain('Comment: Prisma.CommentScalarFieldEnum;');
      });

      it('should generate type-safe field selectors and filters', async () => {
        const fieldMetadataMap = {
          User: {
            modelName: 'User',
            allFields: ['id', 'username', 'email', 'password'],
            fieldsWithAnnotations: [
              { name: 'email', securityLevel: 'sensitive' },
              { name: 'password', securityLevel: 'never-expose' },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: ['email'],
              adminOnly: [],
              neverExpose: ['password'],
            },
          },
        };

        await generateSecurityUtilities(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test type-safe getSensitiveFields function
        expect(generatedContent).toContain(
          'export const getSensitiveFields = <M extends AnyModel>',
        );
        expect(generatedContent).toContain(
          ': M extends ModelKey ? (typeof allSensitiveFields)[M] : readonly string[]',
        );
        expect(generatedContent).toContain(
          'const map = allSensitiveFields as unknown as Record<string, readonly string[]>;',
        );
        expect(generatedContent).toContain('return (map[modelName as string] ?? []) as any;');

        // Test pickSafeFields function
        expect(generatedContent).toContain('export const pickSafeFields = <');
        expect(generatedContent).toContain(
          'allowedSensitiveFields: Array<FieldNameForModel<M>> = []',
        );
        expect(generatedContent).toContain(
          'const sensitiveFields = getSensitiveFields(modelName) as readonly string[];',
        );
        expect(generatedContent).toContain(
          'const isSensitive = (sensitiveFields as readonly string[]).includes(key);',
        );
        expect(generatedContent).toContain(
          'const isExplicitlyAllowed = (allowedSensitiveFields as readonly string[]).includes(key);',
        );
        expect(generatedContent).toContain('if (!isSensitive || isExplicitlyAllowed) {');

        // Test legacy compatibility function
        expect(generatedContent).toContain('export const omitSensitiveFields = <');
        expect(generatedContent).toContain(
          ': M extends ModelKey ? Omit<T, (typeof allSensitiveFields)[M][number]> : T',
        );
        expect(generatedContent).toContain(
          "return omitFieldsBySecurityLevel(obj, modelName, ['sensitive']) as any;",
        );
      });

      it('should generate comprehensive createSecureSelector function', async () => {
        const fieldMetadataMap = {
          User: {
            modelName: 'User',
            allFields: ['id', 'email', 'adminNotes', 'password'],
            fieldsWithAnnotations: [
              { name: 'email', securityLevel: 'sensitive' },
              { name: 'adminNotes', securityLevel: 'admin-only' },
              { name: 'password', securityLevel: 'never-expose' },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: ['email'],
              adminOnly: ['adminNotes'],
              neverExpose: ['password'],
            },
          },
        };

        await generateSecurityUtilities(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test createSecureSelector function structure
        expect(generatedContent).toContain(
          'export const createSecureSelector = <M extends AnyModel>',
        );
        expect(generatedContent).toContain("userRole: UserRole = 'ANONYMOUS'");
        expect(generatedContent).toContain(
          'const { excludedSecurityLevels } = getRoleBasedFieldAccess(modelName, userRole);',
        );

        // Test returned object structure
        expect(generatedContent).toContain('return {');
        expect(generatedContent).toContain('// Enhanced filtering by security level');
        expect(generatedContent).toContain(
          'filterByRole: <T extends Record<string, unknown>>(obj: T) =>',
        );
        expect(generatedContent).toContain(
          'omitFieldsBySecurityLevel(obj, modelName, excludedSecurityLevels),',
        );

        // Test legacy compatibility functions
        expect(generatedContent).toContain('// Legacy compatibility functions');
        expect(generatedContent).toContain(
          'omitSensitive: <T extends Record<string, unknown>>(obj: T) =>',
        );
        expect(generatedContent).toContain('omitSensitiveFields(obj, modelName),');

        expect(generatedContent).toContain(
          'pickSafe: <T extends Record<string, unknown>>(obj: T) =>',
        );
        expect(generatedContent).toContain('pickSafeFields(obj, modelName, []),');

        // Test field checking functions
        expect(generatedContent).toContain('// Field checking functions');
        expect(generatedContent).toContain('isSensitive: (fieldName: FieldNameForModel<M>) =>');
        expect(generatedContent).toContain('isSensitiveField(modelName, fieldName),');

        expect(generatedContent).toContain(
          'getSecurityLevel: (fieldName: FieldNameForModel<M>) =>',
        );
        expect(generatedContent).toContain('getFieldSecurityLevel(modelName, fieldName),');

        // Test role access information
        expect(generatedContent).toContain('// Role access information');
        expect(generatedContent).toContain(
          'getRoleAccess: () => getRoleBasedFieldAccess(modelName, userRole),',
        );
      });
    });

    describe('Contract: Handle edge cases and validation', () => {
      it('should handle empty field metadata map', async () => {
        const emptyFieldMetadataMap = {};

        await generateSecurityUtilities(tempDir, emptyFieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Should still generate base utility functions
        expect(generatedContent).toContain('export const hasSecurityLevel');
        expect(generatedContent).toContain('export const isSensitiveField');
        expect(generatedContent).toContain('export const createSecureSelector');

        // Scalar field enum mapping should be empty
        expect(generatedContent).toContain('type ScalarFieldEnumByModel = {');
        expect(generatedContent).toMatch(/type ScalarFieldEnumByModel = \{\s*\};/);

        // All utility functions should still be present but work with empty metadata
        expect(generatedContent).toContain(
          'const modelFields = allFieldsBySecurityLevel[modelName as string];',
        );
        expect(generatedContent).toContain("if (!modelFields) return securityLevel === 'public';");
      });

      it('should handle model with no annotated fields', async () => {
        const fieldMetadataMap = {
          PlainModel: {
            modelName: 'PlainModel',
            allFields: ['id', 'name', 'description'],
            fieldsWithAnnotations: [],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: [],
              adminOnly: [],
              neverExpose: [],
            },
          },
        };

        await generateSecurityUtilities(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Model should still be included in type mapping
        expect(generatedContent).toContain('PlainModel: Prisma.PlainModelScalarFieldEnum;');

        // Utility functions should handle empty field arrays gracefully
        expect(generatedContent).toContain(
          'const modelFields = allFieldsBySecurityLevel[modelName as string];',
        );
        expect(generatedContent).toContain("if (!modelFields) return securityLevel === 'public';");

        // All functions should be generated
        expect(generatedContent).toContain('export const hasSecurityLevel');
        expect(generatedContent).toContain('export const getSensitiveFields');
        expect(generatedContent).toContain('export const createSecureSelector');
      });

      it('should include correct header and imports', async () => {
        const fieldMetadataMap = {
          TestModel: {
            modelName: 'TestModel',
            allFields: ['id'],
            fieldsWithAnnotations: [],
            fieldsBySecurityLevel: { public: [], sensitive: [], adminOnly: [], neverExpose: [] },
          },
        };

        await generateSecurityUtilities(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test header
        expect(generatedContent).toMatch(/^\/\/ Generated by .+/);
        expect(generatedContent).toContain('// DO NOT EDIT - This file is automatically generated');

        // Test imports
        expect(generatedContent).toContain("import type { Prisma } from '../client';");
        expect(generatedContent).toContain('import {');
        expect(generatedContent).toContain('allSensitiveFields,');
        expect(generatedContent).toContain('allFieldsBySecurityLevel,');
        expect(generatedContent).toContain('SecurityLevel,');
        expect(generatedContent).toContain('GDPR_CATEGORIES,');
        expect(generatedContent).toContain('GDPR_PURPOSES,');
        expect(generatedContent).toContain('GDPR_RETENTION_PERIODS');
        expect(generatedContent).toContain("} from './sensitive-fields';");
      });

      it('should handle model names with special characters', async () => {
        const fieldMetadataMap = {
          Model_With_Underscores: {
            modelName: 'Model_With_Underscores',
            allFields: ['id', 'field_name'],
            fieldsWithAnnotations: [{ name: 'field_name', securityLevel: 'sensitive' }],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: ['field_name'],
              adminOnly: [],
              neverExpose: [],
            },
          },
        };

        await generateSecurityUtilities(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Model should be properly handled in type mapping
        expect(generatedContent).toContain(
          'Model_With_Underscores: Prisma.Model_With_UnderscoresScalarFieldEnum;',
        );

        // All functions should work with the special model name
        expect(generatedContent).toContain('type ScalarFieldEnumByModel = {');
        expect(generatedContent).toContain(
          'Model_With_Underscores: Prisma.Model_With_UnderscoresScalarFieldEnum;',
        );
      });

      it('should write to correct output directory and filename', async () => {
        const customOutputDir = path.join(process.cwd(), 'custom-security-utils-output');
        const customOutputFile = path.join(customOutputDir, 'security-utils.ts');

        try {
          if (!fs.existsSync(customOutputDir)) {
            fs.mkdirSync(customOutputDir, { recursive: true });
          }

          const fieldMetadataMap = {
            TestModel: {
              modelName: 'TestModel',
              allFields: ['id'],
              fieldsWithAnnotations: [],
              fieldsBySecurityLevel: { public: [], sensitive: [], adminOnly: [], neverExpose: [] },
            },
          };

          await generateSecurityUtilities(customOutputDir, fieldMetadataMap);

          expect(fs.existsSync(customOutputFile)).toBe(true);

          const generatedContent = fs.readFileSync(customOutputFile, 'utf-8');
          expect(generatedContent).toContain('// Generated by');
          expect(generatedContent).toContain('export const hasSecurityLevel');
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
    });

    describe('Contract: Real-world security utility generation scenarios', () => {
      it('should generate utilities for comprehensive archival system', async () => {
        const fieldMetadataMap = {
          ArchivalDocument: {
            modelName: 'ArchivalDocument',
            allFields: ['id', 'title', 'personalNames', 'adminNotes', 'hash', 'metadata'],
            fieldsWithAnnotations: [
              { name: 'personalNames', securityLevel: 'sensitive' },
              { name: 'adminNotes', securityLevel: 'admin-only' },
              { name: 'hash', securityLevel: 'never-expose' },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: ['personalNames'],
              adminOnly: ['adminNotes'],
              neverExpose: ['hash'],
            },
          },
          User: {
            modelName: 'User',
            allFields: ['id', 'email', 'hashedPassword', 'role'],
            fieldsWithAnnotations: [
              { name: 'email', securityLevel: 'sensitive' },
              { name: 'hashedPassword', securityLevel: 'never-expose' },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: ['email'],
              adminOnly: [],
              neverExpose: ['hashedPassword'],
            },
          },
          Comment: {
            modelName: 'Comment',
            allFields: ['id', 'content', 'authorId'],
            fieldsWithAnnotations: [],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: [],
              adminOnly: [],
              neverExpose: [],
            },
          },
        };

        await generateSecurityUtilities(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test all models are included
        expect(generatedContent).toContain(
          'ArchivalDocument: Prisma.ArchivalDocumentScalarFieldEnum;',
        );
        expect(generatedContent).toContain('User: Prisma.UserScalarFieldEnum;');
        expect(generatedContent).toContain('Comment: Prisma.CommentScalarFieldEnum;');

        // Test comprehensive role-based access for archival systems
        expect(generatedContent).toContain(
          'const roleSecurityAccess: Record<UserRole, SecurityLevel[]> = {',
        );
        expect(generatedContent).toContain(
          "ADMIN: ['public', 'sensitive', 'admin-only'], // Admin can see everything except never-expose",
        );
        expect(generatedContent).toContain(
          "MODERATOR: ['public', 'sensitive'], // Moderator can see sensitive but not admin-only",
        );
        expect(generatedContent).toContain(
          "EXPERT: ['public', 'sensitive'], // Expert can see sensitive content",
        );
        expect(generatedContent).toContain("USER: ['public'], // User can only see public fields");
        expect(generatedContent).toContain(
          "ANONYMOUS: ['public'], // Anonymous can only see public fields",
        );

        // Test never-expose protection logic
        expect(generatedContent).toContain('// Never-expose fields are always excluded');
        expect(generatedContent).toContain("if (!excludedLevels.includes('never-expose')) {");
        expect(generatedContent).toContain("excludedLevels.push('never-expose');");

        // Test all security utility functions
        expect(generatedContent).toContain('export const hasSecurityLevel');
        expect(generatedContent).toContain('export const isSensitiveField');
        expect(generatedContent).toContain('export const isNeverExposeField');
        expect(generatedContent).toContain('export const isAdminOnlyField');
        expect(generatedContent).toContain('export const omitFieldsBySecurityLevel');
        expect(generatedContent).toContain('export const createSecureSelector');
      });

      it('should handle Finnish cultural heritage data security requirements', async () => {
        const fieldMetadataMap = {
          CulturalHeritageItem: {
            modelName: 'CulturalHeritageItem',
            allFields: ['id', 'description', 'donorInfo', 'restrictedContext', 'locationData'],
            fieldsWithAnnotations: [
              { name: 'donorInfo', securityLevel: 'sensitive' },
              { name: 'restrictedContext', securityLevel: 'admin-only' },
              { name: 'locationData', securityLevel: 'sensitive' },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: ['donorInfo', 'locationData'],
              adminOnly: ['restrictedContext'],
              neverExpose: [],
            },
          },
          ResearchRequest: {
            modelName: 'ResearchRequest',
            allFields: ['id', 'purpose', 'requesterInfo', 'approvalNotes'],
            fieldsWithAnnotations: [
              { name: 'requesterInfo', securityLevel: 'sensitive' },
              { name: 'approvalNotes', securityLevel: 'admin-only' },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: ['requesterInfo'],
              adminOnly: ['approvalNotes'],
              neverExpose: [],
            },
          },
        };

        await generateSecurityUtilities(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test heritage-specific model inclusion
        expect(generatedContent).toContain(
          'CulturalHeritageItem: Prisma.CulturalHeritageItemScalarFieldEnum;',
        );
        expect(generatedContent).toContain(
          'ResearchRequest: Prisma.ResearchRequestScalarFieldEnum;',
        );

        // Test role access appropriate for heritage institutions
        expect(generatedContent).toContain(
          "const allowedLevels = roleSecurityAccess[userRole] || ['public'];",
        );
        expect(generatedContent).toContain(
          "const excludedLevels = (['public', 'sensitive', 'admin-only', 'never-expose'] as SecurityLevel[])",
        );
        expect(generatedContent).toContain('.filter(level => !allowedLevels.includes(level));');

        // Test comprehensive filtering capabilities for sensitive cultural data
        expect(generatedContent).toContain('export const omitFieldsBySecurityLevel = <');
        expect(generatedContent).toContain(
          "excludeSecurityLevels: SecurityLevel[] = ['sensitive', 'admin-only', 'never-expose']",
        );

        // Test secure selector for heritage data access patterns
        expect(generatedContent).toContain('return {');
        expect(generatedContent).toContain('// Enhanced filtering by security level');
        expect(generatedContent).toContain(
          'filterByRole: <T extends Record<string, unknown>>(obj: T) =>',
        );
        expect(generatedContent).toContain('// Field checking functions');
        expect(generatedContent).toContain('isSensitive: (fieldName: FieldNameForModel<M>) =>');
        expect(generatedContent).toContain('isAdminOnly: (fieldName: FieldNameForModel<M>) =>');

        // Test type safety for heritage data models
        expect(generatedContent).toContain('type ModelKey = keyof typeof allSensitiveFields;');
        expect(generatedContent).toContain('type AnyModel = Prisma.ModelName;');
        expect(generatedContent).toContain(
          'type FieldNameForModel<M extends AnyModel> = M extends keyof ScalarFieldEnumByModel',
        );
      });

      it('should generate utilities for complex multi-level security scenarios', async () => {
        const fieldMetadataMap = {
          SecurityTestModel: {
            modelName: 'SecurityTestModel',
            allFields: [
              'publicField1',
              'publicField2',
              'sensitiveField1',
              'sensitiveField2',
              'sensitiveField3',
              'adminOnlyField1',
              'adminOnlyField2',
              'neverExposeField1',
              'neverExposeField2',
            ],
            fieldsWithAnnotations: [
              { name: 'sensitiveField1', securityLevel: 'sensitive' },
              { name: 'sensitiveField2', securityLevel: 'sensitive' },
              { name: 'sensitiveField3', securityLevel: 'sensitive' },
              { name: 'adminOnlyField1', securityLevel: 'admin-only' },
              { name: 'adminOnlyField2', securityLevel: 'admin-only' },
              { name: 'neverExposeField1', securityLevel: 'never-expose' },
              { name: 'neverExposeField2', securityLevel: 'never-expose' },
            ],
            fieldsBySecurityLevel: {
              public: [],
              sensitive: ['sensitiveField1', 'sensitiveField2', 'sensitiveField3'],
              adminOnly: ['adminOnlyField1', 'adminOnlyField2'],
              neverExpose: ['neverExposeField1', 'neverExposeField2'],
            },
          },
        };

        await generateSecurityUtilities(tempDir, fieldMetadataMap);

        const generatedContent = fs.readFileSync(outputFile, 'utf-8');

        // Test complex security level handling
        expect(generatedContent).toContain(
          'SecurityTestModel: Prisma.SecurityTestModelScalarFieldEnum;',
        );

        // Test field filtering with multiple fields per level
        expect(generatedContent).toContain('excludeSecurityLevels.forEach(level => {');
        expect(generatedContent).toContain(
          "const fieldsToRemove = modelFields[level === 'admin-only' ? 'adminOnly' : level === 'never-expose' ? 'neverExpose' : level] || [];",
        );
        expect(generatedContent).toContain('fieldsToRemove.forEach(fieldName => {');
        expect(generatedContent).toContain(
          'delete (result as Record<string, unknown>)[fieldName];',
        );

        // Test priority-based security level determination
        expect(generatedContent).toContain(
          "if (hasSecurityLevel(modelName, fieldName, 'never-expose')) return 'never-expose';",
        );
        expect(generatedContent).toContain(
          "if (hasSecurityLevel(modelName, fieldName, 'admin-only')) return 'admin-only';",
        );
        expect(generatedContent).toContain(
          "if (hasSecurityLevel(modelName, fieldName, 'sensitive')) return 'sensitive';",
        );
        expect(generatedContent).toContain("return 'public';");

        // Test comprehensive role access with all security levels
        expect(generatedContent).toContain(
          'const roleSecurityAccess: Record<UserRole, SecurityLevel[]> = {',
        );
        expect(generatedContent).toContain("ADMIN: ['public', 'sensitive', 'admin-only'],");
        expect(generatedContent).toContain("EXPERT: ['public', 'sensitive'],");

        // Test createSecureSelector with all security utilities
        expect(generatedContent).toContain(
          'filterByRole: <T extends Record<string, unknown>>(obj: T) =>',
        );
        expect(generatedContent).toContain(
          'omitSensitive: <T extends Record<string, unknown>>(obj: T) =>',
        );
        expect(generatedContent).toContain(
          'pickSafe: <T extends Record<string, unknown>>(obj: T) =>',
        );
        expect(generatedContent).toContain('isSensitive: (fieldName: FieldNameForModel<M>) =>');
        expect(generatedContent).toContain('isNeverExpose: (fieldName: FieldNameForModel<M>) =>');
        expect(generatedContent).toContain('isAdminOnly: (fieldName: FieldNameForModel<M>) =>');
        expect(generatedContent).toContain(
          'getSecurityLevel: (fieldName: FieldNameForModel<M>) =>',
        );
        expect(generatedContent).toContain(
          'getRoleAccess: () => getRoleBasedFieldAccess(modelName, userRole),',
        );
      });
    });
  });
});
