/**
 * PROCESS SENSITIVE FIELDS TESTS
 * ===============================
 *
 * Tests for the processSensitiveFields function that extracts multiple
 * annotation types from Prisma DMMF and creates comprehensive field metadata.
 */

import type { DMMF } from '@prisma/generator-helper';
import { beforeEach, describe, expect, it } from 'vitest';
import { processSensitiveFields } from '../../../generators/utils/process-sensitive-fields.js';

// Minimal DMMF factory to satisfy ReadonlyDeep types and avoid mutating readonly fields
const makeDmmf = (models: DMMF.Model[]): DMMF.Document => ({
  datamodel: {
    models,
    enums: [],
    types: [],
    indexes: [],
  },
  schema: {
    inputObjectTypes: { prisma: [] },
    outputObjectTypes: { model: [], prisma: [] },
    enumTypes: { prisma: [] },
    fieldRefTypes: { prisma: [] },
  },
  mappings: { modelOperations: [], otherOperations: { read: [], write: [] } },
});

describe('processSensitiveFields', () => {
  let mockDmmf: DMMF.Document;

  beforeEach(() => {
    // Create a base mock DMMF structure
    mockDmmf = makeDmmf([]);
  });

  describe('Basic Field Processing', () => {
    it('should process model with @sensitive fields', () => {
      mockDmmf = makeDmmf([
        {
          name: 'User',
          dbName: null,
          schema: null,
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
              documentation: 'User ID - public field',
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
              documentation: 'User email @sensitive',
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
              documentation: 'Password hash @never-expose',
            },
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
          isGenerated: false,
        },
      ]);

      const result = processSensitiveFields(mockDmmf);

      expect(result).toHaveProperty('User');
      expect(result.User.modelName).toBe('User');
      expect(result.User.allFields).toEqual(['id', 'email', 'hashedPassword']);
      expect(result.User.fieldsWithAnnotations).toHaveLength(2);

      // Check field metadata structure
      const emailField = result.User.fieldsWithAnnotations.find((f) => f.name === 'email');
      expect(emailField).toBeDefined();
      expect(emailField?.securityLevel).toBe('sensitive');
      expect(emailField?.isSensitive).toBe(true);
      expect(emailField?.isNeverExpose).toBe(false);
      expect(emailField?.isAdminOnly).toBe(false);

      const passwordField = result.User.fieldsWithAnnotations.find(
        (f) => f.name === 'hashedPassword',
      );
      expect(passwordField).toBeDefined();
      expect(passwordField?.securityLevel).toBe('never-expose');
      expect(passwordField?.isSensitive).toBe(false);
      expect(passwordField?.isNeverExpose).toBe(true);
      expect(passwordField?.isAdminOnly).toBe(false);
    });

    it('should process fields with GDPR annotations', () => {
      mockDmmf = makeDmmf([
        {
          name: 'User',
          dbName: null,
          schema: null,
          fields: [
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
                'User email @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(5_YEARS)',
            },
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
          isGenerated: false,
        },
      ]);

      const result = processSensitiveFields(mockDmmf);

      const emailField = result.User.fieldsWithAnnotations[0];
      expect(emailField.gdpr).toEqual({
        category: 'PERSONAL',
        purpose: 'AUTHENTICATION',
        retention: '5_YEARS',
      });

      expect(result.User.gdprFields).toHaveLength(1);
      expect(result.User.gdprFields[0].name).toBe('email');
    });

    it('should organize fields by security level', () => {
      mockDmmf = makeDmmf([
        {
          name: 'User',
          dbName: null,
          schema: null,
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
              documentation: 'User ID - no annotation (public)',
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
              documentation: 'User email @sensitive',
            },
            {
              name: 'internalNotes',
              kind: 'scalar',
              isList: false,
              isRequired: false,
              isUnique: false,
              isId: false,
              isReadOnly: false,
              hasDefaultValue: false,
              type: 'String',
              isGenerated: false,
              isUpdatedAt: false,
              documentation: 'Internal admin notes @admin-only',
            },
            {
              name: 'systemKey',
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
              documentation: 'System encryption key @never-expose',
            },
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
          isGenerated: false,
        },
      ]);

      const result = processSensitiveFields(mockDmmf);

      expect(result.User.fieldsBySecurityLevel.public).toHaveLength(0);
      expect(result.User.fieldsBySecurityLevel.sensitive).toHaveLength(1);
      expect(result.User.fieldsBySecurityLevel.adminOnly).toHaveLength(1);
      expect(result.User.fieldsBySecurityLevel.neverExpose).toHaveLength(1);

      expect(result.User.fieldsBySecurityLevel.sensitive[0].name).toBe('email');
      expect(result.User.fieldsBySecurityLevel.adminOnly[0].name).toBe('internalNotes');
      expect(result.User.fieldsBySecurityLevel.neverExpose[0].name).toBe('systemKey');
    });
  });

  describe('Multiple Models', () => {
    it('should process multiple models with different annotation patterns', () => {
      mockDmmf = makeDmmf([
        {
          name: 'User',
          dbName: null,
          schema: null,
          fields: [
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
              documentation: 'User email @sensitive',
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
          schema: null,
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
              documentation: 'Document ID',
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
                'Document metadata @admin-only @gdpr.category(TECHNICAL) @gdpr.purpose(COMPLIANCE)',
            },
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
          isGenerated: false,
        },
      ]);

      const result = processSensitiveFields(mockDmmf);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toHaveProperty('User');
      expect(result).toHaveProperty('Document');

      expect(result.User.fieldsWithAnnotations).toHaveLength(1);
      expect(result.Document.fieldsWithAnnotations).toHaveLength(1);

      expect(result.User.fieldsWithAnnotations[0].securityLevel).toBe('sensitive');
      expect(result.Document.fieldsWithAnnotations[0].securityLevel).toBe('admin-only');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain legacy sensitiveFields array', () => {
      mockDmmf = makeDmmf([
        {
          name: 'User',
          dbName: null,
          schema: null,
          fields: [
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
              documentation: 'User email @sensitive',
            },
            {
              name: 'phone',
              kind: 'scalar',
              isList: false,
              isRequired: false,
              isUnique: false,
              isId: false,
              isReadOnly: false,
              hasDefaultValue: false,
              type: 'String',
              isGenerated: false,
              isUpdatedAt: false,
              documentation: 'User phone @admin-only',
            },
            {
              name: 'secret',
              kind: 'scalar',
              isList: false,
              isRequired: false,
              isUnique: false,
              isId: false,
              isReadOnly: false,
              hasDefaultValue: false,
              type: 'String',
              isGenerated: false,
              isUpdatedAt: false,
              documentation: 'User secret @never-expose',
            },
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
          isGenerated: false,
        },
      ]);

      const result = processSensitiveFields(mockDmmf);

      // Legacy compatibility arrays
      expect(result.User.sensitiveFields).toHaveLength(1);
      expect(result.User.sensitiveFields[0].name).toBe('email');
      expect(result.User.adminOnlyFields).toHaveLength(1);
      expect(result.User.adminOnlyFields[0].name).toBe('phone');
      expect(result.User.neverExposeFields).toHaveLength(1);
      expect(result.User.neverExposeFields[0].name).toBe('secret');
    });
  });

  describe('Error Handling', () => {
    it('should handle fields without documentation', () => {
      mockDmmf = makeDmmf([
        {
          name: 'User',
          dbName: null,
          schema: null,
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
              // No documentation field
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
              documentation: 'User email @sensitive',
            },
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
          isGenerated: false,
        },
      ]);

      const result = processSensitiveFields(mockDmmf);

      // Should only process the field with documentation
      expect(result.User.fieldsWithAnnotations).toHaveLength(1);
      expect(result.User.fieldsWithAnnotations[0].name).toBe('email');
    });

    it('should handle empty documentation comments', () => {
      mockDmmf = makeDmmf([
        {
          name: 'User',
          dbName: null,
          schema: null,
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
              documentation: '', // Empty documentation
            },
            {
              name: 'name',
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
              documentation: 'Just a comment without annotations',
            },
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
          isGenerated: false,
        },
      ]);

      const result = processSensitiveFields(mockDmmf);

      // Should not process models without annotated fields
      expect(result).toEqual({});
    });

    it('should propagate annotation validation errors', () => {
      mockDmmf = makeDmmf([
        {
          name: 'User',
          dbName: null,
          schema: null,
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
              documentation: 'Field with conflicts @sensitive @never-expose',
            },
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
          isGenerated: false,
        },
      ]);

      expect(() => processSensitiveFields(mockDmmf)).toThrow(/conflicting security annotations/);
    });
  });

  describe('Field Metadata Structure', () => {
    it('should create comprehensive field metadata', () => {
      mockDmmf = makeDmmf([
        {
          name: 'User',
          dbName: null,
          schema: null,
          fields: [
            {
              name: 'tags',
              kind: 'scalar',
              isList: true,
              isRequired: false,
              isUnique: false,
              isId: false,
              isReadOnly: false,
              hasDefaultValue: false,
              type: 'String',
              isGenerated: false,
              isUpdatedAt: false,
              documentation:
                'User tags @sensitive @gdpr.category(BEHAVIORAL) @gdpr.purpose(ANALYTICS) @gdpr.retention(2_YEARS)',
            },
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
          isGenerated: false,
        },
      ]);

      const result = processSensitiveFields(mockDmmf);
      const fieldMetadata = result.User.fieldsWithAnnotations[0];

      expect(fieldMetadata).toMatchObject({
        name: 'tags',
        type: 'String',
        isOptional: true, // because isRequired is false
        isList: true,
        securityLevel: 'sensitive',
        isSensitive: true,
        isNeverExpose: false,
        isAdminOnly: false,
        gdpr: {
          category: 'BEHAVIORAL',
          purpose: 'ANALYTICS',
          retention: '2_YEARS',
        },
      });

      expect(fieldMetadata.annotations).toHaveLength(4);
    });
  });

  describe('Edge Cases', () => {
    it('should handle models with no fields', () => {
      mockDmmf = makeDmmf([
        {
          name: 'EmptyModel',
          dbName: null,
          schema: null,
          fields: [],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
          isGenerated: false,
        },
      ]);

      const result = processSensitiveFields(mockDmmf);
      expect(result).toEqual({});
    });

    it('should handle DMMF with no models', () => {
      mockDmmf = makeDmmf([]);

      const result = processSensitiveFields(mockDmmf);
      expect(result).toEqual({});
    });

    it('should handle complex field types', () => {
      mockDmmf = makeDmmf([
        {
          name: 'ComplexModel',
          dbName: null,
          schema: null,
          fields: [
            {
              name: 'jsonData',
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
              documentation: 'Complex JSON data @admin-only',
            },
            {
              name: 'enumField',
              kind: 'enum',
              isList: false,
              isRequired: true,
              isUnique: false,
              isId: false,
              isReadOnly: false,
              hasDefaultValue: true,
              type: 'UserRole',
              isGenerated: false,
              isUpdatedAt: false,
              documentation: 'User role enum @sensitive',
            },
          ],
          primaryKey: null,
          uniqueFields: [],
          uniqueIndexes: [],
          isGenerated: false,
        },
      ]);

      const result = processSensitiveFields(mockDmmf);

      expect(result.ComplexModel.fieldsWithAnnotations).toHaveLength(2);
      expect(
        result.ComplexModel.fieldsWithAnnotations.find((f) => f.name === 'jsonData')?.type,
      ).toBe('Json');
      expect(
        result.ComplexModel.fieldsWithAnnotations.find((f) => f.name === 'enumField')?.type,
      ).toBe('UserRole');
    });
  });
});
