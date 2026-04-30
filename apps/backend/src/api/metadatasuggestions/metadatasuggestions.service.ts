import { PrismaClient, type Document, type MetadataSuggestion } from '@memoriaali/database';
import { PaginationResponse } from '@memoriaali/shared';

import { HttpException } from '../../shared/errors';
import { AuthenticatedUser } from '../../shared/types/authenticated-user';

import type {
  CreateMetadataSuggestionInput,
  MetadataSuggestionQueryInput,
  UpdateMetadataSuggestionInput,
} from './metadatasuggestions.schemas';

/**
 * Metadata Suggestions Service
 *
 * Handles business logic for metadata suggestion management including:
 * - CRUD operations for metadata suggestions
 * - Moderation workflow (PENDING → APPROVED/VERIFIED/REJECTED)
 * - Access control and privacy enforcement
 * - Search and filtering capabilities
 * - Pagination support
 * - Crowdsourced metadata improvement system
 */
export class MetadataSuggestionsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new metadata suggestion
   *
   * Preconditions: User is authenticated, document exists and is accessible
   * Postconditions: Suggestion is created with PENDING state, audit trail established
   * Invariants: Suggestion is associated with authenticated user and target document
   *
   * @param input - Metadata suggestion creation data
   * @param currentUser - Current authenticated user
   * @returns Created metadata suggestion with user information
   */
  async createMetadataSuggestion(
    input: CreateMetadataSuggestionInput,
    currentUser: AuthenticatedUser,
  ): Promise<MetadataSuggestion> {
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

    const metadataSuggestion = await this.prisma.metadataSuggestion.create({
      data: {
        documentId: input.documentId,
        suggestedById: currentUser.id,
        fieldToChange: input.fieldToChange,
        changedValue: input.changedValue,
        state: 'PENDING',
        createdById: currentUser.id,
        updatedById: currentUser.id,
      },
    });

    return metadataSuggestion;
  }

  /**
   * Get a metadata suggestion by ID with access control
   *
   * Preconditions: Suggestion ID is valid UUID
   * Postconditions: Returns suggestion if accessible, throws if not found or denied
   * Invariants: Access control is enforced based on user permissions
   *
   * @param id - Metadata suggestion ID
   * @param currentUser - Current authenticated user
   * @returns Metadata suggestion with user information if accessible
   */
  async getMetadataSuggestionById(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<MetadataSuggestion> {
    const metadataSuggestion = await this.prisma.metadataSuggestion.findUnique({
      where: { id },
      include: {
        suggestedBy: {
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

    if (!metadataSuggestion) {
      throw HttpException.notFound(undefined, 'Metadata suggestion not found');
    }

    // Check access permissions
    if (!this.canAccessMetadataSuggestion(metadataSuggestion, currentUser)) {
      throw HttpException.forbidden(undefined, 'Access denied to this metadata suggestion');
    }

    return metadataSuggestion;
  }

  /**
   * Get metadata suggestions with filtering and pagination
   *
   * Preconditions: Query parameters are valid
   * Postconditions: Returns filtered and paginated suggestions based on user permissions
   * Invariants: Access control is enforced, pagination limits are respected
   *
   * @param query - Query parameters for filtering and pagination
   * @param currentUser - Current authenticated user
   * @returns Paginated metadata suggestions with user information
   */
  async getMetadataSuggestions(
    query: MetadataSuggestionQueryInput,
    currentUser: AuthenticatedUser,
  ): Promise<PaginationResponse<MetadataSuggestion>> {
    const { page, limit, documentId, suggestedById, state, search } = query;
    const offset = (page - 1) * limit;

    // Build where clause based on user permissions and filters
    const filters: {
      documentId?: string;
      suggestedById?: string;
      state?: string;
      search?: string;
    } = {};
    if (documentId) filters.documentId = documentId;
    if (suggestedById) filters.suggestedById = suggestedById;
    if (state) filters.state = state;
    if (search) filters.search = search;

    const whereClause = this.buildMetadataSuggestionWhereClause(filters, currentUser);

    // Get total count for pagination
    const total = await this.prisma.metadataSuggestion.count({ where: whereClause });

    // Get metadata suggestions with user information
    const metadataSuggestions = await this.prisma.metadataSuggestion.findMany({
      where: whereClause,
      include: {
        suggestedBy: {
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
      data: metadataSuggestions,
      pagination: {
        limit,
        totalCount: total,
        hasNextPage: hasNext,
        hasPreviousPage: hasPrev,
        currentPage: page,
        totalPages: pages,
      },
      links: {
        self: `/api/v2/metadatasuggestions?page=${page}&limit=${limit}`,
        first: `/api/v2/metadatasuggestions?page=1&limit=${limit}`,
        ...(hasPrev && { prev: `/api/v2/metadatasuggestions?page=${page - 1}&limit=${limit}` }),
        ...(hasNext && { next: `/api/v2/metadatasuggestions?page=${page + 1}&limit=${limit}` }),
        ...(pages > 1 && { last: `/api/v2/metadatasuggestions?page=${pages}&limit=${limit}` }),
      },
    };
  }

  /**
   * Get metadata suggestions for a specific document with access control
   *
   * Preconditions: Document ID is valid, user has access to document
   * Postconditions: Returns paginated suggestions for the document based on user permissions
   * Invariants: Access control is enforced, only accessible suggestions are returned
   *
   * @param documentId - Document ID to get suggestions for
   * @param query - Query parameters for pagination and filtering
   * @param currentUser - Current authenticated user
   * @returns Paginated metadata suggestions for the document
   */
  async getMetadataSuggestionsByDocument(
    documentId: string,
    query: MetadataSuggestionQueryInput,
    currentUser: AuthenticatedUser,
  ): Promise<PaginationResponse<MetadataSuggestion>> {
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

    // Build where clause for document suggestions
    const filters: { documentId: string; state?: string; search?: string } = {
      documentId,
    };
    if (state) filters.state = state;
    if (search) filters.search = search;

    const whereClause = this.buildMetadataSuggestionWhereClause(filters, currentUser);

    // Get total count for pagination
    const total = await this.prisma.metadataSuggestion.count({ where: whereClause });

    // Get metadata suggestions with user information
    const metadataSuggestions = await this.prisma.metadataSuggestion.findMany({
      where: whereClause,
      include: {
        suggestedBy: {
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
      data: metadataSuggestions,
      pagination: {
        limit,
        totalCount: total,
        hasNextPage: hasNext,
        hasPreviousPage: hasPrev,
        currentPage: page,
        totalPages: pages,
      },
      links: {
        self: `/api/v2/metadatasuggestions/document/${documentId}?page=${page}&limit=${limit}`,
        first: `/api/v2/metadatasuggestions/document/${documentId}?page=1&limit=${limit}`,
        ...(hasPrev && {
          prev: `/api/v2/metadatasuggestions/document/${documentId}?page=${page - 1}&limit=${limit}`,
        }),
        ...(hasNext && {
          next: `/api/v2/metadatasuggestions/document/${documentId}?page=${page + 1}&limit=${limit}`,
        }),
        ...(pages > 1 && {
          last: `/api/v2/metadatasuggestions/document/${documentId}?page=${pages}&limit=${limit}`,
        }),
      },
    };
  }

  /**
   * Update a metadata suggestion (admin/moderator/expert only)
   *
   * Preconditions: Suggestion exists, user has permission to modify
   * Postconditions: Suggestion is updated with audit trail, state changes are tracked
   * Invariants: Only authorized users can modify suggestions
   *
   * @param id - Metadata suggestion ID
   * @param input - Update data
   * @param currentUser - Current authenticated user
   * @returns Updated metadata suggestion with user information
   */
  async updateMetadataSuggestion(
    id: string,
    input: UpdateMetadataSuggestionInput,
    currentUser: AuthenticatedUser,
  ): Promise<MetadataSuggestion> {
    const metadataSuggestion = await this.prisma.metadataSuggestion.findUnique({
      where: { id },
    });

    if (!metadataSuggestion) {
      throw HttpException.notFound(undefined, 'Metadata suggestion not found');
    }

    // Check if user can modify this suggestion
    if (!this.canModifyMetadataSuggestion(metadataSuggestion, currentUser)) {
      throw HttpException.forbidden(
        undefined,
        'Permission denied to modify this metadata suggestion',
      );
    }

    const updatedMetadataSuggestion = await this.prisma.metadataSuggestion.update({
      where: { id },
      data: {
        ...(input.fieldToChange && { fieldToChange: input.fieldToChange }),
        ...(input.changedValue && { changedValue: input.changedValue }),
        ...(input.state && { state: input.state }),
        ...(input.rejectionExplanation && { rejectionExplanation: input.rejectionExplanation }),
        updatedById: currentUser.id,
      },
      include: {
        suggestedBy: {
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

    return updatedMetadataSuggestion;
  }

  /**
   * Delete a metadata suggestion (admin/moderator only)
   *
   * Preconditions: Suggestion exists, user has permission to delete
   * Postconditions: Suggestion is permanently deleted
   * Invariants: Only authorized users can delete suggestions
   *
   * @param id - Metadata suggestion ID
   * @param currentUser - Current authenticated user
   */
  async deleteMetadataSuggestion(id: string, currentUser: AuthenticatedUser): Promise<void> {
    const metadataSuggestion = await this.prisma.metadataSuggestion.findUnique({
      where: { id },
    });

    if (!metadataSuggestion) {
      throw HttpException.notFound(undefined, 'Metadata suggestion not found');
    }

    // Check if user can delete this suggestion
    if (!this.canDeleteMetadataSuggestion(metadataSuggestion, currentUser)) {
      throw HttpException.forbidden(
        undefined,
        'Permission denied to delete this metadata suggestion',
      );
    }

    await this.prisma.metadataSuggestion.delete({
      where: { id },
    });
  }

  /**
   * Approve a metadata suggestion (moderator/expert only)
   *
   * Preconditions: Suggestion exists and is in PENDING state
   * Postconditions: Suggestion state changes to APPROVED
   * Invariants: Only moderators/experts can approve suggestions
   *
   * @param id - Metadata suggestion ID
   * @param currentUser - Current authenticated user
   * @returns Approved metadata suggestion
   */
  async approveMetadataSuggestion(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<MetadataSuggestion> {
    return this.updateMetadataSuggestion(id, { state: 'APPROVED' }, currentUser);
  }

  /**
   * Verify a metadata suggestion (expert only)
   *
   * Preconditions: Suggestion exists and is in APPROVED state
   * Postconditions: Suggestion state changes to VERIFIED
   * Invariants: Only experts can verify suggestions
   *
   * @param id - Metadata suggestion ID
   * @param currentUser - Current authenticated user
   * @returns Verified metadata suggestion
   */
  async verifyMetadataSuggestion(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<MetadataSuggestion> {
    return this.updateMetadataSuggestion(id, { state: 'VERIFIED' }, currentUser);
  }

  /**
   * Reject a metadata suggestion (moderator/expert only)
   *
   * Preconditions: Suggestion exists and is in PENDING state
   * Postconditions: Suggestion state changes to REJECTED
   * Invariants: Only moderators/experts can reject suggestions
   *
   * @param id - Metadata suggestion ID
   * @param rejectionExplanation - Optional explanation for rejection
   * @param currentUser - Current authenticated user
   * @returns Rejected metadata suggestion
   */
  async rejectMetadataSuggestion(
    id: string,
    rejectionExplanation: string | undefined,
    currentUser: AuthenticatedUser,
  ): Promise<MetadataSuggestion> {
    return this.updateMetadataSuggestion(
      id,
      { state: 'REJECTED', rejectionExplanation },
      currentUser,
    );
  }

  /**
   * Get pending metadata suggestions for moderation
   *
   * Preconditions: User has moderator/expert permissions
   * Postconditions: Returns only PENDING suggestions
   * Invariants: Only moderators/experts can access pending suggestions
   *
   * @param query - Query parameters for pagination
   * @param currentUser - Current authenticated user
   * @returns Paginated pending metadata suggestions
   */
  async getPendingMetadataSuggestions(
    query: MetadataSuggestionQueryInput,
    currentUser: AuthenticatedUser,
  ): Promise<PaginationResponse<MetadataSuggestion>> {
    // Only moderators and experts can see pending suggestions
    if (!this.isModeratorOrExpert(currentUser)) {
      throw HttpException.forbidden(undefined, 'Moderator or expert access required');
    }

    return this.getMetadataSuggestions({ ...query, state: 'PENDING' }, currentUser);
  }

  /**
   * Check if user can access a document
   *
   * @param document - Document to check access for
   * @param currentUser - Current authenticated user
   * @returns True if user can access the document
   */
  private canAccessDocument(document: Document, currentUser: AuthenticatedUser): boolean {
    // Admin and moderators can access all documents
    if (currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR') {
      return true;
    }

    // Document owner can always access their documents
    if (document.userId === currentUser.id) {
      return true;
    }

    // Check privacy settings
    switch (document.documentPrivacy) {
      case 'PUBLIC':
        return true;
      case 'PRIVATE':
        return document.userId === currentUser.id;
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
   * Check if user can access a metadata suggestion
   *
   * @param metadataSuggestion - Metadata suggestion to check access for
   * @param currentUser - Current authenticated user
   * @returns True if user can access the metadata suggestion
   */
  private canAccessMetadataSuggestion(
    metadataSuggestion: { suggestedById: string; state: string },
    currentUser: AuthenticatedUser,
  ): boolean {
    // Suggestion author can always see their own suggestions
    if (metadataSuggestion.suggestedById === currentUser.id) {
      return true;
    }

    // Moderators and experts can see all suggestions
    if (this.isModeratorOrExpert(currentUser)) {
      return true;
    }

    // Only approved/verified suggestions are visible to other users
    if (metadataSuggestion.state === 'APPROVED' || metadataSuggestion.state === 'VERIFIED') {
      return true;
    }

    return false;
  }

  /**
   * Check if user can modify a metadata suggestion
   *
   * @param metadataSuggestion - Metadata suggestion to check modification rights for
   * @param currentUser - Current authenticated user
   * @returns True if user can modify the metadata suggestion
   */
  private canModifyMetadataSuggestion(
    metadataSuggestion: { suggestedById: string; state: string },
    currentUser: AuthenticatedUser,
  ): boolean {
    // Suggestion author can modify their own suggestions (if still pending)
    if (
      metadataSuggestion.suggestedById === currentUser.id &&
      metadataSuggestion.state === 'PENDING'
    ) {
      return true;
    }

    // Moderators and experts can modify any suggestion
    if (this.isModeratorOrExpert(currentUser)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can delete a metadata suggestion
   *
   * @param metadataSuggestion - Metadata suggestion to check deletion rights for
   * @param currentUser - Current authenticated user
   * @returns True if user can delete the metadata suggestion
   */
  private canDeleteMetadataSuggestion(
    metadataSuggestion: { suggestedById: string; state: string },
    currentUser: AuthenticatedUser,
  ): boolean {
    // Suggestion author can delete their own suggestions (if still pending)
    if (
      metadataSuggestion.suggestedById === currentUser.id &&
      metadataSuggestion.state === 'PENDING'
    ) {
      return true;
    }

    // Moderators and experts can delete any suggestion
    if (this.isModeratorOrExpert(currentUser)) {
      return true;
    }

    return false;
  }

  /**
   * Check if user is a moderator or expert
   *
   * @param currentUser - Current authenticated user
   * @returns True if user has moderator or expert permissions
   */
  private isModeratorOrExpert(currentUser: AuthenticatedUser): boolean {
    // Check if user has moderator, expert, or admin role
    return currentUser.isModerator || currentUser.isExpert;
  }

  /**
   * Build where clause for metadata suggestion queries based on user permissions
   *
   * @param filters - Query filters
   * @param currentUser - Current authenticated user
   * @returns Prisma where clause
   */
  private buildMetadataSuggestionWhereClause(
    filters: { documentId?: string; suggestedById?: string; state?: string; search?: string },
    currentUser: AuthenticatedUser,
  ): Record<string, unknown> {
    const whereClause: Record<string, unknown> = {};

    // Apply filters
    if (filters.documentId) {
      whereClause.documentId = filters.documentId;
    }

    if (filters.suggestedById) {
      whereClause.suggestedById = filters.suggestedById;
    }

    if (filters.state) {
      whereClause.state = filters.state;
    }

    // Search in field to change and changed value
    if (filters.search) {
      whereClause.OR = [
        { fieldToChange: { contains: filters.search, mode: 'insensitive' } },
        { changedValue: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Apply access control based on user permissions
    if (this.isModeratorOrExpert(currentUser)) {
      // Moderators and experts can see all suggestions
      return whereClause;
    }

    // Regular users can only see:
    // 1. Their own suggestions (any state)
    // 2. Approved/verified suggestions from other users
    const userSuggestions = { suggestedById: currentUser.id };
    const approvedSuggestions = { state: { in: ['APPROVED', 'VERIFIED'] } };

    whereClause.OR = [userSuggestions, approvedSuggestions];

    return whereClause;
  }
}
