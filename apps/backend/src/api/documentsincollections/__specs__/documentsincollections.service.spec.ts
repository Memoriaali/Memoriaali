/**
 * DocumentsInCollections Service Tests
 *
 * Unit tests for document-collection relationship management service.
 * Tests core business logic for adding and removing documents from collections.
 */

import type { PrismaClient } from '@memoriaali/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthenticatedUser } from '../../../shared/types/authenticated-user';
import { DocumentsInCollectionsService } from '../documentsincollections.service';

import { createSharedPrismaMock } from '../../../__mocks__/prisma.mock';
const { prismaMock, resetAll } = createSharedPrismaMock();
const mockPrisma = prismaMock as unknown as PrismaClient;

describe('DocumentsInCollectionsService', () => {
  let service: DocumentsInCollectionsService;
  let mockUser: AuthenticatedUser;

  beforeEach(() => {
    resetAll();
    service = new DocumentsInCollectionsService(mockPrisma);
    mockUser = new AuthenticatedUser(
      'user-123',
      'test@example.com',
      'Test',
      'User',
      'USER',
      true,
      true,
    );

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('addDocumentToCollection', () => {
    it('should add document to collection successfully', async () => {
      const input = {
        documentId: 'doc-123',
        collectionId: 'col-456',
      };

      const mockTransaction = vi.fn().mockImplementation((callback) => {
        return callback({
          documentsInCollections: {
            findUnique: vi.fn().mockResolvedValue(null), // No existing relationship
            create: vi.fn().mockResolvedValue({
              id: 'rel-789',
              documentId: 'doc-123',
              collectionId: 'col-456',
              createdAt: new Date(),
              updatedAt: new Date(),
              createdById: 'user-123',
              updatedById: 'user-123',
            }),
          },
          document: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'doc-123',
              userId: 'user-123',
              documentPrivacy: 'PUBLIC',
            }),
          },
          collection: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'col-456',
              createdById: 'user-123',
            }),
          },
          usersInGroups: {
            findUnique: vi.fn(),
          },
        });
      });

      mockPrisma.$transaction = mockTransaction;

      const result = await service.addDocumentToCollection(input, mockUser);

      expect(result).toEqual({
        id: 'rel-789',
        documentId: 'doc-123',
        collectionId: 'col-456',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        createdById: 'user-123',
        updatedById: 'user-123',
      });
    });
  });

  describe('removeDocumentFromCollection', () => {
    it('should remove document from collection successfully', async () => {
      const input = {
        documentId: 'doc-123',
        collectionId: 'col-456',
      };

      const mockTransaction = vi.fn().mockImplementation((callback) => {
        return callback({
          documentsInCollections: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'rel-789',
              documentId: 'doc-123',
              collectionId: 'col-456',
            }), // Relationship exists
            delete: vi.fn().mockResolvedValue({}),
          },
          document: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'doc-123',
              userId: 'user-123',
              documentPrivacy: 'PUBLIC',
            }),
          },
          collection: {
            findUnique: vi.fn().mockResolvedValue({
              id: 'col-456',
              createdById: 'user-123',
            }),
          },
          usersInGroups: {
            findUnique: vi.fn(),
          },
        });
      });

      mockPrisma.$transaction = mockTransaction;

      const result = await service.removeDocumentFromCollection(input, mockUser);

      expect(result).toEqual({
        success: true,
        message: 'Document removed from collection successfully',
      });
    });
  });
});
