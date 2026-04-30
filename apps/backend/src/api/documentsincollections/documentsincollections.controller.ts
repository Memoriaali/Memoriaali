/**
 * DocumentsInCollections Controller
 *
 * HTTP request handling for document-collection relationship management.
 * Provides endpoints for adding and removing documents from collections.
 *
 * Design by Contract:
 * - Preconditions: Valid request data, proper authentication
 * - Postconditions: Appropriate HTTP responses, error handling
 * - Invariants: Consistent response format, proper status codes
 */

import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { ERROR_CODES, HttpException } from '../../shared/errors';
import type { AuthenticatedRequest } from '../../shared/types/AuthenticatedRequest';

import {
  AddDocumentToCollectionSchema,
  DeleteSuccessResponseSchema,
  DocumentsInCollectionsResponseSchema,
  GetDocumentsInCollectionResponseSchema,
  ListDocumentsInCollectionPathSchema,
  ListDocumentsInCollectionQuerySchema,
  RemoveDocumentFromCollectionSchema,
} from './documentsincollections.schemas';
import { DocumentsInCollectionsService } from './documentsincollections.service';

/**
 * DocumentsInCollections HTTP Controller
 *
 * Handles HTTP requests for document-collection relationship management.
 * Provides endpoints for adding and removing documents from collections.
 *
 * Design by Contract:
 * - Preconditions: Valid request data, proper authentication
 * - Postconditions: Appropriate HTTP responses, error handling
 * - Invariants: Consistent response format, proper status codes
 */
export class DocumentsInCollectionsController {
  constructor(private readonly documentsInCollectionsService: DocumentsInCollectionsService) {}

  // ================================================================================================
  // HTTP ENDPOINTS
  // ================================================================================================

  /**
   * POST /documentsincollections
   * Add a document to a collection
   *
   * Preconditions: Valid request body with documentId and collectionId
   * Postconditions: Document added to collection, returns relationship data
   * Invariants: Returns 201 on success, appropriate error codes on failure
   */
  addDocumentToCollection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Validate request body
      const validatedData = AddDocumentToCollectionSchema.parse(req.body);

      // Get authenticated user from request
      if (!req.authenticatedUser) {
        throw HttpException.unauthorized(
          ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
          'Authentication required',
        );
      }

      // Add document to collection
      const relationship = await this.documentsInCollectionsService.addDocumentToCollection(
        validatedData,
        req.authenticatedUser,
      );

      // Return success response
      const response = DocumentsInCollectionsResponseSchema.parse(relationship);
      res.status(StatusCodes.CREATED).json(response);
    } catch (error) {
      if (error instanceof HttpException) {
        res.status(error.status).json(error.toJSON());
        return;
      }

      // Handle validation errors
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Invalid request data',
          code: ERROR_CODES.VALIDATION.FAILED,
          details: error.message,
        });
        return;
      }

      // Handle unexpected errors
      console.error('Error adding document to collection:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
        code: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
      });
    }
  };

  /**
   * DELETE /documentsincollections
   * Remove a document from a collection
   *
   * Preconditions: Valid request body with documentId and collectionId
   * Postconditions: Document removed from collection, returns success message
   * Invariants: Returns 200 on success, appropriate error codes on failure
   */
  removeDocumentFromCollection = async (
    req: AuthenticatedRequest,
    res: Response,
  ): Promise<void> => {
    try {
      // Validate request body
      const validatedData = RemoveDocumentFromCollectionSchema.parse(req.body);

      // Get authenticated user from request
      if (!req.authenticatedUser) {
        throw HttpException.unauthorized(
          ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
          'Authentication required',
        );
      }

      // Remove document from collection
      const result = await this.documentsInCollectionsService.removeDocumentFromCollection(
        validatedData,
        req.authenticatedUser,
      );

      // Return success response
      const response = DeleteSuccessResponseSchema.parse(result);
      res.status(StatusCodes.OK).json(response);
    } catch (error) {
      if (error instanceof HttpException) {
        res.status(error.status).json(error.toJSON());
        return;
      }

      // Handle validation errors
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Invalid request data',
          code: ERROR_CODES.VALIDATION.FAILED,
          details: error.message,
        });
        return;
      }

      // Handle unexpected errors
      console.error('Error removing document from collection:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
        code: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
      });
    }
  };

  /**
   * GET /documentsincollections/:collectionId
   * Get all documents in a collection by collection ID
   *
   * Preconditions: Valid collectionId parameter, authenticatedUser has access to collection
   * Postconditions: Returns paginated list of documents in collection
   * Invariants: Returns 200 on success, appropriate error codes on failure
   */
  getDocumentsInCollection = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // Validate path parameters
      const validatedPath = ListDocumentsInCollectionPathSchema.parse(req.params);

      // Validate query parameters
      const validatedQuery = ListDocumentsInCollectionQuerySchema.parse(req.query);

      // Get authenticated user from request
      if (!req.authenticatedUser) {
        throw HttpException.unauthorized(
          ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
          'Authentication required',
        );
      }

      // Get documents in collection
      const result = await this.documentsInCollectionsService.getDocumentsInCollection(
        validatedPath.collectionId,
        req.authenticatedUser,
        validatedQuery.page,
        validatedQuery.limit,
      );

      // Return success response
      const response = GetDocumentsInCollectionResponseSchema.parse(result);
      res.status(StatusCodes.OK).json(response);
    } catch (error) {
      if (error instanceof HttpException) {
        res.status(error.status).json(error.toJSON());
        return;
      }

      // Handle validation errors
      if (error instanceof Error && error.name === 'ZodError') {
        res.status(StatusCodes.BAD_REQUEST).json({
          error: 'Invalid request data',
          code: ERROR_CODES.VALIDATION.FAILED,
          details: error.message,
        });
        return;
      }

      // Handle unexpected errors
      console.error('Error getting documents in collection:', error);
      res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
        code: ERROR_CODES.SYSTEM.INTERNAL_ERROR,
      });
    }
  };
}
