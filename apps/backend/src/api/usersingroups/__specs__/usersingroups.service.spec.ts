/**
 * Unit Tests for UsersInGroupsService - Group Membership Management
 *
 * ARCHITECTURAL CONTEXT:
 * Tests the service layer for user-group membership management. This service sits between
 * the HTTP controllers and the database layer, implementing business logic for adding/removing
 * users from groups, managing memberships, and providing audit trails.
 *
 * BUSINESS REQUIREMENTS:
 * - Users can be added to groups with optional metadata (roles, permissions)
 * - Users can be removed from groups with proper audit trails
 * - Duplicate memberships are prevented
 * - Group and user existence is validated before operations
 * - Paginated listing of group members and user's groups
 * - Membership status checking for authorization purposes
 *
 * KEY DEPENDENCIES:
 * - Prisma ORM for database transactions
 * - UserGroupMetadata schema for role/permission validation
 * - Pagination utilities for list operations
 * - Audit trail system for compliance tracking
 *
 * SECURITY CONSIDERATIONS:
 * - All operations require authentication and authorization
 * - Audit trails track who performed membership changes
 * - Prevents duplicate memberships to maintain data integrity
 * - Validates user and group existence before operations
 *
 * CONTRACT SUMMARY:
 * - Preconditions: Valid user/group IDs, user not already in group (for add), user in group (for remove)
 * - Postconditions: Membership created/deleted, audit trail updated, proper error handling
 * - Invariants: Data consistency, no duplicate memberships, complete audit trails
 */

import { CustomSchemas } from '@memoriaali/api-types';
import { Group, PrismaClient, User, UsersInGroups } from '@memoriaali/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpException } from '../../../shared/errors';
import { UsersInGroupsService } from '../usersingroups.service';

// Mock Prisma client
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
  },
  group: {
    findUnique: vi.fn(),
  },
  usersInGroups: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
} as unknown as PrismaClient;

describe('UsersInGroupsService', () => {
  let service: UsersInGroupsService;

  // Test fixture documentation: Representative entities for testing different scenarios
  const testUsers = {
    // Regular user fixture - represents a typical system user
    regularUser: {
      id: 'user-123',
      email: 'user@example.com',
      username: 'testuser',
      firstName: 'Test',
      lastName: 'User',
      role: 'USER',
      accountType: 'PRIVATE',
      isActivated: true,
      verificationCode: '',
      streetAddress: null,
      postalCode: null,
      postOffice: null,
      telephone: null,
      profession: null,
      companyName: null,
      companyEmail: null,
      companyTelephone: null,
      companyContactPerson: null,
      hashedPassword: '',
      salt: '',
      organization: null,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: null,
      updatedById: null,
    } as unknown as User,

    // Another user fixture - for testing multiple users
    anotherUser: {
      id: 'user-456',
      email: 'another@example.com',
      username: 'anotheruser',
      firstName: 'Another',
      lastName: 'User',
      role: 'USER',
      accountType: 'PRIVATE',
      isActivated: true,
      verificationCode: '',
      streetAddress: null,
      postalCode: null,
      postOffice: null,
      telephone: null,
      profession: null,
      companyName: null,
      companyEmail: null,
      companyTelephone: null,
      companyContactPerson: null,
      hashedPassword: '',
      salt: '',
      organization: null,
      adminNotes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: null,
      updatedById: null,
    } as unknown as User,
  };

  const testGroups = {
    // Regular group fixture - represents a typical system group
    regularGroup: {
      id: 'group-123',
      groupName: 'Test Group',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: 'admin-123',
      updatedById: 'admin-123',
    } as Group,

    // Another group fixture - for testing multiple groups
    anotherGroup: {
      id: 'group-456',
      groupName: 'Another Group',
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: 'admin-123',
      updatedById: 'admin-123',
    } as Group,
  };

  const testMemberships = {
    // Active membership fixture - represents a user in a group
    activeMembership: {
      id: 'membership-123',
      userId: testUsers.regularUser.id,
      groupId: testGroups.regularGroup.id,
      metadata: {
        roles: [{ id: 'member', name: 'Member', level: 1, active: true }],
      } as CustomSchemas.UserGroupMetadata,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdById: 'admin-123',
      updatedById: 'admin-123',
      user: testUsers.regularUser,
      group: testGroups.regularGroup,
    } as UsersInGroups,
  };

  beforeEach(() => {
    service = new UsersInGroupsService(mockPrisma);
    vi.clearAllMocks();
  });

  describe('addUserToGroup', () => {
    /**
     * Scenario: Successfully add a user to a group with metadata
     * Expected outcome: User added to group, membership record created with audit trail
     * Contract: Postcondition (membership created, audit trail updated)
     * Business impact: User can now access group resources and permissions
     */
    it('adds user to group successfully', async () => {
      const userId = testUsers.regularUser.id;
      const groupId = testGroups.regularGroup.id;
      const metadata: CustomSchemas.UserGroupMetadata = {
        roles: [{ id: 'member', name: 'Member', level: 1, active: true }],
      };
      const currentUserId = 'admin-123';

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(testUsers.regularUser);
      vi.mocked(mockPrisma.group.findUnique).mockResolvedValue(testGroups.regularGroup);
      vi.mocked(mockPrisma.usersInGroups.findUnique).mockResolvedValue(null);
      vi.mocked(mockPrisma.usersInGroups.create).mockResolvedValue(
        testMemberships.activeMembership,
      );

      const result = await service.addUserToGroup(userId, groupId, metadata, currentUserId);

      expect(result).toEqual(testMemberships.activeMembership);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: userId } });
      expect(mockPrisma.group.findUnique).toHaveBeenCalledWith({ where: { id: groupId } });
      expect(mockPrisma.usersInGroups.findUnique).toHaveBeenCalledWith({
        where: { groupId_userId: { groupId, userId } },
      });
      expect(mockPrisma.usersInGroups.create).toHaveBeenCalledWith({
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
    });

    /**
     * Scenario: Attempt to add user to non-existent group
     * Expected outcome: Throws NotFoundError with specific error message
     * Contract: Precondition (group must exist)
     * Business impact: Prevents creation of invalid memberships, maintains data integrity
     */
    it('throws NotFoundError when group does not exist', async () => {
      const userId = testUsers.regularUser.id;
      const groupId = 'non-existent-group';
      const currentUserId = 'admin-123';

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(testUsers.regularUser);
      vi.mocked(mockPrisma.group.findUnique).mockResolvedValue(null);

      await expect(service.addUserToGroup(userId, groupId, {}, currentUserId)).rejects.toThrow(
        HttpException,
      );
      await expect(service.addUserToGroup(userId, groupId, {}, currentUserId)).rejects.toThrow(
        `Group with ID ${groupId} not found`,
      );
    });

    /**
     * Scenario: Attempt to add non-existent user to group
     * Expected outcome: Throws NotFoundError with specific error message
     * Contract: Precondition (user must exist)
     * Business impact: Prevents creation of invalid memberships, maintains data integrity
     */
    it('throws NotFoundError when user does not exist', async () => {
      const userId = 'non-existent-user';
      const groupId = testGroups.regularGroup.id;
      const currentUserId = 'admin-123';

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);

      await expect(service.addUserToGroup(userId, groupId, {}, currentUserId)).rejects.toThrow(
        HttpException,
      );
      await expect(service.addUserToGroup(userId, groupId, {}, currentUserId)).rejects.toThrow(
        `User with ID ${userId} not found`,
      );
    });

    /**
     * Scenario: Attempt to add user who is already a member of the group
     * Expected outcome: Throws ValidationError with specific error message
     * Contract: Precondition (user must not already be a member)
     * Business impact: Prevents duplicate memberships, maintains data consistency
     */
    it('throws ValidationError when user is already a member', async () => {
      const userId = testUsers.regularUser.id;
      const groupId = testGroups.regularGroup.id;
      const currentUserId = 'admin-123';

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(testUsers.regularUser);
      vi.mocked(mockPrisma.group.findUnique).mockResolvedValue(testGroups.regularGroup);
      vi.mocked(mockPrisma.usersInGroups.findUnique).mockResolvedValue(
        testMemberships.activeMembership,
      );

      await expect(service.addUserToGroup(userId, groupId, {}, currentUserId)).rejects.toThrow(
        HttpException,
      );
      await expect(service.addUserToGroup(userId, groupId, {}, currentUserId)).rejects.toThrow(
        `User ${userId} is already a member of group ${groupId}`,
      );
    });
  });

  describe('removeUserFromGroup', () => {
    /**
     * Scenario: Successfully remove a user from a group
     * Expected outcome: User removed from group, membership record deleted, audit trail maintained
     * Contract: Postcondition (membership deleted, audit trail preserved)
     * Business impact: User loses access to group resources and permissions
     */
    it('removes user from group successfully', async () => {
      const userId = testUsers.regularUser.id;
      const groupId = testGroups.regularGroup.id;
      const currentUserId = 'admin-123';

      vi.mocked(mockPrisma.usersInGroups.findUnique).mockResolvedValue(
        testMemberships.activeMembership,
      );
      vi.mocked(mockPrisma.usersInGroups.delete).mockResolvedValue(
        testMemberships.activeMembership,
      );

      const result = await service.removeUserFromGroup(userId, groupId, currentUserId);

      expect(result).toEqual(testMemberships.activeMembership);
      expect(mockPrisma.usersInGroups.findUnique).toHaveBeenCalledWith({
        where: { groupId_userId: { groupId, userId } },
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
      expect(mockPrisma.usersInGroups.delete).toHaveBeenCalledWith({
        where: { groupId_userId: { groupId, userId } },
      });
    });

    /**
     * Scenario: Attempt to remove user who is not a member of the group
     * Expected outcome: Throws NotFoundError with specific error message
     * Contract: Precondition (user must be a member of the group)
     * Business impact: Prevents removal of non-existent memberships, maintains data integrity
     */
    it('throws NotFoundError when user is not a member of the group', async () => {
      const userId = testUsers.regularUser.id;
      const groupId = testGroups.regularGroup.id;
      const currentUserId = 'admin-123';

      vi.mocked(mockPrisma.usersInGroups.findUnique).mockResolvedValue(null);

      await expect(service.removeUserFromGroup(userId, groupId, currentUserId)).rejects.toThrow(
        HttpException,
      );
      await expect(service.removeUserFromGroup(userId, groupId, currentUserId)).rejects.toThrow(
        `User ${userId} is not a member of group ${groupId}`,
      );
    });
  });

  describe('getUsersInGroup', () => {
    /**
     * Scenario: Successfully retrieve paginated list of users in a group
     * Expected outcome: Returns paginated list with proper metadata
     * Contract: Postcondition (paginated results with correct structure)
     * Business impact: Enables group management and member listing functionality
     */
    it('returns paginated users in group successfully', async () => {
      const groupId = testGroups.regularGroup.id;
      const page = 1;
      const limit = 20;
      const total = 1;

      vi.mocked(mockPrisma.group.findUnique).mockResolvedValue(testGroups.regularGroup);
      vi.mocked(mockPrisma.usersInGroups.count).mockResolvedValue(total);
      vi.mocked(mockPrisma.usersInGroups.findMany).mockResolvedValue([
        testMemberships.activeMembership,
      ]);

      const result = await service.getUsersInGroup(groupId, page, limit);

      expect(result.items).toEqual([testMemberships.activeMembership]);
      expect(result.pagination).toEqual({
        page,
        limit,
        total,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
      expect(mockPrisma.group.findUnique).toHaveBeenCalledWith({ where: { id: groupId } });
      expect(mockPrisma.usersInGroups.count).toHaveBeenCalledWith({ where: { groupId } });
      expect(mockPrisma.usersInGroups.findMany).toHaveBeenCalledWith({
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
        skip: 0,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    });

    /**
     * Scenario: Attempt to get users from non-existent group
     * Expected outcome: Throws NotFoundError with specific error message
     * Contract: Precondition (group must exist)
     * Business impact: Prevents listing users for invalid groups, maintains data integrity
     */
    it('throws NotFoundError when group does not exist', async () => {
      const groupId = 'non-existent-group';

      vi.mocked(mockPrisma.group.findUnique).mockResolvedValue(null);

      await expect(service.getUsersInGroup(groupId)).rejects.toThrow(HttpException);
      await expect(service.getUsersInGroup(groupId)).rejects.toThrow(
        `Group with ID ${groupId} not found`,
      );
    });
  });

  describe('getGroupsForUser', () => {
    /**
     * Scenario: Successfully retrieve paginated list of groups for a user
     * Expected outcome: Returns paginated list with proper metadata
     * Contract: Postcondition (paginated results with correct structure)
     * Business impact: Enables user profile and group management functionality
     */
    it('returns paginated groups for user successfully', async () => {
      const userId = testUsers.regularUser.id;
      const page = 1;
      const limit = 20;
      const total = 1;

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(testUsers.regularUser);
      vi.mocked(mockPrisma.usersInGroups.count).mockResolvedValue(total);
      vi.mocked(mockPrisma.usersInGroups.findMany).mockResolvedValue([
        testMemberships.activeMembership,
      ]);

      const result = await service.getGroupsForUser(userId, page, limit);

      expect(result.items).toEqual([testMemberships.activeMembership]);
      expect(result.pagination).toEqual({
        page,
        limit,
        total,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: userId } });
      expect(mockPrisma.usersInGroups.count).toHaveBeenCalledWith({ where: { userId } });
      expect(mockPrisma.usersInGroups.findMany).toHaveBeenCalledWith({
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
        skip: 0,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    });

    /**
     * Scenario: Attempt to get groups for non-existent user
     * Expected outcome: Throws NotFoundError with specific error message
     * Contract: Precondition (user must exist)
     * Business impact: Prevents listing groups for invalid users, maintains data integrity
     */
    it('throws NotFoundError when user does not exist', async () => {
      const userId = 'non-existent-user';

      vi.mocked(mockPrisma.user.findUnique).mockResolvedValue(null);

      await expect(service.getGroupsForUser(userId)).rejects.toThrow(HttpException);
      await expect(service.getGroupsForUser(userId)).rejects.toThrow(
        `User with ID ${userId} not found`,
      );
    });
  });

  describe('isUserInGroup', () => {
    /**
     * Scenario: Check if user is a member of a group (user is member)
     * Expected outcome: Returns true when user is a member
     * Contract: Postcondition (returns correct membership status)
     * Business impact: Enables authorization checks and access control
     */
    it('returns true when user is a member of the group', async () => {
      const userId = testUsers.regularUser.id;
      const groupId = testGroups.regularGroup.id;

      vi.mocked(mockPrisma.usersInGroups.findUnique).mockResolvedValue(
        testMemberships.activeMembership,
      );

      const result = await service.isUserInGroup(userId, groupId);

      expect(result).toBe(true);
      expect(mockPrisma.usersInGroups.findUnique).toHaveBeenCalledWith({
        where: { groupId_userId: { groupId, userId } },
      });
    });

    /**
     * Scenario: Check if user is a member of a group (user is not member)
     * Expected outcome: Returns false when user is not a member
     * Contract: Postcondition (returns correct membership status)
     * Business impact: Enables authorization checks and access control
     */
    it('returns false when user is not a member of the group', async () => {
      const userId = testUsers.regularUser.id;
      const groupId = testGroups.regularGroup.id;

      vi.mocked(mockPrisma.usersInGroups.findUnique).mockResolvedValue(null);

      const result = await service.isUserInGroup(userId, groupId);

      expect(result).toBe(false);
      expect(mockPrisma.usersInGroups.findUnique).toHaveBeenCalledWith({
        where: { groupId_userId: { groupId, userId } },
      });
    });
  });

  describe('getUserGroupMembership', () => {
    /**
     * Scenario: Get specific user-group membership (membership exists)
     * Expected outcome: Returns the membership record with user and group details
     * Contract: Postcondition (returns membership if exists)
     * Business impact: Enables detailed membership management and audit functionality
     */
    it('returns membership when it exists', async () => {
      const userId = testUsers.regularUser.id;
      const groupId = testGroups.regularGroup.id;

      vi.mocked(mockPrisma.usersInGroups.findUnique).mockResolvedValue(
        testMemberships.activeMembership,
      );

      const result = await service.getUserGroupMembership(userId, groupId);

      expect(result).toEqual(testMemberships.activeMembership);
      expect(mockPrisma.usersInGroups.findUnique).toHaveBeenCalledWith({
        where: { groupId_userId: { groupId, userId } },
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
    });

    /**
     * Scenario: Get specific user-group membership (membership does not exist)
     * Expected outcome: Returns null when membership does not exist
     * Contract: Postcondition (returns null if membership does not exist)
     * Business impact: Enables safe membership checking without exceptions
     */
    it('returns null when membership does not exist', async () => {
      const userId = testUsers.regularUser.id;
      const groupId = testGroups.regularGroup.id;

      vi.mocked(mockPrisma.usersInGroups.findUnique).mockResolvedValue(null);

      const result = await service.getUserGroupMembership(userId, groupId);

      expect(result).toBeNull();
      expect(mockPrisma.usersInGroups.findUnique).toHaveBeenCalledWith({
        where: { groupId_userId: { groupId, userId } },
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
    });
  });
});
