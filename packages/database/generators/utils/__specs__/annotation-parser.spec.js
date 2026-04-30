/* eslint-disable no-undef */
/**
 * Comprehensive unit tests for annotation-parser.js
 *
 * Test Contract:
 * - Tests validate real behavior of the actual annotation parsing system
 * - Uses actual interfaces and data structures from the module
 * - Tests both happy path and edge case scenarios
 * - Validates error conditions and validation logic
 * - Achieves comprehensive code coverage through real behavior testing
 */

import { describe, expect, it } from 'vitest';
import {
  ANNOTATION_TYPES,
  GDPR_CATEGORIES,
  GDPR_PURPOSES,
  GDPR_RETENTION_PERIODS,
  determineSecurityLevel,
  extractGdprInfo,
  getAnnotationValue,
  hasAnnotation,
  parseAnnotations,
  validateAnnotations,
} from '../annotation-parser.js';

describe('annotation-parser.js', () => {
  // Store original console.warn to restore later
  const originalWarn = console.warn;
  let consoleCalls = [];

  // Simple mock without vitest vi
  function mockConsoleWarn() {
    consoleCalls = [];
    console.warn = (...args) => {
      consoleCalls.push(args.join(' '));
    };
  }

  function restoreConsoleWarn() {
    console.warn = originalWarn;
    consoleCalls = [];
  }

  function expectConsoleWarn(expectedMessage) {
    const found = consoleCalls.some((call) => call.includes(expectedMessage));
    if (!found) {
      throw new Error(
        `Expected console.warn to contain "${expectedMessage}", but got: ${consoleCalls.join(', ')}`,
      );
    }
  }

  describe('parseAnnotations', () => {
    describe('Contract: Parse simple annotations without parameters', () => {
      it('should parse @sensitive annotation correctly', () => {
        const comment = '/// @sensitive';
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: 'sensitive',
          value: true,
          raw: '@sensitive',
        });
      });

      it('should parse @never-expose annotation correctly', () => {
        const comment = '/// @never-expose';
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: 'never-expose',
          value: true,
          raw: '@never-expose',
        });
      });

      it('should parse @admin-only annotation correctly', () => {
        const comment = '/// @admin-only';
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: 'admin-only',
          value: true,
          raw: '@admin-only',
        });
      });

      it('should parse multiple simple annotations in one comment', () => {
        const comment = '/// @sensitive @admin-only @never-expose';
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(3);
        expect(result).toContainEqual({
          type: 'sensitive',
          value: true,
          raw: '@sensitive',
        });
        expect(result).toContainEqual({
          type: 'admin-only',
          value: true,
          raw: '@admin-only',
        });
        expect(result).toContainEqual({
          type: 'never-expose',
          value: true,
          raw: '@never-expose',
        });
      });
    });

    describe('Contract: Parse GDPR annotations with parameters', () => {
      it('should parse @gdpr.category annotation with valid parameter', () => {
        const comment = '/// @gdpr.category(PERSONAL)';
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: 'gdpr.category',
          value: 'PERSONAL',
          raw: '@gdpr.category(PERSONAL)',
        });
      });

      it('should parse @gdpr.purpose annotation with valid parameter', () => {
        const comment = '/// @gdpr.purpose(AUTHENTICATION)';
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: 'gdpr.purpose',
          value: 'AUTHENTICATION',
          raw: '@gdpr.purpose(AUTHENTICATION)',
        });
      });

      it('should parse @gdpr.retention annotation with valid parameter', () => {
        const comment = '/// @gdpr.retention(1_YEAR)';
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: 'gdpr.retention',
          value: '1_YEAR',
          raw: '@gdpr.retention(1_YEAR)',
        });
      });

      it('should handle quoted GDPR parameters correctly', () => {
        const comment = '/// @gdpr.category("PERSONAL") @gdpr.purpose(\'AUTHENTICATION\')';
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
          type: 'gdpr.category',
          value: 'PERSONAL',
          raw: '@gdpr.category("PERSONAL")',
        });
        expect(result[1]).toEqual({
          type: 'gdpr.purpose',
          value: 'AUTHENTICATION',
          raw: "@gdpr.purpose('AUTHENTICATION')",
        });
      });

      it('should handle case-insensitive GDPR parameters', () => {
        const comment = '/// @gdpr.category(personal) @gdpr.purpose(authentication)';
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(2);
        expect(result[0].value).toBe('PERSONAL');
        expect(result[1].value).toBe('AUTHENTICATION');
      });

      it('should handle GDPR parameters with extra whitespace', () => {
        const comment = '/// @gdpr.category( PERSONAL ) @gdpr.purpose(  AUTHENTICATION  )';
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(2);
        expect(result[0].value).toBe('PERSONAL');
        expect(result[1].value).toBe('AUTHENTICATION');
      });
    });

    describe('Contract: Parse complex mixed annotations', () => {
      it('should parse all annotation types in a single comment', () => {
        const comment =
          '/// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(COMMUNICATION) @gdpr.retention(UNTIL_DELETION_REQUEST)';
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(4);
        expect(result).toContainEqual({
          type: 'sensitive',
          value: true,
          raw: '@sensitive',
        });
        expect(result).toContainEqual({
          type: 'gdpr.category',
          value: 'PERSONAL',
          raw: '@gdpr.category(PERSONAL)',
        });
        expect(result).toContainEqual({
          type: 'gdpr.purpose',
          value: 'COMMUNICATION',
          raw: '@gdpr.purpose(COMMUNICATION)',
        });
        expect(result).toContainEqual({
          type: 'gdpr.retention',
          value: 'UNTIL_DELETION_REQUEST',
          raw: '@gdpr.retention(UNTIL_DELETION_REQUEST)',
        });
      });

      it('should parse annotations from complex comment with documentation', () => {
        const comment = `/// User email address
        /// Used for notifications and login
        /// @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(COMMUNICATION)`;
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(3);
        expect(result).toContainEqual({
          type: 'sensitive',
          value: true,
          raw: '@sensitive',
        });
        expect(result).toContainEqual({
          type: 'gdpr.category',
          value: 'PERSONAL',
          raw: '@gdpr.category(PERSONAL)',
        });
        expect(result).toContainEqual({
          type: 'gdpr.purpose',
          value: 'COMMUNICATION',
          raw: '@gdpr.purpose(COMMUNICATION)',
        });
      });
    });

    describe('Contract: Handle edge cases and invalid input', () => {
      it('should return empty array for null input', () => {
        const result = parseAnnotations(null);
        expect(result).toEqual([]);
      });

      it('should return empty array for undefined input', () => {
        const result = parseAnnotations(undefined);
        expect(result).toEqual([]);
      });

      it('should return empty array for non-string input', () => {
        const result = parseAnnotations(123);
        expect(result).toEqual([]);
      });

      it('should return empty array for empty string', () => {
        const result = parseAnnotations('');
        expect(result).toEqual([]);
      });

      it('should return empty array for comment without annotations', () => {
        const comment = '/// This is just a regular comment';
        const result = parseAnnotations(comment);
        expect(result).toEqual([]);
      });

      it('should handle malformed annotations gracefully', () => {
        const comment = '/// @invalid-annotation @sensitive @broken(';
        const result = parseAnnotations(comment);

        // Should only find the valid @sensitive annotation
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: 'sensitive',
          value: true,
          raw: '@sensitive',
        });
      });

      it('should ignore annotations without @ prefix', () => {
        const comment = '/// sensitive never-expose @admin-only';
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('admin-only');
      });
    });

    describe('Contract: Validate GDPR parameter validation through parsing', () => {
      describe('GDPR Category validation', () => {
        it('should accept all valid GDPR categories', () => {
          const validCategories = Object.values(GDPR_CATEGORIES);

          validCategories.forEach((category) => {
            const comment = `/// @gdpr.category(${category})`;
            const result = parseAnnotations(comment);

            expect(result).toHaveLength(1);
            expect(result[0].value).toBe(category);
          });
        });

        it('should throw error for invalid GDPR category', () => {
          const comment = '/// @gdpr.category(INVALID_CATEGORY)';

          expect(() => parseAnnotations(comment)).toThrow(
            /Invalid GDPR category 'INVALID_CATEGORY'/,
          );
        });
      });

      describe('GDPR Purpose validation', () => {
        it('should accept all valid GDPR purposes', () => {
          const validPurposes = Object.values(GDPR_PURPOSES);

          validPurposes.forEach((purpose) => {
            const comment = `/// @gdpr.purpose(${purpose})`;
            const result = parseAnnotations(comment);

            expect(result).toHaveLength(1);
            expect(result[0].value).toBe(purpose);
          });
        });

        it('should throw error for invalid GDPR purpose', () => {
          const comment = '/// @gdpr.purpose(INVALID_PURPOSE)';

          expect(() => parseAnnotations(comment)).toThrow(/Invalid GDPR purpose 'INVALID_PURPOSE'/);
        });
      });

      describe('GDPR Retention validation', () => {
        it('should accept all valid GDPR retention periods', () => {
          const validRetentions = Object.values(GDPR_RETENTION_PERIODS);

          validRetentions.forEach((retention) => {
            const comment = `/// @gdpr.retention(${retention})`;
            const result = parseAnnotations(comment);

            expect(result).toHaveLength(1);
            expect(result[0].value).toBe(retention);
          });
        });

        it('should throw error for invalid GDPR retention period', () => {
          const comment = '/// @gdpr.retention(INVALID_RETENTION)';

          expect(() => parseAnnotations(comment)).toThrow(
            /Invalid GDPR retention period 'INVALID_RETENTION'/,
          );
        });
      });

      it('should provide helpful error messages with valid options', () => {
        const comment = '/// @gdpr.category(WRONG)';

        expect(() => parseAnnotations(comment)).toThrow(
          new RegExp(`Valid categories: ${Object.values(GDPR_CATEGORIES).join(', ')}`),
        );
      });

      it('should handle unknown GDPR types gracefully (edge case for internal validation)', () => {
        // This tests the defensive default case in validateGdprParameter
        // We can't directly call the internal function, but we can simulate the condition
        // by temporarily modifying the regex pattern to capture an unknown type

        // Create a comment that would theoretically match if the regex supported unknown types
        const comment = '/// @gdpr.unknown(VALUE)';

        // The current regex won't match this, so it returns empty array
        const result = parseAnnotations(comment);
        expect(result).toEqual([]);

        // Note: The actual default case line 266 is defensive code for internal consistency
        // and would only be reached if the regex patterns were modified to include unknown types
      });
    });

    describe('Contract: Test annotation boundary and whitespace handling', () => {
      it('should handle annotations at word boundaries', () => {
        const comment = '/// @sensitivedata @admin-onlyuser @sensitive';
        const result = parseAnnotations(comment);

        // Should only match @sensitive (exact word boundary match)
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('sensitive');
      });

      it('should handle multiple whitespace between annotations', () => {
        const comment = '/// @sensitive    @admin-only     @never-expose';
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(3);
      });

      it('should handle newlines and multiple line comments', () => {
        const comment = `/// First line @sensitive
        /// Second line @admin-only
        /// Third line @gdpr.category(PERSONAL)`;
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(3);
      });
    });
  });

  describe('hasAnnotation', () => {
    describe('Contract: Check if specific annotation type exists in array', () => {
      const sampleAnnotations = [
        { type: 'sensitive', value: true, raw: '@sensitive' },
        { type: 'gdpr.category', value: 'PERSONAL', raw: '@gdpr.category(PERSONAL)' },
        { type: 'admin-only', value: true, raw: '@admin-only' },
      ];

      it('should return true when annotation exists', () => {
        expect(hasAnnotation(sampleAnnotations, 'sensitive')).toBe(true);
        expect(hasAnnotation(sampleAnnotations, 'gdpr.category')).toBe(true);
        expect(hasAnnotation(sampleAnnotations, 'admin-only')).toBe(true);
      });

      it('should return false when annotation does not exist', () => {
        expect(hasAnnotation(sampleAnnotations, 'never-expose')).toBe(false);
        expect(hasAnnotation(sampleAnnotations, 'gdpr.purpose')).toBe(false);
        expect(hasAnnotation(sampleAnnotations, 'non-existent')).toBe(false);
      });

      it('should handle empty annotations array', () => {
        expect(hasAnnotation([], 'sensitive')).toBe(false);
      });

      it('should use exact type matching', () => {
        expect(hasAnnotation(sampleAnnotations, 'gdpr')).toBe(false);
        expect(hasAnnotation(sampleAnnotations, 'admin')).toBe(false);
        expect(hasAnnotation(sampleAnnotations, 'sensitive-data')).toBe(false);
      });
    });
  });

  describe('getAnnotationValue', () => {
    describe('Contract: Get value of specific annotation type', () => {
      const sampleAnnotations = [
        { type: 'sensitive', value: true, raw: '@sensitive' },
        { type: 'gdpr.category', value: 'PERSONAL', raw: '@gdpr.category(PERSONAL)' },
        { type: 'gdpr.purpose', value: 'AUTHENTICATION', raw: '@gdpr.purpose(AUTHENTICATION)' },
      ];

      it('should return correct value when annotation exists', () => {
        expect(getAnnotationValue(sampleAnnotations, 'sensitive')).toBe(true);
        expect(getAnnotationValue(sampleAnnotations, 'gdpr.category')).toBe('PERSONAL');
        expect(getAnnotationValue(sampleAnnotations, 'gdpr.purpose')).toBe('AUTHENTICATION');
      });

      it('should return null when annotation does not exist', () => {
        expect(getAnnotationValue(sampleAnnotations, 'never-expose')).toBe(null);
        expect(getAnnotationValue(sampleAnnotations, 'gdpr.retention')).toBe(null);
        expect(getAnnotationValue(sampleAnnotations, 'non-existent')).toBe(null);
      });

      it('should handle empty annotations array', () => {
        expect(getAnnotationValue([], 'sensitive')).toBe(null);
      });

      it('should return first match when duplicate types exist', () => {
        const duplicateAnnotations = [
          { type: 'sensitive', value: true, raw: '@sensitive' },
          { type: 'sensitive', value: false, raw: '@sensitive' }, // Duplicate for test
        ];

        expect(getAnnotationValue(duplicateAnnotations, 'sensitive')).toBe(true);
      });
    });
  });

  describe('determineSecurityLevel', () => {
    describe('Contract: Determine highest security level based on annotations', () => {
      it('should return "never-expose" as highest priority', () => {
        const annotations = [
          { type: 'sensitive', value: true, raw: '@sensitive' },
          { type: 'admin-only', value: true, raw: '@admin-only' },
          { type: 'never-expose', value: true, raw: '@never-expose' },
        ];

        expect(determineSecurityLevel(annotations)).toBe('never-expose');
      });

      it('should return "admin-only" when no never-expose', () => {
        const annotations = [
          { type: 'sensitive', value: true, raw: '@sensitive' },
          { type: 'admin-only', value: true, raw: '@admin-only' },
        ];

        expect(determineSecurityLevel(annotations)).toBe('admin-only');
      });

      it('should return "sensitive" when only sensitive annotation exists', () => {
        const annotations = [
          { type: 'sensitive', value: true, raw: '@sensitive' },
          { type: 'gdpr.category', value: 'PERSONAL', raw: '@gdpr.category(PERSONAL)' },
        ];

        expect(determineSecurityLevel(annotations)).toBe('sensitive');
      });

      it('should return "public" when no security annotations exist', () => {
        const annotations = [
          { type: 'gdpr.category', value: 'PERSONAL', raw: '@gdpr.category(PERSONAL)' },
          { type: 'gdpr.purpose', value: 'COMMUNICATION', raw: '@gdpr.purpose(COMMUNICATION)' },
        ];

        expect(determineSecurityLevel(annotations)).toBe('public');
      });

      it('should return "public" for empty annotations array', () => {
        expect(determineSecurityLevel([])).toBe('public');
      });

      it('should use constant values for security level determination', () => {
        const neverExposeAnnotations = [
          { type: ANNOTATION_TYPES.NEVER_EXPOSE, value: true, raw: '@never-expose' },
        ];
        expect(determineSecurityLevel(neverExposeAnnotations)).toBe('never-expose');

        const adminOnlyAnnotations = [
          { type: ANNOTATION_TYPES.ADMIN_ONLY, value: true, raw: '@admin-only' },
        ];
        expect(determineSecurityLevel(adminOnlyAnnotations)).toBe('admin-only');

        const sensitiveAnnotations = [
          { type: ANNOTATION_TYPES.SENSITIVE, value: true, raw: '@sensitive' },
        ];
        expect(determineSecurityLevel(sensitiveAnnotations)).toBe('sensitive');
      });
    });
  });

  describe('extractGdprInfo', () => {
    describe('Contract: Extract GDPR-specific annotation values', () => {
      it('should extract complete GDPR information when all annotations present', () => {
        const annotations = [
          { type: 'sensitive', value: true, raw: '@sensitive' },
          { type: 'gdpr.category', value: 'PERSONAL', raw: '@gdpr.category(PERSONAL)' },
          { type: 'gdpr.purpose', value: 'COMMUNICATION', raw: '@gdpr.purpose(COMMUNICATION)' },
          { type: 'gdpr.retention', value: '1_YEAR', raw: '@gdpr.retention(1_YEAR)' },
        ];

        const result = extractGdprInfo(annotations);

        expect(result).toEqual({
          category: 'PERSONAL',
          purpose: 'COMMUNICATION',
          retention: '1_YEAR',
        });
      });

      it('should return partial GDPR info when some annotations missing', () => {
        const annotations = [
          { type: 'sensitive', value: true, raw: '@sensitive' },
          { type: 'gdpr.category', value: 'TECHNICAL', raw: '@gdpr.category(TECHNICAL)' },
        ];

        const result = extractGdprInfo(annotations);

        expect(result).toEqual({
          category: 'TECHNICAL',
          purpose: null,
          retention: null,
        });
      });

      it('should return all null values when no GDPR annotations present', () => {
        const annotations = [
          { type: 'sensitive', value: true, raw: '@sensitive' },
          { type: 'admin-only', value: true, raw: '@admin-only' },
        ];

        const result = extractGdprInfo(annotations);

        expect(result).toEqual({
          category: null,
          purpose: null,
          retention: null,
        });
      });

      it('should handle empty annotations array', () => {
        const result = extractGdprInfo([]);

        expect(result).toEqual({
          category: null,
          purpose: null,
          retention: null,
        });
      });

      it('should use correct annotation type constants', () => {
        const annotations = [
          { type: ANNOTATION_TYPES.GDPR_CATEGORY, value: 'HEALTH', raw: '@gdpr.category(HEALTH)' },
          {
            type: ANNOTATION_TYPES.GDPR_PURPOSE,
            value: 'RESEARCH',
            raw: '@gdpr.purpose(RESEARCH)',
          },
          {
            type: ANNOTATION_TYPES.GDPR_RETENTION,
            value: '10_YEARS',
            raw: '@gdpr.retention(10_YEARS)',
          },
        ];

        const result = extractGdprInfo(annotations);

        expect(result).toEqual({
          category: 'HEALTH',
          purpose: 'RESEARCH',
          retention: '10_YEARS',
        });
      });
    });
  });

  describe('validateAnnotations', () => {
    describe('Contract: Validate annotation consistency and conflicts', () => {
      const testFieldName = 'testField';
      const testModelName = 'TestModel';

      it('should pass validation for single security annotation', () => {
        const annotations = [
          { type: 'sensitive', value: true, raw: '@sensitive' },
          { type: 'gdpr.category', value: 'PERSONAL', raw: '@gdpr.category(PERSONAL)' },
        ];

        expect(() => validateAnnotations(annotations, testFieldName, testModelName)).not.toThrow();
        expect(validateAnnotations(annotations, testFieldName, testModelName)).toBe(true);
      });

      it('should pass validation for no security annotations', () => {
        const annotations = [
          { type: 'gdpr.category', value: 'TECHNICAL', raw: '@gdpr.category(TECHNICAL)' },
        ];

        expect(() => validateAnnotations(annotations, testFieldName, testModelName)).not.toThrow();
        expect(validateAnnotations(annotations, testFieldName, testModelName)).toBe(true);
      });

      it('should pass validation for empty annotations', () => {
        expect(() => validateAnnotations([], testFieldName, testModelName)).not.toThrow();
        expect(validateAnnotations([], testFieldName, testModelName)).toBe(true);
      });

      it('should throw error for conflicting security annotations', () => {
        const conflictingAnnotations = [
          { type: 'sensitive', value: true, raw: '@sensitive' },
          { type: 'admin-only', value: true, raw: '@admin-only' },
        ];

        expect(() =>
          validateAnnotations(conflictingAnnotations, testFieldName, testModelName),
        ).toThrow(
          /Field 'testField' in model 'TestModel' has conflicting security annotations: sensitive, admin-only/,
        );
      });

      it('should throw error for multiple conflicting security annotations', () => {
        const conflictingAnnotations = [
          { type: 'sensitive', value: true, raw: '@sensitive' },
          { type: 'admin-only', value: true, raw: '@admin-only' },
          { type: 'never-expose', value: true, raw: '@never-expose' },
        ];

        expect(() =>
          validateAnnotations(conflictingAnnotations, testFieldName, testModelName),
        ).toThrow(/has conflicting security annotations: sensitive, admin-only, never-expose/);
      });

      it('should warn when GDPR annotations exist without security annotation', () => {
        const gdprOnlyAnnotations = [
          { type: 'gdpr.category', value: 'PERSONAL', raw: '@gdpr.category(PERSONAL)' },
          { type: 'gdpr.purpose', value: 'COMMUNICATION', raw: '@gdpr.purpose(COMMUNICATION)' },
        ];

        mockConsoleWarn();
        validateAnnotations(gdprOnlyAnnotations, testFieldName, testModelName);
        expectConsoleWarn(
          "Warning: Field 'testField' in model 'TestModel' has GDPR annotations but no security annotation",
        );
        restoreConsoleWarn();
      });

      it('should not warn when GDPR annotations exist with security annotation', () => {
        const combinedAnnotations = [
          { type: 'sensitive', value: true, raw: '@sensitive' },
          { type: 'gdpr.category', value: 'PERSONAL', raw: '@gdpr.category(PERSONAL)' },
        ];

        mockConsoleWarn();
        validateAnnotations(combinedAnnotations, testFieldName, testModelName);
        expect(consoleCalls).toHaveLength(0);
        restoreConsoleWarn();
      });

      it('should handle different field and model names in error messages', () => {
        const conflictingAnnotations = [
          { type: 'never-expose', value: true, raw: '@never-expose' },
          { type: 'sensitive', value: true, raw: '@sensitive' },
        ];

        expect(() =>
          validateAnnotations(conflictingAnnotations, 'emailField', 'UserModel'),
        ).toThrow(/Field 'emailField' in model 'UserModel'/);
      });

      it('should validate using correct annotation type constants', () => {
        const conflictingAnnotations = [
          { type: ANNOTATION_TYPES.SENSITIVE, value: true, raw: '@sensitive' },
          { type: ANNOTATION_TYPES.NEVER_EXPOSE, value: true, raw: '@never-expose' },
          { type: ANNOTATION_TYPES.ADMIN_ONLY, value: true, raw: '@admin-only' },
        ];

        expect(() =>
          validateAnnotations(conflictingAnnotations, testFieldName, testModelName),
        ).toThrow(/has conflicting security annotations/);
      });
    });

    describe('Contract: Test GDPR consistency validation warnings', () => {
      it('should warn for each GDPR annotation type without security', () => {
        mockConsoleWarn();

        const categoryOnlyAnnotations = [
          { type: 'gdpr.category', value: 'PERSONAL', raw: '@gdpr.category(PERSONAL)' },
        ];
        validateAnnotations(categoryOnlyAnnotations, 'field1', 'Model1');
        expect(consoleCalls).toHaveLength(1);

        const purposeOnlyAnnotations = [
          { type: 'gdpr.purpose', value: 'COMMUNICATION', raw: '@gdpr.purpose(COMMUNICATION)' },
        ];
        validateAnnotations(purposeOnlyAnnotations, 'field2', 'Model2');
        expect(consoleCalls).toHaveLength(2);

        const retentionOnlyAnnotations = [
          { type: 'gdpr.retention', value: '1_YEAR', raw: '@gdpr.retention(1_YEAR)' },
        ];
        validateAnnotations(retentionOnlyAnnotations, 'field3', 'Model3');
        expect(consoleCalls).toHaveLength(3);

        restoreConsoleWarn();
      });

      it('should provide helpful warning message with security annotation suggestions', () => {
        const gdprOnlyAnnotations = [
          { type: 'gdpr.category', value: 'HEALTH', raw: '@gdpr.category(HEALTH)' },
        ];

        mockConsoleWarn();
        validateAnnotations(gdprOnlyAnnotations, 'medicalData', 'PatientModel');
        expectConsoleWarn(
          'Consider adding @sensitive, @admin-only, or @never-expose for data protection',
        );
        restoreConsoleWarn();
      });
    });
  });

  describe('Integration Tests - Real World Scenarios', () => {
    describe('Contract: Complete annotation processing workflows', () => {
      it('should handle typical user model field annotations', () => {
        const emailComment =
          '/// User email address @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(COMMUNICATION) @gdpr.retention(UNTIL_DELETION_REQUEST)';
        const passwordComment =
          '/// Hashed password @never-expose @gdpr.category(TECHNICAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(INDEFINITE)';
        const adminNoteComment =
          '/// Admin internal notes @admin-only @gdpr.category(TECHNICAL) @gdpr.purpose(COMPLIANCE) @gdpr.retention(5_YEARS)';

        // Test email field
        const emailAnnotations = parseAnnotations(emailComment);
        expect(emailAnnotations).toHaveLength(4);
        expect(determineSecurityLevel(emailAnnotations)).toBe('sensitive');
        expect(extractGdprInfo(emailAnnotations)).toEqual({
          category: 'PERSONAL',
          purpose: 'COMMUNICATION',
          retention: 'UNTIL_DELETION_REQUEST',
        });
        expect(() => validateAnnotations(emailAnnotations, 'email', 'User')).not.toThrow();

        // Test password field
        const passwordAnnotations = parseAnnotations(passwordComment);
        expect(passwordAnnotations).toHaveLength(4);
        expect(determineSecurityLevel(passwordAnnotations)).toBe('never-expose');
        expect(extractGdprInfo(passwordAnnotations)).toEqual({
          category: 'TECHNICAL',
          purpose: 'AUTHENTICATION',
          retention: 'INDEFINITE',
        });
        expect(() =>
          validateAnnotations(passwordAnnotations, 'hashedPassword', 'User'),
        ).not.toThrow();

        // Test admin note field
        const adminAnnotations = parseAnnotations(adminNoteComment);
        expect(adminAnnotations).toHaveLength(4);
        expect(determineSecurityLevel(adminAnnotations)).toBe('admin-only');
        expect(extractGdprInfo(adminAnnotations)).toEqual({
          category: 'TECHNICAL',
          purpose: 'COMPLIANCE',
          retention: '5_YEARS',
        });
        expect(() => validateAnnotations(adminAnnotations, 'adminNotes', 'User')).not.toThrow();
      });

      it('should handle healthcare data scenario with sensitive categories', () => {
        const medicalRecordComment =
          '/// Patient medical record @never-expose @gdpr.category(HEALTH) @gdpr.purpose(RESEARCH) @gdpr.retention(10_YEARS)';
        const biometricComment =
          '/// Fingerprint data @admin-only @gdpr.category(BIOMETRIC) @gdpr.purpose(SECURITY) @gdpr.retention(2_YEARS)';

        const medicalAnnotations = parseAnnotations(medicalRecordComment);
        expect(determineSecurityLevel(medicalAnnotations)).toBe('never-expose');
        expect(extractGdprInfo(medicalAnnotations).category).toBe('HEALTH');

        const biometricAnnotations = parseAnnotations(biometricComment);
        expect(determineSecurityLevel(biometricAnnotations)).toBe('admin-only');
        expect(extractGdprInfo(biometricAnnotations).category).toBe('BIOMETRIC');

        expect(() =>
          validateAnnotations(medicalAnnotations, 'medicalRecord', 'Patient'),
        ).not.toThrow();
        expect(() =>
          validateAnnotations(biometricAnnotations, 'fingerprintHash', 'Patient'),
        ).not.toThrow();
      });

      it('should handle financial data with appropriate security levels', () => {
        const bankAccountComment =
          '/// Bank account number @never-expose @gdpr.category(FINANCIAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(5_YEARS)';
        const transactionComment =
          '/// Transaction amount @sensitive @gdpr.category(FINANCIAL) @gdpr.purpose(ANALYTICS) @gdpr.retention(5_YEARS)';

        const bankAnnotations = parseAnnotations(bankAccountComment);
        expect(determineSecurityLevel(bankAnnotations)).toBe('never-expose');
        expect(extractGdprInfo(bankAnnotations)).toEqual({
          category: 'FINANCIAL',
          purpose: 'AUTHENTICATION',
          retention: '5_YEARS',
        });

        const transactionAnnotations = parseAnnotations(transactionComment);
        expect(determineSecurityLevel(transactionAnnotations)).toBe('sensitive');
        expect(extractGdprInfo(transactionAnnotations)).toEqual({
          category: 'FINANCIAL',
          purpose: 'ANALYTICS',
          retention: '5_YEARS',
        });

        expect(() =>
          validateAnnotations(bankAnnotations, 'accountNumber', 'Payment'),
        ).not.toThrow();
        expect(() =>
          validateAnnotations(transactionAnnotations, 'amount', 'Transaction'),
        ).not.toThrow();
      });

      it('should validate complete archival data workflow', () => {
        const archivalComment =
          '/// Historical document metadata @sensitive @gdpr.category(ARCHIVAL) @gdpr.purpose(ARCHIVAL) @gdpr.retention(INDEFINITE)';

        const annotations = parseAnnotations(archivalComment);
        expect(annotations).toHaveLength(4);

        const gdprInfo = extractGdprInfo(annotations);
        expect(gdprInfo.category).toBe('ARCHIVAL');
        expect(gdprInfo.purpose).toBe('ARCHIVAL');
        expect(gdprInfo.retention).toBe('INDEFINITE');

        expect(determineSecurityLevel(annotations)).toBe('sensitive');
        expect(() =>
          validateAnnotations(annotations, 'documentMetadata', 'ArchivalRecord'),
        ).not.toThrow();
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    describe('Contract: Robust error handling and edge case management', () => {
      it('should handle regex state persistence correctly', () => {
        // Test that multiple calls don't interfere with each other
        const comment1 = '/// @sensitive @admin-only';
        const comment2 = '/// @gdpr.category(PERSONAL) @gdpr.purpose(COMMUNICATION)';

        const result1 = parseAnnotations(comment1);
        const result2 = parseAnnotations(comment2);

        expect(result1).toHaveLength(2);
        expect(result2).toHaveLength(2);

        // Verify first parsing doesn't affect second
        expect(result1.map((r) => r.type)).toEqual(['sensitive', 'admin-only']);
        expect(result2.map((r) => r.type)).toEqual(['gdpr.category', 'gdpr.purpose']);
      });

      it('should handle extremely long comments with many annotations', () => {
        const longComment = '/// ' + Array(100).fill('@sensitive').join(' ');
        const result = parseAnnotations(longComment);

        expect(result).toHaveLength(100);
        expect(result.every((r) => r.type === 'sensitive')).toBe(true);
      });

      it('should handle annotations with special characters in context', () => {
        const comment = '/// Field with special chars: åäö @sensitive @gdpr.category(PERSONAL)';
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(2);
        expect(result[0].type).toBe('sensitive');
        expect(result[1].type).toBe('gdpr.category');
      });

      it('should handle GDPR parameters with special characters being cleaned', () => {
        const comment = '/// @gdpr.category("PERSONAL") @gdpr.purpose(\'COMMUNICATION\')';
        const result = parseAnnotations(comment);

        expect(result).toHaveLength(2);
        expect(result[0].value).toBe('PERSONAL');
        expect(result[1].value).toBe('COMMUNICATION');
      });

      it('should handle empty GDPR parameters gracefully', () => {
        const comment = '/// @gdpr.category()';

        // Empty parentheses don't match the regex pattern, so return empty array
        const result = parseAnnotations(comment);
        expect(result).toEqual([]);
      });

      it('should handle malformed GDPR annotations with missing closing parenthesis', () => {
        const comment = '/// @gdpr.category(PERSONAL @sensitive';
        const result = parseAnnotations(comment);

        // Should only find @sensitive since the GDPR annotation is malformed
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('sensitive');
      });
    });
  });

  describe('Constants and Type Safety', () => {
    describe('Contract: Verify exported constants match expected values', () => {
      it('should export correct annotation types', () => {
        expect(ANNOTATION_TYPES).toEqual({
          SENSITIVE: 'sensitive',
          NEVER_EXPOSE: 'never-expose',
          ADMIN_ONLY: 'admin-only',
          GDPR_CATEGORY: 'gdpr.category',
          GDPR_PURPOSE: 'gdpr.purpose',
          GDPR_RETENTION: 'gdpr.retention',
        });
      });

      it('should export complete GDPR categories', () => {
        const expectedCategories = [
          'PERSONAL',
          'SENSITIVE_PERSONAL',
          'BIOMETRIC',
          'HEALTH',
          'FINANCIAL',
          'LOCATION',
          'BEHAVIORAL',
          'TECHNICAL',
          'ARCHIVAL',
        ];

        expect(Object.values(GDPR_CATEGORIES).sort()).toEqual(expectedCategories.sort());
      });

      it('should export complete GDPR purposes', () => {
        const expectedPurposes = [
          'AUTHENTICATION',
          'AUTHORIZATION',
          'COMMUNICATION',
          'ARCHIVAL',
          'RESEARCH',
          'ANALYTICS',
          'COMPLIANCE',
          'SECURITY',
        ];

        expect(Object.values(GDPR_PURPOSES).sort()).toEqual(expectedPurposes.sort());
      });

      it('should export complete GDPR retention periods', () => {
        const expectedRetentions = [
          'INDEFINITE',
          '1_YEAR',
          '2_YEARS',
          '5_YEARS',
          '10_YEARS',
          'UNTIL_DELETION_REQUEST',
        ];

        expect(Object.values(GDPR_RETENTION_PERIODS).sort()).toEqual(expectedRetentions.sort());
      });
    });
  });
});
