/**
 * ANNOTATION PARSER TESTS
 * =======================
 *
 * Comprehensive tests for the enhanced annotation parser that supports:
 * - @sensitive - Requires authorization to view (existing)
 * - @never-expose - Never appears in any API response (new)
 * - @admin-only - Only accessible to admin role users (new)
 * - @gdpr.category(TYPE) - GDPR data classification (new)
 * - @gdpr.purpose(PURPOSE) - GDPR processing purpose (new)
 * - @gdpr.retention(PERIOD) - GDPR retention period (new)
 */

import { describe, it, expect, vi } from 'vitest';
import {
  parseAnnotations,
  hasAnnotation,
  getAnnotationValue,
  determineSecurityLevel,
  extractGdprInfo,
  validateAnnotations,
  ANNOTATION_TYPES,
  GDPR_CATEGORIES,
  GDPR_PURPOSES,
  GDPR_RETENTION_PERIODS,
} from '../../../generators/utils/annotation-parser.js';

describe('Annotation Parser', () => {
  describe('parseAnnotations', () => {
    it('should parse simple @sensitive annotation', () => {
      const comment = 'User password hash @sensitive';
      const annotations = parseAnnotations(comment);

      expect(annotations).toHaveLength(1);
      expect(annotations[0]).toEqual({
        type: 'sensitive',
        value: true,
        raw: '@sensitive',
      });
    });

    it('should parse @never-expose annotation', () => {
      const comment = 'System secret key @never-expose';
      const annotations = parseAnnotations(comment);

      expect(annotations).toHaveLength(1);
      expect(annotations[0]).toEqual({
        type: 'never-expose',
        value: true,
        raw: '@never-expose',
      });
    });

    it('should parse @admin-only annotation', () => {
      const comment = 'Internal user ID @admin-only for auditing';
      const annotations = parseAnnotations(comment);

      expect(annotations).toHaveLength(1);
      expect(annotations[0]).toEqual({
        type: 'admin-only',
        value: true,
        raw: '@admin-only',
      });
    });

    it('should parse GDPR category annotation', () => {
      const comment = 'Email address @gdpr.category(PERSONAL)';
      const annotations = parseAnnotations(comment);

      expect(annotations).toHaveLength(1);
      expect(annotations[0]).toEqual({
        type: 'gdpr.category',
        value: 'PERSONAL',
        raw: '@gdpr.category(PERSONAL)',
      });
    });

    it('should parse GDPR purpose annotation', () => {
      const comment = 'User email @gdpr.purpose(AUTHENTICATION)';
      const annotations = parseAnnotations(comment);

      expect(annotations).toHaveLength(1);
      expect(annotations[0]).toEqual({
        type: 'gdpr.purpose',
        value: 'AUTHENTICATION',
        raw: '@gdpr.purpose(AUTHENTICATION)',
      });
    });

    it('should parse GDPR retention annotation', () => {
      const comment = 'Session data @gdpr.retention(1_YEAR)';
      const annotations = parseAnnotations(comment);

      expect(annotations).toHaveLength(1);
      expect(annotations[0]).toEqual({
        type: 'gdpr.retention',
        value: '1_YEAR',
        raw: '@gdpr.retention(1_YEAR)',
      });
    });

    it('should parse multiple annotations from same comment', () => {
      const comment =
        'User password @sensitive @gdpr.category(SENSITIVE_PERSONAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(UNTIL_DELETION_REQUEST)';
      const annotations = parseAnnotations(comment);

      expect(annotations).toHaveLength(4);

      const types = annotations.map((ann) => ann.type);
      expect(types).toContain('sensitive');
      expect(types).toContain('gdpr.category');
      expect(types).toContain('gdpr.purpose');
      expect(types).toContain('gdpr.retention');
    });

    it('should handle GDPR parameters with quotes', () => {
      const comment = 'Field with @gdpr.category("PERSONAL") and @gdpr.purpose(\'COMMUNICATION\')';
      const annotations = parseAnnotations(comment);

      expect(annotations).toHaveLength(2);
      expect(annotations[0].value).toBe('PERSONAL');
      expect(annotations[1].value).toBe('COMMUNICATION');
    });

    it('should return empty array for comments without annotations', () => {
      const comment = 'Just a regular comment without any annotations';
      const annotations = parseAnnotations(comment);

      expect(annotations).toHaveLength(0);
    });

    it('should return empty array for null or undefined comments', () => {
      expect(parseAnnotations(null as any)).toHaveLength(0);
      expect(parseAnnotations(undefined as any)).toHaveLength(0);
      expect(parseAnnotations('')).toHaveLength(0);
    });

    it('should handle complex multi-line comments', () => {
      const comment = `
        User authentication fields
        Contains sensitive personal data
        @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(AUTHENTICATION)
        Should be handled with care
      `;
      const annotations = parseAnnotations(comment);

      expect(annotations).toHaveLength(3);
    });
  });

  describe('GDPR Parameter Validation', () => {
    it('should validate valid GDPR categories', () => {
      const validCategories = Object.values(GDPR_CATEGORIES);
      validCategories.forEach((category) => {
        const comment = `Field @gdpr.category(${category})`;
        expect(() => parseAnnotations(comment)).not.toThrow();
      });
    });

    it('should validate valid GDPR purposes', () => {
      const validPurposes = Object.values(GDPR_PURPOSES);
      validPurposes.forEach((purpose) => {
        const comment = `Field @gdpr.purpose(${purpose})`;
        expect(() => parseAnnotations(comment)).not.toThrow();
      });
    });

    it('should validate valid GDPR retention periods', () => {
      const validPeriods = Object.values(GDPR_RETENTION_PERIODS);
      validPeriods.forEach((period) => {
        const comment = `Field @gdpr.retention(${period})`;
        expect(() => parseAnnotations(comment)).not.toThrow();
      });
    });

    it('should throw error for invalid GDPR category', () => {
      const comment = 'Field @gdpr.category(INVALID_CATEGORY)';
      expect(() => parseAnnotations(comment)).toThrow(/Invalid GDPR category/);
    });

    it('should throw error for invalid GDPR purpose', () => {
      const comment = 'Field @gdpr.purpose(INVALID_PURPOSE)';
      expect(() => parseAnnotations(comment)).toThrow(/Invalid GDPR purpose/);
    });

    it('should throw error for invalid GDPR retention period', () => {
      const comment = 'Field @gdpr.retention(INVALID_PERIOD)';
      expect(() => parseAnnotations(comment)).toThrow(/Invalid GDPR retention period/);
    });

    it('should handle case insensitive GDPR parameters', () => {
      const comment = 'Field @gdpr.category(personal)';
      const annotations = parseAnnotations(comment);

      expect(annotations[0].value).toBe('PERSONAL');
    });
  });

  describe('hasAnnotation', () => {
    it('should return true when annotation exists', () => {
      const annotations = parseAnnotations('Field @sensitive @admin-only');

      expect(hasAnnotation(annotations, ANNOTATION_TYPES.SENSITIVE)).toBe(true);
      expect(hasAnnotation(annotations, ANNOTATION_TYPES.ADMIN_ONLY)).toBe(true);
      expect(hasAnnotation(annotations, ANNOTATION_TYPES.NEVER_EXPOSE)).toBe(false);
    });

    it('should return false when annotation does not exist', () => {
      const annotations = parseAnnotations('Field @sensitive');

      expect(hasAnnotation(annotations, ANNOTATION_TYPES.NEVER_EXPOSE)).toBe(false);
      expect(hasAnnotation(annotations, ANNOTATION_TYPES.ADMIN_ONLY)).toBe(false);
    });
  });

  describe('getAnnotationValue', () => {
    it('should return annotation value when exists', () => {
      const annotations = parseAnnotations('Field @gdpr.category(PERSONAL) @sensitive');

      expect(getAnnotationValue(annotations, ANNOTATION_TYPES.GDPR_CATEGORY)).toBe('PERSONAL');
      expect(getAnnotationValue(annotations, ANNOTATION_TYPES.SENSITIVE)).toBe(true);
    });

    it('should return null when annotation does not exist', () => {
      const annotations = parseAnnotations('Field @sensitive');

      expect(getAnnotationValue(annotations, ANNOTATION_TYPES.GDPR_CATEGORY)).toBeNull();
      expect(getAnnotationValue(annotations, ANNOTATION_TYPES.ADMIN_ONLY)).toBeNull();
    });
  });

  describe('determineSecurityLevel', () => {
    it('should return "never-expose" as highest security level', () => {
      const annotations = parseAnnotations('Field @sensitive @never-expose @admin-only');
      expect(determineSecurityLevel(annotations)).toBe('never-expose');
    });

    it('should return "admin-only" when no never-expose', () => {
      const annotations = parseAnnotations('Field @sensitive @admin-only');
      expect(determineSecurityLevel(annotations)).toBe('admin-only');
    });

    it('should return "sensitive" when only sensitive annotation', () => {
      const annotations = parseAnnotations('Field @sensitive');
      expect(determineSecurityLevel(annotations)).toBe('sensitive');
    });

    it('should return "public" when no security annotations', () => {
      const annotations = parseAnnotations('Field @gdpr.category(PERSONAL)');
      expect(determineSecurityLevel(annotations)).toBe('public');
    });

    it('should return "public" for empty annotations', () => {
      expect(determineSecurityLevel([])).toBe('public');
    });
  });

  describe('extractGdprInfo', () => {
    it('should extract all GDPR information when present', () => {
      const annotations = parseAnnotations(
        'Field @gdpr.category(PERSONAL) @gdpr.purpose(AUTHENTICATION) @gdpr.retention(1_YEAR)',
      );
      const gdprInfo = extractGdprInfo(annotations);

      expect(gdprInfo).toEqual({
        category: 'PERSONAL',
        purpose: 'AUTHENTICATION',
        retention: '1_YEAR',
      });
    });

    it('should return partial GDPR information when only some annotations present', () => {
      const annotations = parseAnnotations('Field @gdpr.category(PERSONAL) @sensitive');
      const gdprInfo = extractGdprInfo(annotations);

      expect(gdprInfo).toEqual({
        category: 'PERSONAL',
        purpose: null,
        retention: null,
      });
    });

    it('should return all null values when no GDPR annotations', () => {
      const annotations = parseAnnotations('Field @sensitive @admin-only');
      const gdprInfo = extractGdprInfo(annotations);

      expect(gdprInfo).toEqual({
        category: null,
        purpose: null,
        retention: null,
      });
    });
  });

  describe('validateAnnotations', () => {
    it('should pass validation for valid single security annotation', () => {
      const annotations = parseAnnotations('Field @sensitive');
      expect(() => validateAnnotations(annotations, 'testField', 'TestModel')).not.toThrow();
    });

    it('should pass validation for GDPR annotations with security annotation', () => {
      const annotations = parseAnnotations(
        'Field @sensitive @gdpr.category(PERSONAL) @gdpr.purpose(AUTHENTICATION)',
      );
      expect(() => validateAnnotations(annotations, 'testField', 'TestModel')).not.toThrow();
    });

    it('should throw error for conflicting security annotations', () => {
      const annotations = parseAnnotations('Field @sensitive @never-expose');
      expect(() => validateAnnotations(annotations, 'testField', 'TestModel')).toThrow(
        /conflicting security annotations/,
      );
    });

    it('should throw error for multiple conflicting security annotations', () => {
      const annotations = parseAnnotations('Field @sensitive @admin-only @never-expose');
      expect(() => validateAnnotations(annotations, 'testField', 'TestModel')).toThrow(
        /conflicting security annotations/,
      );
    });

    it('should warn about GDPR annotations without security annotation', () => {
      // Capture console output
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const annotations = parseAnnotations(
        'Field @gdpr.category(PERSONAL) @gdpr.purpose(AUTHENTICATION)',
      );
      validateAnnotations(annotations, 'testField', 'TestModel');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('has GDPR annotations but no security annotation'),
      );

      consoleSpy.mockRestore();
    });

    it('should include field and model names in error messages', () => {
      const annotations = parseAnnotations('Field @sensitive @admin-only');
      expect(() => validateAnnotations(annotations, 'password', 'User')).toThrow(
        /Field 'password' in model 'User'/,
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed GDPR annotations gracefully', () => {
      const comment = 'Field @gdpr.category() @gdpr.purpose';
      // Should not throw, but should not parse malformed annotations
      const annotations = parseAnnotations(comment);
      expect(annotations).toHaveLength(0); // Malformed annotations ignored
    });

    it('should handle annotations with special characters in comments', () => {
      const comment = 'Field with special chars !@#$% @sensitive normal comment';
      const annotations = parseAnnotations(comment);

      expect(annotations).toHaveLength(1);
      expect(annotations[0].type).toBe('sensitive');
    });

    it('should handle very long comments with annotations', () => {
      const longComment = 'A'.repeat(1000) + ' @sensitive ' + 'B'.repeat(1000);
      const annotations = parseAnnotations(longComment);

      expect(annotations).toHaveLength(1);
      expect(annotations[0].type).toBe('sensitive');
    });

    it('should handle multiple GDPR annotations of same type (should only keep last one)', () => {
      const comment = 'Field @gdpr.category(PERSONAL) @gdpr.category(HEALTH)';
      const annotations = parseAnnotations(comment);

      // Should have both annotations parsed (validation will catch conflicts)
      expect(annotations).toHaveLength(2);
      expect(annotations[0].value).toBe('PERSONAL');
      expect(annotations[1].value).toBe('HEALTH');
    });
  });

  describe('Constants and Enums', () => {
    it('should have all required annotation types', () => {
      expect(ANNOTATION_TYPES.SENSITIVE).toBe('sensitive');
      expect(ANNOTATION_TYPES.NEVER_EXPOSE).toBe('never-expose');
      expect(ANNOTATION_TYPES.ADMIN_ONLY).toBe('admin-only');
      expect(ANNOTATION_TYPES.GDPR_CATEGORY).toBe('gdpr.category');
      expect(ANNOTATION_TYPES.GDPR_PURPOSE).toBe('gdpr.purpose');
      expect(ANNOTATION_TYPES.GDPR_RETENTION).toBe('gdpr.retention');
    });

    it('should have comprehensive GDPR categories', () => {
      const expectedCategories = [
        'PERSONAL',
        'SENSITIVE_PERSONAL',
        'BIOMETRIC',
        'HEALTH',
        'FINANCIAL',
        'LOCATION',
        'BEHAVIORAL',
        'TECHNICAL',
      ];

      expectedCategories.forEach((category) => {
        expect(Object.values(GDPR_CATEGORIES)).toContain(category);
      });
    });

    it('should have comprehensive GDPR purposes', () => {
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

      expectedPurposes.forEach((purpose) => {
        expect(Object.values(GDPR_PURPOSES)).toContain(purpose);
      });
    });

    it('should have comprehensive GDPR retention periods', () => {
      const expectedPeriods = [
        'INDEFINITE',
        '1_YEAR',
        '2_YEARS',
        '5_YEARS',
        '10_YEARS',
        'UNTIL_DELETION_REQUEST',
      ];

      expectedPeriods.forEach((period) => {
        expect(Object.values(GDPR_RETENTION_PERIODS)).toContain(period);
      });
    });
  });
});
