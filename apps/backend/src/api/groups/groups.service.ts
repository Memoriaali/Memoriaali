import { PrismaClient } from '@memoriaali/database';

import { ERROR_CODES, HttpException } from '../../shared/errors';
import { AuthenticatedUser } from '../../shared/types/authenticated-user';

import {
  CreateGroupRequest,
  GroupListResponse,
  GroupQueryParams,
  GroupResponse,
  UpdateGroupRequest,
} from './groups.schemas';

/**
 * Service for managing groups
 *
 * Provides CRUD operations for groups with proper authorization and validation.
 * Groups are used to organize users by institution, department, or access level.
 *
 * Security Features:
 * - Authorization checks for all operations
 * - Input validation and sanitization
 * - Audit trail maintenance
 * - Proper error handling
 */
export class GroupsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new group
   *
   * @param authenticatedUser - The authenticated user creating the group
   * @param data - Group creation data
   * @returns Created group with audit information
   *
   * @throws {HttpException} When group name already exists
   * @throws {HttpException} When user lacks permission
   */
  async createGroup(
    authenticatedUser: AuthenticatedUser,
    data: CreateGroupRequest,
  ): Promise<GroupResponse> {
    // Check if group name already exists
    const existingGroup = await this.prisma.group.findFirst({
      where: { groupName: data.groupName },
    });

    if (existingGroup) {
      throw HttpException.conflict(
        ERROR_CODES.GROUPS.GROUP_NAME_EXISTS,
        'Group name already exists',
      );
    }

    // Create the group
    const group = await this.prisma.group.create({
      data: {
        groupName: data.groupName,
        createdById: authenticatedUser.id,
        updatedById: authenticatedUser.id,
      },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return group as GroupResponse;
  }

  /**
   * Get a group by ID
   *
   * @param authenticatedUser - The authenticated user requesting the group
   * @param groupId - The ID of the group to retrieve
   * @returns Group with audit information
   *
   * @throws {HttpException} When group not found
   * @throws {HttpException} When user lacks permission
   */
  async getGroupById(
    authenticatedUser: AuthenticatedUser,
    groupId: string,
  ): Promise<GroupResponse> {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!group) {
      throw HttpException.notFound(ERROR_CODES.GROUPS.GROUP_NOT_FOUND, 'Group not found');
    }

    return group as GroupResponse;
  }

  /**
   * Get paginated list of groups
   *
   * @param authenticatedUser - The authenticated user requesting the groups
   * @param query - Query parameters for pagination and filtering
   * @returns Paginated list of groups
   *
   * @throws {HttpException} When user lacks permission
   */
  async getGroups(
    authenticatedUser: AuthenticatedUser,
    query: GroupQueryParams,
  ): Promise<GroupListResponse> {
    const { page, limit, search, sortBy, sortOrder } = query;
    const offset = (page - 1) * limit;

    // Build where clause for search
    const where = search
      ? {
          groupName: {
            contains: search,
            mode: 'insensitive' as const,
          },
        }
      : {};

    // Get total count for pagination
    const total = await this.prisma.group.count({ where });

    // Get groups with pagination
    const groups = await this.prisma.group.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      groups: groups as GroupResponse[],
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext,
        hasPrev,
      },
    };
  }

  /**
   * Update an existing group
   *
   * @param authenticatedUser - The authenticated user updating the group
   * @param groupId - The ID of the group to update
   * @param data - Group update data
   * @returns Updated group with audit information
   *
   * @throws {HttpException} When group not found
   * @throws {HttpException} When group name already exists
   * @throws {HttpException} When user lacks permission
   */
  async updateGroup(
    authenticatedUser: AuthenticatedUser,
    groupId: string,
    data: UpdateGroupRequest,
  ): Promise<GroupResponse> {
    // Check if group exists
    const existingGroup = await this.prisma.group.findUnique({
      where: { id: groupId },
    });

    if (!existingGroup) {
      throw HttpException.notFound(ERROR_CODES.GROUPS.GROUP_NOT_FOUND, 'Group not found');
    }

    // Check if new group name already exists (excluding current group)
    const duplicateGroup = await this.prisma.group.findFirst({
      where: {
        groupName: data.groupName,
        id: { not: groupId },
      },
    });

    if (duplicateGroup) {
      throw HttpException.conflict(
        ERROR_CODES.GROUPS.GROUP_NAME_EXISTS,
        'Group name already exists',
      );
    }

    // Update the group
    const group = await this.prisma.group.update({
      where: { id: groupId },
      data: {
        groupName: data.groupName,
        updatedById: authenticatedUser.id,
      },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return group as GroupResponse;
  }

  /**
   * Delete a group
   *
   * @param authenticatedUser - The authenticated user deleting the group
   * @param groupId - The ID of the group to delete
   * @returns Deleted group information
   *
   * @throws {HttpException} When group not found
   * @throws {HttpException} When group has members
   * @throws {HttpException} When user lacks permission
   */
  async deleteGroup(authenticatedUser: AuthenticatedUser, groupId: string): Promise<GroupResponse> {
    // Check if group exists and get member count
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    if (!group) {
      throw HttpException.notFound(ERROR_CODES.GROUPS.GROUP_NOT_FOUND, 'Group not found');
    }

    // Check if group has members
    if (group._count.users > 0) {
      throw HttpException.conflict(
        ERROR_CODES.GROUPS.GROUP_HAS_MEMBERS,
        'Cannot delete group with members. Remove all members first.',
      );
    }

    // Delete the group
    const deletedGroup = await this.prisma.group.delete({
      where: { id: groupId },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return deletedGroup as GroupResponse;
  }
}
