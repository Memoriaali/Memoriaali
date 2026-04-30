/**
 * SIP Controller Unit Tests
 *
 * Comprehensive test coverage for runtime validation and type safety.
 * Tests extraction methods with both valid and invalid data.
 */

import type { SipJob } from '@memoriaali/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SIPController } from '../sip.controller';

describe('SIPController', () => {
  let controller: SIPController;

  beforeEach(() => {
    controller = new SIPController();
  });

  describe('extractPayload', () => {
    it('should extract valid payload from job metadata', () => {
      const job = {
        id: 'job-123',
        metadata: {
          documentIds: ['550e8400-e29b-41d4-a716-446655440000'],
          packageMode: 'single',
          relativePaths: ['/path/to/doc1.pdf'],
          metadata: { archiveId: 'archive-1' },
        },
      } as unknown as SipJob;

      // Access private method via type assertion for testing
      const payload = (controller as any).extractPayload(job);

      expect(payload).toEqual({
        documentIds: ['550e8400-e29b-41d4-a716-446655440000'],
        packageMode: 'single',
        relativePaths: ['/path/to/doc1.pdf'],
        metadata: { archiveId: 'archive-1' },
      });
    });

    it('should return safe fallback when documentIds contains non-UUIDs', () => {
      const job = {
        id: 'job-123',
        metadata: {
          documentIds: ['not-a-uuid', 123, null],
          packageMode: 'single',
        },
      } as unknown as SipJob;

      const payload = (controller as any).extractPayload(job);

      // Should return safe fallback due to validation failure
      expect(payload).toEqual({ documentIds: [] });
    });

    it('should return safe fallback when documentIds is not an array', () => {
      const job = {
        id: 'job-123',
        metadata: {
          documentIds: 'not-an-array',
          packageMode: 'single',
        },
      } as unknown as SipJob;

      const payload = (controller as any).extractPayload(job);

      expect(payload).toEqual({ documentIds: [] });
    });

    it('should handle missing packageMode gracefully', () => {
      const job = {
        id: 'job-123',
        metadata: {
          documentIds: ['550e8400-e29b-41d4-a716-446655440000'],
        },
      } as unknown as SipJob;

      const payload = (controller as any).extractPayload(job);

      expect(payload.documentIds).toEqual(['550e8400-e29b-41d4-a716-446655440000']);
      expect(payload.packageMode).toBeUndefined();
    });

    it('should reject invalid packageMode values', () => {
      const job = {
        id: 'job-123',
        metadata: {
          documentIds: ['550e8400-e29b-41d4-a716-446655440000'],
          packageMode: 'invalid-mode',
        },
      } as unknown as SipJob;

      const payload = (controller as any).extractPayload(job);

      // Should return safe fallback due to validation failure
      expect(payload).toEqual({ documentIds: [] });
    });

    it('should accept "combined" as valid packageMode', () => {
      const job = {
        id: 'job-123',
        metadata: {
          documentIds: ['550e8400-e29b-41d4-a716-446655440000'],
          packageMode: 'combined',
        },
      } as unknown as SipJob;

      const payload = (controller as any).extractPayload(job);

      expect(payload.packageMode).toBe('combined');
    });

    it('should handle null metadata gracefully', () => {
      const job = {
        id: 'job-123',
        metadata: null,
      } as unknown as SipJob;

      const payload = (controller as any).extractPayload(job);

      expect(payload).toEqual({ documentIds: [] });
    });

    it('should validate relativePaths are strings', () => {
      const job = {
        id: 'job-123',
        metadata: {
          documentIds: ['550e8400-e29b-41d4-a716-446655440000'],
          relativePaths: ['/valid/path', 123, null, 'another/path'],
        },
      } as unknown as SipJob;

      const payload = (controller as any).extractPayload(job);

      // Should return safe fallback due to validation failure
      expect(payload).toEqual({ documentIds: [] });
    });

    it('should handle empty documentIds array', () => {
      const job = {
        id: 'job-123',
        metadata: {
          documentIds: [],
          packageMode: 'single',
        },
      } as unknown as SipJob;

      const payload = (controller as any).extractPayload(job);

      expect(payload.documentIds).toEqual([]);
      expect(payload.packageMode).toBe('single');
    });
  });

  describe('extractResult', () => {
    it('should extract valid result from job', () => {
      const job = {
        id: 'job-123',
        result: {
          sipPath: '/output/sip-123.zip',
          sipId: 'sip-550e8400-e29b-41d4-a716-446655440000',
          size: 1024000,
          documentCount: 5,
        },
      } as unknown as SipJob;

      const result = (controller as any).extractResult(job);

      expect(result).toEqual({
        sipPath: '/output/sip-123.zip',
        sipId: 'sip-550e8400-e29b-41d4-a716-446655440000',
        size: 1024000,
        documentCount: 5,
      });
    });

    it('should return undefined when result is null', () => {
      const job = {
        id: 'job-123',
        result: null,
      } as unknown as SipJob;

      const result = (controller as any).extractResult(job);

      expect(result).toBeUndefined();
    });

    it('should return undefined when result is missing required fields', () => {
      const job = {
        id: 'job-123',
        result: {
          sipPath: '/output/sip-123.zip',
          // Missing sipId, size, documentCount
        },
      } as unknown as SipJob;

      const result = (controller as any).extractResult(job);

      expect(result).toBeUndefined();
    });

    it('should return undefined when result has wrong types', () => {
      const job = {
        id: 'job-123',
        result: {
          sipPath: '/output/sip-123.zip',
          sipId: 'sip-123',
          size: '1024', // Wrong type - should be number
          documentCount: 5,
        },
      } as unknown as SipJob;

      const result = (controller as any).extractResult(job);

      expect(result).toBeUndefined();
    });
  });

  describe('extractError', () => {
    it('should extract valid error from job', () => {
      const job = {
        id: 'job-123',
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Document file not found',
          details: { documentId: 'doc-123', path: '/missing/file.pdf' },
        },
      } as unknown as SipJob;

      const error = (controller as any).extractError(job);

      expect(error).toEqual({
        code: 'FILE_NOT_FOUND',
        message: 'Document file not found',
        details: { documentId: 'doc-123', path: '/missing/file.pdf' },
      });
    });

    it('should return undefined when error is null', () => {
      const job = {
        id: 'job-123',
        error: null,
      } as unknown as SipJob;

      const error = (controller as any).extractError(job);

      expect(error).toBeUndefined();
    });

    it('should return undefined when error is missing message', () => {
      const job = {
        id: 'job-123',
        error: {
          code: 'SOME_ERROR',
          // Missing message
        },
      } as unknown as SipJob;

      const error = (controller as any).extractError(job);

      expect(error).toBeUndefined();
    });

    it('should handle error with no code', () => {
      const job = {
        id: 'job-123',
        error: {
          message: 'An error occurred',
        },
      } as unknown as SipJob;

      const error = (controller as any).extractError(job);

      expect(error).toEqual({
        message: 'An error occurred',
      });
    });

    it('should handle error with wrong message type', () => {
      const job = {
        id: 'job-123',
        error: {
          code: 'ERROR',
          message: 123, // Wrong type
        },
      } as unknown as SipJob;

      const error = (controller as any).extractError(job);

      expect(error).toBeUndefined();
    });
  });

  describe('Runtime safety', () => {
    it('should never throw on malformed metadata', () => {
      const malformedJobs = [
        { id: 'job-1', metadata: 'string' },
        { id: 'job-2', metadata: 123 },
        { id: 'job-3', metadata: true },
        { id: 'job-4', metadata: ['array'] },
        { id: 'job-5', metadata: { deeply: { nested: { invalid: { structure: 'value' } } } } },
      ] as unknown as SipJob[];

      malformedJobs.forEach((job) => {
        expect(() => {
          (controller as any).extractPayload(job);
        }).not.toThrow();
      });
    });

    it('should log warnings for invalid data but continue gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const job = {
        id: 'job-123',
        metadata: {
          documentIds: ['not-a-uuid'],
        },
      } as unknown as SipJob;

      const payload = (controller as any).extractPayload(job);

      // Should have safe fallback
      expect(payload).toEqual({ documentIds: [] });

      consoleSpy.mockRestore();
    });
  });
});
