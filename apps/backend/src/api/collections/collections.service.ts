/**
 * Collections Service
 *
 * Provides business logic for collection management in Finnish memory institutions,
 * including document organization, curation workflows, and institutional oversight.
 *
 * Design by Contract:
 * - Preconditions: Valid collection data, proper authentication context
 * - Postconditions: Database consistency, audit trail creation
 * - Invariants: Collection name uniqueness, ownership integrity
 */

import { Collection, Prisma, PrismaClient } from '@memoriaali/database';
import { PaginationResponse } from '@memoriaali/shared';

import { ERROR_CODES, HttpException } from '../../shared/errors';
import { PrismaPaginationService } from '../../shared/services/prisma-pagination.service';
import { AuthenticatedUser } from '../../shared/types/authenticated-user';

import {
  CreateCollectionInput,
  ListCollectionsQuery,
  UpdateCollectionInput,
} from './collections.schemas';

interface WithCount {
  _count: {
    documentsInCollections: number;
  };
}

/**
 * Collection Management Service
 *
 * Provides business logic for Finnish memory institution collection management,
 * including document organization, curation workflows, and institutional oversight.
 *
 * Design by Contract:
 * - Preconditions: Valid collection data, proper authentication context
 * - Postconditions: Database consistency, audit trail creation
 * - Invariants: Collection name uniqueness, ownership integrity
 */
export class CollectionsService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly paginationService: PrismaPaginationService = new PrismaPaginationService(
      prisma,
      'http://localhost:3000',
    ),
  ) {}

  // ================================================================================================
  // CORE CRUD OPERATIONS (Enhanced with Service-Level Authorization)
  // ================================================================================================

  /**
   * Create a new collection with institutional validation
   *
   * Preconditions: collectionData is valid, collectionName is unique, authenticatedUser is provided
   * Postconditions: Collection created in database, audit log entry created
   * Invariants: Collection name uniqueness maintained
   */
  async createCollection(
    collectionData: CreateCollectionInput,
    authenticatedUser: AuthenticatedUser,
  ): Promise<Collection> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Validate collection name uniqueness
      await this.validateCollectionNameUnique(collectionData.collectionName, tx);

      // Create collection record
      const collection = await tx.collection.create({
        data: {
          collectionName: collectionData.collectionName,
          collectionDescription: collectionData.collectionDescription,
          createdById: authenticatedUser.id,
          updatedById: authenticatedUser.id,
        },
      });

      return collection;
    });
  }

  /**
   * Get collection by ID with proper authorization
   *
   * Preconditions: collectionId is valid UUID, authenticatedUser is provided
   * Postconditions: Returns collection if user has access, null otherwise
   * Invariants: Authorization rules enforced
   */
  async getCollectionById(
    collectionId: string,
    authenticatedUser: AuthenticatedUser,
  ): Promise<(Collection & WithCount) | null> {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        updatedBy: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            documentsInCollections: true,
          },
        },
      },
    });

    if (!collection) {
      return null;
    }

    // Check if user has access to this collection
    const canAccessCollection = this.canAccessCollection(collection, authenticatedUser);
    if (!canAccessCollection) {
      return null;
    }

    return collection;
  }

  /**
   * Update collection with authorization and validation
   *
   * Preconditions: collectionId is valid, updateData is valid, user has permission
   * Postconditions: Collection updated, audit trail maintained
   * Invariants: Collection name uniqueness maintained if name is being updated
   */
  async updateCollection(
    collectionId: string,
    updateData: UpdateCollectionInput,
    authenticatedUser: AuthenticatedUser,
  ): Promise<Collection> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Get existing collection
      const existingCollection = await tx.collection.findUnique({
        where: { id: collectionId },
      });

      if (!existingCollection) {
        throw HttpException.notFound(ERROR_CODES.COLLECTION.NOT_FOUND, 'Collection not found');
      }

      // Check authorization
      this.requireCollectionAccess(existingCollection, authenticatedUser, 'update');

      // Validate collection name uniqueness if name is being updated
      if (
        updateData.collectionName &&
        updateData.collectionName !== existingCollection.collectionName
      ) {
        await this.validateCollectionNameUnique(updateData.collectionName, tx, collectionId);
      }

      // Prepare update data
      const updatePayload = {
        ...updateData,
        updatedById: authenticatedUser.id,
      };

      // Remove undefined properties to avoid Prisma type issues
      Object.keys(updatePayload).forEach((key) => {
        if ((updatePayload as Record<string, unknown>)[key] === undefined) {
          delete (updatePayload as Record<string, unknown>)[key];
        }
      });

      // Update collection
      const updatedCollection = await tx.collection.update({
        where: { id: collectionId },
        data: updatePayload as Prisma.CollectionUpdateInput,
      });

      return updatedCollection;
    });
  }

  /**
   * Delete collection with authorization and cascade handling
   *
   * Preconditions: collectionId is valid, user has permission, no dependent documents
   * Postconditions: Collection deleted, related records cleaned up
   * Invariants: Referential integrity maintained
   */
  async deleteCollection(
    collectionId: string,
    authenticatedUser: AuthenticatedUser,
  ): Promise<void> {
    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Get existing collection
      const existingCollection = await tx.collection.findUnique({
        where: { id: collectionId },
        include: {
          documentsInCollections: true,
        },
      });

      if (!existingCollection) {
        throw HttpException.notFound(ERROR_CODES.COLLECTION.NOT_FOUND, 'Collection not found');
      }

      // Check authorization
      this.requireCollectionAccess(existingCollection, authenticatedUser, 'delete');

      // Check if collection has documents
      if (existingCollection.documentsInCollections.length > 0) {
        throw HttpException.badRequest(
          ERROR_CODES.COLLECTION.HAS_DOCUMENTS,
          'Cannot delete collection that contains documents. Please remove all documents first.',
        );
      }

      // Delete collection
      await tx.collection.delete({
        where: { id: collectionId },
      });
    });
  }

  /**
   * List collections with pagination and search
   *
   * Preconditions: query parameters are valid, user is authenticated
   * Postconditions: Returns paginated collection list with proper access control
   * Invariants: Pagination limits enforced, search results filtered by access
   */
  async listCollections(
    query: ListCollectionsQuery,
    authenticatedUser: AuthenticatedUser,
  ): Promise<PaginationResponse<Collection & WithCount>> {
    const { page, limit, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;

    // Build where clause with search and access control
    const where: Prisma.CollectionWhereInput = {};

    // Add search functionality
    if (search) {
      where.OR = [
        { collectionName: { contains: search } },
        { collectionDescription: { contains: search } },
      ];
    }

    // Add access control - users can see collections they created or all collections if admin
    if (authenticatedUser.role !== 'ADMIN') {
      where.createdById = authenticatedUser.id;
    }

    // Build order by clause
    const orderBy: Prisma.CollectionOrderByWithRelationInput = {};
    orderBy[sortBy] = sortOrder;

    // Execute paginated query using direct Prisma
    const skip = (page - 1) * limit;

    const [collections, totalCount] = await Promise.all([
      this.prisma.collection.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              documentsInCollections: true,
            },
          },
        },
      }),
      this.prisma.collection.count({ where }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: collections,
      pagination: {
        limit,
        totalCount,
        currentPage: page,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
      links: {
        self: `/api/v2/collections?page=${page}&limit=${limit}`,
        first: `/api/v2/collections?page=1&limit=${limit}`,
        ...(page > 1 && { prev: `/api/v2/collections?page=${page - 1}&limit=${limit}` }),
        ...(page < totalPages && { next: `/api/v2/collections?page=${page + 1}&limit=${limit}` }),
        ...(totalPages > 1 && { last: `/api/v2/collections?page=${totalPages}&limit=${limit}` }),
      },
    };
  }

  // ================================================================================================
  // VALIDATION AND AUTHORIZATION HELPERS
  // ================================================================================================

  /**
   * Validate collection name uniqueness
   *
   * Preconditions: collectionName is provided, transaction context is available
   * Postconditions: Throws error if name is not unique
   * Invariants: Case-insensitive uniqueness check
   */
  private async validateCollectionNameUnique(
    collectionName: string,
    tx: Prisma.TransactionClient,
    excludeId?: string,
  ): Promise<void> {
    const where: Prisma.CollectionWhereInput = {
      collectionName: {
        equals: collectionName,
      },
    };

    if (excludeId) {
      where.id = { not: excludeId };
    }

    const existingCollection = await tx.collection.findFirst({ where });

    if (existingCollection) {
      throw HttpException.conflict(
        ERROR_CODES.COLLECTION.NAME_ALREADY_EXISTS,
        'Collection name already exists',
      );
    }
  }

  /**
   * Check if user can access a collection
   *
   * Preconditions: collection and authenticatedUser are provided
   * Postconditions: Returns boolean indicating access permission
   * Invariants: Admin users always have access
   */
  private canAccessCollection(
    collection: Collection,
    authenticatedUser: AuthenticatedUser,
  ): boolean {
    // Admin users can access all collections
    if (authenticatedUser.role === 'ADMIN') {
      return true;
    }

    // Users can access collections they created
    return collection.createdById === authenticatedUser.id;
  }

  /**
   * Require collection access or throw error
   *
   * Preconditions: collection, authenticatedUser, and operation are provided
   * Postconditions: Throws error if user doesn't have required access
   * Invariants: Authorization rules enforced
   */
  private requireCollectionAccess(
    collection: Collection,
    authenticatedUser: AuthenticatedUser,
    operation: 'read' | 'update' | 'delete',
  ): void {
    const canAccess = this.canAccessCollection(collection, authenticatedUser);

    if (!canAccess) {
      throw HttpException.forbidden(
        ERROR_CODES.AUTH.ACCESS_DENIED,
        `Insufficient permissions to ${operation} this collection`,
      );
    }
  }

  // ================================================================================================
  // UTILITY METHODS
  // ================================================================================================

  /**
   * Get collection count for user
   *
   * Preconditions: authenticatedUser is provided
   * Postconditions: Returns count of collections user can access
   * Invariants: Count reflects access permissions
   */
  async getCollectionCount(authenticatedUser: AuthenticatedUser): Promise<number> {
    const where: Prisma.CollectionWhereInput = {};

    // Add access control
    if (authenticatedUser.role !== 'ADMIN') {
      where.createdById = authenticatedUser.id;
    }

    return this.prisma.collection.count({ where });
  }

  /**
   * Check if collection exists and user has access
   *
   * Preconditions: collectionId and authenticatedUser are provided
   * Postconditions: Returns boolean indicating existence and access
   * Invariants: Access control enforced
   */
  async collectionExists(
    collectionId: string,
    authenticatedUser: AuthenticatedUser,
  ): Promise<boolean> {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (!collection) {
      return false;
    }

    return this.canAccessCollection(collection, authenticatedUser);
  }
}
