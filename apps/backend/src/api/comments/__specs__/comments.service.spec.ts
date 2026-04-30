import type { PrismaClient } from '@memoriaali/database';
import { beforeEach, describe, expect, it } from 'vitest';

import { HttpException } from '../../../shared/errors';
import { AuthenticatedUser } from '../../../shared/types/authenticated-user';
import { CommentsService } from '../comments.service';

import { createSharedPrismaMock } from '../../../__mocks__/prisma.mock';

describe('CommentsService', () => {
  let commentsService: CommentsService;
  let prismaClientLike: PrismaClient;
  let mockUser: AuthenticatedUser;
  const { prismaMock, resetAll, document, comment } = createSharedPrismaMock();

  beforeEach(() => {
    resetAll();
    prismaClientLike = prismaMock as unknown as PrismaClient;
    commentsService = new CommentsService(prismaClientLike);

    // Mock authenticated user
    mockUser = new AuthenticatedUser(
      'user-123',
      'test@example.com',
      'Test',
      'User',
      'USER',
      true,
      true,
    );
  });

  describe('createComment', () => {
    it('should create a comment successfully', async () => {
      const input = {
        documentId: 'doc-123',
        comment: 'This is a test comment',
      };

      const mockDocument = {
        id: 'doc-123',
        userId: 'user-123',
        documentPrivacy: 'PUBLIC',
      };

      const mockComment = {
        id: 'comment-123',
        documentId: 'doc-123',
        userId: 'user-123',
        comment: 'This is a test comment',
        state: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-123',
        updatedById: 'user-123',
      };

      document.findUnique.mockResolvedValue(mockDocument);
      comment.create.mockResolvedValue(mockComment);

      const result = await commentsService.createComment(input, mockUser);

      expect(result).toEqual(mockComment);
      expect(document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
      });
      expect(comment.create).toHaveBeenCalledWith({
        data: {
          documentId: 'doc-123',
          userId: 'user-123',
          comment: 'This is a test comment',
          state: 'PENDING',
          createdById: 'user-123',
          updatedById: 'user-123',
        },
      });
    });

    it('should throw error when document not found', async () => {
      const input = {
        documentId: 'doc-123',
        comment: 'This is a test comment',
      };

      document.findUnique.mockResolvedValue(null);

      await expect(commentsService.createComment(input, mockUser)).rejects.toThrow(HttpException);
    });

    it('should throw error when user cannot access document', async () => {
      const input = {
        documentId: 'doc-123',
        comment: 'This is a test comment',
      };

      const mockDocument = {
        id: 'doc-123',
        userId: 'other-user',
        documentPrivacy: 'PRIVATE',
      };

      document.findUnique.mockResolvedValue(mockDocument);

      await expect(commentsService.createComment(input, mockUser)).rejects.toThrow(HttpException);
    });
  });

  describe('getCommentById', () => {
    it('should return comment when user has access', async () => {
      const mockComment = {
        id: 'comment-123',
        documentId: 'doc-123',
        userId: 'user-123',
        comment: 'This is a test comment',
        state: 'APPROVED',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-123',
        updatedById: 'user-123',
        user: {
          id: 'user-123',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
        },
        createdBy: {
          id: 'user-123',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
        },
        updatedBy: {
          id: 'user-123',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
        },
      };

      comment.findUnique.mockResolvedValue(mockComment);

      const result = await commentsService.getCommentById('comment-123', mockUser);

      expect(result).toEqual(mockComment);
      expect(comment.findUnique).toHaveBeenCalledWith({
        where: { id: 'comment-123' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });

    it('should throw error when comment not found', async () => {
      comment.findUnique.mockResolvedValue(null);

      await expect(commentsService.getCommentById('comment-123', mockUser)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getComments', () => {
    it('should return paginated comments', async () => {
      const query = {
        page: 1,
        limit: 10,
        documentId: 'doc-123',
      };

      const mockComments = [
        {
          id: 'comment-123',
          documentId: 'doc-123',
          userId: 'user-123',
          comment: 'Test comment',
          state: 'APPROVED',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: 'user-123',
          updatedById: 'user-123',
          user: {
            id: 'user-123',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
          },
          createdBy: {
            id: 'user-123',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
          },
          updatedBy: {
            id: 'user-123',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
          },
        },
      ];

      comment.count.mockResolvedValue(1);
      comment.findMany.mockResolvedValue(mockComments);

      const result = await commentsService.getComments(query, mockUser);

      expect(result.data).toEqual(mockComments);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });
  });

  describe('updateComment', () => {
    it('should update comment when user has permission', async () => {
      const mockComment = {
        id: 'comment-123',
        documentId: 'doc-123',
        userId: 'user-123',
        comment: 'Original comment',
        state: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-123',
        updatedById: 'user-123',
      };

      const updatedComment = {
        ...mockComment,
        comment: 'Updated comment',
        updatedById: 'user-123',
      };

      comment.findUnique.mockResolvedValue(mockComment);
      comment.update.mockResolvedValue(updatedComment);

      const input = { comment: 'Updated comment' };
      const result = await commentsService.updateComment('comment-123', input, mockUser);

      expect(result).toEqual(updatedComment);
      expect(comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-123' },
        data: {
          comment: 'Updated comment',
          updatedById: 'user-123',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });

    it('should throw error when comment not found', async () => {
      comment.findUnique.mockResolvedValue(null);

      const input = { comment: 'Updated comment' };
      await expect(commentsService.updateComment('comment-123', input, mockUser)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('deleteComment', () => {
    it('should delete comment when user has permission', async () => {
      const mockComment = {
        id: 'comment-123',
        documentId: 'doc-123',
        userId: 'user-123',
        comment: 'Test comment',
        state: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-123',
        updatedById: 'user-123',
      };

      comment.findUnique.mockResolvedValue(mockComment);
      comment.delete.mockResolvedValue(mockComment);

      await commentsService.deleteComment('comment-123', mockUser);

      expect(comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-123' },
      });
    });

    it('should throw error when comment not found', async () => {
      comment.findUnique.mockResolvedValue(null);

      await expect(commentsService.deleteComment('comment-123', mockUser)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('approveComment', () => {
    it('should approve comment when user is moderator', async () => {
      const moderatorUser = new AuthenticatedUser(
        mockUser.id,
        mockUser.email,
        mockUser.firstName,
        mockUser.lastName,
        'MODERATOR',
        mockUser.isActive,
        mockUser.isVerified,
      );

      const mockComment = {
        id: 'comment-123',
        documentId: 'doc-123',
        userId: 'user-123',
        comment: 'Test comment',
        state: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-123',
        updatedById: 'user-123',
      };

      const approvedComment = {
        ...mockComment,
        state: 'APPROVED',
        updatedById: 'user-123',
      };

      comment.findUnique.mockResolvedValue(mockComment);
      comment.update.mockResolvedValue(approvedComment);

      const result = await commentsService.approveComment('comment-123', moderatorUser);

      expect(result).toEqual(approvedComment);
      expect(comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-123' },
        data: {
          state: 'APPROVED',
          updatedById: 'user-123',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });
  });

  describe('rejectComment', () => {
    it('should reject comment when user is moderator', async () => {
      const moderatorUser = new AuthenticatedUser(
        mockUser.id,
        mockUser.email,
        mockUser.firstName,
        mockUser.lastName,
        'MODERATOR',
        mockUser.isActive,
        mockUser.isVerified,
      );

      const mockComment = {
        id: 'comment-123',
        documentId: 'doc-123',
        userId: 'user-123',
        comment: 'Test comment',
        state: 'PENDING',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: 'user-123',
        updatedById: 'user-123',
      };

      const rejectedComment = {
        ...mockComment,
        state: 'REJECTED',
        updatedById: 'user-123',
      };

      comment.findUnique.mockResolvedValue(mockComment);
      comment.update.mockResolvedValue(rejectedComment);

      const result = await commentsService.rejectComment('comment-123', moderatorUser);

      expect(result).toEqual(rejectedComment);
      expect(comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-123' },
        data: {
          state: 'REJECTED',
          updatedById: 'user-123',
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          updatedBy: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });
  });

  describe('getPendingComments', () => {
    it('should return pending comments for moderators', async () => {
      const moderatorUser = new AuthenticatedUser(
        mockUser.id,
        mockUser.email,
        mockUser.firstName,
        mockUser.lastName,
        'MODERATOR',
        mockUser.isActive,
        mockUser.isVerified,
      );

      const query = {
        page: 1,
        limit: 10,
      };

      const mockComments = [
        {
          id: 'comment-123',
          documentId: 'doc-123',
          userId: 'user-123',
          comment: 'Pending comment',
          state: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: 'user-123',
          updatedById: 'user-123',
          user: {
            id: 'user-123',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
          },
          createdBy: {
            id: 'user-123',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
          },
          updatedBy: {
            id: 'user-123',
            username: 'testuser',
            firstName: 'Test',
            lastName: 'User',
          },
        },
      ];

      comment.count.mockResolvedValue(1);
      comment.findMany.mockResolvedValue(mockComments);

      const result = await commentsService.getPendingComments(query, moderatorUser);

      expect(result.data).toEqual(mockComments);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 1,
        pages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should throw error when user is not moderator', async () => {
      const query = {
        page: 1,
        limit: 10,
      };

      await expect(commentsService.getPendingComments(query, mockUser)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getCommentsByDocument', () => {
    it('should return comments for a document when user has access', async () => {
      const mockUser = new AuthenticatedUser(
        'user-1',
        'test@example.com',
        'Test',
        'User',
        'USER',
        true,
        true,
      );
      const mockDocument = {
        id: 'doc-1',
        userId: 'user-1',
        documentPrivacy: 'PUBLIC',
      };
      const mockComments = [
        {
          id: 'comment-1',
          documentId: 'doc-1',
          userId: 'user-1',
          comment: 'This is a test comment',
          state: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: 'user-1',
          updatedById: 'user-1',
        },
        {
          id: 'comment-2',
          documentId: 'doc-1',
          userId: 'user-2',
          comment: 'This is a test comment',
          state: 'APPROVED',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: 'user-2',
          updatedById: 'user-2',
        },
      ];

      document.findUnique.mockResolvedValue(mockDocument);
      comment.count.mockResolvedValue(2);
      comment.findMany.mockResolvedValue(mockComments);

      const result = await commentsService.getCommentsByDocument(
        'doc-1',
        { page: 1, limit: 10 },
        mockUser,
      );

      expect(result.data).toHaveLength(2);
      expect(result.pagination.totalCount).toBe(2);
      expect(document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
      });
    });

    it('should throw error when document not found', async () => {
      const mockUser = new AuthenticatedUser(
        'user-1',
        'test@example.com',
        'Test',
        'User',
        'USER',
        true,
        true,
      );

      document.findUnique.mockResolvedValue(null);

      await expect(
        commentsService.getCommentsByDocument('non-existent', { page: 1, limit: 10 }, mockUser),
      ).rejects.toThrow('Document not found');
    });

    it('should throw error when user has no access to document', async () => {
      const mockUser = new AuthenticatedUser(
        'user-1',
        'test@example.com',
        'Test',
        'User',
        'USER',
        true,
        true,
      );
      const mockDocument = {
        id: 'doc-1',
        userId: 'user-2',
        documentPrivacy: 'PRIVATE',
      };

      document.findUnique.mockResolvedValue(mockDocument);

      await expect(
        commentsService.getCommentsByDocument('doc-1', { page: 1, limit: 10 }, mockUser),
      ).rejects.toThrow('Access denied to this document');
    });

    it('should allow moderators to see all comments for any document', async () => {
      const mockUser = new AuthenticatedUser(
        'moderator-1',
        'moderator@example.com',
        'Moderator',
        'User',
        'MODERATOR',
        true,
        true,
      );
      const mockDocument = {
        id: 'doc-1',
        userId: 'user-1',
        documentPrivacy: 'PRIVATE',
      };
      const mockComments = [
        {
          id: 'comment-1',
          documentId: 'doc-1',
          userId: 'user-1',
          comment: 'This is a test comment',
          state: 'PENDING',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: 'user-1',
          updatedById: 'user-1',
        },
        {
          id: 'comment-2',
          documentId: 'doc-1',
          userId: 'user-2',
          comment: 'This is a test comment',
          state: 'APPROVED',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: 'user-2',
          updatedById: 'user-2',
        },
      ];

      document.findUnique.mockResolvedValue(mockDocument);
      comment.count.mockResolvedValue(2);
      comment.findMany.mockResolvedValue(mockComments);

      const result = await commentsService.getCommentsByDocument(
        'doc-1',
        { page: 1, limit: 10 },
        mockUser,
      );

      expect(result.data).toHaveLength(2);
      expect(document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
      });
    });
  });
});
