import { RequestHandler, Response } from 'express';

import { AuthenticatedRequest } from '../../shared/types/AuthenticatedRequest';
import { asyncHandler } from '../../shared/utils/response.utils';

import { CreateGroupSchema, GroupQuerySchema, UpdateGroupSchema } from './groups.schemas';
import { GroupsService } from './groups.service';

/**
 * Controller for managing groups
 *
 * Handles HTTP requests for group CRUD operations with proper validation
 * and response formatting. Delegates business logic to GroupsService.
 *
 * Security Features:
 * - Input validation using Zod schemas
 * - Proper error handling and response formatting
 * - Audit trail maintenance
 * - Authorization checks (handled by middleware)
 */
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  /**
   * Create a new group
   *
   * @param req - Express request with authenticated user and validated body
   * @param res - Express response
   * @returns Created group with 201 status
   */
  createGroup: RequestHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validatedData = CreateGroupSchema.parse(req.body);
    if (!req.authenticatedUser) {
      throw new Error('User not authenticated');
    }
    const group = await this.groupsService.createGroup(req.authenticatedUser, validatedData);

    res.status(201).json({
      success: true,
      data: group,
      message: 'Group created successfully',
    });
  });

  /**
   * Get a group by ID
   *
   * @param req - Express request with authenticated user and group ID
   * @param res - Express response
   * @returns Group data with 200 status
   */
  getGroupById: RequestHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { groupId } = req.params;
    if (!groupId) {
      throw new Error('Group ID is required');
    }
    if (!req.authenticatedUser) {
      throw new Error('User not authenticated');
    }
    const group = await this.groupsService.getGroupById(req.authenticatedUser, groupId);

    res.status(200).json({
      success: true,
      data: group,
    });
  });

  /**
   * Get paginated list of groups
   *
   * @param req - Express request with authenticated user and query parameters
   * @param res - Express response
   * @returns Paginated list of groups with 200 status
   */
  getGroups: RequestHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const validatedQuery = GroupQuerySchema.parse(req.query);
    if (!req.authenticatedUser) {
      throw new Error('User not authenticated');
    }
    const result = await this.groupsService.getGroups(req.authenticatedUser, validatedQuery);

    res.status(200).json({
      success: true,
      data: result.groups,
      pagination: result.pagination,
    });
  });

  /**
   * Update an existing group
   *
   * @param req - Express request with authenticated user, group ID, and validated body
   * @param res - Express response
   * @returns Updated group with 200 status
   */
  updateGroup: RequestHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { groupId } = req.params;
    if (!groupId) {
      throw new Error('Group ID is required');
    }
    const validatedData = UpdateGroupSchema.parse(req.body);
    if (!req.authenticatedUser) {
      throw new Error('User not authenticated');
    }
    const group = await this.groupsService.updateGroup(
      req.authenticatedUser,
      groupId,
      validatedData,
    );

    res.status(200).json({
      success: true,
      data: group,
      message: 'Group updated successfully',
    });
  });

  /**
   * Delete a group
   *
   * @param req - Express request with authenticated user and group ID
   * @param res - Express response
   * @returns Deleted group data with 200 status
   */
  deleteGroup: RequestHandler = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { groupId } = req.params;
    if (!groupId) {
      throw new Error('Group ID is required');
    }
    if (!req.authenticatedUser) {
      throw new Error('User not authenticated');
    }
    const group = await this.groupsService.deleteGroup(req.authenticatedUser, groupId);

    res.status(200).json({
      success: true,
      data: group,
      message: 'Group deleted successfully',
    });
  });
}
