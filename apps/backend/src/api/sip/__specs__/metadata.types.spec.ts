/**
 * Metadata Types Unit Tests
 *
 * Tests for runtime validation schemas and helper functions.
 * Ensures metadata parsing is type-safe and fails gracefully.
 */

import { describe, expect, it } from 'vitest';
import {
  ArchivalMetadataSchema,
  DocumentMetadataSchema,
  DublinCoreMetadataSchema,
  EADMetadataSchema,
  getNestedString,
  getString,
  parseDocumentMetadata,
} from '../types/metadata.types';

describe('Metadata Types', () => {
  describe('DublinCoreMetadataSchema', () => {
    it('should validate valid Dublin Core metadata', () => {
      const validDC = {
        title: 'Test Document',
        creator: 'John Doe',
        subject: 'Testing',
        description: 'A test document',
        date: '2024-01-15',
        language: 'en',
      };

      const result = DublinCoreMetadataSchema.safeParse(validDC);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validDC);
      }
    });

    it('should reject non-string values', () => {
      const invalidDC = {
        title: 123, // Should be string
        creator: true,
      };

      const result = DublinCoreMetadataSchema.safeParse(invalidDC);

      expect(result.success).toBe(false);
    });

    it('should accept empty object', () => {
      const result = DublinCoreMetadataSchema.safeParse({});

      expect(result.success).toBe(true);
    });

    it('should strip unknown fields', () => {
      const dcWithExtra = {
        title: 'Test',
        unknownField: 'should be removed',
      };

      const result = DublinCoreMetadataSchema.safeParse(dcWithExtra);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('unknownField');
      }
    });
  });

  describe('ArchivalMetadataSchema', () => {
    it('should validate nested archival structure', () => {
      const validArchival = {
        header: {
          title: 'Archival Collection',
          location: 'Archive Room 1',
        },
        personNames: {
          creator: 'Jane Smith',
          interviewer: 'Bob Johnson',
        },
        subjectIndexing: {
          subject: 'Oral History',
          keywords: ['interview', 'history'],
        },
      };

      const result = ArchivalMetadataSchema.safeParse(validArchival);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.header?.title).toBe('Archival Collection');
        expect(result.data.personNames?.creator).toBe('Jane Smith');
      }
    });

    it('should handle partial nested objects', () => {
      const partialArchival = {
        header: {
          title: 'Only Title',
        },
      };

      const result = ArchivalMetadataSchema.safeParse(partialArchival);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.personNames).toBeUndefined();
      }
    });
  });

  describe('parseDocumentMetadata', () => {
    it('should parse valid complete metadata', () => {
      const validMetadata = {
        dublinCore: {
          title: 'Test Document',
          creator: 'John Doe',
        },
        archival: {
          header: {
            title: 'Archival Title',
          },
        },
        ead: {
          titleproper: 'EAD Title',
        },
      };

      const result = parseDocumentMetadata(validMetadata);

      expect(result).toHaveProperty('dublinCore');
      expect(result).toHaveProperty('archival');
      expect(result).toHaveProperty('ead');
      expect(result.dublinCore?.title).toBe('Test Document');
    });

    it('should return empty object for invalid metadata', () => {
      const invalidMetadata = {
        dublinCore: {
          title: 123, // Invalid type
        },
      };

      const result = parseDocumentMetadata(invalidMetadata);

      expect(result).toEqual({});
    });

    it('should return empty object for null metadata', () => {
      const result = parseDocumentMetadata(null);

      expect(result).toEqual({});
    });

    it('should return empty object for non-object metadata', () => {
      const result1 = parseDocumentMetadata('string');
      const result2 = parseDocumentMetadata(123);
      const result3 = parseDocumentMetadata(true);

      expect(result1).toEqual({});
      expect(result2).toEqual({});
      expect(result3).toEqual({});
    });

    it('should handle deeply nested invalid data gracefully', () => {
      const deeplyNested = {
        dublinCore: {
          title: {
            nested: {
              too: {
                deep: 'value',
              },
            },
          },
        },
      };

      const result = parseDocumentMetadata(deeplyNested);

      expect(result).toEqual({});
    });

    it('should preserve valid fields and discard invalid ones', () => {
      const mixedMetadata = {
        dublinCore: {
          title: 'Valid Title',
          creator: 123, // Invalid
        },
      };

      const result = parseDocumentMetadata(mixedMetadata);

      // Should fail validation for the whole dublinCore object
      expect(result).toEqual({});
    });
  });

  describe('getString helper', () => {
    it('should extract string value', () => {
      const obj = { key: 'value' };
      expect(getString(obj, 'key')).toBe('value');
    });

    it('should return undefined for non-string value', () => {
      const obj = { key: 123 };
      expect(getString(obj, 'key')).toBeUndefined();
    });

    it('should return undefined for missing key', () => {
      const obj = {};
      expect(getString(obj, 'missing')).toBeUndefined();
    });

    it('should return undefined for null value', () => {
      const obj = { key: null };
      expect(getString(obj, 'key')).toBeUndefined();
    });

    it('should return undefined for object value', () => {
      const obj = { key: { nested: 'value' } };
      expect(getString(obj, 'key')).toBeUndefined();
    });

    it('should return undefined for array value', () => {
      const obj = { key: ['array'] };
      expect(getString(obj, 'key')).toBeUndefined();
    });
  });

  describe('getNestedString helper', () => {
    it('should extract string value from nested object', () => {
      const nested = { key: 'value' };
      expect(getNestedString(nested, 'key')).toBe('value');
    });

    it('should return undefined when parent object is undefined', () => {
      expect(getNestedString(undefined, 'key')).toBeUndefined();
    });

    it('should return undefined for non-string nested value', () => {
      const nested = { key: 123 };
      expect(getNestedString(nested, 'key')).toBeUndefined();
    });

    it('should return undefined for missing nested key', () => {
      const nested = {};
      expect(getNestedString(nested, 'missing')).toBeUndefined();
    });
  });

  describe('EADMetadataSchema', () => {
    it('should validate EAD fields', () => {
      const validEAD = {
        titleproper: 'Proper Title',
        unittitle: 'Unit Title',
        unitdate: '2024',
        unitid: 'ID-123',
        abstract: 'This is an abstract',
      };

      const result = EADMetadataSchema.safeParse(validEAD);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.titleproper).toBe('Proper Title');
      }
    });
  });

  describe('DocumentMetadataSchema edge cases', () => {
    it('should handle all optional fields missing', () => {
      const emptyMetadata = {};

      const result = DocumentMetadataSchema.safeParse(emptyMetadata);

      expect(result.success).toBe(true);
    });

    it('should accept metadata with only one section', () => {
      const partialMetadata = {
        dublinCore: {
          title: 'Only DC',
        },
      };

      const result = DocumentMetadataSchema.safeParse(partialMetadata);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.archival).toBeUndefined();
      }
    });

    it('should accept additional and combined as records', () => {
      const metadataWithExtra = {
        additional: {
          customField1: 'value1',
          customField2: 123,
        },
        combined: {
          mergedData: 'merged',
        },
      };

      const result = DocumentMetadataSchema.safeParse(metadataWithExtra);

      expect(result.success).toBe(true);
    });
  });
});
