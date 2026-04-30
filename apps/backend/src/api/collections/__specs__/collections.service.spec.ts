/**
 * Collections Service Unit Tests
 *
 * Tests the business logic for collection management operations.
 * Covers CRUD operations, authorization, and validation logic.
 */

import { Collection } from '@memoriaali/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpException } from '../../../shared/errors';
import { AuthenticatedUser } from '../../../shared/types/authenticated-user';
import { CreateCollectionInput, UpdateCollectionInput } from '../collections.schemas';
import { CollectionsService } from '../collections.service';

describe('CollectionsService', () => {
  let collectionsService: CollectionsService;
  let mockPrisma: any;
  let mockTransaction: any;
  let mockUser: AuthenticatedUser;

  // Test fixtures
  const testUser = new AuthenticatedUser(
    'user-123',
    'test@example.com',
    'Test',
    'User',
    'USER',
    true, // isActive
    true, // isVerified
  );

  const testAdminUser = new AuthenticatedUser(
    'admin-123',
    'admin@example.com',
    'Admin',
    'User',
    'ADMIN',
    true, // isActive
    true, // isVerified
  );

  beforeEach(() => {
    // Create fresh mocks for each test
    mockTransaction = {
      collection: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    mockPrisma = {
      $transaction: vi.fn(),
      collection: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
    };

    collectionsService = new CollectionsService(mockPrisma);
    mockUser = testUser;
  });

  describe('createCollection', () => {
    const createCollectionData: CreateCollectionInput = {
      collectionName: 'Test Collection',
      collectionDescription: 'A test collection for unit testing',
    };

    it('creates collection successfully', async () => {
      const expectedCollection: Collection = {
        id: 'collection-123',
        collectionName: createCollectionData.collectionName,
        collectionDescription: createCollectionData.collectionDescription,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: mockUser.id,
        updatedById: mockUser.id,
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.collection.findFirst.mockResolvedValue(null);
        mockTransaction.collection.create.mockResolvedValue(expectedCollection);
        return await callback(mockTransaction);
      });

      const result = await collectionsService.createCollection(createCollectionData, mockUser);

      expect(result).toEqual(expectedCollection);
      expect(mockTransaction.collection.create).toHaveBeenCalledWith({
        data: {
          collectionName: createCollectionData.collectionName,
          collectionDescription: createCollectionData.collectionDescription,
          createdById: mockUser.id,
          updatedById: mockUser.id,
        },
      });
    });

    it('throws error if collection name already exists', async () => {
      const existingCollection = {
        id: 'existing-123',
        collectionName: createCollectionData.collectionName,
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.collection.findFirst.mockResolvedValue(existingCollection);
        return await callback(mockTransaction);
      });

      await expect(
        collectionsService.createCollection(createCollectionData, mockUser),
      ).rejects.toThrow(HttpException);

      await expect(
        collectionsService.createCollection(createCollectionData, mockUser),
      ).rejects.toMatchObject({
        code: 'COLLECTION_NAME_ALREADY_EXISTS',
      });
    });
  });

  describe('getCollectionById', () => {
    const collectionId = 'collection-123';

    it('returns collection with documents count if user has access', async () => {
      const mockCollection = {
        id: collectionId,
        collectionName: 'Test Collection',
        collectionDescription: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: mockUser.id,
        updatedById: mockUser.id,
        createdBy: { id: mockUser.id, username: 'test.user' },
        updatedBy: { id: mockUser.id, username: 'test.user' },
        _count: { documentsInCollections: 3 },
      };

      mockPrisma.collection.findUnique.mockResolvedValue(mockCollection);

      const result = await collectionsService.getCollectionById(collectionId, mockUser);

      expect(result).toEqual(mockCollection);
      expect(result?._count.documentsInCollections).toBe(3);
      expect(mockPrisma.collection.findUnique).toHaveBeenCalledWith({
        where: { id: collectionId },
        include: {
          createdBy: { select: { id: true, username: true, firstName: true, lastName: true } },
          updatedBy: { select: { id: true, username: true, firstName: true, lastName: true } },
          _count: { select: { documentsInCollections: true } },
        },
      });
    });

    it('returns null if collection does not exist', async () => {
      mockPrisma.collection.findUnique.mockResolvedValue(null);

      const result = await collectionsService.getCollectionById(collectionId, mockUser);

      expect(result).toBeNull();
    });

    it('returns null if user does not have access', async () => {
      const mockCollection: Collection = {
        id: collectionId,
        collectionName: 'Test Collection',
        collectionDescription: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'other-user-123',
        updatedById: 'other-user-123',
      };

      mockPrisma.collection.findUnique.mockResolvedValue(mockCollection);

      const result = await collectionsService.getCollectionById(collectionId, mockUser);

      expect(result).toBeNull();
    });
  });

  describe('updateCollection', () => {
    const collectionId = 'collection-123';
    const updateData: UpdateCollectionInput = {
      collectionName: 'Updated Collection Name',
      collectionDescription: 'Updated description',
    };

    it('updates collection successfully', async () => {
      const existingCollection: Collection = {
        id: collectionId,
        collectionName: 'Original Name',
        collectionDescription: 'Original description',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: mockUser.id,
        updatedById: mockUser.id,
      };

      const updatedCollection = {
        ...existingCollection,
        ...updateData,
        updatedAt: new Date(),
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.collection.findUnique.mockResolvedValue(existingCollection);
        mockTransaction.collection.findFirst.mockResolvedValue(null);
        mockTransaction.collection.update.mockResolvedValue(updatedCollection);
        return await callback(mockTransaction);
      });

      const result = await collectionsService.updateCollection(collectionId, updateData, mockUser);

      expect(result).toEqual(updatedCollection);
      expect(mockTransaction.collection.update).toHaveBeenCalledWith({
        where: { id: collectionId },
        data: {
          ...updateData,
          updatedById: mockUser.id,
        },
      });
    });

    it('throws error if collection does not exist', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.collection.findUnique.mockResolvedValue(null);
        return await callback(mockTransaction);
      });

      await expect(
        collectionsService.updateCollection(collectionId, updateData, mockUser),
      ).rejects.toThrow(HttpException);

      await expect(
        collectionsService.updateCollection(collectionId, updateData, mockUser),
      ).rejects.toMatchObject({
        code: 'COLLECTION_NOT_FOUND',
      });
    });

    it('throws error if user does not have access', async () => {
      const existingCollection: Collection = {
        id: collectionId,
        collectionName: 'Original Name',
        collectionDescription: 'Original description',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'other-user-123',
        updatedById: 'other-user-123',
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.collection.findUnique.mockResolvedValue(existingCollection);
        return await callback(mockTransaction);
      });

      await expect(
        collectionsService.updateCollection(collectionId, updateData, mockUser),
      ).rejects.toThrow(HttpException);

      await expect(
        collectionsService.updateCollection(collectionId, updateData, mockUser),
      ).rejects.toMatchObject({
        code: 'ACCESS_DENIED',
      });
    });
  });

  describe('deleteCollection', () => {
    const collectionId = 'collection-123';

    it('deletes collection successfully when no documents', async () => {
      const existingCollection = {
        id: collectionId,
        collectionName: 'Test Collection',
        collectionDescription: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: mockUser.id,
        updatedById: mockUser.id,
        documentsInCollections: [],
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.collection.findUnique.mockResolvedValue(existingCollection);
        mockTransaction.collection.delete.mockResolvedValue(existingCollection);
        return await callback(mockTransaction);
      });

      await collectionsService.deleteCollection(collectionId, mockUser);

      expect(mockTransaction.collection.delete).toHaveBeenCalledWith({
        where: { id: collectionId },
      });
    });

    it('throws error if collection has documents', async () => {
      const collectionWithDocuments = {
        id: collectionId,
        collectionName: 'Test Collection',
        collectionDescription: 'Test description',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: mockUser.id,
        updatedById: mockUser.id,
        documentsInCollections: [{ id: 'doc-1' }],
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.collection.findUnique.mockResolvedValue(collectionWithDocuments);
        return await callback(mockTransaction);
      });

      await expect(collectionsService.deleteCollection(collectionId, mockUser)).rejects.toThrow(
        HttpException,
      );

      await expect(
        collectionsService.deleteCollection(collectionId, mockUser),
      ).rejects.toMatchObject({
        code: 'COLLECTION_HAS_DOCUMENTS',
      });
    });

    it('throws error if collection does not exist', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.collection.findUnique.mockResolvedValue(null);
        return await callback(mockTransaction);
      });

      await expect(collectionsService.deleteCollection(collectionId, mockUser)).rejects.toThrow(
        HttpException,
      );

      await expect(
        collectionsService.deleteCollection(collectionId, mockUser),
      ).rejects.toMatchObject({
        code: 'COLLECTION_NOT_FOUND',
      });
    });
  });

  describe('listCollections', () => {
    it('returns paginated collections for user with documents count', async () => {
      const query = { page: 1, limit: 20 };
      const mockCollections = [
        {
          id: 'collection-1',
          collectionName: 'Collection 1',
          collectionDescription: 'Description 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: mockUser.id,
          updatedById: mockUser.id,
          createdBy: { id: mockUser.id, username: 'test.user' },
          updatedBy: { id: mockUser.id, username: 'test.user' },
          _count: { documentsInCollections: 5 },
        },
        {
          id: 'collection-2',
          collectionName: 'Collection 2',
          collectionDescription: 'Description 2',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: mockUser.id,
          updatedById: mockUser.id,
          createdBy: { id: mockUser.id, username: 'test.user' },
          updatedBy: { id: mockUser.id, username: 'test.user' },
          _count: { documentsInCollections: 0 },
        },
      ];

      mockPrisma.collection.findMany.mockResolvedValue(mockCollections);
      mockPrisma.collection.count.mockResolvedValue(2);

      const result = await collectionsService.listCollections(query, mockUser);

      expect(result.data).toEqual(mockCollections);
      expect(result.data?.[0]?._count?.documentsInCollections).toBe(5);
      expect(result.data?.[1]?._count?.documentsInCollections).toBe(0);
      expect(result.pagination?.totalCount).toBe(2);
      expect(result.pagination?.currentPage).toBe(1);
      expect(mockPrisma.collection.findMany).toHaveBeenCalledWith({
        where: { createdById: mockUser.id },
        include: {
          createdBy: { select: { id: true, username: true, firstName: true, lastName: true } },
          updatedBy: { select: { id: true, username: true, firstName: true, lastName: true } },
          _count: { select: { documentsInCollections: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });

    it('includes documents count in collection queries', async () => {
      const query = { page: 1, limit: 10 };
      const mockCollection = {
        id: 'collection-1',
        collectionName: 'Test Collection',
        collectionDescription: 'Test Description',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: mockUser.id,
        updatedById: mockUser.id,
        createdBy: { id: mockUser.id, username: 'test.user' },
        updatedBy: { id: mockUser.id, username: 'test.user' },
        _count: { documentsInCollections: 3 },
      };

      mockPrisma.collection.findMany.mockResolvedValue([mockCollection]);
      mockPrisma.collection.count.mockResolvedValue(1);

      await collectionsService.listCollections(query, mockUser);

      // Verify that the _count field is included in the query
      expect(mockPrisma.collection.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            _count: { select: { documentsInCollections: true } },
          }),
        }),
      );
    });
  });

  describe('getCollectionCount', () => {
    it('returns count of user collections', async () => {
      mockPrisma.collection.count.mockResolvedValue(5);

      const result = await collectionsService.getCollectionCount(mockUser);

      expect(result).toBe(5);
      expect(mockPrisma.collection.count).toHaveBeenCalledWith({
        where: { createdById: mockUser.id },
      });
    });

    it('returns total count for admin users', async () => {
      mockPrisma.collection.count.mockResolvedValue(10);

      const result = await collectionsService.getCollectionCount(testAdminUser);

      expect(result).toBe(10);
      expect(mockPrisma.collection.count).toHaveBeenCalledWith({
        where: {},
      });
    });
  });
});
