import { RequestHandler, Response } from 'express';

import { HttpException } from '../../shared/errors';
import { AuthenticatedRequest } from '../../shared/types/AuthenticatedRequest';
import { asyncHandler } from '../../shared/utils/response.utils';

import { CustomSchemas } from '@memoriaali/api-types';
import {
  UpdateMetadataSuggestionInput,
  type CreateMetadataSuggestionInput,
} from './metadatasuggestions.schemas';
import { MetadataSuggestionsService } from './metadatasuggestions.service';
/**
 * Metadata Suggestions Controller
 *
 * Handles HTTP requests and responses for metadata suggestion operations.
 * Implements proper error handling, validation, and response formatting.
 */
export class MetadataSuggestionsController {
  constructor(private readonly metadataSuggestionsService: MetadataSuggestionsService) {}

  /**
   * Create a new metadata suggestion
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  createMetadataSuggestion: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const input = req.body as CreateMetadataSuggestionInput;

      const metadataSuggestion = await this.metadataSuggestionsService.createMetadataSuggestion(
        input,
        currentUser,
      );

      res.status(201).json({
        status: 'success',
        data: metadataSuggestion,
        message: 'Metadata suggestion created successfully',
      });
    },
  );

  /**
   * Get a metadata suggestion by ID
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getMetadataSuggestionById: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const { id } = req.params;

      if (!id) {
        throw HttpException.badRequest(undefined, 'Metadata suggestion ID is required');
      }

      const metadataSuggestion = await this.metadataSuggestionsService.getMetadataSuggestionById(
        id,
        currentUser,
      );

      res.status(200).json({
        status: 'success',
        data: metadataSuggestion,
      });
    },
  );

  /**
   * Get metadata suggestions with filtering and pagination
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getMetadataSuggestions: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const query = CustomSchemas.MetadataSuggestionQuerySchema.parse(req.query);

      const result = await this.metadataSuggestionsService.getMetadataSuggestions(
        query,
        currentUser,
      );

      res.status(200).json({
        status: 'success',
        data: {
          metadataSuggestions: result.data,
          pagination: result.pagination,
        },
      });
    },
  );

  /**
   * Get metadata suggestions for a specific document
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getMetadataSuggestionsByDocument: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const { documentId } = req.params;
      const query = CustomSchemas.MetadataSuggestionQuerySchema.parse(req.query);

      if (!documentId) {
        throw HttpException.badRequest(undefined, 'Document ID is required');
      }

      const result = await this.metadataSuggestionsService.getMetadataSuggestionsByDocument(
        documentId,
        query,
        currentUser,
      );

      res.status(200).json({
        status: 'success',
        data: {
          metadataSuggestions: result.data,
          pagination: result.pagination,
        },
      });
    },
  );

  /**
   * Update a metadata suggestion
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  updateMetadataSuggestion: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const { id } = req.params;
      const input = req.body as UpdateMetadataSuggestionInput;

      if (!id) {
        throw HttpException.badRequest(undefined, 'Metadata suggestion ID is required');
      }

      const metadataSuggestion = await this.metadataSuggestionsService.updateMetadataSuggestion(
        id,
        input,
        currentUser,
      );

      res.status(200).json({
        status: 'success',
        data: metadataSuggestion,
        message: 'Metadata suggestion updated successfully',
      });
    },
  );

  /**
   * Delete a metadata suggestion
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  deleteMetadataSuggestion: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const { id } = req.params;

      if (!id) {
        throw HttpException.badRequest(undefined, 'Metadata suggestion ID is required');
      }

      await this.metadataSuggestionsService.deleteMetadataSuggestion(id, currentUser);

      res.status(200).json({
        status: 'success',
        message: 'Metadata suggestion deleted successfully',
      });
    },
  );

  /**
   * Approve a metadata suggestion (moderator/expert only)
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  approveMetadataSuggestion: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const { id } = req.params;

      if (!id) {
        throw HttpException.badRequest(undefined, 'Metadata suggestion ID is required');
      }

      const metadataSuggestion = await this.metadataSuggestionsService.approveMetadataSuggestion(
        id,
        currentUser,
      );

      res.status(200).json({
        status: 'success',
        data: metadataSuggestion,
        message: 'Metadata suggestion approved successfully',
      });
    },
  );

  /**
   * Verify a metadata suggestion (expert only)
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  verifyMetadataSuggestion: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const { id } = req.params;

      if (!id) {
        throw HttpException.badRequest(undefined, 'Metadata suggestion ID is required');
      }

      const metadataSuggestion = await this.metadataSuggestionsService.verifyMetadataSuggestion(
        id,
        currentUser,
      );

      res.status(200).json({
        status: 'success',
        data: metadataSuggestion,
        message: 'Metadata suggestion verified successfully',
      });
    },
  );

  /**
   * Reject a metadata suggestion (moderator/expert only)
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  rejectMetadataSuggestion: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const { id } = req.params;
      const { rejectionExplanation } = req.body as { rejectionExplanation?: string };

      if (!id) {
        throw HttpException.badRequest(undefined, 'Metadata suggestion ID is required');
      }

      const metadataSuggestion = await this.metadataSuggestionsService.rejectMetadataSuggestion(
        id,
        rejectionExplanation,
        currentUser,
      );

      res.status(200).json({
        status: 'success',
        data: metadataSuggestion,
        message: 'Metadata suggestion rejected successfully',
      });
    },
  );

  /**
   * Get pending metadata suggestions for moderation
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getPendingMetadataSuggestions: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const query = CustomSchemas.MetadataSuggestionQuerySchema.parse(req.query);

      const result = await this.metadataSuggestionsService.getPendingMetadataSuggestions(
        query,
        currentUser,
      );

      res.status(200).json({
        status: 'success',
        data: {
          metadataSuggestions: result.data,
          pagination: result.pagination,
        },
      });
    },
  );
}
