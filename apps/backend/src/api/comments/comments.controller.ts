import { RequestHandler, Response } from 'express';

import { HttpException } from '../../shared/errors';
import { AuthenticatedRequest } from '../../shared/types/AuthenticatedRequest';
import { asyncHandler } from '../../shared/utils/response.utils';

import { CustomSchemas } from '@memoriaali/api-types';
import { UpdateCommentInput, type CreateCommentInput } from './comments.schemas';
import { CommentsService } from './comments.service';
/**
 * Comments Controller
 *
 * Handles HTTP requests and responses for comment operations.
 * Implements proper error handling, validation, and response formatting.
 */
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Create a new comment
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  createComment: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const input = req.body as CreateCommentInput;

      const comment = await this.commentsService.createComment(input, currentUser);

      res.status(201).json({
        status: 'success',
        data: comment,
        message: 'Comment created successfully',
      });
    },
  );

  /**
   * Get a comment by ID
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getCommentById: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const { id } = req.params;

      if (!id) {
        throw HttpException.badRequest(undefined, 'Comment ID is required');
      }

      const comment = await this.commentsService.getCommentById(id, currentUser);

      res.status(200).json({
        status: 'success',
        data: comment,
      });
    },
  );

  /**
   * Get comments with filtering and pagination
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getComments: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const query = CustomSchemas.CommentQuerySchema.parse(req.query);

      const result = await this.commentsService.getComments(query, currentUser);

      res.status(200).json({
        status: 'success',
        data: {
          comments: result.data,
          pagination: result.pagination,
        },
      });
    },
  );

  /**
   * Get comments for a specific document
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getCommentsByDocument: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const { documentId } = req.params;
      const query = CustomSchemas.CommentQuerySchema.parse(req.query);

      if (!documentId) {
        throw HttpException.badRequest(undefined, 'Document ID is required');
      }

      const result = await this.commentsService.getCommentsByDocument(
        documentId,
        query,
        currentUser,
      );

      res.status(200).json({
        status: 'success',
        data: {
          comments: result.data,
          pagination: result.pagination,
        },
      });
    },
  );

  /**
   * Update a comment
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  updateComment: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const { id } = req.params;
      const input = req.body as UpdateCommentInput;

      if (!id) {
        throw HttpException.badRequest(undefined, 'Comment ID is required');
      }

      const comment = await this.commentsService.updateComment(id, input, currentUser);

      res.status(200).json({
        status: 'success',
        data: comment,
        message: 'Comment updated successfully',
      });
    },
  );

  /**
   * Delete a comment
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  deleteComment: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const { id } = req.params;

      if (!id) {
        throw HttpException.badRequest(undefined, 'Comment ID is required');
      }

      await this.commentsService.deleteComment(id, currentUser);

      res.status(200).json({
        status: 'success',
        message: 'Comment deleted successfully',
      });
    },
  );

  /**
   * Approve a comment (moderator only)
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  approveComment: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const { id } = req.params;

      if (!id) {
        throw HttpException.badRequest(undefined, 'Comment ID is required');
      }

      const comment = await this.commentsService.approveComment(id, currentUser);

      res.status(200).json({
        status: 'success',
        data: comment,
        message: 'Comment approved successfully',
      });
    },
  );

  /**
   * Reject a comment (moderator only)
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  rejectComment: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const { id } = req.params;

      if (!id) {
        throw HttpException.badRequest(undefined, 'Comment ID is required');
      }

      const comment = await this.commentsService.rejectComment(id, currentUser);

      res.status(200).json({
        status: 'success',
        data: comment,
        message: 'Comment rejected successfully',
      });
    },
  );

  /**
   * Get pending comments for moderation
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  getPendingComments: RequestHandler = asyncHandler(
    async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const currentUser = req.authenticatedUser;
      const query = CustomSchemas.CommentQuerySchema.parse(req.query);

      const result = await this.commentsService.getPendingComments(query, currentUser);

      res.status(200).json({
        status: 'success',
        data: {
          comments: result.data,
          pagination: result.pagination,
        },
      });
    },
  );
}
