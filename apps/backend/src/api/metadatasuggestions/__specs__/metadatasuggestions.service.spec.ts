import type { Document } from '@memoriaali/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HttpException } from '../../../shared/errors';
import { AuthenticatedUser } from '../../../shared/types/authenticated-user';
import { MetadataSuggestionsService } from '../metadatasuggestions.service';

// Mock Prisma client
const mockPrisma = {
  document: {
    findUnique: vi.fn(),
  },
  metadataSuggestion: {
    create: vi.fn(),
  },
};

const mockService = new MetadataSuggestionsService(mockPrisma as any);

describe('MetadataSuggestionsService', () => {
  const mockUser = new AuthenticatedUser(
    'user-123',
    'test@example.com',
    'Test',
    'User',
    'USER',
    true,
    true,
  );

  const mockDocument: Document = {
    id: 'doc-123',
    userId: 'user-456',
    fileName: 'test.pdf',
    documentPrivacy: 'PUBLIC',
    shareToGroup: false,
    groupToShare: null,
    metadata: {},
    iris: {},
    hasErrors: false,
    errorTypes: [],
    errorPageNumbers: [],
    aiModified: false,
    aiModifiedFields: [],
    pluginsEnabled: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    createdById: 'user-456',
    updatedById: 'user-456',
    ocrText: null,
    mimeType: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMetadataSuggestion', () => {
    it('should create metadata suggestion for public document', async () => {
      // Arrange
      const input = {
        documentId: 'doc-123',
        fieldToChange: 'metadata.title',
        changedValue: 'New Title',
      };

      const expectedSuggestion = {
        id: 'suggestion-123',
        documentId: 'doc-123',
        suggestedById: 'user-123',
        fieldToChange: 'metadata.title',
        changedValue: 'New Title',
        state: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-123',
        updatedById: 'user-123',
        approvedById: null,
        rejectionExplanation: null,
      };

      mockPrisma.document.findUnique.mockResolvedValue(mockDocument);
      mockPrisma.metadataSuggestion.create.mockResolvedValue(expectedSuggestion);

      // Act
      const result = await mockService.createMetadataSuggestion(input, mockUser);

      // Assert
      expect(result).toEqual(expectedSuggestion);
      expect(mockPrisma.document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
      });
      expect(mockPrisma.metadataSuggestion.create).toHaveBeenCalledWith({
        data: {
          documentId: 'doc-123',
          suggestedById: 'user-123',
          fieldToChange: 'metadata.title',
          changedValue: 'New Title',
          state: 'PENDING',
          createdById: 'user-123',
          updatedById: 'user-123',
        },
      });
    });

    it("should create metadata suggestion for user's own document", async () => {
      // Arrange
      const ownDocument = { ...mockDocument, userId: 'user-123', documentPrivacy: 'PRIVATE' };
      const input = {
        documentId: 'doc-123',
        fieldToChange: 'metadata.title',
        changedValue: 'New Title',
      };

      const expectedSuggestion = {
        id: 'suggestion-123',
        documentId: 'doc-123',
        suggestedById: 'user-123',
        fieldToChange: 'metadata.title',
        changedValue: 'New Title',
        state: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-123',
        updatedById: 'user-123',
        approvedById: null,
        rejectionExplanation: null,
      };

      mockPrisma.document.findUnique.mockResolvedValue(ownDocument);
      mockPrisma.metadataSuggestion.create.mockResolvedValue(expectedSuggestion);

      // Act
      const result = await mockService.createMetadataSuggestion(input, mockUser);

      // Assert
      expect(result).toEqual(expectedSuggestion);
    });

    it('should throw not found error when document does not exist', async () => {
      // Arrange
      const input = {
        documentId: 'non-existent',
        fieldToChange: 'metadata.title',
        changedValue: 'New Title',
      };

      mockPrisma.document.findUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(mockService.createMetadataSuggestion(input, mockUser)).rejects.toThrow(
        HttpException,
      );
      await expect(mockService.createMetadataSuggestion(input, mockUser)).rejects.toThrow(
        'Document not found',
      );
    });

    it('should throw forbidden error when user cannot access private document', async () => {
      // Arrange
      const privateDocument = { ...mockDocument, documentPrivacy: 'PRIVATE' };
      const input = {
        documentId: 'doc-123',
        fieldToChange: 'metadata.title',
        changedValue: 'New Title',
      };

      mockPrisma.document.findUnique.mockResolvedValue(privateDocument);

      // Act & Assert
      await expect(mockService.createMetadataSuggestion(input, mockUser)).rejects.toThrow(
        HttpException,
      );
      await expect(mockService.createMetadataSuggestion(input, mockUser)).rejects.toThrow(
        'Access denied to this document',
      );
    });

    it('should allow admin to access any document', async () => {
      // Arrange
      const adminUser = new AuthenticatedUser(
        'user-123',
        'test@example.com',
        'Test',
        'User',
        'ADMIN',
        true,
        true,
      );
      const privateDocument = { ...mockDocument, documentPrivacy: 'PRIVATE' };
      const input = {
        documentId: 'doc-123',
        fieldToChange: 'metadata.title',
        changedValue: 'New Title',
      };

      const expectedSuggestion = {
        id: 'suggestion-123',
        documentId: 'doc-123',
        suggestedById: 'user-123',
        fieldToChange: 'metadata.title',
        changedValue: 'New Title',
        state: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-123',
        updatedById: 'user-123',
        approvedById: null,
        rejectionExplanation: null,
      };

      mockPrisma.document.findUnique.mockResolvedValue(privateDocument);
      mockPrisma.metadataSuggestion.create.mockResolvedValue(expectedSuggestion);

      // Act
      const result = await mockService.createMetadataSuggestion(input, adminUser);

      // Assert
      expect(result).toEqual(expectedSuggestion);
    });

    it('should allow moderator to access any document', async () => {
      // Arrange
      const moderatorUser = new AuthenticatedUser(
        'user-123',
        'test@example.com',
        'Test',
        'User',
        'MODERATOR',
        true,
        true,
      );
      const privateDocument = { ...mockDocument, documentPrivacy: 'PRIVATE' };
      const input = {
        documentId: 'doc-123',
        fieldToChange: 'metadata.title',
        changedValue: 'New Title',
      };

      const expectedSuggestion = {
        id: 'suggestion-123',
        documentId: 'doc-123',
        suggestedById: 'user-123',
        fieldToChange: 'metadata.title',
        changedValue: 'New Title',
        state: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-123',
        updatedById: 'user-123',
        approvedById: null,
        rejectionExplanation: null,
      };

      mockPrisma.document.findUnique.mockResolvedValue(privateDocument);
      mockPrisma.metadataSuggestion.create.mockResolvedValue(expectedSuggestion);

      // Act
      const result = await mockService.createMetadataSuggestion(input, moderatorUser);

      // Assert
      expect(result).toEqual(expectedSuggestion);
    });
  });
});
