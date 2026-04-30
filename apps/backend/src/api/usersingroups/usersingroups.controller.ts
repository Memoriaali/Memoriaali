import { Response } from 'express';
import { ZodError } from 'zod';

import { AuthenticatedRequest } from '../../shared/types/AuthenticatedRequest';

import { ERROR_CODES, HttpException } from '../../shared/errors';
import {
  AddUserToGroupRequest,
  ListGroupsForUserQueryOnlySchema,
  ListUsersInGroupQueryOnlySchema,
  RemoveUserFromGroupRequest,
} from './usersingroups.schemas';
import { UsersInGroupsService } from './usersingroups.service';

/**
 * Controller for managing users in groups relationships
 *
 * Handles HTTP requests for adding/removing users from groups,
 * listing group memberships, and providing proper error responses.
 *
 * Security Features:
 * - Validates request data using Zod schemas
 * - Provides consistent error responses
 * - Handles authentication context
 * - Implements proper HTTP status codes
 */
export class UsersInGroupsController {
  constructor(private readonly usersInGroupsService: UsersInGroupsService) {}

  /**
   * Add a user to a group
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async addUserToGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId, groupId, metadata } = req.body as AddUserToGroupRequest;
    const currentUserId = req.authenticatedUser?.id;

    if (!currentUserId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        data: null,
      });
      return;
    }

    try {
      const membership = await this.usersInGroupsService.addUserToGroup(
        userId,
        groupId,
        metadata,
        currentUserId,
      );

      res.status(201).json({
        success: true,
        message: 'User added to group successfully',
        data: membership,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Remove a user from a group
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async removeUserFromGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId, groupId } = req.body as RemoveUserFromGroupRequest;
    const currentUserId = req.authenticatedUser?.id;

    if (!currentUserId) {
      res.status(401).json({
        success: false,
        message: 'Authentication required',
        data: null,
      });
      return;
    }

    try {
      const membership = await this.usersInGroupsService.removeUserFromGroup(
        userId,
        groupId,
        currentUserId,
      );

      res.status(200).json({
        success: true,
        message: 'User removed from group successfully',
        data: membership,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get all users in a group with pagination
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async getUsersInGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { groupId } = req.params;

    if (!groupId) {
      res.status(400).json({
        success: false,
        message: 'Group ID is required',
        data: null,
      });
      return;
    }

    try {
      // Validate and parse query parameters using Zod schema
      const { page, limit } = ListUsersInGroupQueryOnlySchema.parse(req.query);

      const result = await this.usersInGroupsService.getUsersInGroup(groupId, page, limit);

      res.status(200).json({
        success: true,
        message: 'Users in group retrieved successfully',
        data: result,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get all groups for a user with pagination
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async getGroupsForUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({
        success: false,
        message: 'User ID is required',
        data: null,
      });
      return;
    }

    try {
      // Validate and parse query parameters using Zod schema
      const { page, limit } = ListGroupsForUserQueryOnlySchema.parse(req.query);

      const viewer = req.authenticatedUser;

      const isOwner = viewer.id === userId;
      if (!isOwner && !viewer.isModerator) {
        throw HttpException.forbidden(ERROR_CODES.AUTH.ACCESS_DENIED, 'Access denied');
      }

      const result = await this.usersInGroupsService.getGroupsForUser(userId, page, limit);

      res.status(200).json({
        success: true,
        message: 'User groups retrieved successfully',
        data: result,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Check if a user is a member of a group
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async isUserInGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId, groupId } = req.params;

    if (!userId || !groupId) {
      res.status(400).json({
        success: false,
        message: 'User ID and Group ID are required',
        data: null,
      });
      return;
    }

    try {
      const isMember = await this.usersInGroupsService.isUserInGroup(userId, groupId);

      res.status(200).json({
        success: true,
        message: 'Membership check completed',
        data: { isMember },
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get a specific user-group membership
   *
   * @param req - Express request object
   * @param res - Express response object
   */
  async getUserGroupMembership(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { userId, groupId } = req.params;

    if (!userId || !groupId) {
      res.status(400).json({
        success: false,
        message: 'User ID and Group ID are required',
        data: null,
      });
      return;
    }

    try {
      const membership = await this.usersInGroupsService.getUserGroupMembership(userId, groupId);

      if (!membership) {
        res.status(404).json({
          success: false,
          message: 'Membership not found',
          data: null,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Membership retrieved successfully',
        data: membership,
      });
    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Handle errors and provide consistent error responses
   *
   * @param error - Error object
   * @param res - Express response object
   */
  private handleError(error: unknown, res: Response): void {
    console.error('UsersInGroups API Error:', error);

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        data: null,
        details: error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
      return;
    }

    if (error instanceof Error) {
      const errorMessage = error.message;
      let statusCode = 500;

      // Map specific error types to HTTP status codes
      if (errorMessage.includes('not found')) {
        statusCode = 404;
      } else if (
        errorMessage.includes('already a member') ||
        errorMessage.includes('not a member')
      ) {
        statusCode = 409;
      } else if (errorMessage.includes('Invalid')) {
        statusCode = 400;
      } else if (errorMessage.includes('permission') || errorMessage.includes('authorization')) {
        statusCode = 403;
      }

      res.status(statusCode).json({
        success: false,
        message: errorMessage,
        data: null,
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        data: null,
      });
    }
  }
}
