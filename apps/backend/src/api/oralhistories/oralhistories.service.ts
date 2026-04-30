import { PrismaClient, type OralHistory } from '@memoriaali/database';

import { HttpException } from '../../shared/errors';
import { AuthenticatedUser } from '../../shared/types/authenticated-user';

import type {
  CreateOralHistoryInput,
  OralHistoryQueryInput,
  UpdateOralHistoryInput,
} from './oralhistories.schemas';

/**
 * Oral Histories Service
 *
 * Handles business logic for oral history management including:
 * - CRUD operations for oral histories
 * - Privacy and access control enforcement
 * - Search and filtering capabilities
 * - Pagination support
 */
export class OralHistoriesService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new oral history
   *
   * @param input - Oral history creation data
   * @param currentUser - Current authenticated user
   * @returns Created oral history
   */
  async createOralHistory(
    input: CreateOralHistoryInput,
    currentUser: AuthenticatedUser,
  ): Promise<OralHistory> {
    const oralHistory = await this.prisma.oralHistory.create({
      data: {
        userId: currentUser.id,
        fileName: input.fileName,
        person: input.person,
        reporter: input.reporter,
        event: input.event,
        description: input.description,
        language: input.language,
        groupToShare: input.groupToShare ?? null,
        shareToGroup: input.shareToGroup ?? null,
        questions: input.questions,
        keywords: input.keywords,
        createdById: currentUser.id,
        updatedById: currentUser.id,
      },
    });

    return oralHistory;
  }

  /**
   * Get an oral history by ID with access control
   *
   * @param id - Oral history ID
   * @param currentUser - Current authenticated user
   * @returns Oral history if accessible
   */
  async getOralHistoryById(id: string, currentUser: AuthenticatedUser): Promise<OralHistory> {
    const oralHistory = await this.prisma.oralHistory.findUnique({
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
      },
    });

    if (!oralHistory) {
      throw HttpException.notFound(undefined, 'Oral history not found');
    }

    // Check access permissions
    if (!this.canAccessOralHistory(oralHistory, currentUser)) {
      throw HttpException.forbidden(undefined, 'Access denied to this oral history');
    }

    return oralHistory;
  }

  /**
   * Update an oral history
   *
   * @param id - Oral history ID
   * @param input - Update data
   * @param currentUser - Current authenticated user
   * @returns Updated oral history
   */
  async updateOralHistory(
    id: string,
    input: UpdateOralHistoryInput,
    currentUser: AuthenticatedUser,
  ): Promise<OralHistory> {
    // Check if oral history exists and user has access
    const existingOralHistory = await this.prisma.oralHistory.findUnique({
      where: { id },
    });

    if (!existingOralHistory) {
      throw HttpException.notFound(undefined, 'Oral history not found');
    }

    // Check if user can update this oral history
    if (!this.canUpdateOralHistory(existingOralHistory, currentUser)) {
      throw HttpException.forbidden(undefined, 'Access denied to update this oral history');
    }

    const updatedOralHistory = await this.prisma.oralHistory.update({
      where: { id },
      data: {
        ...(input.fileName !== undefined && { fileName: input.fileName }),
        ...(input.person !== undefined && { person: input.person }),
        ...(input.reporter !== undefined && { reporter: input.reporter }),
        ...(input.event !== undefined && { event: input.event }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.language !== undefined && { language: input.language }),
        ...(input.groupToShare !== undefined && { groupToShare: input.groupToShare }),
        ...(input.shareToGroup !== undefined && { shareToGroup: input.shareToGroup }),
        ...(input.questions !== undefined && { questions: input.questions }),
        ...(input.keywords !== undefined && { keywords: input.keywords }),
        updatedById: currentUser.id,
      },
    });

    return updatedOralHistory;
  }

  /**
   * Delete an oral history
   *
   * @param id - Oral history ID
   * @param currentUser - Current authenticated user
   */
  async deleteOralHistory(id: string, currentUser: AuthenticatedUser): Promise<void> {
    // Check if oral history exists and user has access
    const existingOralHistory = await this.prisma.oralHistory.findUnique({
      where: { id },
    });

    if (!existingOralHistory) {
      throw HttpException.notFound(undefined, 'Oral history not found');
    }

    // Check if user can delete this oral history
    if (!this.canDeleteOralHistory(existingOralHistory, currentUser)) {
      throw HttpException.forbidden(undefined, 'Access denied to delete this oral history');
    }

    await this.prisma.oralHistory.delete({
      where: { id },
    });
  }

  /**
   * List oral histories with filtering and pagination
   *
   * @param query - Query parameters for filtering and pagination
   * @param currentUser - Current authenticated user
   * @returns Paginated list of oral histories
   */
  async listOralHistories(
    query: OralHistoryQueryInput,
    currentUser: AuthenticatedUser,
  ): Promise<{
    data: OralHistory[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page, limit, search, userId, language, person, reporter } = query;
    const skip = (page - 1) * limit;

    // Build where clause based on user permissions and filters
    const filters: {
      search?: string;
      userId?: string;
      language?: string;
      person?: string;
      reporter?: string;
    } = {};

    if (search) filters.search = search;
    if (userId) filters.userId = userId;
    if (language) filters.language = language;
    if (person) filters.person = person;
    if (reporter) filters.reporter = reporter;

    const whereClause = this.buildWhereClause(currentUser, filters);

    // Get total count for pagination
    const total = await this.prisma.oralHistory.count({
      where: whereClause,
    });

    // Get oral histories with user information
    const oralHistories = await this.prisma.oralHistory.findMany({
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
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    });

    const pages = Math.ceil(total / limit);
    const hasNext = page < pages;
    const hasPrev = page > 1;

    return {
      data: oralHistories,
      pagination: {
        page,
        limit,
        total,
        pages,
        hasNext,
        hasPrev,
      },
    };
  }

  /**
   * Check if user can access an oral history
   *
   * @param oralHistory - Oral history to check access for
   * @param currentUser - Current authenticated user
   * @returns True if user can access the oral history
   */
  private canAccessOralHistory(oralHistory: OralHistory, currentUser: AuthenticatedUser): boolean {
    // Admin and moderator can access all oral histories
    if (currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR') {
      return true;
    }

    // User can always access their own oral histories
    if (oralHistory.userId === currentUser.id) {
      return true;
    }

    // Check group sharing permissions
    if (oralHistory.shareToGroup && oralHistory.groupToShare) {
      // TODO: Implement group membership check
      // For now, allow access if group sharing is enabled
      return true;
    }

    // Default to public access (no privacy field in oral_histories table)
    return true;
  }

  /**
   * Check if user can update an oral history
   *
   * @param oralHistory - Oral history to check update permissions for
   * @param currentUser - Current authenticated user
   * @returns True if user can update the oral history
   */
  private canUpdateOralHistory(oralHistory: OralHistory, currentUser: AuthenticatedUser): boolean {
    // Admin and moderator can update all oral histories
    if (currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR') {
      return true;
    }

    // User can update their own oral histories
    return oralHistory.userId === currentUser.id;
  }

  /**
   * Check if user can delete an oral history
   *
   * @param oralHistory - Oral history to check delete permissions for
   * @param currentUser - Current authenticated user
   * @returns True if user can delete the oral history
   */
  private canDeleteOralHistory(oralHistory: OralHistory, currentUser: AuthenticatedUser): boolean {
    // Admin and moderator can delete all oral histories
    if (currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR') {
      return true;
    }

    // User can delete their own oral histories
    return oralHistory.userId === currentUser.id;
  }

  /**
   * Build where clause for filtering oral histories
   *
   * @param currentUser - Current authenticated user
   * @param filters - Filter parameters
   * @returns Prisma where clause
   */
  private buildWhereClause(
    currentUser: AuthenticatedUser,
    filters: {
      search?: string;
      userId?: string;
      language?: string;
      person?: string;
      reporter?: string;
    },
  ) {
    const { search, userId, language, person, reporter } = filters;

    const whereClause: Record<string, unknown> = {};

    // Apply user-based filtering
    if (currentUser.role === 'USER' || currentUser.role === 'EXPERT') {
      // Regular users can only see their own oral histories or shared ones
      whereClause.OR = [{ userId: currentUser.id }, { shareToGroup: true }];
    }

    // Apply search filter
    if (search) {
      const searchConditions = [
        { fileName: { contains: search, mode: 'insensitive' } },
        { person: { contains: search, mode: 'insensitive' } },
        { reporter: { contains: search, mode: 'insensitive' } },
        { event: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];

      if (whereClause.OR) {
        // If we already have OR conditions, we need to restructure
        whereClause.AND = [{ OR: whereClause.OR }, { OR: searchConditions }];
        delete whereClause.OR;
      } else {
        whereClause.OR = searchConditions;
      }
    }

    // Apply specific filters
    if (userId) {
      whereClause.userId = userId;
    }

    if (language) {
      whereClause.language = { contains: language, mode: 'insensitive' };
    }

    if (person) {
      whereClause.person = { contains: person, mode: 'insensitive' };
    }

    if (reporter) {
      whereClause.reporter = { contains: reporter, mode: 'insensitive' };
    }

    return whereClause;
  }
}
