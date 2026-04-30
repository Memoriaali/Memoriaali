import type { PrismaClient } from '@memoriaali/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createSharedPrismaMock } from '../../../__mocks__/prisma.mock';
import { ERROR_CODES, HttpException } from '../../../shared/errors';
import { AuthenticatedUser } from '../../../shared/types/authenticated-user';
import { GroupsService } from '../groups.service';

const { prismaMock, resetAll, group } = createSharedPrismaMock();
const mockPrisma = prismaMock as unknown as PrismaClient;

// Mock authenticated user
const mockUser: AuthenticatedUser = new AuthenticatedUser(
  'user-123',
  'test@example.com',
  'Test',
  'User',
  'ADMIN',
  true,
  true,
);

describe('GroupsService', () => {
  let service: GroupsService;

  beforeEach(() => {
    resetAll();
    service = new GroupsService(mockPrisma);
  });

  describe('createGroup', () => {
    it('should create a group successfully', async () => {
      const groupData = { groupName: 'Test Group' };
      const expectedGroup = {
        id: 'group-123',
        groupName: 'Test Group',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: mockUser.id,
        updatedById: mockUser.id,
        _count: { users: 0 },
      };

      vi.mocked(group.findFirst).mockResolvedValue(null);
      vi.mocked(group.create).mockResolvedValue(expectedGroup);

      const result = await service.createGroup(mockUser, groupData);

      expect(result).toEqual(expectedGroup);
      expect(group.findFirst).toHaveBeenCalledWith({
        where: { groupName: groupData.groupName },
      });
      expect(group.create).toHaveBeenCalledWith({
        data: {
          groupName: groupData.groupName,
          createdById: mockUser.id,
          updatedById: mockUser.id,
        },
        include: {
          _count: {
            select: {
              users: true,
            },
          },
        },
      });
    });

    it('should throw conflict error when group name already exists', async () => {
      const groupData = { groupName: 'Existing Group' };
      const existingGroup = {
        id: 'existing-group',
        groupName: 'Existing Group',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: mockUser.id,
        updatedById: mockUser.id,
      };

      vi.mocked(group.findFirst).mockResolvedValue(existingGroup);

      await expect(service.createGroup(mockUser, groupData)).rejects.toThrow(HttpException);
      await expect(service.createGroup(mockUser, groupData)).rejects.toMatchObject({
        status: 409,
        code: ERROR_CODES.GROUPS.GROUP_NAME_EXISTS,
      });
    });
  });

  describe('getGroupById', () => {
    it('should return group when found', async () => {
      const groupId = 'group-123';
      const expectedGroup = {
        id: groupId,
        groupName: 'Test Group',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: mockUser.id,
        updatedById: mockUser.id,
        _count: { users: 5 },
      };

      vi.mocked(group.findUnique).mockResolvedValue(expectedGroup);

      const result = await service.getGroupById(mockUser, groupId);

      expect(result).toEqual(expectedGroup);
      expect(group.findUnique).toHaveBeenCalledWith({
        where: { id: groupId },
        include: {
          _count: {
            select: {
              users: true,
            },
          },
        },
      });
    });

    it('should throw not found error when group does not exist', async () => {
      const groupId = 'non-existent-group';

      vi.mocked(group.findUnique).mockResolvedValue(null);

      await expect(service.getGroupById(mockUser, groupId)).rejects.toThrow(HttpException);
      await expect(service.getGroupById(mockUser, groupId)).rejects.toMatchObject({
        status: 404,
        code: ERROR_CODES.GROUPS.GROUP_NOT_FOUND,
      });
    });
  });

  describe('getGroups', () => {
    it('should return paginated list of groups', async () => {
      const query = {
        page: 1,
        limit: 20,
        search: 'test',
        sortBy: 'groupName' as const,
        sortOrder: 'asc' as const,
      };

      const groups = [
        {
          id: 'group-1',
          groupName: 'Test Group 1',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: mockUser.id,
          updatedById: mockUser.id,
          _count: { users: 2 },
        },
        {
          id: 'group-2',
          groupName: 'Test Group 2',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: mockUser.id,
          updatedById: mockUser.id,
          _count: { users: 3 },
        },
      ];

      vi.mocked(group.count).mockResolvedValue(2);
      vi.mocked(group.findMany).mockResolvedValue(groups);

      const result = await service.getGroups(mockUser, query);

      expect(result.groups).toEqual(groups);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });
  });

  describe('updateGroup', () => {
    it('should update group successfully', async () => {
      const groupId = 'group-123';
      const updateData = { groupName: 'Updated Group' };
      const existingGroup = {
        id: groupId,
        groupName: 'Old Group',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: mockUser.id,
        updatedById: mockUser.id,
      };
      const updatedGroup = {
        ...existingGroup,
        groupName: 'Updated Group',
        _count: { users: 0 },
      };

      vi.mocked(group.findUnique).mockResolvedValue(existingGroup);
      vi.mocked(group.findFirst).mockResolvedValue(null);
      vi.mocked(group.update).mockResolvedValue(updatedGroup);

      const result = await service.updateGroup(mockUser, groupId, updateData);

      expect(result).toEqual(updatedGroup);
    });

    it('should throw not found error when group does not exist', async () => {
      const groupId = 'non-existent-group';
      const updateData = { groupName: 'Updated Group' };

      vi.mocked(group.findUnique).mockResolvedValue(null);

      await expect(service.updateGroup(mockUser, groupId, updateData)).rejects.toThrow(
        HttpException,
      );
      await expect(service.updateGroup(mockUser, groupId, updateData)).rejects.toMatchObject({
        status: 404,
        code: ERROR_CODES.GROUPS.GROUP_NOT_FOUND,
      });
    });

    it('should throw conflict error when new group name already exists', async () => {
      const groupId = 'group-123';
      const updateData = { groupName: 'Existing Group' };
      const existingGroup = {
        id: groupId,
        groupName: 'Old Group',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: mockUser.id,
        updatedById: mockUser.id,
      };
      const duplicateGroup = {
        id: 'other-group',
        groupName: 'Existing Group',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: mockUser.id,
        updatedById: mockUser.id,
      };

      vi.mocked(group.findUnique).mockResolvedValue(existingGroup);
      vi.mocked(group.findFirst).mockResolvedValue(duplicateGroup);

      await expect(service.updateGroup(mockUser, groupId, updateData)).rejects.toThrow(
        HttpException,
      );
      await expect(service.updateGroup(mockUser, groupId, updateData)).rejects.toMatchObject({
        status: 409,
        code: ERROR_CODES.GROUPS.GROUP_NAME_EXISTS,
      });
    });
  });

  describe('deleteGroup', () => {
    it('should delete group successfully when no members', async () => {
      const groupId = 'group-123';
      const groupToDelete = {
        id: groupId,
        groupName: 'Test Group',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: mockUser.id,
        updatedById: mockUser.id,
        _count: { users: 0 },
      };

      vi.mocked(group.findUnique).mockResolvedValue(groupToDelete);
      vi.mocked(group.delete).mockResolvedValue(groupToDelete);

      const result = await service.deleteGroup(mockUser, groupId);

      expect(result).toEqual(groupToDelete);
      expect(group.delete).toHaveBeenCalledWith({
        where: { id: groupId },
        include: {
          _count: {
            select: {
              users: true,
            },
          },
        },
      });
    });

    it('should throw conflict error when group has members', async () => {
      const groupId = 'group-123';
      const groupWithMembers = {
        id: groupId,
        groupName: 'Test Group',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: mockUser.id,
        updatedById: mockUser.id,
        _count: { users: 5 },
      };

      vi.mocked(group.findUnique).mockResolvedValue(groupWithMembers);

      await expect(service.deleteGroup(mockUser, groupId)).rejects.toThrow(HttpException);
      await expect(service.deleteGroup(mockUser, groupId)).rejects.toMatchObject({
        status: 409,
        code: ERROR_CODES.GROUPS.GROUP_HAS_MEMBERS,
      });
    });

    it('should throw not found error when group does not exist', async () => {
      const groupId = 'non-existent-group';

      vi.mocked(group.findUnique).mockResolvedValue(null);

      await expect(service.deleteGroup(mockUser, groupId)).rejects.toThrow(HttpException);
      await expect(service.deleteGroup(mockUser, groupId)).rejects.toMatchObject({
        status: 404,
        code: ERROR_CODES.GROUPS.GROUP_NOT_FOUND,
      });
    });
  });
});
