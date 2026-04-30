import { PrismaClient, type Document } from '@memoriaali/database';

import { HttpException } from '../../shared/errors';
import { AuthenticatedUser } from '../../shared/types/authenticated-user';

import type {
  CreateDocumentInput,
  DocumentQueryInput,
  UpdateDocumentInput,
} from './documents.schemas';

/**
 * Documents Service
 *
 * Handles business logic for document management including:
 * - CRUD operations for documents
 * - Privacy and access control enforcement
 * - Search and filtering capabilities
 * - Pagination support
 */
export class DocumentsService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new document
   *
   * @param input - Document creation data
   * @param currentUser - Current authenticated user
   * @returns Created document
   */
  async createDocument(
    input: CreateDocumentInput,
    currentUser: AuthenticatedUser,
  ): Promise<Document> {
    if (input.groupToShare && input.documentPrivacy !== 'GROUP') {
      throw HttpException.badRequest(
        undefined,
        'groupToShare can only be set if documentPrivacy is GROUP',
      );
    }

    const document = await this.prisma.document.create({
      data: {
        user: {
          connect: { id: currentUser.id },
        },
        fileName: input.fileName,
        mimeType: input.mimeType ?? null,
        documentPrivacy: input.documentPrivacy,
        groupToShare: input.documentPrivacy === 'GROUP' ? (input.groupToShare ?? null) : null,
        metadata: input.metadata,
        aiModified: input.aiModified ?? false,
        aiModifiedFields: input.aiModifiedFields ?? [],
        hasErrors: input.hasErrors ?? false,
        errorTypes: input.errorTypes ?? [],
        errorPageNumbers: input.errorPageNumbers ?? [],
        createdBy: {
          connect: { id: currentUser.id },
        },
        updatedBy: {
          connect: { id: currentUser.id },
        },
      },
    });

    return document;
  }

  /**
   * Get a document by ID with access control
   *
   * @param id - Document ID
   * @param currentUser - Current authenticated user
   * @returns Document if accessible
   */
  async getDocumentById(id: string, currentUser: AuthenticatedUser): Promise<Document> {
    const document = await this.prisma.document.findUnique({
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

    if (!document) {
      throw HttpException.notFound(undefined, 'Document not found');
    }

    // Check access permissions
    if (!this.canAccessDocument(document, currentUser)) {
      throw HttpException.forbidden(undefined, 'Access denied to this document');
    }

    return document;
  }

  /**
   * Update a document
   *
   * @param id - Document ID
   * @param input - Update data
   * @param currentUser - Current authenticated user
   * @returns Updated document
   */
  async updateDocument(
    id: string,
    input: UpdateDocumentInput,
    currentUser: AuthenticatedUser,
  ): Promise<Document> {
    // Check if document exists and user has access
    const existingDocument = await this.getDocumentById(id, currentUser);

    // Check if user has permission to update
    if (!this.canModifyDocument(existingDocument, currentUser)) {
      throw HttpException.forbidden(
        undefined,
        'You do not have permission to modify this document',
      );
    }

    if (input.groupToShare && input.documentPrivacy !== 'GROUP') {
      throw HttpException.badRequest(
        undefined,
        'groupToShare can only be set if documentPrivacy is GROUP',
      );
    }

    const document = await this.prisma.document.update({
      where: { id },
      data: {
        updatedBy: {
          connect: { id: currentUser.id },
        },
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        ...(input.fileName !== undefined && { fileName: input.fileName }),
        ...(input.mimeType !== undefined && { mimeType: input.mimeType }),
        ...(input.documentPrivacy !== undefined && { documentPrivacy: input.documentPrivacy }),
        ...(input.groupToShare !== undefined &&
          input.documentPrivacy === 'GROUP' && { groupToShare: input.groupToShare ?? null }),
        ...(input.aiModified !== undefined && { aiModified: input.aiModified }),
        ...(input.aiModifiedFields !== undefined && { aiModifiedFields: input.aiModifiedFields }),
        ...(input.hasErrors !== undefined && { hasErrors: input.hasErrors }),
        ...(input.errorTypes !== undefined && { errorTypes: input.errorTypes }),
        ...(input.errorPageNumbers !== undefined && { errorPageNumbers: input.errorPageNumbers }),
      },
    });

    return document;
  }

  /**
   * Delete a document
   *
   * @param id - Document ID
   * @param currentUser - Current authenticated user
   */
  async deleteDocument(id: string, currentUser: AuthenticatedUser): Promise<void> {
    // Check if document exists and user has access
    const existingDocument = await this.getDocumentById(id, currentUser);

    // Check if user has permission to delete
    if (!this.canModifyDocument(existingDocument, currentUser)) {
      throw HttpException.forbidden(
        undefined,
        'You do not have permission to delete this document',
      );
    }

    await this.prisma.document.delete({
      where: { id },
    });
  }

  /**
   * List documents with filtering and pagination
   *
   * @param query - Query parameters
   * @param currentUser - Current authenticated user
   * @returns Paginated list of documents with comment counts
   */
  /*async listDocuments(
    query: DocumentQueryInput,
    currentUser: AuthenticatedUser,
  ): Promise<{
    documents: (Document & {
      user: { id: string; username: string; firstName: string | null; lastName: string | null };
      _count: { comments: number };
    })[];
    pagination: PaginationResponse<Document>;
  }> {
    const { page = 1, limit = 10, noLimit = false } = query;

    // Build where clause based on user permissions and filters
    const where = this.buildDocumentWhereClause(query, currentUser);

    // Get total count for pagination
    const total = await this.prisma.document.count({ where });

    // If noLimit is true, return all documents without pagination
    if (noLimit) {
      const documents = await this.prisma.document.findMany({
        where,
        orderBy: { createdAt: query.sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              comments: true,
            },
          },
        },
      });

      // Build pagination response for no-limit case
      const pagination: PaginationResponse<Document> = {
        data: documents,
        pagination: {
          limit: total, // Set limit to total count to indicate all items
          totalCount: total,
          hasNextPage: false,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 1,
        },
        links: {
          self: `/api/v2/documents?noLimit=true`,
          first: `/api/v2/documents?noLimit=true`,
        },
      };

      return {
        documents,
        pagination,
      };
    }

    // Calculate pagination metadata for normal pagination
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Get documents with comment count and user information
    const documents = await this.prisma.document.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: query.sortOrder === 'asc' ? 'asc' : 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            comments: true,
          },
        },
      },
    });

    // Build pagination response
    const pagination: PaginationResponse<Document> = {
      data: documents,
      pagination: {
        limit,
        totalCount: total,
        hasNextPage,
        hasPreviousPage,
        currentPage: page,
        totalPages,
      },
      links: {
        self: `/api/v2/documents?page=${page}&limit=${limit}`,
        ...(hasPreviousPage && { prev: `/api/v2/documents?page=${page - 1}&limit=${limit}` }),
        ...(hasNextPage && { next: `/api/v2/documents?page=${page + 1}&limit=${limit}` }),
        first: `/api/v2/documents?limit=${limit}`,
      },
    };

    return {
      documents,
      pagination,
    };
  }*/

  async listDocuments(
    query: DocumentQueryInput,
    currentUser: AuthenticatedUser,
  ): Promise<{
    documents: (Document & {
      user: { id: string; username: string; firstName: string | null; lastName: string | null };
      _count: { comments: number };
    })[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { page = 1, limit = 10, noLimit = false } = query;

    // Use group membership data from the authenticated user context
    // This avoids extra database calls and keeps the service layer testable.
    const userGroupIds = currentUser.groupIds ?? [];

    // Build where clause
    const where = this.buildDocumentWhereClause(query, currentUser, userGroupIds);

    // Get total count
    const total = await this.prisma.document.count({ where });

    if (noLimit) {
      const documents = await this.prisma.document.findMany({
        where,
        orderBy: { createdAt: query.sortOrder === 'asc' ? 'asc' : 'desc' },
        include: {
          user: { select: { id: true, username: true, firstName: true, lastName: true } },
          _count: { select: { comments: true } },
        },
      });

      return {
        documents,
        pagination: {
          page: 1,
          limit: total,
          total,
          pages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };
    }

    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    const documents = await this.prisma.document.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: query.sortOrder === 'asc' ? 'asc' : 'desc' },
      include: {
        user: { select: { id: true, username: true, firstName: true, lastName: true } },
        _count: { select: { comments: true } },
      },
    });

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
        hasNext,
        hasPrev,
      },
    };
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
   * Check if user can modify a document
   *
   * @param document - Document to check modification rights for
   * @param currentUser - Current authenticated user
   * @returns True if user can modify the document
   */
  private canModifyDocument(document: Document, currentUser: AuthenticatedUser): boolean {
    // Admin and moderators can modify all documents
    if (currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR') {
      return true;
    }

    // Document owner can modify their own documents
    return document.userId === currentUser.id;
  }

  /**
   * Parse bracket notation search terms
   *
   * @param searchTerm - Search term that may contain bracket notation like [author.Saarinen, personNames.Saarinen]
   * @returns Object with parsed search targets or null if not bracket notation
   */
  private parseBracketSearch(searchTerm: string): { [field: string]: string[] } | null {
    if (!searchTerm.startsWith('[') || !searchTerm.endsWith(']')) {
      return null;
    }

    const content = searchTerm.slice(1, -1).trim();
    if (!content) {
      return null;
    }

    const searchTargets: { [field: string]: string[] } = {};
    const pairs = content.split(',');

    for (const pair of pairs) {
      const trimmed = pair.trim();
      const dot = trimmed.indexOf('.');
      if (dot <= 0) continue;

      const field = trimmed.substring(0, dot).trim();
      const value = trimmed.substring(dot + 1).trim();

      if (!field || !value) continue;

      if (!searchTargets[field]) {
        searchTargets[field] = [];
      }
      searchTargets[field].push(value);
    }

    return Object.keys(searchTargets).length > 0 ? searchTargets : null;
  }

  /**
   * Split search terms by spaces while preserving bracket notation
   *
   * @param search - Search string
   * @returns Array of search terms
   */
  private splitSearchTerms(search: string): string[] {
    const terms: string[] = [];
    let currentTerm = '';
    let inBrackets = false;
    let bracketDepth = 0;

    for (let i = 0; i < search.length; i++) {
      const char = search[i];

      if (char === '[') {
        inBrackets = true;
        bracketDepth++;
        currentTerm += char;
      } else if (char === ']') {
        bracketDepth--;
        if (bracketDepth === 0) {
          inBrackets = false;
        }
        currentTerm += char;
      } else if (char === ' ' && !inBrackets) {
        // Only split on spaces when not inside brackets
        if (currentTerm.trim()) {
          terms.push(currentTerm.trim());
          currentTerm = '';
        }
      } else {
        currentTerm += char;
      }
    }

    // Add the last term if it exists
    if (currentTerm.trim()) {
      terms.push(currentTerm.trim());
    }

    return terms.filter((term) => term.length > 0);
  }

  // Helper function for bracket notation
  private buildBracketConditions(term: string): Record<string, unknown>[] {
    const bracketSearch = this.parseBracketSearch(term);
    const typeConditions: Array<Record<string, unknown>> = [];
    const languageConditions: Array<Record<string, unknown>> = [];
    const authorConditions: Array<Record<string, unknown>> = [];
    const subjectConditions: Array<Record<string, unknown>> = [];
    const dateConditions: Array<Record<string, unknown>> = [];
    const locationConditions: Array<Record<string, unknown>> = [];
    const otherConditions: Array<Record<string, unknown>> = [];

    if (bracketSearch) {
      for (const [field, values] of Object.entries(bracketSearch)) {
        const vals = Array.isArray(values) ? values : [String(values)];
        for (const v of vals) {
          // Ensure only non-undefined values are added
          const results = (this.buildSingleWordConditions(v, field) || []).filter(
            Boolean,
          ) as Record<string, unknown>[];
          if (field === 'type') {
            typeConditions.push(...results);
          } else if (field === 'language') {
            languageConditions.push(...results);
          } else if (field === 'author') {
            authorConditions.push(...results);
          } else if (field === 'subjectIndexing') {
            subjectConditions.push(...results);
          } else if (field === 'dateRange') {
            dateConditions.push(...results);
          } else if (field === 'locations') {
            locationConditions.push(...results);
          } else {
            otherConditions.push(...results);
          }
        }
      }

      // Compose non-empty condition groups
      const conditions: Array<Record<string, unknown>> = [];
      if (typeConditions.length) conditions.push({ OR: typeConditions });
      if (languageConditions.length) conditions.push({ OR: languageConditions });
      if (otherConditions.length) conditions.push(...otherConditions);
      if (authorConditions.length) conditions.push({ OR: authorConditions });
      if (subjectConditions.length) conditions.push({ OR: subjectConditions });
      if (dateConditions.length) conditions.push({ OR: dateConditions });
      if (locationConditions.length) conditions.push({ OR: locationConditions });

      // Combine all with AND

      if (conditions.length > 1) {
        return [{ AND: conditions }];
      } else if (conditions.length === 1 && conditions[0]) {
        return [conditions[0]];
      }
    }
    return [];
  }

  /**
   * Build search conditions for a search term, handling multi-word searches with AND operator
   *
   * @param search - Search term
   * @returns Array of search conditions
   */
  private buildSearchConditions(search: string): Array<Record<string, unknown>> {
    // Handle mixed search terms - split by spaces but preserve bracket notation
    const searchTerms = this.splitSearchTerms(search);

    if (searchTerms.length === 1) {
      // Single search term - check if it's bracket notation, dot notation, or general search
      const term = searchTerms[0]!;

      if (!term) {
        return [];
      }

      // Check for bracket notation first
      if (term.startsWith('[') && term.endsWith(']')) {
        const bracketConditions = this.buildBracketConditions(term);
        if (bracketConditions.length > 0) {
          return bracketConditions;
        }

        // Fallback for completely malformed bracket expressions (e.g. [author, personNames])
        // Treat as regular search on the raw input
        return this.buildSingleWordConditions(term, null);
      }

      // Check for dot notation
      const dotIndex = term.indexOf('.');
      if (dotIndex > 0) {
        const searchPath = term.substring(0, dotIndex);
        const actualSearchTerm = term.substring(dotIndex + 1);
        return this.buildSingleWordConditions(actualSearchTerm, searchPath);
      }

      // General search
      return this.buildSingleWordConditions(term, null);
    } else {
      // Multiple search terms - each term can be bracket notation, dot notation, or general search
      const termConditions: Array<Record<string, unknown>> = [];

      for (const term of searchTerms) {
        if (term.startsWith('[') && term.endsWith(']')) {
          // Check for bracket notation first
          termConditions.push(...this.buildBracketConditions(term));
          continue;
        }

        // Check for dot notation
        const dotIndex = term.indexOf('.');
        if (dotIndex > 0) {
          const searchPath = term.substring(0, dotIndex);
          const actualSearchTerm = term.substring(dotIndex + 1);
          const dotNotationConditions = this.buildSingleWordConditions(
            actualSearchTerm,
            searchPath,
          );
          termConditions.push({ OR: dotNotationConditions });
        } else {
          // General search
          const generalConditions = this.buildSingleWordConditions(term, null);
          termConditions.push({ OR: generalConditions });
        }
      }

      // All terms must be found (AND of all term conditions)
      return [{ AND: termConditions }];
    }
  }

  /**
   * Build search conditions for multi-word searches
   * Creates AND conditions where each word must be found in any field
   *
   * @param words - Array of words to search for
   * @param searchPath - Optional specific metadata path to search in
   * @returns Array of Prisma AND conditions
   */
  private buildMultiWordFieldConditions(
    words: string[],
    searchPath: string | null = null,
  ): Array<Record<string, unknown>> {
    // For multi-word searches, we want each word to be found in ANY field
    // So we create individual word conditions and combine them with AND
    const wordConditions: Array<Record<string, unknown>> = [];

    for (const word of words) {
      // Get all possible search conditions for this word
      const wordSearchConditions = this.buildSingleWordConditions(word, searchPath);
      // Each word must be found in at least one field (OR of all field conditions for this word)
      wordConditions.push({ OR: wordSearchConditions });
    }

    // All words must be found (AND of all word conditions)
    return [{ AND: wordConditions }];
  }

  /**
   * Build search conditions for date ranges in exactDate field
   *
   * @param dateRange - Date range string in format "startDate:endDate"
   * @returns Array of search conditions for the date range
   */
  private buildDateRangeConditions(dateRange: string): Array<Record<string, unknown>> {
    const [startDate, endDate] = dateRange.split(':');

    if (!startDate || !endDate) {
      // If invalid format, fall back to string search
      return [{ metadata: { path: '$.exactDate', string_contains: dateRange } }];
    }

    const startDateStr = startDate.trim();
    const endDateStr = endDate.trim();

    // Parse dates to validate format
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      // If invalid dates, fall back to string search
      return [{ metadata: { path: '$.exactDate', string_contains: dateRange } }];
    }

    // For ISO date format (YYYY-MM-DD), we can use string comparison
    // since the format is naturally sortable
    return [
      {
        AND: [
          { metadata: { path: '$.exactDate', gte: startDateStr } },
          { metadata: { path: '$.exactDate', lte: endDateStr } },
        ],
      },
    ];
  }

  /**
   * Build search conditions for a single word
   *
   * @param word - Single word to search for
   * @param searchPath - Optional specific path to search in
   * @returns Array of search conditions for the word
   */
  private buildSingleWordConditions(
    word: string,
    searchPath: string | null = null,
  ): Array<Record<string, unknown>> {
    // Create case-insensitive search terms
    const searchLower = word.toLowerCase();
    const searchUpper = word.toUpperCase();
    const searchCapitalized = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

    // If a specific path is provided, search only in that path
    if (searchPath) {
      // Special handling for exactDate field with date ranges
      if (searchPath === 'exactDate' && word.includes(':')) {
        return this.buildDateRangeConditions(word);
      }

      return [
        // Search in the specified metadata path only
        { metadata: { path: `$.${searchPath}`, string_contains: word } },
        { metadata: { path: `$.${searchPath}`, string_contains: searchLower } },
        { metadata: { path: `$.${searchPath}`, string_contains: searchUpper } },
        { metadata: { path: `$.${searchPath}`, string_contains: searchCapitalized } },
        // Also try array_contains for the specified path (in case it's an array)
        { metadata: { path: `$.${searchPath}`, array_contains: word } },
        { metadata: { path: `$.${searchPath}`, array_contains: searchLower } },
        { metadata: { path: `$.${searchPath}`, array_contains: searchUpper } },
        { metadata: { path: `$.${searchPath}`, array_contains: searchCapitalized } },
      ];
    } else {
      // Default comprehensive search across all fields
      return [
        { fileName: { contains: word } },
        { ocrText: { contains: word } },
        // Search in JSON arrays (case-sensitive for arrays)
        {
          metadata: {
            path: '$.archival.subjectIndexing.keywords',
            array_contains: word,
          },
        },
        {
          metadata: {
            path: '$.archival.subjectIndexing.keywords',
            array_contains: searchLower,
          },
        },
        {
          metadata: {
            path: '$.archival.subjectIndexing.keywords',
            array_contains: searchUpper,
          },
        },
        {
          metadata: {
            path: '$.archival.subjectIndexing.keywords',
            array_contains: searchCapitalized,
          },
        },
        {
          metadata: {
            path: '$.archival.subjectIndexing.subjects',
            array_contains: word,
          },
        },
        {
          metadata: {
            path: '$.archival.subjectIndexing.subjects',
            array_contains: searchLower,
          },
        },
        {
          metadata: {
            path: '$.archival.subjectIndexing.subjects',
            array_contains: searchUpper,
          },
        },
        {
          metadata: {
            path: '$.archival.subjectIndexing.subjects',
            array_contains: searchCapitalized,
          },
        },
        {
          metadata: {
            path: '$.archival.subjectIndexing.timePeriods',
            array_contains: word,
          },
        },
        {
          metadata: {
            path: '$.archival.subjectIndexing.timePeriods',
            array_contains: searchLower,
          },
        },
        {
          metadata: {
            path: '$.archival.subjectIndexing.timePeriods',
            array_contains: searchUpper,
          },
        },
        {
          metadata: {
            path: '$.archival.subjectIndexing.timePeriods',
            array_contains: searchCapitalized,
          },
        },
        {
          metadata: {
            path: '$.archival.subjectIndexing.geographicLocations',
            array_contains: word,
          },
        },
        {
          metadata: {
            path: '$.archival.subjectIndexing.geographicLocations',
            array_contains: searchLower,
          },
        },
        {
          metadata: {
            path: '$.archival.subjectIndexing.geographicLocations',
            array_contains: searchUpper,
          },
        },
        {
          metadata: {
            path: '$.archival.subjectIndexing.geographicLocations',
            array_contains: searchCapitalized,
          },
        },
        // Search in JSON strings using raw SQL approach
        { metadata: { path: '$.dublinCore.title', string_contains: word } },
        { metadata: { path: '$.dublinCore.title', string_contains: searchLower } },
        { metadata: { path: '$.dublinCore.title', string_contains: searchUpper } },
        { metadata: { path: '$.dublinCore.title', string_contains: searchCapitalized } },
        { metadata: { path: '$.dublinCore.subject', string_contains: word } },
        { metadata: { path: '$.dublinCore.subject', string_contains: searchLower } },
        { metadata: { path: '$.dublinCore.subject', string_contains: searchUpper } },
        { metadata: { path: '$.dublinCore.subject', string_contains: searchCapitalized } },
        { metadata: { path: '$.dublinCore.description', string_contains: word } },
        { metadata: { path: '$.dublinCore.description', string_contains: searchLower } },
        { metadata: { path: '$.dublinCore.description', string_contains: searchUpper } },
        {
          metadata: { path: '$.dublinCore.description', string_contains: searchCapitalized },
        },
        { metadata: { path: '$.dublinCore.coverage', string_contains: word } },
        { metadata: { path: '$.dublinCore.coverage', string_contains: searchLower } },
        { metadata: { path: '$.dublinCore.coverage', string_contains: searchUpper } },
        { metadata: { path: '$.dublinCore.coverage', string_contains: searchCapitalized } },
        { metadata: { path: '$.ead.unitTitle', string_contains: word } },
        { metadata: { path: '$.ead.unitTitle', string_contains: searchLower } },
        { metadata: { path: '$.ead.unitTitle', string_contains: searchUpper } },
        { metadata: { path: '$.ead.unitTitle', string_contains: searchCapitalized } },
        { metadata: { path: '$.ead.scopeContent', string_contains: word } },
        { metadata: { path: '$.ead.scopeContent', string_contains: searchLower } },
        { metadata: { path: '$.ead.scopeContent', string_contains: searchUpper } },
        { metadata: { path: '$.ead.scopeContent', string_contains: searchCapitalized } },
        // Search in additional metadata fields
        { metadata: { path: '$.type', string_contains: word } },
        { metadata: { path: '$.type', string_contains: searchLower } },
        { metadata: { path: '$.type', string_contains: searchUpper } },
        { metadata: { path: '$.type', string_contains: searchCapitalized } },
        { metadata: { path: '$.author', string_contains: word } },
        { metadata: { path: '$.author', string_contains: searchLower } },
        { metadata: { path: '$.author', string_contains: searchUpper } },
        { metadata: { path: '$.author', string_contains: searchCapitalized } },
        { metadata: { path: '$.personNames', string_contains: word } },
        { metadata: { path: '$.personNames', string_contains: searchLower } },
        { metadata: { path: '$.personNames', string_contains: searchUpper } },
        { metadata: { path: '$.personNames', string_contains: searchCapitalized } },
        { metadata: { path: '$.header', string_contains: word } },
        { metadata: { path: '$.header', string_contains: searchLower } },
        { metadata: { path: '$.header', string_contains: searchUpper } },
        { metadata: { path: '$.header', string_contains: searchCapitalized } },
        { metadata: { path: '$.description', string_contains: word } },
        { metadata: { path: '$.description', string_contains: searchLower } },
        { metadata: { path: '$.description', string_contains: searchUpper } },
        { metadata: { path: '$.description', string_contains: searchCapitalized } },
        { metadata: { path: '$.events', string_contains: word } },
        { metadata: { path: '$.events', string_contains: searchLower } },
        { metadata: { path: '$.events', string_contains: searchUpper } },
        { metadata: { path: '$.events', string_contains: searchCapitalized } },
        { metadata: { path: '$.locations', string_contains: word } },
        { metadata: { path: '$.locations', string_contains: searchLower } },
        { metadata: { path: '$.locations', string_contains: searchUpper } },
        { metadata: { path: '$.locations', string_contains: searchCapitalized } },
        { metadata: { path: '$.organizations', string_contains: word } },
        { metadata: { path: '$.organizations', string_contains: searchLower } },
        { metadata: { path: '$.organizations', string_contains: searchUpper } },
        { metadata: { path: '$.organizations', string_contains: searchCapitalized } },
        { metadata: { path: '$.products', string_contains: word } },
        { metadata: { path: '$.products', string_contains: searchLower } },
        { metadata: { path: '$.products', string_contains: searchUpper } },
        { metadata: { path: '$.products', string_contains: searchCapitalized } },
        { metadata: { path: '$.other', string_contains: word } },
        { metadata: { path: '$.other', string_contains: searchLower } },
        { metadata: { path: '$.other', string_contains: searchUpper } },
        { metadata: { path: '$.other', string_contains: searchCapitalized } },
        // Search in subjectIndexing array
        { metadata: { path: '$.subjectIndexing', array_contains: word } },
        { metadata: { path: '$.subjectIndexing', array_contains: searchLower } },
        { metadata: { path: '$.subjectIndexing', array_contains: searchUpper } },
        { metadata: { path: '$.subjectIndexing', array_contains: searchCapitalized } },
      ];
    }
  }

  /**
   * Build where clause for document queries based on user permissions
   *
   * @param query - Query parameters
   * @param currentUser - Current authenticated user
   * @returns Prisma where clause
   */
  //JJ groupId in list
  private buildDocumentWhereClause(
    query: DocumentQueryInput,
    currentUser: AuthenticatedUser,
    userGroupIds: string[],
  ) {
    const { search, documentPrivacy, userId, groupId, mimeType } = query;

    const where: Record<string, unknown> = {};

    // Add MIME type filter (always applied)
    if (mimeType) {
      where.mimeType = mimeType;
    }

    if (currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR') {
      // Admins and moderators can see all documents (subject to requested filters)

      if (documentPrivacy) {
        where.documentPrivacy = documentPrivacy;
      }

      if (userId) {
        where.userId = userId;
      }

      // Admin/groupId query should still filter by a specific group if requested

      if (groupId) {
        where.documentPrivacy = 'GROUP';

        where.groupToShare = groupId;
      }

      // Add search filter if present
      if (search) {
        const searchConditions = this.buildSearchConditions(search);
        // Single-word searches return OR conditions, multi-word searches return AND conditions
        if (searchConditions.length === 1 && searchConditions[0]?.AND) {
          // Multi-word search returns AND conditions
          where.AND = searchConditions;
        } else {
          // Single-word search returns OR conditions
          where.OR = searchConditions;
        }
      }
      return where;
    }

    // Regular users can only see:
    // 1. Their own documents
    // 2. Public documents
    // 3. Group documents for each group they belong to
    const accessConditions: Array<Record<string, unknown>> = [
      { userId: currentUser.id },
      { documentPrivacy: 'PUBLIC' },
    ];

    if (userGroupIds.length > 0) {
      accessConditions.push({
        documentPrivacy: 'GROUP',
        groupToShare: { in: userGroupIds },
      });
    }

    // Handle additional filters for regular users
    const additionalFilters: Record<string, unknown> = {};

    // Add privacy filter if specified (but only if it's allowed for this user)
    if (documentPrivacy) {
      if (documentPrivacy === 'PUBLIC') {
        additionalFilters.documentPrivacy = 'PUBLIC';
      } else if (documentPrivacy === 'GROUP') {
        additionalFilters.documentPrivacy = 'GROUP';
        // If group filter is sent, use it; otherwise use current user's group (if any)
        if (groupId) {
          additionalFilters.groupToShare = groupId;
        } else if (userGroupIds.length > 0) {
          additionalFilters.groupToShare = { in: userGroupIds };
        }
      } else if (documentPrivacy === 'PRIVATE') {
        // Keep private filter limited to own documents only
        additionalFilters.documentPrivacy = 'PRIVATE';
        additionalFilters.userId = currentUser.id;
      }
    }

    // Add user filter if specified (but only if it's their own user ID)
    if (userId && userId === currentUser.id) {
      additionalFilters.userId = userId;
    }

    // Handle requested groupId param explicitly
    if (groupId) {
      const hasGroupAccess = userGroupIds.includes(groupId);

      if (!hasGroupAccess) {
        // User is not allowed to query other groups
        throw HttpException.forbidden(undefined, 'Access denied to this groupId');
      }

      additionalFilters.documentPrivacy = 'GROUP';
      additionalFilters.groupToShare = groupId;
    }

    // Combine search and access control conditions
    if (search) {
      const searchConditions = this.buildSearchConditions(search);

      // Create AND condition: (search conditions) AND (access conditions) AND (additional filters)
      const andConditions: Array<Record<string, unknown>> = [{ OR: accessConditions }];

      // Handle different search condition formats
      if (searchConditions.length === 1 && searchConditions[0]?.AND) {
        // Multi-word search returns AND conditions - add them directly
        andConditions.unshift(...searchConditions);
      } else {
        // Single-word search returns OR conditions
        andConditions.unshift({ OR: searchConditions });
      }

      // Add additional filters if any
      if (Object.keys(additionalFilters).length > 0) {
        andConditions.push(additionalFilters);
      }

      where.AND = andConditions;
    } else {
      // If no search, combine access control with additional filters
      if (Object.keys(additionalFilters).length > 0) {
        where.AND = [{ OR: accessConditions }, additionalFilters];
      } else {
        where.OR = accessConditions;
      }
    }

    return where;
  }
}
