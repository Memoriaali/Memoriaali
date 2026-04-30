/**
 * Collections Controller
 *
 * HTTP request/response layer for collection management endpoints.
 * Simplified version that matches existing CollectionsService interface.
 *
 * Design by Contract:
 * - Preconditions: Valid HTTP requests with proper authentication
 * - Postconditions: Type-safe HTTP responses with security field filtering
 * - Invariants: No sensitive data exposure, consistent error handling
 */

import { PaginationResponse } from '@memoriaali/shared';
import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ERROR_CODES, HttpException } from '../../shared/errors';
import { AuthenticatedRequest } from '../../shared/types/AuthenticatedRequest';

// Type for collection with includes
type CollectionWithIncludes = {
  id: string;
  collectionName: string;
  collectionDescription: string;
  createdAt: Date;
  updatedAt: Date;
  createdById: string;
  updatedById: string;
  createdBy: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  updatedBy: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
  _count: {
    documentsInCollections: number;
  };
};

import {
  CreateCollectionInputSchema,
  ListCollectionsQuerySchema,
  UpdateCollectionInputSchema,
  selectCollectionResponseSchema,
  type CreateCollectionInput,
  type ListCollectionsQuery,
  type UpdateCollectionInput,
} from './collections.schemas';
import { CollectionsService } from './collections.service';

/**
 * Collections Controller Class
 *
 * Orchestrates HTTP request handling for collection management operations.
 */
export class CollectionsController {
  constructor(private readonly collectionsService: CollectionsService) {}

  /**
   * Create new collection
   */
  createCollection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }

    // Validation happens in middleware - ZodError should be caught there
    const collectionData: CreateCollectionInput = CreateCollectionInputSchema.parse(req.body);
    const newCollection = await this.collectionsService.createCollection(
      collectionData,
      req.authenticatedUser,
    );

    const responseSchema = selectCollectionResponseSchema(req.authenticatedUser.role, true);
    const response = responseSchema.parse(newCollection);

    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: response,
      message: 'Collection created successfully',
    });
  };

  /**
   * Get collection by ID
   */
  getCollectionById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }

    const { id } = req.params;

    if (!id) {
      throw HttpException.badRequest(
        ERROR_CODES.VALIDATION.MISSING_REQUIRED_FIELD,
        'Collection ID is required',
      );
    }

    const collection = (await this.collectionsService.getCollectionById(
      id,
      req.authenticatedUser,
    )) as CollectionWithIncludes | null;

    if (!collection) {
      throw HttpException.notFound(ERROR_CODES.COLLECTION.NOT_FOUND, 'Collection not found');
    }

    const user = req.authenticatedUser;
    const isOwner = collection.createdById === user.id;
    const responseSchema = selectCollectionResponseSchema(user.role, isOwner);

    // Transform the data to rename documentsInCollections to documents
    const transformedCollection = {
      ...collection,
      _count: {
        documents: collection._count.documentsInCollections,
      },
    };

    const response = responseSchema.parse(transformedCollection);

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: response,
    });
  };

  /**
   * Update collection
   */
  updateCollection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }

    const { id } = req.params;

    if (!id) {
      throw HttpException.badRequest(
        ERROR_CODES.VALIDATION.MISSING_REQUIRED_FIELD,
        'Collection ID is required',
      );
    }

    // Validation happens in middleware - ZodError should be caught there
    const updateData: UpdateCollectionInput = UpdateCollectionInputSchema.parse(req.body);
    const updatedCollection = await this.collectionsService.updateCollection(
      id,
      updateData,
      req.authenticatedUser,
    );

    const user = req.authenticatedUser;
    const isOwner = updatedCollection.createdById === user.id;
    const responseSchema = selectCollectionResponseSchema(user.role, isOwner);
    const response = responseSchema.parse(updatedCollection);

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: response,
      message: 'Collection updated successfully',
    });
  };

  /**
   * Delete collection
   */
  deleteCollection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }

    const { id } = req.params;

    if (!id) {
      throw HttpException.badRequest(
        ERROR_CODES.VALIDATION.MISSING_REQUIRED_FIELD,
        'Collection ID is required',
      );
    }

    await this.collectionsService.deleteCollection(id, req.authenticatedUser);

    res.status(StatusCodes.OK).json({
      status: 'success',
      message: 'Collection deleted successfully',
    });
  };

  /**
   * List collections with pagination and search
   */
  listCollections = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }

    // Validation happens in middleware - ZodError should be caught there
    const query: ListCollectionsQuery = ListCollectionsQuerySchema.parse(req.query);
    const result = await this.collectionsService.listCollections(query, req.authenticatedUser);
    const collectionsWithIncludes = result.data as CollectionWithIncludes[];

    // Apply response schema to each collection
    const user = req.authenticatedUser;
    const collections = collectionsWithIncludes.map((collection) => {
      const isOwner = collection.createdById === user.id;
      const responseSchema = selectCollectionResponseSchema(user.role, isOwner);

      // Transform the data to rename documentsInCollections to documents
      const transformedCollection = {
        ...collection,
        _count: {
          documents: collection._count.documentsInCollections,
        },
      };

      return responseSchema.parse(transformedCollection);
    });

    const response: PaginationResponse<(typeof collections)[0]> = {
      data: collections,
      pagination: result.pagination,
      links: result.links,
    };

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: response,
    });
  };

  /**
   * Get collection count for current user
   */
  getCollectionCount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
        'Authentication required',
      );
    }

    const count = await this.collectionsService.getCollectionCount(req.authenticatedUser);

    res.status(StatusCodes.OK).json({
      status: 'success',
      data: { count },
    });
  };
}
