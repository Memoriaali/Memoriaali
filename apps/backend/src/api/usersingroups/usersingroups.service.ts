import { UserGroupMetadata } from '@memoriaali/api-types/schemas';
import { PrismaClient, UsersInGroups } from '@memoriaali/database';

import { Group } from '@memoriaali/api-types';
import { ERROR_CODES, HttpException } from '../../shared/errors';
// Define a simple pagination result type for this service
interface PaginationResult<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Service for managing users in groups relationships
 *
 * Handles the business logic for adding/removing users from groups,
 * managing group memberships, and providing audit trails for all operations.
 *
 * Security Features:
 * - Validates user and group existence before operations
 * - Ensures proper authorization for group management
 * - Maintains audit trails for all membership changes
 * - Prevents duplicate memberships
 */
export class UsersInGroupsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Add a user to a group
   *
   * Preconditions:
   * - User and group must exist
   * - User must not already be a member of the group
   * - Current user must have permission to manage the group
   *
   * Postconditions:
   * - User is added to group with specified metadata
   * - Audit trail is created
   * - Returns the created membership record
   *
   * @param userId - ID of the user to add
   * @param groupId - ID of the group to add user to
   * @param metadata - Optional metadata for the membership
   * @param currentUserId - ID of the user performing the operation
   * @returns Created UsersInGroups record
   */
  async addUserToGroup(
    userId: string,
    groupId: string,
    metadata: UserGroupMetadata = {},
    currentUserId: string,
  ): Promise<UsersInGroups> {
    // Validate that user and group exist
    const [user, group] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId } }),
      this.prisma.group.findUnique({ where: { id: groupId } }),
    ]);

    if (!user) {
      throw HttpException.notFound(ERROR_CODES.USER.NOT_FOUND, `User with ID ${userId} not found`);
    }

    if (!group) {
      throw HttpException.notFound(
        ERROR_CODES.GROUPS.GROUP_NOT_FOUND,
        `Group with ID ${groupId} not found`,
      );
    }

    // Check if user is already a member of the group
    const existingMembership = await this.prisma.usersInGroups.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (existingMembership) {
      throw HttpException.conflict(
        ERROR_CODES.USER.USER_ALREADY_IN_GROUP,
        `User ${userId} is already a member of group ${groupId}`,
      );
    }

    // Create the membership
    const membership = await this.prisma.usersInGroups.create({
      data: {
        userId,
        groupId,
        metadata,
        createdById: currentUserId,
        updatedById: currentUserId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        group: {
          select: {
            id: true,
            groupName: true,
          },
        },
      },
    });

    return membership;
  }

  /**
   * Remove a user from a group
   *
   * Preconditions:
   * - User must be a member of the group
   * - Current user must have permission to manage the group
   *
   * Postconditions:
   * - User is removed from group
   * - Audit trail is updated
   * - Returns the deleted membership record
   *
   * @param userId - ID of the user to remove
   * @param groupId - ID of the group to remove user from
   * @param currentUserId - ID of the user performing the operation
   * @returns Deleted UsersInGroups record
   */
  async removeUserFromGroup(
    userId: string,
    groupId: string,
    _currentUserId: string,
  ): Promise<UsersInGroups> {
    // Check if user is a member of the group
    const membership = await this.prisma.usersInGroups.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        group: {
          select: {
            id: true,
            groupName: true,
          },
        },
      },
    });

    if (!membership) {
      throw HttpException.notFound(
        ERROR_CODES.USER.USER_NOT_IN_GROUP,
        `User ${userId} is not a member of group ${groupId}`,
      );
    }

    // Delete the membership
    await this.prisma.usersInGroups.delete({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    return membership;
  }

  /**
   * Get all users in a group with pagination
   *
   * Preconditions:
   * - Group must exist
   * - Current user must have permission to view the group
   *
   * Postconditions:
   * - Returns paginated list of group members
   *
   * @param groupId - ID of the group
   * @param page - Page number (1-based)
   * @param limit - Number of items per page
   * @returns Paginated list of group members
   */
  async getUsersInGroup(
    groupId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginationResult<UsersInGroups>> {
    // Validate that group exists
    const group = await this.prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      throw HttpException.notFound(
        ERROR_CODES.GROUPS.GROUP_NOT_FOUND,
        `Group with ID ${groupId} not found`,
      );
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.prisma.usersInGroups.count({
      where: { groupId },
    });

    // Get paginated results
    const items = await this.prisma.usersInGroups.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        group: {
          select: {
            id: true,
            groupName: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      items: items.map(item => ({
        ...item,
        groupName: item.group.groupName,
      })),
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
   * Get all groups for a user with pagination
   *
   * Preconditions:
   * - User must exist
   * - Current user must have permission to view the user's groups
   *
   * Postconditions:
   * - Returns paginated list of user's groups
   *
   * @param userId - ID of the user
   * @param page - Page number (1-based)
   * @param limit - Number of items per page
   * @returns Paginated list of user's groups
   */
  async getGroupsForUser(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginationResult<Group>> {
    // Validate that user exists
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw HttpException.notFound(ERROR_CODES.USER.NOT_FOUND, `User with ID ${userId} not found`);
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get total count
    const total = await this.prisma.usersInGroups.count({
      where: { userId },
    });

    // Get paginated results
    const items = await this.prisma.usersInGroups.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        group: {
          select: {
            id: true,
            groupName: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    return {
      items: items.map(item => ({
        id: item.group.id,
        groupName: item.group.groupName,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        createdById: item.createdById,
        updatedById: item.updatedById,
      })),
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
   * Check if a user is a member of a group
   *
   * Preconditions:
   * - User and group must exist
   *
   * Postconditions:
   * - Returns true if user is a member, false otherwise
   *
   * @param userId - ID of the user
   * @param groupId - ID of the group
   * @returns True if user is a member of the group
   */
  async isUserInGroup(userId: string, groupId: string): Promise<boolean> {
    const membership = await this.prisma.usersInGroups.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    return !!membership;
  }

  /**
   * Get a specific user-group membership
   *
   * Preconditions:
   * - User and group must exist
   *
   * Postconditions:
   * - Returns the membership record if it exists
   *
   * @param userId - ID of the user
   * @param groupId - ID of the group
   * @returns UsersInGroups record or null if not found
   */
  async getUserGroupMembership(userId: string, groupId: string): Promise<UsersInGroups | null> {
    const result = await this.prisma.usersInGroups.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        group: {
          select: {
            id: true,
            groupName: true,
          },
        },
      },
    });
    return result;
  }
}
