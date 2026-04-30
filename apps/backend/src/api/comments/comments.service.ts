import { PrismaClient, type Comment, type DocPrivacy } from '@memoriaali/database';
import { PaginationResponse } from '@memoriaali/shared';

import { HttpException } from '../../shared/errors';
import { AuthenticatedUser } from '../../shared/types/authenticated-user';

import type { CommentQueryInput, CreateCommentInput, UpdateCommentInput } from './comments.schemas';

/**
 * Comments Service
 *
 * Handles business logic for comment management including:
 * - CRUD operations for comments
 * - Moderation workflow (PENDING → APPROVED/REJECTED)
 * - Access control and privacy enforcement
 * - Search and filtering capabilities
 * - Pagination support
 */
export class CommentsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new comment
   *
   * Preconditions: User is authenticated, document exists and is accessible
   * Postconditions: Comment is created with PENDING state, audit trail established
   * Invariants: Comment is associated with authenticated user and target document
   *
   * @param input - Comment creation data
   * @param currentUser - Current authenticated user
   * @returns Created comment with user information
   */
  async createComment(input: CreateCommentInput, currentUser: AuthenticatedUser): Promise<Comment> {
    // Verify document exists and is accessible
    const document = await this.prisma.document.findUnique({
      where: { id: input.documentId },
    });

    if (!document) {
      throw HttpException.notFound(undefined, 'Document not found');
    }

    // Check if user can access the document (basic check - document owner or public)
    if (!this.canAccessDocument(document, currentUser)) {
      throw HttpException.forbidden(undefined, 'Access denied to this document');
    }

    const comment = await this.prisma.comment.create({
      data: {
        documentId: input.documentId,
        userId: currentUser.id,
        comment: input.comment,
        state: 'PENDING',
        createdById: currentUser.id,
        updatedById: currentUser.id,
      },
    });

    return comment;
  }

  /**
   * Get a comment by ID with access control
   *
   * Preconditions: Comment ID is valid integer
   * Postconditions: Returns comment if accessible, throws if not found or denied
   * Invariants: Access control is enforced based on user permissions
   *
   * @param id - Comment ID
   * @param currentUser - Current authenticated user
   * @returns Comment with user information if accessible
   */
  async getCommentById(id: string, currentUser: AuthenticatedUser): Promise<Comment> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
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

    if (!comment) {
      throw HttpException.notFound(undefined, 'Comment not found');
    }

    // Check access permissions
    if (!this.canAccessComment(comment, currentUser)) {
      throw HttpException.forbidden(undefined, 'Access denied to this comment');
    }

    return comment;
  }

  /**
   * Get comments with filtering and pagination
   *
   * Preconditions: Query parameters are valid
   * Postconditions: Returns filtered and paginated comments based on user permissions
   * Invariants: Access control is enforced, pagination limits are respected
   *
   * @param query - Query parameters for filtering and pagination
   * @param currentUser - Current authenticated user
   * @returns Paginated comments with user information
   */
  async getComments(
    query: CommentQueryInput,
    currentUser: AuthenticatedUser,
  ): Promise<PaginationResponse<Comment>> {
    const { page, limit, documentId, userId, state, search } = query;
    const offset = (page - 1) * limit;

    // Build where clause based on user permissions and filters
    const filters: { documentId?: string; userId?: string; state?: string; search?: string } = {};
    if (documentId) filters.documentId = documentId;
    if (userId) filters.userId = userId;
    if (state) filters.state = state;
    if (search) filters.search = search;

    const whereClause = this.buildCommentWhereClause(filters, currentUser);

    // Get total count for pagination
    const total = await this.prisma.comment.count({ where: whereClause });

    // Get comments with user information
    const comments = await this.prisma.comment.findMany({
      where: whereClause,
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
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;

    return {
      data: comments,
      pagination: {
        limit,
        totalCount: total,
        hasNextPage: hasNext,
        hasPreviousPage: hasPrev,
        currentPage: page,
        totalPages: pages,
      },
      links: {
        self: `/api/v2/comments?page=${page}&limit=${limit}`,
        first: `/api/v2/comments?page=1&limit=${limit}`,
        ...(hasPrev && { prev: `/api/v2/comments?page=${page - 1}&limit=${limit}` }),
        ...(hasNext && { next: `/api/v2/comments?page=${page + 1}&limit=${limit}` }),
        ...(pages > 1 && { last: `/api/v2/comments?page=${pages}&limit=${limit}` }),
      },
    };
  }

  /**
   * Get comments for a specific document with access control
   *
   * Preconditions: Document ID is valid, user has access to document
   * Postconditions: Returns paginated comments for the document based on user permissions
   * Invariants: Access control is enforced, only accessible comments are returned
   *
   * @param documentId - Document ID to get comments for
   * @param query - Query parameters for pagination and filtering
   * @param currentUser - Current authenticated user
   * @returns Paginated comments for the document
   */
  async getCommentsByDocument(
    documentId: string,
    query: CommentQueryInput,
    currentUser: AuthenticatedUser,
  ): Promise<PaginationResponse<Comment>> {
    // Verify document exists and is accessible
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw HttpException.notFound(undefined, 'Document not found');
    }

    // Check if user can access the document
    if (!this.canAccessDocument(document, currentUser)) {
      throw HttpException.forbidden(undefined, 'Access denied to this document');
    }

    const { page, limit, state, search } = query;
    const offset = (page - 1) * limit;

    // Build where clause for document comments
    const filters: { documentId: string; state?: string; search?: string } = {
      documentId,
    };
    if (state) filters.state = state;
    if (search) filters.search = search;

    const whereClause = this.buildCommentWhereClause(filters, currentUser);

    // Get total count for pagination
    const total = await this.prisma.comment.count({ where: whereClause });

    // Get comments with user information
    const comments = await this.prisma.comment.findMany({
      where: whereClause,
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
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;

    return {
      data: comments,
      pagination: {
        limit,
        totalCount: total,
        hasNextPage: hasNext,
        hasPreviousPage: hasPrev,
        currentPage: page,
        totalPages: pages,
      },
      links: {
        self: `/api/v2/comments/document/${documentId}?page=${page}&limit=${limit}`,
        first: `/api/v2/comments/document/${documentId}?page=1&limit=${limit}`,
        ...(hasPrev && {
          prev: `/api/v2/comments/document/${documentId}?page=${page - 1}&limit=${limit}`,
        }),
        ...(hasNext && {
          next: `/api/v2/comments/document/${documentId}?page=${page + 1}&limit=${limit}`,
        }),
        ...(pages > 1 && {
          last: `/api/v2/comments/document/${documentId}?page=${pages}&limit=${limit}`,
        }),
      },
    };
  }

  /**
   * Update a comment (admin/moderator only)
   *
   * Preconditions: Comment exists, user has permission to modify
   * Postconditions: Comment is updated with audit trail, state changes are tracked
   * Invariants: Only authorized users can modify comments
   *
   * @param id - Comment ID
   * @param currentUser - Current authenticated user
   * @returns Updated comment with user information
   */
  async updateComment(
    id: string,
    input: UpdateCommentInput,
    currentUser: AuthenticatedUser,
  ): Promise<Comment> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw HttpException.notFound(undefined, 'Comment not found');
    }

    // Check if user can modify this comment
    if (!this.canModifyComment(comment, currentUser)) {
      throw HttpException.forbidden(undefined, 'Permission denied to modify this comment');
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id },
      data: {
        ...(input.comment && { comment: input.comment }),
        ...(input.state && { state: input.state }),
        updatedById: currentUser.id,
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

    return updatedComment;
  }

  /**
   * Delete a comment (admin/moderator only)
   *
   * Preconditions: Comment exists, user has permission to delete
   * Postconditions: Comment is permanently deleted
   * Invariants: Only authorized users can delete comments
   *
   * @param id - Comment ID
   * @param currentUser - Current authenticated user
   */
  async deleteComment(id: string, currentUser: AuthenticatedUser): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw HttpException.notFound(undefined, 'Comment not found');
    }

    // Check if user can delete this comment
    if (!this.canDeleteComment(comment, currentUser)) {
      throw HttpException.forbidden(undefined, 'Permission denied to delete this comment');
    }

    await this.prisma.comment.delete({
      where: { id },
    });
  }

  /**
   * Approve a comment (moderator only)
   *
   * Preconditions: Comment exists and is in PENDING state
   * Postconditions: Comment state changes to APPROVED
   * Invariants: Only moderators can approve comments
   *
   * @param id - Comment ID
   * @param currentUser - Current authenticated user
   * @returns Approved comment
   */
  async approveComment(id: string, currentUser: AuthenticatedUser): Promise<Comment> {
    return this.updateComment(id, { state: 'APPROVED' }, currentUser);
  }

  /**
   * Reject a comment (moderator only)
   *
   * Preconditions: Comment exists and is in PENDING state
   * Postconditions: Comment state changes to REJECTED
   * Invariants: Only moderators can reject comments
   *
   * @param id - Comment ID
   * @param currentUser - Current authenticated user
   * @returns Rejected comment
   */
  async rejectComment(id: string, currentUser: AuthenticatedUser): Promise<Comment> {
    return this.updateComment(id, { state: 'REJECTED' }, currentUser);
  }

  /**
   * Get pending comments for moderation
   *
   * Preconditions: User has moderator permissions
   * Postconditions: Returns only PENDING comments
   * Invariants: Only moderators can access pending comments
   *
   * @param query - Query parameters for pagination
   * @param currentUser - Current authenticated user
   * @returns Paginated pending comments
   */
  async getPendingComments(
    query: CommentQueryInput,
    currentUser: AuthenticatedUser,
  ): Promise<PaginationResponse<Comment>> {
    // Only moderators can see pending comments
    if (!this.isModerator(currentUser)) {
      throw HttpException.forbidden(undefined, 'Moderator access required');
    }

    return this.getComments({ ...query, state: 'PENDING' }, currentUser);
  }

  /**
   * Check if user can access a document
   *
   * @param document - Document to check access for
   * @param currentUser - Current authenticated user
   * @returns True if user can access the document
   */
  private canAccessDocument(
    document: { documentPrivacy: DocPrivacy; userId: string; groupToShare: string | null },
    currentUser: AuthenticatedUser,
  ): boolean {
    // Admin and moderators can access all documents
    if (currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR') {
      return true;
    }

    // Document owner can always access their documents (except PRIVATE)
    if (document.userId === currentUser.id) {
      return document.documentPrivacy !== 'PRIVATE';
    }

    // Check privacy settings for all users
    switch (document.documentPrivacy) {
      case 'PUBLIC':
        return true;
      case 'PRIVATE':
        return false;
      case 'GROUP':
        return (
          document.groupToShare !== null &&
          Array.isArray(currentUser.groupIds) &&
          currentUser.groupIds.includes(document.groupToShare)
        );
      case 'RESEARCH_ONLY':
        // TODO: Implement research request checking
        return false;
      default:
        return false;
    }
  }

  /**
   * Check if user can access a comment
   *
   * @param comment - Comment to check access for
   * @param currentUser - Current authenticated user
   * @returns True if user can access the comment
   */
  private canAccessComment(
    comment: { userId: string; state: string },
    currentUser: AuthenticatedUser,
  ): boolean {
    // Comment author can always see their own comments
    if (comment.userId === currentUser.id) {
      return true;
    }

    // Moderators can see all comments
    if (this.isModerator(currentUser)) {
      return true;
    }

    // Only approved comments are visible to other users
    if (comment.state === 'APPROVED') {
      return true;
    }

    return false;
  }

  /**
   * Check if user can modify a comment
   *
   * @param comment - Comment to check modification rights for
   * @param currentUser - Current authenticated user
   * @returns True if user can modify the comment
   */
  private canModifyComment(
    comment: { userId: string; state: string },
    currentUser: AuthenticatedUser,
  ): boolean {
    // Comment author can modify their own comments (if still pending)
    if (comment.userId === currentUser.id && comment.state === 'PENDING') {
      return true;
    }

    // Moderators can modify any comment
    if (this.isModerator(currentUser)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can delete a comment
   *
   * @param comment - Comment to check deletion rights for
   * @param currentUser - Current authenticated user
   * @returns True if user can delete the comment
   */
  private canDeleteComment(
    comment: { userId: string; state: string },
    currentUser: AuthenticatedUser,
  ): boolean {
    // Comment author can delete their own comments (if still pending)
    if (comment.userId === currentUser.id && comment.state === 'PENDING') {
      return true;
    }

    // Moderators can delete any comment
    if (this.isModerator(currentUser)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user is a moderator
   *
   * @param currentUser - Current authenticated user
   * @returns True if user has moderator permissions
   */
  private isModerator(currentUser: AuthenticatedUser): boolean {
    // Check if user has moderator or admin role
    return currentUser.isModerator;
  }

  /**
   * Build where clause for comment queries based on user permissions
   *
   * @param filters - Query filters
   * @param currentUser - Current authenticated user
   * @returns Prisma where clause
   */
  private buildCommentWhereClause(
    filters: { documentId?: string; userId?: string; state?: string; search?: string },
    currentUser: AuthenticatedUser,
  ): Record<string, unknown> {
    const whereClause: Record<string, unknown> = {};

    // Apply filters
    if (filters.documentId) {
      whereClause.documentId = filters.documentId;
    }

    if (filters.userId) {
      whereClause.userId = filters.userId;
    }

    if (filters.state) {
      whereClause.state = filters.state;
    }

    // Search in comment text
    if (filters.search) {
      whereClause.comment = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    // Apply access control based on user permissions
    if (this.isModerator(currentUser)) {
      // Moderators can see all comments
      return whereClause;
    }

    // Regular users can only see:
    // 1. Their own comments (any state)
    // 2. Approved comments from other users
    const userComments = { userId: currentUser.id };
    const approvedComments = { state: 'APPROVED' };

    whereClause.OR = [userComments, approvedComments];

    return whereClause;
  }
}
