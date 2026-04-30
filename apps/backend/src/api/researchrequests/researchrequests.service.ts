import { PrismaClient, RequestState, type ResearchRequest } from '@memoriaali/database';
import { PaginationResponse } from '@memoriaali/shared';

import { HttpException } from '../../shared/errors';
import { AuthenticatedUser } from '../../shared/types/authenticated-user';

import type {
  CreateResearchRequestInput,
  ResearchRequestQueryInput,
  UpdateResearchRequestInput,
} from './researchrequests.schemas';

/**
 * Research Requests Service
 *
 * Handles business logic for research request management including:
 * - CRUD operations for research requests
 * - Access control and authorization enforcement
 * - Approval workflow management
 * - Search and filtering capabilities
 * - Pagination support
 */
export class ResearchRequestsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new research request
   *
   * @param input - Research request creation data
   * @param currentUser - Current authenticated user
   * @returns Created research request
   */
  async createResearchRequest(
    input: CreateResearchRequestInput,
    currentUser: AuthenticatedUser,
  ): Promise<ResearchRequest> {
    // Verify the document exists and is RESEARCH_ONLY
    const document = await this.prisma.document.findUnique({
      where: { id: input.documentId },
      select: { id: true, documentPrivacy: true },
    });

    if (!document) {
      throw HttpException.notFound(undefined, 'Document not found');
    }

    if (document.documentPrivacy !== 'RESEARCH_ONLY') {
      throw HttpException.badRequest(
        undefined,
        'Research requests can only be made for RESEARCH_ONLY documents',
      );
    }

    // Check if user already has a pending request for this document
    const existingRequest = await this.prisma.researchRequest.findFirst({
      where: {
        documentId: input.documentId,
        requestedById: currentUser.id,
        state: RequestState.PENDING,
      },
    });

    if (existingRequest) {
      throw HttpException.conflict(
        undefined,
        'You already have a pending request for this document',
      );
    }

    const researchRequest = await this.prisma.researchRequest.create({
      data: {
        documentId: input.documentId,
        requestedById: currentUser.id,
        purpose: input.purpose,
        researchStartDate: input.researchStartDate ? new Date(input.researchStartDate) : null,
        researchEndDate: input.researchEndDate ? new Date(input.researchEndDate) : null,
        createdById: currentUser.id,
        updatedById: currentUser.id,
      },
    });

    return researchRequest;
  }

  /**
   * Get a research request by ID with access control
   *
   * @param id - Research request ID
   * @param currentUser - Current authenticated user
   * @returns Research request if accessible
   */
  async getResearchRequestById(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<ResearchRequest> {
    const researchRequest = await this.prisma.researchRequest.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            id: true,
            userId: true,
            fileName: true,
            documentPrivacy: true,
          },
        },
        requestedBy: {
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

    if (!researchRequest) {
      throw HttpException.notFound(undefined, 'Research request not found');
    }

    // Check access permissions
    if (!this.canAccessResearchRequest(researchRequest, currentUser)) {
      throw HttpException.forbidden(undefined, 'Access denied to this research request');
    }

    return researchRequest;
  }

  /**
   * Update a research request (approval/rejection)
   *
   * @param id - Research request ID
   * @param input - Update data
   * @param currentUser - Current authenticated user
   * @returns Updated research request
   */
  async updateResearchRequest(
    id: string,
    input: UpdateResearchRequestInput,
    currentUser: AuthenticatedUser,
  ): Promise<ResearchRequest> {
    // Check if research request exists and user has access
    const existingRequest = await this.prisma.researchRequest.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            id: true,
            userId: true,
            documentPrivacy: true,
          },
        },
      },
    });

    if (!existingRequest) {
      throw HttpException.notFound(undefined, 'Research request not found');
    }

    // Only admins or the document owner can approve/reject requests
    if (!this.canModifyResearchRequest(existingRequest, currentUser)) {
      throw HttpException.forbidden(
        undefined,
        'You do not have permission to modify this research request',
      );
    }

    // Validate state transitions
    if (existingRequest.state !== RequestState.PENDING && input.state !== existingRequest.state) {
      throw HttpException.badRequest(
        undefined,
        'Only pending requests can have their state changed',
      );
    }

    // Require rejection explanation when rejecting
    if (input.state === RequestState.REJECTED && !input.rejectionExplanation) {
      throw HttpException.badRequest(
        undefined,
        'Rejection explanation is required when rejecting a request',
      );
    }

    const updateData: Partial<{
      state: RequestState;
      approvedById: string | null;
      updatedById: string;
      purpose: string;
      rejectionExplanation: string;
      researchStartDate: Date | null;
      researchEndDate: Date | null;
    }> = {
      state: input.state,
      approvedById: input.state !== RequestState.PENDING ? currentUser.id : null,
      updatedById: currentUser.id,
    };

    // Only include purpose if it's provided
    if (input.purpose !== undefined) {
      updateData.purpose = input.purpose;
    }

    // Only include rejectionExplanation if it's provided
    if (input.rejectionExplanation !== undefined) {
      updateData.rejectionExplanation = input.rejectionExplanation;
    }

    // Only include research dates if they're provided
    if (input.researchStartDate !== undefined) {
      updateData.researchStartDate = input.researchStartDate
        ? new Date(input.researchStartDate)
        : null;
    }

    if (input.researchEndDate !== undefined) {
      updateData.researchEndDate = input.researchEndDate ? new Date(input.researchEndDate) : null;
    }

    const updatedRequest = await this.prisma.researchRequest.update({
      where: { id },
      data: updateData,
    });

    return updatedRequest;
  }

  /**
   * Approve a research request
   *
   * @param id - Research request ID
   * @param currentUser - Current authenticated user
   * @returns Approved research request
   */
  async approveResearchRequest(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<ResearchRequest> {
    // Check if research request exists and user has access
    const existingRequest = await this.prisma.researchRequest.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            id: true,
            userId: true,
            documentPrivacy: true,
          },
        },
      },
    });

    if (!existingRequest) {
      throw HttpException.notFound(undefined, 'Research request not found');
    }

    // Only admins or the document owner can approve requests
    if (!this.canModifyResearchRequest(existingRequest, currentUser)) {
      throw HttpException.forbidden(
        undefined,
        'You do not have permission to approve this research request',
      );
    }

    // Only pending requests can be approved
    if (existingRequest.state !== RequestState.PENDING) {
      throw HttpException.badRequest(undefined, 'Only pending requests can be approved');
    }

    const updatedRequest = await this.prisma.researchRequest.update({
      where: { id },
      data: {
        state: RequestState.APPROVED,
        approvedById: currentUser.id,
        updatedById: currentUser.id,
      },
    });

    return updatedRequest;
  }

  /**
   * Reject a research request
   *
   * @param id - Research request ID
   * @param rejectionExplanation - Explanation for rejection
   * @param currentUser - Current authenticated user
   * @returns Rejected research request
   */
  async rejectResearchRequest(
    id: string,
    rejectionExplanation: string,
    currentUser: AuthenticatedUser,
  ): Promise<ResearchRequest> {
    // Check if research request exists and user has access
    const existingRequest = await this.prisma.researchRequest.findUnique({
      where: { id },
      include: {
        document: {
          select: {
            id: true,
            userId: true,
            documentPrivacy: true,
          },
        },
      },
    });

    if (!existingRequest) {
      throw HttpException.notFound(undefined, 'Research request not found');
    }

    // Only admins or the document owner can reject requests
    if (!this.canModifyResearchRequest(existingRequest, currentUser)) {
      throw HttpException.forbidden(
        undefined,
        'You do not have permission to reject this research request',
      );
    }

    // Only pending requests can be rejected
    if (existingRequest.state !== RequestState.PENDING) {
      throw HttpException.badRequest(undefined, 'Only pending requests can be rejected');
    }

    // Validate rejection explanation
    if (!rejectionExplanation || rejectionExplanation.trim().length === 0) {
      throw HttpException.badRequest(undefined, 'Rejection explanation is required');
    }

    const updatedRequest = await this.prisma.researchRequest.update({
      where: { id },
      data: {
        state: RequestState.REJECTED,
        approvedById: currentUser.id,
        rejectionExplanation: rejectionExplanation.trim(),
        updatedById: currentUser.id,
      },
    });

    return updatedRequest;
  }

  /**
   * Get research requests with filtering and pagination
   *
   * @param query - Query parameters for filtering and pagination
   * @param currentUser - Current authenticated user
   * @returns Paginated research requests
   */
  async getResearchRequests(
    query: ResearchRequestQueryInput,
    currentUser: AuthenticatedUser,
  ): Promise<PaginationResponse<ResearchRequest>> {
    const { page = 1, limit = 20, documentId, requestedById, state } = query;
    const skip = (page - 1) * limit;

    // Build where clause based on user permissions
    const whereClause: {
      documentId?: string;
      requestedById?: string;
      state?: RequestState;
    } = {};

    if (documentId) {
      whereClause.documentId = documentId;
    }

    if (requestedById) {
      whereClause.requestedById = requestedById;
    }

    if (state) {
      whereClause.state = state;
    }

    // Regular users can only see their own requests
    // Admins can see all requests
    if (!currentUser.isAdmin) {
      whereClause.requestedById = currentUser.id;
    }

    const [researchRequests, total] = await Promise.all([
      this.prisma.researchRequest.findMany({
        where: whereClause,
        include: {
          document: {
            select: {
              id: true,
              fileName: true,
              documentPrivacy: true,
            },
          },
          requestedBy: {
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
        skip,
        take: limit,
      }),
      this.prisma.researchRequest.count({ where: whereClause }),
    ]);

    const currentPage = Math.floor(skip / limit) + 1;
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = skip + limit < total;
    const hasPreviousPage = skip > 0;

    return {
      data: researchRequests,
      pagination: {
        limit,
        totalCount: total,
        hasNextPage,
        hasPreviousPage,
        currentPage,
        totalPages,
      },
      links: {
        self: `/api/researchrequests?page=${currentPage}&limit=${limit}`,
        first: `/api/researchrequests?page=1&limit=${limit}`,
        ...(hasPreviousPage && {
          prev: `/api/researchrequests?page=${currentPage - 1}&limit=${limit}`,
        }),
        ...(hasNextPage && {
          next: `/api/researchrequests?page=${currentPage + 1}&limit=${limit}`,
        }),
        ...(totalPages > 1 && { last: `/api/researchrequests?page=${totalPages}&limit=${limit}` }),
      },
    };
  }

  /**
   * Delete a research request
   *
   * @param id - Research request ID
   * @param currentUser - Current authenticated user
   */
  async deleteResearchRequest(id: string, currentUser: AuthenticatedUser): Promise<void> {
    const researchRequest = await this.prisma.researchRequest.findUnique({
      where: { id },
    });

    if (!researchRequest) {
      throw HttpException.notFound(undefined, 'Research request not found');
    }

    // Only the requester or admins can delete requests
    if (researchRequest.requestedById !== currentUser.id && !currentUser.isAdmin) {
      throw HttpException.forbidden(
        undefined,
        'You do not have permission to delete this research request',
      );
    }

    // Only pending requests can be deleted
    if (researchRequest.state !== RequestState.PENDING) {
      throw HttpException.badRequest(undefined, 'Only pending requests can be deleted');
    }

    await this.prisma.researchRequest.delete({
      where: { id },
    });
  }

  /**
   * Check if user can access a research request
   *
   * @param researchRequest - Research request to check access for
   * @param currentUser - Current authenticated user
   * @returns True if user can access the request
   */
  private canAccessResearchRequest(
    researchRequest: ResearchRequest & {
      document?: { userId: string };
    },
    currentUser: AuthenticatedUser,
  ): boolean {
    // Admins can access all requests
    if (currentUser.isAdmin) {
      return true;
    }

    // Users can access their own requests
    if (researchRequest.requestedById === currentUser.id) {
      return true;
    }

    // Document owners can access requests for their documents
    if (researchRequest.document?.userId === currentUser.id) {
      return true;
    }

    return false;
  }

  /**
   * Check if user can modify a research request
   *
   * @param researchRequest - Research request to check modification rights for
   * @param currentUser - Current authenticated user
   * @returns True if user can modify the request
   */
  private canModifyResearchRequest(
    researchRequest: ResearchRequest & {
      document?: { userId: string };
    },
    currentUser: AuthenticatedUser,
  ): boolean {
    // Admins can modify all requests
    if (currentUser.isAdmin) {
      return true;
    }

    // Document owners can approve/reject requests for their documents
    if (researchRequest.document?.userId === currentUser.id) {
      return true;
    }

    return false;
  }
}
