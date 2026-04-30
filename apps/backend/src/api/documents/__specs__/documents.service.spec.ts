import type { PrismaClient } from '@memoriaali/database';
import { beforeEach, describe, expect, it } from 'vitest';

import { createSharedPrismaMock } from '../../../__mocks__/prisma.mock';
import { HttpException } from '../../../shared/errors';
import { AuthenticatedUser } from '../../../shared/types/authenticated-user';
import { DocumentQueryInput } from '../documents.schemas';
import { DocumentsService } from '../documents.service';
const { prismaMock, resetAll, document } = createSharedPrismaMock();
let prismaClientLike = prismaMock as unknown as PrismaClient;

// Authenticated users
const mockUser = new AuthenticatedUser(
  'user-123',
  'test.user@example.com',
  'Test',
  'User',
  'USER',
  true,
  true,
);

const mockAdminUser = new AuthenticatedUser(
  'admin-123',
  'admin.user@example.com',
  'Admin',
  'User',
  'ADMIN',
  true,
  true,
);

const mockDocument = {
  id: 'doc-123',
  userId: 'user-123',
  fileName: 'test-document.pdf',
  mimeType: 'application/pdf',
  documentPrivacy: 'PUBLIC' as const,
  shareToGroup: false,
  groupToShare: null,
  metadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
  createdById: 'user-123',
  updatedById: 'user-123',
  uuid: 'uuid-123',
  sipId: null,
  ocrText: null,
};

describe('DocumentsService', () => {
  let documentsService: DocumentsService;

  beforeEach(() => {
    resetAll();
    prismaClientLike = prismaMock as unknown as PrismaClient;
    documentsService = new DocumentsService(prismaClientLike);
  });

  describe('createDocument', () => {
    it('should create a document successfully', async () => {
      const input = {
        fileName: 'test-document.pdf',
        mimeType: 'application/pdf',
        documentPrivacy: 'PUBLIC' as const,
        metadata: {},
        aiModified: false,
        aiModifiedFields: [],
        hasErrors: false,
        errorTypes: [],
        errorPageNumbers: [],
      };

      document.create.mockResolvedValue(mockDocument);

      const result = await documentsService.createDocument(input, mockUser);

      expect(document.create).toHaveBeenCalledWith({
        data: {
          user: {
            connect: { id: mockUser.id },
          },
          fileName: input.fileName,
          mimeType: input.mimeType,
          documentPrivacy: input.documentPrivacy,
          groupToShare: null,
          metadata: input.metadata,
          aiModified: false,
          aiModifiedFields: [],
          hasErrors: false,
          errorTypes: [],
          errorPageNumbers: [],
          createdBy: {
            connect: { id: mockUser.id },
          },
          updatedBy: {
            connect: { id: mockUser.id },
          },
        },
      });

      expect(result).toEqual(mockDocument);
    });
  });

  describe('getDocumentById', () => {
    it('should return document if user has access', async () => {
      const documentWithUser = {
        ...mockDocument,
        user: {
          id: mockUser.id,
          username: 'testuser',
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
      };

      document.findUnique.mockResolvedValue(documentWithUser);

      const result = await documentsService.getDocumentById('doc-123', mockUser);

      expect(document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      expect(result).toEqual(documentWithUser);
    });

    it('should throw HttpException if document does not exist', async () => {
      document.findUnique.mockResolvedValue(null);

      await expect(documentsService.getDocumentById('doc-123', mockUser)).rejects.toThrow(
        HttpException,
      );
    });

    it('should throw HttpException if user cannot access document', async () => {
      const privateDocument = {
        ...mockDocument,
        userId: 'other-user-123',
        documentPrivacy: 'PRIVATE' as const,
        user: {
          id: 'other-user-123',
          username: 'otheruser',
          firstName: 'Other',
          lastName: 'User',
        },
      };

      document.findUnique.mockResolvedValue(privateDocument);

      await expect(documentsService.getDocumentById('doc-123', mockUser)).rejects.toThrow(
        HttpException,
      );
    });

    it('should allow admin to access any document', async () => {
      const privateDocument = {
        ...mockDocument,
        userId: 'other-user-123',
        documentPrivacy: 'PRIVATE' as const,
        user: {
          id: 'other-user-123',
          username: 'otheruser',
          firstName: 'Other',
          lastName: 'User',
        },
      };

      document.findUnique.mockResolvedValue(privateDocument);

      const result = await documentsService.getDocumentById('doc-123', mockAdminUser);

      expect(result).toEqual(privateDocument);
    });
  });

  describe('updateDocument', () => {
    it('should update document if user has permission', async () => {
      const documentWithUser = {
        ...mockDocument,
        user: {
          id: mockUser.id,
          username: 'testuser',
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
      };

      const updateInput = {
        fileName: 'updated-document.pdf',
        documentPrivacy: 'PRIVATE' as const,
      };

      const updatedDocument = { ...mockDocument, ...updateInput };

      document.findUnique.mockResolvedValue(documentWithUser);
      document.update.mockResolvedValue(updatedDocument);

      const result = await documentsService.updateDocument('doc-123', updateInput, mockUser);

      expect(document.update).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        data: {
          ...updateInput,
          updatedBy: {
            connect: { id: mockUser.id },
          },
        },
      });

      expect(result).toEqual(updatedDocument);
    });

    it('should throw HttpException if user cannot modify document', async () => {
      const otherUserDocument = {
        ...mockDocument,
        userId: 'other-user-123',
        user: {
          id: 'other-user-123',
          username: 'otheruser',
          firstName: 'Other',
          lastName: 'User',
        },
      };

      document.findUnique.mockResolvedValue(otherUserDocument);

      await expect(
        documentsService.updateDocument('doc-123', { fileName: 'updated.pdf' }, mockUser),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document if user has permission', async () => {
      const documentWithUser = {
        ...mockDocument,
        user: {
          id: mockUser.id,
          username: 'testuser',
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
        },
      };

      document.findUnique.mockResolvedValue(documentWithUser);
      document.delete.mockResolvedValue(mockDocument);

      await documentsService.deleteDocument('doc-123', mockUser);

      expect(document.delete).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
      });
    });

    it('should throw HttpException if user cannot delete document', async () => {
      const otherUserDocument = {
        ...mockDocument,
        userId: 'other-user-123',
        user: {
          id: 'other-user-123',
          username: 'otheruser',
          firstName: 'Other',
          lastName: 'User',
        },
      };

      document.findUnique.mockResolvedValue(otherUserDocument);

      await expect(documentsService.deleteDocument('doc-123', mockUser)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('listDocuments', () => {
    it('should return paginated list of accessible documents', async () => {
      const query = {
        page: 1,
        limit: 10,
        search: 'test',
        documentPrivacy: 'PUBLIC' as const,
      } as DocumentQueryInput;

      const documentsWithRelations = [
        {
          ...mockDocument,
          _count: { comments: 0 },
          user: {
            id: 'user-123',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
          },
        },
      ];
      const total = 1;

      document.count.mockResolvedValue(total);
      document.findMany.mockResolvedValue(documentsWithRelations);

      const result = await documentsService.listDocuments(query, mockUser);

      expect(document.count).toHaveBeenCalled();
      expect(document.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              comments: true,
            },
          },
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      expect(result.documents).toEqual(documentsWithRelations);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should return group documents for user with multiple group memberships', async () => {
      const query = {
        page: 1,
        limit: 10,
        documentPrivacy: 'GROUP' as const,
      } as DocumentQueryInput;

      const documentsWithRelations = [
        {
          ...mockDocument,
          documentPrivacy: 'GROUP' as const,
          shareToGroup: true,
          groupToShare: 'group-1',
          _count: { comments: 0 },
          user: {
            id: 'user-123',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
          },
        },
      ];

      const total = 1;
      const userWithGroups = new AuthenticatedUser(
        mockUser.id,
        mockUser.email,
        mockUser.firstName,
        mockUser.lastName,
        mockUser.role,
        mockUser.isActive,
        mockUser.isVerified,
        null,
        ['group-1', 'group-2'],
      );
      document.count.mockResolvedValue(total);
      document.findMany.mockResolvedValue(documentsWithRelations);

      const result = await documentsService.listDocuments(query, userWithGroups);

      const calledWhere = (document.findMany as any).mock.calls[0][0].where;
      expect(calledWhere).toMatchObject({
        AND: expect.arrayContaining([
          expect.objectContaining({
            OR: expect.any(Array),
          }),
          {
            documentPrivacy: 'GROUP',
            groupToShare: { in: ['group-1', 'group-2'] },
          },
        ]),
      });

      expect(result.documents).toEqual(documentsWithRelations);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should forbid request for a groupId the user does not belong to', async () => {
      const query = {
        page: 1,
        limit: 10,
        groupId: 'group-x',
      } as DocumentQueryInput;

      const userWithGroup = new AuthenticatedUser(
        mockUser.id,
        mockUser.email,
        mockUser.firstName,
        mockUser.lastName,
        mockUser.role,
        mockUser.isActive,
        mockUser.isVerified,
        null,
        ['group-1'],
      );

      await expect(documentsService.listDocuments(query, userWithGroup)).rejects.toThrow(
        HttpException,
      );
    });

    /**
     * Scenario: Regular user searches for documents with search term
     * Expected outcome: Search conditions are properly combined with access control using AND logic
     * Contract: Postcondition (search results are filtered by both search term AND user access permissions)
     * Business impact: Users can search within their accessible documents without database validation errors
     */
    it('should properly combine search and access control conditions for regular users', async () => {
      const query = {
        page: 1,
        limit: 10,
        search: 'sauna',
      } as DocumentQueryInput;
      const documents = [mockDocument];
      const total = 1;

      document.count.mockResolvedValue(total);
      document.findMany.mockResolvedValue(documents);

      await documentsService.listDocuments(query, mockUser);

      // Verify the where clause structure for search + access control
      expect(document.count).toHaveBeenCalledWith({
        where: expect.objectContaining({
          AND: [
            {
              OR: expect.arrayContaining([
                { fileName: { contains: 'sauna' } },
                { ocrText: { contains: 'sauna' } },
                {
                  metadata: {
                    path: '$.archival.subjectIndexing.keywords',
                    array_contains: 'sauna',
                  },
                },
                { metadata: { path: '$.dublinCore.title', string_contains: 'sauna' } },
                { metadata: { path: '$.author', string_contains: 'sauna' } },
                { metadata: { path: '$.personNames', string_contains: 'sauna' } },
                { metadata: { path: '$.subjectIndexing', array_contains: 'sauna' } },
              ]),
            },
            {
              OR: [{ userId: mockUser.id }, { documentPrivacy: 'PUBLIC' }],
            },
          ],
        }),
      });
    });

    /**
     * Scenario: Admin searches for documents with search term
     * Expected outcome: Search conditions are applied without access control restrictions
     * Contract: Postcondition (admin sees all documents matching search term)
     * Business impact: Admins can search across all documents in the system
     */
    it('should apply search conditions without access control for admin users', async () => {
      const query = {
        page: 1,
        limit: 10,
        search: 'sauna',
      } as DocumentQueryInput;
      const documents = [mockDocument];
      const total = 1;

      document.count.mockResolvedValue(total);
      document.findMany.mockResolvedValue(documents);

      await documentsService.listDocuments(query, mockAdminUser);

      // Verify the where clause structure for admin search
      expect(document.count).toHaveBeenCalledWith({
        where: {
          OR: expect.arrayContaining([
            { fileName: { contains: 'sauna' } },
            { ocrText: { contains: 'sauna' } },
            { metadata: { path: '$.archival.subjectIndexing.keywords', array_contains: 'sauna' } },
            { metadata: { path: '$.dublinCore.title', string_contains: 'sauna' } },
          ]),
        },
      });
    });

    /**
     * Scenario: Admin searches using bracket notation [author.Saarinen, personNames.Saarinen]
     * Expected outcome: Search conditions are created for each field:value pair
     * Contract: Postcondition (search targets multiple specific metadata fields)
     * Business impact: Admins can perform targeted searches across multiple metadata fields
     */
    it('should handle bracket notation search for admin users', async () => {
      const query = {
        page: 1,
        limit: 10,
        search: '[author.Saarinen, personNames.Saarinen]',
      } as DocumentQueryInput;
      const documents = [mockDocument];
      const total = 1;

      document.count.mockResolvedValue(total);
      document.findMany.mockResolvedValue(documents);

      await documentsService.listDocuments(query, mockAdminUser);

      // Verify the where clause structure for bracket search
      expect(document.count).toHaveBeenCalledWith({
        where: {
          AND: [
            {
              AND: [
                // Search conditions for personNames field
                { metadata: { path: '$.personNames', string_contains: 'Saarinen' } },
                { metadata: { path: '$.personNames', string_contains: 'saarinen' } },
                { metadata: { path: '$.personNames', string_contains: 'SAARINEN' } },
                { metadata: { path: '$.personNames', string_contains: 'Saarinen' } },
                { metadata: { path: '$.personNames', array_contains: 'Saarinen' } },
                { metadata: { path: '$.personNames', array_contains: 'saarinen' } },
                { metadata: { path: '$.personNames', array_contains: 'SAARINEN' } },
                { metadata: { path: '$.personNames', array_contains: 'Saarinen' } },
                // Search conditions for author field wrapped in OR
                {
                  OR: [
                    { metadata: { path: '$.author', string_contains: 'Saarinen' } },
                    { metadata: { path: '$.author', string_contains: 'saarinen' } },
                    { metadata: { path: '$.author', string_contains: 'SAARINEN' } },
                    { metadata: { path: '$.author', string_contains: 'Saarinen' } },
                    { metadata: { path: '$.author', array_contains: 'Saarinen' } },
                    { metadata: { path: '$.author', array_contains: 'saarinen' } },
                    { metadata: { path: '$.author', array_contains: 'SAARINEN' } },
                    { metadata: { path: '$.author', array_contains: 'Saarinen' } },
                  ],
                },
              ],
            },
          ],
        },
      });
    });

    /**
     * Scenario: Regular user searches using bracket notation [author.Saarinen, personNames.Saarinen]
     * Expected outcome: Search conditions are combined with access control using AND logic
     * Contract: Postcondition (search results are filtered by both bracket search AND user access permissions)
     * Business impact: Users can perform targeted searches within their accessible documents
     */
    it('should handle bracket notation search for regular users with access control', async () => {
      const query = {
        page: 1,
        limit: 10,
        search: '[author.Saarinen, personNames.Saarinen]',
      } as DocumentQueryInput;
      const documents = [mockDocument];
      const total = 1;

      document.count.mockResolvedValue(total);
      document.findMany.mockResolvedValue(documents);

      await documentsService.listDocuments(query, mockUser);

      // Verify the where clause structure for bracket search + access control
      expect(document.count).toHaveBeenCalledWith({
        where: {
          AND: [
            // Search conditions
            {
              AND: [
                // Search conditions for personNames field
                { metadata: { path: '$.personNames', string_contains: 'Saarinen' } },
                { metadata: { path: '$.personNames', string_contains: 'saarinen' } },
                { metadata: { path: '$.personNames', string_contains: 'SAARINEN' } },
                { metadata: { path: '$.personNames', string_contains: 'Saarinen' } },
                { metadata: { path: '$.personNames', array_contains: 'Saarinen' } },
                { metadata: { path: '$.personNames', array_contains: 'saarinen' } },
                { metadata: { path: '$.personNames', array_contains: 'SAARINEN' } },
                { metadata: { path: '$.personNames', array_contains: 'Saarinen' } },
                // Search conditions for author field wrapped in OR
                {
                  OR: [
                    { metadata: { path: '$.author', string_contains: 'Saarinen' } },
                    { metadata: { path: '$.author', string_contains: 'saarinen' } },
                    { metadata: { path: '$.author', string_contains: 'SAARINEN' } },
                    { metadata: { path: '$.author', string_contains: 'Saarinen' } },
                    { metadata: { path: '$.author', array_contains: 'Saarinen' } },
                    { metadata: { path: '$.author', array_contains: 'saarinen' } },
                    { metadata: { path: '$.author', array_contains: 'SAARINEN' } },
                    { metadata: { path: '$.author', array_contains: 'Saarinen' } },
                  ],
                },
              ],
            },
            // Access control conditions (mockUser has no groups)
            {
              OR: [{ userId: mockUser.id }, { documentPrivacy: 'PUBLIC' }],
            },
          ],
        },
      });
    });

    /**
     * Scenario: User searches with single field bracket notation [author.Saarinen]
     * Expected outcome: Search conditions are created for the single field
     * Contract: Postcondition (search targets only the specified metadata field)
     * Business impact: Users can perform targeted searches on specific metadata fields
     */
    it('should handle single field bracket notation search', async () => {
      const query = {
        page: 1,
        limit: 10,
        search: '[author.Saarinen]',
      } as DocumentQueryInput;
      const documents = [mockDocument];
      const total = 1;

      document.count.mockResolvedValue(total);
      document.findMany.mockResolvedValue(documents);

      await documentsService.listDocuments(query, mockAdminUser);

      // Verify the where clause structure for single field bracket search
      expect(document.count).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              OR: [
                { metadata: { path: '$.author', string_contains: 'Saarinen' } },
                { metadata: { path: '$.author', string_contains: 'saarinen' } },
                { metadata: { path: '$.author', string_contains: 'SAARINEN' } },
                { metadata: { path: '$.author', string_contains: 'Saarinen' } },
                { metadata: { path: '$.author', array_contains: 'Saarinen' } },
                { metadata: { path: '$.author', array_contains: 'saarinen' } },
                { metadata: { path: '$.author', array_contains: 'SAARINEN' } },
                { metadata: { path: '$.author', array_contains: 'Saarinen' } },
              ],
            },
          ],
        },
      });
    });

    /**
     * Scenario: User searches with partially malformed bracket notation
     * Expected outcome: Parses valid field:value pairs and ignores malformed ones
     * Contract: Postcondition (valid field:value pairs are processed, malformed ones ignored)
     * Business impact: System gracefully handles partially invalid bracket notation
     */
    it('should parse valid field:value pairs from partially malformed bracket notation', async () => {
      const query = {
        page: 1,
        limit: 10,
        search: '[author.Saarinen, personNames]', // Missing value for personNames
      } as DocumentQueryInput;
      const documents = [mockDocument];
      const total = 1;

      document.count.mockResolvedValue(total);
      document.findMany.mockResolvedValue(documents);

      await documentsService.listDocuments(query, mockAdminUser);

      // Should parse the valid author.Saarinen pair and ignore the malformed personNames
      // Since only one field is valid, this behaves like a single-field search (uses OR)
      expect(document.count).toHaveBeenCalledWith({
        where: {
          OR: [
            {
              OR: [
                { metadata: { path: '$.author', string_contains: 'Saarinen' } },
                { metadata: { path: '$.author', string_contains: 'saarinen' } },
                { metadata: { path: '$.author', string_contains: 'SAARINEN' } },
                { metadata: { path: '$.author', string_contains: 'Saarinen' } },
                { metadata: { path: '$.author', array_contains: 'Saarinen' } },
                { metadata: { path: '$.author', array_contains: 'saarinen' } },
                { metadata: { path: '$.author', array_contains: 'SAARINEN' } },
                { metadata: { path: '$.author', array_contains: 'Saarinen' } },
              ],
            },
          ],
        },
      });
    }); // This closes the 'should parse valid field:value...' test

    /**
     * Scenario: User searches with completely malformed bracket notation
     * Expected outcome: Falls back to regular search behavior
     * Contract: Postcondition (completely malformed bracket notation is treated as regular search)
     * Business impact: System gracefully handles completely invalid bracket notation
     */
    it('should fall back to regular search for completely malformed bracket notation', async () => {
      const query = {
        page: 1,
        limit: 10,
        search: '[author, personNames]', // No colons or values
      } as DocumentQueryInput;
      const documents = [mockDocument];
      const total = 1;

      document.count.mockResolvedValue(total);
      document.findMany.mockResolvedValue(documents);

      await documentsService.listDocuments(query, mockAdminUser);

      // Should fall back to regular search since no valid field:value pairs were found
      expect(document.count).toHaveBeenCalledWith({
        where: {
          OR: expect.arrayContaining([
            { fileName: { contains: '[author, personNames]' } },
            { ocrText: { contains: '[author, personNames]' } },
          ]),
        },
      });
    });
  });
});
