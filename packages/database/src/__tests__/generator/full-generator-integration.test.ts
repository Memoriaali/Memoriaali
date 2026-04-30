/**
 * FULL GENERATOR INTEGRATION TESTS
 * =================================
 *
 * End-to-end tests for the complete sensitive fields generator workflow:
 * - Mock Prisma DMMF processing
 * - Generated TypeScript output validation
 * - Runtime functionality verification
 * - Backward compatibility testing
 *
 * These tests simulate the complete generator pipeline from Prisma schema
 * annotations to working TypeScript utilities.
 */

import type { DMMF } from '@prisma/generator-helper';
import * as fs from 'fs';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { generateFieldPickingHelpers } from '../../../generators/utils/generate-field-picking-helpers.js';
import { generateSecurityUtilities } from '../../../generators/utils/generate-security-utilities.js';
import { generateSensitiveFieldsTypes } from '../../../generators/utils/generate-sensitive-fields-types.js';
import { processSensitiveFields } from '../../../generators/utils/process-sensitive-fields.js';

describe('Full Generator Integration', () => {
  const testOutputDir = './test-generator-output';

  // Mock DMMF that represents a realistic Prisma schema
  const mockDmmf: DMMF.Document = {
    datamodel: {
      models: [
        {
          name: 'User',
          dbName: null,
          schema: 'public',
          fields: [
            {
              name: 'id',
              kind: 'scalar',
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: true,
              isReadOnly: false,
              hasDefaultValue: true,
              type: 'String',
              isGenerated: false,
              isUpdatedAt: false,
              documentation: 'User unique identifier - public field',
            },
            {
              name: 'email',
              kind: 'scalar',
              isList: false,
              isRequired: true,
              isUnique: true,
              isId: false,
              isReadOnly: false,
              hasDefaultValue: false,
              type: 'String',
              isGenerated: false,
              isUpdatedAt: false,
              documentation:
                'User email address @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(5_YEARS)',
            },
            {
              name: 'hashedPassword',
              kind: 'scalar',
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              isReadOnly: false,
              hasDefaultValue: false,
              type: 'String',
              isGenerated: false,
              isUpdatedAt: false,
              documentation:
                'Password hash - never exposed @never-expose @gdpr.category(SENSITIVE_PERSONAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(UNTIL_DELETION_REQUEST)',
            },
            {
              name: 'personalInfo',
              kind: 'scalar',
              isList: false,
              isRequired: false,
              isUnique: false,
              isId: false,
              isReadOnly: false,
              hasDefaultValue: false,
              type: 'Json',
              isGenerated: false,
              isUpdatedAt: false,
              documentation:
                'Personal information JSON @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(ARCHIVAL) @gdpr.retention(10_YEARS)',
            },
            {
              name: 'systemKey',
              kind: 'scalar',
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              isReadOnly: false,
              hasDefaultValue: true,
              type: 'String',
              isGenerated: false,
              isUpdatedAt: false,
              documentation: 'System encryption key @never-expose',
            },
            {
              name: 'username',
              kind: 'scalar',
              isList: false,
              isRequired: true,
              isUnique: true,
              isId: false,
              isReadOnly: false,
              hasDefaultValue: false,
              type: 'String',
              isGenerated: false,
              isUpdatedAt: false,
              documentation: 'Public username - no annotation means public',
            },
            {
              name: 'createdAt',
              kind: 'scalar',
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              isReadOnly: false,
              hasDefaultValue: true,
              type: 'DateTime',
              isGenerated: false,
              isUpdatedAt: false,
              documentation: 'Account creation timestamp',
            },
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
          isGenerated: false,
        },
        {
          name: 'Document',
          dbName: null,
          schema: 'public',
          fields: [
            {
              name: 'id',
              kind: 'scalar',
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: true,
              isReadOnly: false,
              hasDefaultValue: true,
              type: 'String',
              isGenerated: false,
              isUpdatedAt: false,
              documentation: 'Document identifier',
            },
            {
              name: 'title',
              kind: 'scalar',
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              isReadOnly: false,
              hasDefaultValue: false,
              type: 'String',
              isGenerated: false,
              isUpdatedAt: false,
              documentation: 'Document title - public',
            },
            {
              name: 'metadata',
              kind: 'scalar',
              isList: false,
              isRequired: false,
              isUnique: false,
              isId: false,
              isReadOnly: false,
              hasDefaultValue: false,
              type: 'Json',
              isGenerated: false,
              isUpdatedAt: false,
              documentation:
                'Document archival metadata @admin-only @gdpr.category(ARCHIVAL) @gdpr.purpose(ARCHIVAL) @gdpr.retention(INDEFINITE)',
            },
            {
              name: 'processingLog',
              kind: 'scalar',
              isList: false,
              isRequired: false,
              isUnique: false,
              isId: false,
              isReadOnly: false,
              hasDefaultValue: false,
              type: 'Json',
              isGenerated: false,
              isUpdatedAt: false,
              documentation:
                'System processing log @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(SECURITY) @gdpr.retention(2_YEARS)',
            },
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
          isGenerated: false,
        },
      ],
      indexes: [],
      enums: [],
      types: [],
    },
    schema: {
      inputObjectTypes: { prisma: [], model: [] },
      outputObjectTypes: { prisma: [], model: [] },
      enumTypes: { prisma: [], model: [] },
      fieldRefTypes: { prisma: [] },
    },
    mappings: { modelOperations: [], otherOperations: { read: [], write: [] } },
  };

  beforeAll(async () => {
    // Create test output directory
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('DMMF Processing', () => {
    it('should extract comprehensive field metadata from mock DMMF', () => {
      const fieldMetadata = processSensitiveFields(mockDmmf);

      expect(fieldMetadata).toHaveProperty('User');
      expect(fieldMetadata).toHaveProperty('Document');

      // Check User model metadata
      const userMetadata = fieldMetadata.User;
      expect(userMetadata.fieldsWithAnnotations).toHaveLength(4); // email, hashedPassword, personalInfo, systemKey
      expect(userMetadata.fieldsBySecurityLevel.sensitive).toHaveLength(2); // email, personalInfo
      expect(userMetadata.fieldsBySecurityLevel.adminOnly).toHaveLength(0); // no admin-only fields
      expect(userMetadata.fieldsBySecurityLevel.neverExpose).toHaveLength(2); // hashedPassword, systemKey
      expect(userMetadata.gdprFields).toHaveLength(3); // All except systemKey have GDPR annotations

      // Check Document model metadata
      const docMetadata = fieldMetadata.Document;
      expect(docMetadata.fieldsWithAnnotations).toHaveLength(2); // metadata, processingLog
      expect(docMetadata.fieldsBySecurityLevel.adminOnly).toHaveLength(1); // metadata
      expect(docMetadata.fieldsBySecurityLevel.neverExpose).toHaveLength(1); // processingLog
    });

    it('should correctly categorize fields by security level', () => {
      const fieldMetadata = processSensitiveFields(mockDmmf);

      const userFields = fieldMetadata.User.fieldsWithAnnotations;

      const emailField = userFields.find((f) => f.name === 'email');
      expect(emailField?.securityLevel).toBe('sensitive');
      expect(emailField?.gdpr.category).toBe('PERSONAL');
      expect(emailField?.gdpr.purpose).toBe('AUTHENTICATION');
      expect(emailField?.gdpr.retention).toBe('5_YEARS');

      const passwordField = userFields.find((f) => f.name === 'hashedPassword');
      expect(passwordField?.securityLevel).toBe('never-expose');
      expect(passwordField?.gdpr.category).toBe('SENSITIVE_PERSONAL');
    });
  });

  describe('Generated Files', () => {
    let fieldMetadata: ReturnType<typeof processSensitiveFields>;

    beforeAll(async () => {
      // Process DMMF and generate all files
      fieldMetadata = processSensitiveFields(mockDmmf);

      await generateSensitiveFieldsTypes(testOutputDir, fieldMetadata);
      await generateSecurityUtilities(testOutputDir, fieldMetadata);
      await generateFieldPickingHelpers(testOutputDir, fieldMetadata);
    });

    it('should generate sensitive-fields.ts with correct structure', () => {
      const filePath = path.join(testOutputDir, 'sensitive-fields.ts');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');

      // Check exports
      expect(content).toContain('export const allSensitiveFields');
      expect(content).toContain('export const allFieldsBySecurityLevel');
      expect(content).toContain('export type SecurityLevel');
      expect(content).toContain('export const GDPR_CATEGORIES');
      expect(content).toContain('export const GDPR_PURPOSES');
      expect(content).toContain('export const GDPR_RETENTION_PERIODS');

      // Check User fields
      expect(content).toContain("User: ['email', 'personalInfo'] as const");
      expect(content).toContain("sensitive: ['email', 'personalInfo']");
      expect(content).toContain('adminOnly: []');
      expect(content).toContain("neverExpose: ['hashedPassword', 'systemKey']");

      // Check GDPR constants
      expect(content).toContain("PERSONAL: 'PERSONAL'");
      expect(content).toContain("AUTHENTICATION: 'AUTHENTICATION'");
      expect(content).toContain("5_YEARS: '5_YEARS'");
    });

    it('should generate security-utils.ts with all utility functions', () => {
      const filePath = path.join(testOutputDir, 'security-utils.ts');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');

      // Check function exports
      expect(content).toContain('export const hasSecurityLevel');
      expect(content).toContain('export const isSensitiveField');
      expect(content).toContain('export const isNeverExposeField');
      expect(content).toContain('export const isAdminOnlyField');
      expect(content).toContain('export const getFieldSecurityLevel');
      expect(content).toContain('export const omitFieldsBySecurityLevel');
      expect(content).toContain('export const getRoleBasedFieldAccess');
      expect(content).toContain('export const createSecureSelector');

      // Check types
      expect(content).toContain('User: Prisma.UserScalarFieldEnum');
      expect(content).toContain('Document: Prisma.DocumentScalarFieldEnum');
      expect(content).toContain(
        "type UserRole = 'ADMIN' | 'MODERATOR' | 'EXPERT' | 'USER' | 'ANONYMOUS'",
      );
    });

    it('should generate field-selectors.ts with field picking helpers', () => {
      const filePath = path.join(testOutputDir, 'field-selectors.ts');
      expect(fs.existsSync(filePath)).toBe(true);

      const content = fs.readFileSync(filePath, 'utf8');

      // Check model-specific selectors
      expect(content).toContain('export const UserFieldSelector');
      expect(content).toContain('export const DocumentFieldSelector');

      // Check role-based selectors
      expect(content).toContain('public:');
      expect(content).toContain('user:');
      expect(content).toContain('moderator:');
      expect(content).toContain('admin:');
    });

    it('should generate valid TypeScript code', () => {
      const files = ['sensitive-fields.ts', 'security-utils.ts', 'field-selectors.ts'];

      files.forEach((fileName) => {
        const filePath = path.join(testOutputDir, fileName);
        const content = fs.readFileSync(filePath, 'utf8');

        // Check basic TypeScript syntax
        expect(content).not.toContain('undefined');
        expect(content).not.toContain('syntax error');
        expect(content).toContain('export');

        // Check that imports are properly formed
        const importMatches = content.match(/import.*from.*['"]/g);
        if (importMatches) {
          importMatches.forEach((importStatement) => {
            expect(importStatement).toMatch(/import.*from\s*['"][^'"]+['"]/);
          });
        }
      });
    });
  });

  describe('Runtime Integration', () => {
    it('should create functional field metadata structure', () => {
      const fieldMetadata = processSensitiveFields(mockDmmf);

      // Test field lookup functionality
      const userEmail = fieldMetadata.User.fieldsWithAnnotations.find((f) => f.name === 'email');
      expect(userEmail).toBeDefined();
      expect(userEmail?.securityLevel).toBe('sensitive');
      expect(userEmail?.gdpr.category).toBe('PERSONAL');

      // Test security level organization
      expect(fieldMetadata.User.fieldsBySecurityLevel.sensitive).toContain('email');
      expect(fieldMetadata.User.fieldsBySecurityLevel.sensitive).toContain('personalInfo');
      expect(fieldMetadata.User.fieldsBySecurityLevel.neverExpose).toContain('hashedPassword');
      expect(fieldMetadata.User.fieldsBySecurityLevel.neverExpose).toContain('systemKey');
    });

    it('should support backward compatibility patterns', () => {
      const fieldMetadata = processSensitiveFields(mockDmmf);

      // Legacy sensitiveFields array should exist
      expect(fieldMetadata.User.sensitiveFields).toBeDefined();
      expect(fieldMetadata.User.sensitiveFields).toHaveLength(2);
      expect(fieldMetadata.User.sensitiveFields.map((f) => f.name)).toEqual([
        'email',
        'personalInfo',
      ]);

      // Legacy arrays for other security levels
      expect(fieldMetadata.User.adminOnlyFields).toHaveLength(1);
      expect(fieldMetadata.User.neverExposeFields).toHaveLength(2);
    });
  });

  describe('GDPR Compliance Features', () => {
    it('should properly extract and organize GDPR information', () => {
      const fieldMetadata = processSensitiveFields(mockDmmf);

      const gdprFields = fieldMetadata.User.gdprFields;
      expect(gdprFields).toHaveLength(4);

      const emailGdpr = gdprFields.find((f) => f.name === 'email');
      expect(emailGdpr?.gdpr).toEqual({
        category: 'PERSONAL',
        purpose: 'AUTHENTICATION',
        retention: '5_YEARS',
      });

      const passwordGdpr = gdprFields.find((f) => f.name === 'hashedPassword');
      expect(passwordGdpr?.gdpr).toEqual({
        category: 'SENSITIVE_PERSONAL',
        purpose: 'AUTHENTICATION',
        retention: 'UNTIL_DELETION_REQUEST',
      });
    });

    it('should include GDPR constants in generated types', async () => {
      const fieldMetadata = processSensitiveFields(mockDmmf);
      await generateSensitiveFieldsTypes(testOutputDir, fieldMetadata);

      const content = fs.readFileSync(path.join(testOutputDir, 'sensitive-fields.ts'), 'utf8');

      // Check GDPR categories
      expect(content).toContain("PERSONAL: 'PERSONAL'");
      expect(content).toContain("SENSITIVE_PERSONAL: 'SENSITIVE_PERSONAL'");
      expect(content).toContain("TECHNICAL: 'TECHNICAL'");
      expect(content).toContain("ARCHIVAL: 'ARCHIVAL'");

      // Check GDPR purposes
      expect(content).toContain("AUTHENTICATION: 'AUTHENTICATION'");
      expect(content).toContain("COMPLIANCE: 'COMPLIANCE'");
      expect(content).toContain("SECURITY: 'SECURITY'");

      // Check GDPR retention periods
      expect(content).toContain("5_YEARS: '5_YEARS'");
      expect(content).toContain("INDEFINITE: 'INDEFINITE'");
      expect(content).toContain("UNTIL_DELETION_REQUEST: 'UNTIL_DELETION_REQUEST'");
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle DMMF with no annotated fields', () => {
      const emptyDmmf: DMMF.Document = {
        ...mockDmmf,
        datamodel: {
          ...mockDmmf.datamodel,
          models: [
            {
              name: 'EmptyModel',
              dbName: null,
              schema: 'public',
              fields: [
                {
                  name: 'id',
                  kind: 'scalar',
                  isList: false,
                  isRequired: true,
                  isUnique: false,
                  isId: true,
                  isReadOnly: false,
                  hasDefaultValue: true,
                  type: 'String',
                  isGenerated: false,
                  isUpdatedAt: false,
                  documentation: 'Just a regular field',
                },
              ],
              primaryKey: null,
              uniqueFields: [],
              uniqueIndexes: [],
              isGenerated: false,
            },
          ],
        },
      };

      const fieldMetadata = processSensitiveFields(emptyDmmf);
      expect(fieldMetadata).toEqual({});
    });

    it('should validate annotation conflicts', () => {
      const conflictDmmf: DMMF.Document = {
        ...mockDmmf,
        datamodel: {
          ...mockDmmf.datamodel,
          models: [
            {
              name: 'ConflictModel',
              dbName: null,
              schema: 'public',
              fields: [
                {
                  name: 'conflictField',
                  kind: 'scalar',
                  isList: false,
                  isRequired: true,
                  isUnique: false,
                  isId: false,
                  isReadOnly: false,
                  hasDefaultValue: false,
                  type: 'String',
                  isGenerated: false,
                  isUpdatedAt: false,
                  documentation: 'Field with conflicting annotations @sensitive @never-expose',
                },
              ],
              primaryKey: null,
              uniqueFields: [],
              uniqueIndexes: [],
              isGenerated: false,
            },
          ],
        },
      };

      expect(() => processSensitiveFields(conflictDmmf)).toThrow(
        /conflicting security annotations/,
      );
    });

    it('should warn about GDPR without security annotations', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const gdprOnlyDmmf: DMMF.Document = {
        ...mockDmmf,
        datamodel: {
          ...mockDmmf.datamodel,
          models: [
            {
              name: 'GdprModel',
              dbName: null,
              schema: 'public',
              fields: [
                {
                  name: 'gdprField',
                  kind: 'scalar',
                  isList: false,
                  isRequired: true,
                  isUnique: false,
                  isId: false,
                  isReadOnly: false,
                  hasDefaultValue: false,
                  type: 'String',
                  isGenerated: false,
                  isUpdatedAt: false,
                  documentation: 'Field with GDPR but no security @gdpr.category(PERSONAL)',
                },
              ],
              primaryKey: null,
              uniqueFields: [],
              uniqueIndexes: [],
              isGenerated: false,
            },
          ],
        },
      };

      processSensitiveFields(gdprOnlyDmmf);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('has GDPR annotations but no security annotation'),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large schemas efficiently', () => {
      // Create a large DMMF with many models and fields
      const largeModels = Array.from({ length: 10 }, (_, modelIndex) => ({
        name: `Model${modelIndex}`,
        dbName: null,
        schema: 'public',
        fields: Array.from({ length: 20 }, (_, fieldIndex) => ({
          name: `field${fieldIndex}`,
          kind: 'scalar' as const,
          isList: false,
          isRequired: true,
          isUnique: false,
          isId: fieldIndex === 0,
          isReadOnly: false,
          hasDefaultValue: fieldIndex === 0,
          type: 'String',
          isGenerated: false,
          isUpdatedAt: false,
          documentation:
            fieldIndex % 3 === 0 ? `Field ${fieldIndex} @sensitive` : `Field ${fieldIndex}`,
        })),
        primaryKey: null,
        uniqueFields: [],
        uniqueIndexes: [],
        isGenerated: false,
      }));

      const largeDmmf: DMMF.Document = {
        ...mockDmmf,
        datamodel: {
          ...mockDmmf.datamodel,
          models: largeModels,
        },
      };

      const startTime = performance.now();
      const fieldMetadata = processSensitiveFields(largeDmmf);
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should process quickly
      expect(Object.keys(fieldMetadata)).toHaveLength(10); // All models processed
    });
  });

  describe('Generated Code Quality', () => {
    it('should generate properly formatted TypeScript', async () => {
      const fieldMetadata = processSensitiveFields(mockDmmf);
      await generateSensitiveFieldsTypes(testOutputDir, fieldMetadata);

      const content = fs.readFileSync(path.join(testOutputDir, 'sensitive-fields.ts'), 'utf8');

      // Check for proper TypeScript formatting
      expect(content).toMatch(/export const \w+/); // Proper const exports
      expect(content).toMatch(/export type \w+/); // Proper type exports
      expect(content).toMatch(/as const/); // Proper const assertions
      expect(content).not.toMatch(/\s{2,}/); // No excessive whitespace
      expect(content).not.toMatch(/^\s*$/m); // No completely empty lines
    });

    it('should include proper attribution and warnings', async () => {
      const fieldMetadata = processSensitiveFields(mockDmmf);
      await generateSecurityUtilities(testOutputDir, fieldMetadata);

      const content = fs.readFileSync(path.join(testOutputDir, 'security-utils.ts'), 'utf8');

      expect(content).toContain('Generated by memoriaali-sensitive-fields');
      expect(content).toContain('DO NOT EDIT - This file is automatically generated');
      expect(content).toContain('* @param');
      expect(content).toContain('* @returns');
    });
  });
});
