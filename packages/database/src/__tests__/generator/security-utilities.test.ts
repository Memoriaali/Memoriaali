/**
 * SECURITY UTILITIES TESTS
 * =========================
 *
 * Tests for the generated security utility functions that provide:
 * - Role-based field filtering
 * - Security level checking
 * - Field omission and picking functions
 * - GDPR compliance utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generateSecurityUtilities } from '../../../generators/utils/generate-security-utilities.js';

describe('Security Utilities', () => {
  const testOutputDir = './test-output';
  const utilsFilePath = path.join(testOutputDir, 'security-utils.ts');

  // Mock field metadata for testing
  const mockFieldMetadata = {
    User: {
      modelName: 'User',
      allFields: ['id', 'email', 'hashedPassword', 'role', 'internalNotes', 'systemKey'],
      fieldsWithAnnotations: [
        {
          name: 'email',
          securityLevel: 'sensitive',
          isSensitive: true,
          isNeverExpose: false,
          isAdminOnly: false,
          gdpr: { category: 'PERSONAL', purpose: 'AUTHENTICATION', retention: '5_YEARS' },
        },
        {
          name: 'hashedPassword',
          securityLevel: 'never-expose',
          isSensitive: false,
          isNeverExpose: true,
          isAdminOnly: false,
          gdpr: { category: null, purpose: null, retention: null },
        },
        {
          name: 'internalNotes',
          securityLevel: 'admin-only',
          isSensitive: false,
          isNeverExpose: false,
          isAdminOnly: true,
          gdpr: { category: 'TECHNICAL', purpose: 'COMPLIANCE', retention: 'INDEFINITE' },
        },
        {
          name: 'systemKey',
          securityLevel: 'never-expose',
          isSensitive: false,
          isNeverExpose: true,
          isAdminOnly: false,
          gdpr: { category: null, purpose: null, retention: null },
        },
      ],
      fieldsBySecurityLevel: {
        public: [],
        sensitive: ['email'],
        adminOnly: ['internalNotes'],
        neverExpose: ['hashedPassword', 'systemKey'],
      },
      gdprFields: [
        {
          name: 'email',
          gdpr: { category: 'PERSONAL', purpose: 'AUTHENTICATION', retention: '5_YEARS' },
        },
        {
          name: 'internalNotes',
          gdpr: { category: 'TECHNICAL', purpose: 'COMPLIANCE', retention: 'INDEFINITE' },
        },
      ],
      sensitiveFields: [{ name: 'email', securityLevel: 'sensitive' }],
      neverExposeFields: [
        { name: 'hashedPassword', securityLevel: 'never-expose' },
        { name: 'systemKey', securityLevel: 'never-expose' },
      ],
      adminOnlyFields: [{ name: 'internalNotes', securityLevel: 'admin-only' }],
    },
    Document: {
      modelName: 'Document',
      allFields: ['id', 'title', 'content', 'metadata'],
      fieldsWithAnnotations: [
        {
          name: 'metadata',
          securityLevel: 'admin-only',
          isSensitive: false,
          isNeverExpose: false,
          isAdminOnly: true,
          gdpr: { category: 'ARCHIVAL', purpose: 'ARCHIVAL', retention: 'INDEFINITE' },
        },
      ],
      fieldsBySecurityLevel: {
        public: [],
        sensitive: [],
        adminOnly: ['metadata'],
        neverExpose: [],
      },
      gdprFields: [
        {
          name: 'metadata',
          gdpr: { category: 'ARCHIVAL', purpose: 'ARCHIVAL', retention: 'INDEFINITE' },
        },
      ],
      sensitiveFields: [],
      neverExposeFields: [],
      adminOnlyFields: [{ name: 'metadata', securityLevel: 'admin-only' }],
    },
  };

  beforeAll(async () => {
    // Create test output directory
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }

    // Generate the security utilities file
    await generateSecurityUtilities(testOutputDir, mockFieldMetadata);
  });

  afterAll(() => {
    // Clean up test files
    if (fs.existsSync(testOutputDir)) {
      fs.rmSync(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('Generated File Structure', () => {
    it('should generate security-utils.ts file', () => {
      expect(fs.existsSync(utilsFilePath)).toBe(true);
    });

    it('should contain proper TypeScript imports and exports', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      // Check imports
      expect(content).toContain("import type { Prisma } from '../client'");
      expect(content).toContain('import {');
      expect(content).toContain('allSensitiveFields');
      expect(content).toContain('allFieldsBySecurityLevel');
      expect(content).toContain('SecurityLevel');
      expect(content).toContain('GDPR_CATEGORIES');
      expect(content).toContain('GDPR_PURPOSES');
      expect(content).toContain('GDPR_RETENTION_PERIODS');

      // Check exports
      expect(content).toContain('export const hasSecurityLevel');
      expect(content).toContain('export const isSensitiveField');
      expect(content).toContain('export const isNeverExposeField');
      expect(content).toContain('export const isAdminOnlyField');
      expect(content).toContain('export const omitFieldsBySecurityLevel');
      expect(content).toContain('export const createSecureSelector');
    });

    it('should generate proper TypeScript types', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain('type ScalarFieldEnumByModel');
      expect(content).toContain('type ModelKey');
      expect(content).toContain('type AnyModel');
      expect(content).toContain('type FieldNameForModel');
      expect(content).toContain(
        "type UserRole = 'ADMIN' | 'MODERATOR' | 'EXPERT' | 'USER' | 'ANONYMOUS'",
      );
    });

    it('should include model-specific field enums', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain('User: Prisma.UserScalarFieldEnum');
      expect(content).toContain('Document: Prisma.DocumentScalarFieldEnum');
    });
  });

  describe('Security Level Functions', () => {
    it('should generate hasSecurityLevel function with proper logic', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain('export const hasSecurityLevel');
      expect(content).toContain(
        'const modelFields = allFieldsBySecurityLevel[modelName as string]',
      );
      expect(content).toContain("if (!modelFields) return securityLevel === 'public'");
      expect(content).toContain(
        "const fields = modelFields[securityLevel === 'admin-only' ? 'adminOnly' : securityLevel]",
      );
    });

    it('should generate legacy compatibility functions', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain('export const isSensitiveField');
      expect(content).toContain('export const isNeverExposeField');
      expect(content).toContain('export const isAdminOnlyField');
      expect(content).toContain("return hasSecurityLevel(modelName, fieldName, 'sensitive')");
      expect(content).toContain("return hasSecurityLevel(modelName, fieldName, 'never-expose')");
      expect(content).toContain("return hasSecurityLevel(modelName, fieldName, 'admin-only')");
    });

    it('should generate getFieldSecurityLevel function', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain('export const getFieldSecurityLevel');
      expect(content).toContain(
        "if (hasSecurityLevel(modelName, fieldName, 'never-expose')) return 'never-expose'",
      );
      expect(content).toContain(
        "if (hasSecurityLevel(modelName, fieldName, 'admin-only')) return 'admin-only'",
      );
      expect(content).toContain(
        "if (hasSecurityLevel(modelName, fieldName, 'sensitive')) return 'sensitive'",
      );
      expect(content).toContain("return 'public'");
    });
  });

  describe('Field Filtering Functions', () => {
    it('should generate omitFieldsBySecurityLevel function', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain('export const omitFieldsBySecurityLevel');
      expect(content).toContain(
        "excludeSecurityLevels: SecurityLevel[] = ['sensitive', 'admin-only', 'never-expose']",
      );
      expect(content).toContain('const result = { ...obj } as T');
      expect(content).toContain(
        'const modelFields = allFieldsBySecurityLevel[modelName as string]',
      );
      expect(content).toContain('excludeSecurityLevels.forEach(level => {');
      expect(content).toContain(
        "const fieldsToRemove = modelFields[level === 'admin-only' ? 'adminOnly' : level] || []",
      );
      expect(content).toContain('delete (result as Record<string, unknown>)[fieldName]');
    });

    it('should generate legacy omitSensitiveFields function', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain('export const omitSensitiveFields');
      expect(content).toContain(
        "return omitFieldsBySecurityLevel(obj, modelName, ['sensitive']) as any",
      );
    });

    it('should generate pickSafeFields function', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain('export const pickSafeFields');
      expect(content).toContain('allowedSensitiveFields: Array<FieldNameForModel<M>> = []');
      expect(content).toContain(
        'const sensitiveFields = getSensitiveFields(modelName) as readonly string[]',
      );
      expect(content).toContain(
        'const isSensitive = (sensitiveFields as readonly string[]).includes(key)',
      );
      expect(content).toContain(
        'const isExplicitlyAllowed = (allowedSensitiveFields as readonly string[]).includes(key)',
      );
      expect(content).toContain('if (!isSensitive || isExplicitlyAllowed)');
    });
  });

  describe('Role-Based Access Control', () => {
    it('should generate getRoleBasedFieldAccess function', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain('export const getRoleBasedFieldAccess');
      expect(content).toContain("userRole: UserRole = 'ANONYMOUS'");
      expect(content).toContain('const roleSecurityAccess: Record<UserRole, SecurityLevel[]>');

      // Check role definitions
      expect(content).toContain("ADMIN: ['public', 'sensitive', 'admin-only']");
      expect(content).toContain("MODERATOR: ['public', 'sensitive']");
      expect(content).toContain("EXPERT: ['public', 'sensitive']");
      expect(content).toContain("USER: ['public']");
      expect(content).toContain("ANONYMOUS: ['public']");

      expect(content).toContain("const allowedLevels = roleSecurityAccess[userRole] || ['public']");
      expect(content).toContain(
        "const excludedLevels = (['public', 'sensitive', 'admin-only', 'never-expose'] as SecurityLevel[])",
      );
      expect(content).toContain('.filter(level => !allowedLevels.includes(level))');

      // Never-expose always excluded
      expect(content).toContain("if (!excludedLevels.includes('never-expose'))");
      expect(content).toContain("excludedLevels.push('never-expose')");
    });

    it('should generate createSecureSelector function', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain('export const createSecureSelector');
      expect(content).toContain(
        'const { excludedSecurityLevels } = getRoleBasedFieldAccess(modelName, userRole)',
      );

      // Check returned object structure
      expect(content).toContain('filterByRole: <T extends Record<string, unknown>>(obj: T) =>');
      expect(content).toContain(
        'omitFieldsBySecurityLevel(obj, modelName, excludedSecurityLevels)',
      );

      expect(content).toContain('omitSensitive: <T extends Record<string, unknown>>(obj: T) =>');
      expect(content).toContain('omitSensitiveFields(obj, modelName)');

      expect(content).toContain('pickSafe: <T extends Record<string, unknown>>(obj: T) =>');
      expect(content).toContain('pickSafeFields(obj, modelName, [])');

      expect(content).toContain('isSensitive: (fieldName: FieldNameForModel<M>) =>');
      expect(content).toContain('isSensitiveField(modelName, fieldName)');

      expect(content).toContain(
        'getRoleAccess: () => getRoleBasedFieldAccess(modelName, userRole)',
      );
    });
  });

  describe('Generated Documentation', () => {
    it('should include comprehensive JSDoc comments', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      // Check function documentation
      expect(content).toContain(
        '* Check if a field has a specific security level for a given model',
      );
      expect(content).toContain('* @param modelName - The name of the model to check');
      expect(content).toContain('* @param fieldName - The name of the field to check');
      expect(content).toContain('* @param securityLevel - The security level to check for');
      expect(content).toContain('* @returns True if the field has the specified security level');

      expect(content).toContain('* Remove fields based on security level from an object');
      expect(content).toContain('* @param obj - The object to filter');
      expect(content).toContain('* @param excludeSecurityLevels - Security levels to exclude');

      expect(content).toContain('* Create a type-safe field selector based on user permissions');
      expect(content).toContain(
        '* @param userRole - The role of the user to create a secure selector for',
      );
    });

    it('should include generator attribution', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain('// Generated by memoriaali-sensitive-fields');
      expect(content).toContain('// DO NOT EDIT - This file is automatically generated');
    });
  });

  describe('Type Safety', () => {
    it('should generate proper generic type constraints', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain('<M extends AnyModel>');
      expect(content).toContain('<T extends Record<string, unknown>, M extends AnyModel>');
      expect(content).toContain('FieldNameForModel<M>');
      expect(content).toContain('M extends ModelKey');
      expect(content).toContain('(typeof allSensitiveFields)[M]');
    });

    it('should handle model key constraints properly', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain(
        'M extends ModelKey ? (typeof allSensitiveFields)[M] : readonly string[]',
      );
      expect(content).toContain(
        'M extends ModelKey ? Omit<T, (typeof allSensitiveFields)[M][number]> : T',
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle missing model fields gracefully', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain("if (!modelFields) return securityLevel === 'public'");
      expect(content).toContain('if (!modelFields) return result');
      expect(content).toContain(
        'const map = allSensitiveFields as unknown as Record<string, readonly string[]>',
      );
      expect(content).toContain('return (map[modelName as string] ?? []) as any');
    });

    it('should provide fallback behavior for unknown roles', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain("const allowedLevels = roleSecurityAccess[userRole] || ['public']");
    });
  });

  describe('Integration Features', () => {
    it('should support GDPR constants import', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain('GDPR_CATEGORIES');
      expect(content).toContain('GDPR_PURPOSES');
      expect(content).toContain('GDPR_RETENTION_PERIODS');
    });

    it('should maintain compatibility with existing sensitive fields structure', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      expect(content).toContain('allSensitiveFields');
      expect(content).toContain('allFieldsBySecurityLevel');
      expect(content).toContain('SecurityLevel');
    });
  });

  describe('Function Signatures', () => {
    it('should generate functions with correct parameter and return types', () => {
      const content = fs.readFileSync(utilsFilePath, 'utf8');

      // hasSecurityLevel
      expect(content).toMatch(/hasSecurityLevel.*:\s*boolean/);

      // omitFieldsBySecurityLevel
      expect(content).toMatch(/omitFieldsBySecurityLevel.*:\s*T/);

      // getRoleBasedFieldAccess
      expect(content).toContain('allowedSecurityLevels: allowedLevels');
      expect(content).toContain('excludedSecurityLevels: excludedLevels');

      // createSecureSelector return type structure
      expect(content).toContain('filterByRole:');
      expect(content).toContain('omitSensitive:');
      expect(content).toContain('pickSafe:');
      expect(content).toContain('isSensitive:');
      expect(content).toContain('isNeverExpose:');
      expect(content).toContain('isAdminOnly:');
      expect(content).toContain('getSecurityLevel:');
      expect(content).toContain('getRoleAccess:');
    });
  });
});
