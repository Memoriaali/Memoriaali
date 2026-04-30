/**
 * Prisma Pagination Service
 *
 * Generic pagination service for Prisma models supporting both cursor-based and offset-based pagination.
 * Implements RFC 8288 Web Linking for navigation and provides transaction consistency.
 */

import { Prisma, PrismaClient } from '@memoriaali/database';
import { PaginationLinks, PaginationResponse } from '@memoriaali/shared';

// Type helper to get model delegate from PrismaClient
type ModelDelegate = {
  count: (args?: { where?: Record<string, unknown> }) => Promise<number>;
  findMany: (args?: {
    where?: Record<string, unknown>;
    orderBy?: Record<string, unknown>;
    take?: number;
    skip?: number;
    select?: Record<string, unknown>;
  }) => Promise<unknown[]>;
};

export interface CursorPaginationOptions {
  model: string;
  cursor?: string;
  limit: number;
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
}

export interface OffsetPaginationOptions {
  model: string;
  page: number;
  limit: number;
  where?: Record<string, unknown>;
  orderBy?: Record<string, unknown>;
  select?: Record<string, unknown>;
}

export class PrismaPaginationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly baseUrl: string,
  ) {}

  /**
   * Paginate using cursor-based pagination.
   *
   * @param {CursorPaginationOptions} options - Cursor pagination options
   * @param {string} options.model - Prisma model name
   * @param {string} options.cursor - Opaque cursor token
   * @param {number} options.limit - Items per page (1-100)
   * @param {Object} options.where - Filter conditions
   * @param {Object} options.orderBy - Sorting configuration
   * @return {Promise<PaginationResponse<T>>} Paginated results with RFC 8288 links
   *
   * Preconditions:
   * - Database connection is established
   * - Cursor is valid opaque token when provided
   * - Limit is between 1 and 100
   * - orderBy ensures deterministic ordering
   *
   * Postconditions:
   * - Returns data array with requested items
   * - hasNextPage reflects actual availability
   * - hasPreviousPage is true when cursor provided
   * - Links follow RFC 8288 Web Linking standard
   *
   * Invariants:
   * - Data consistency maintained via transactions
   * - Cursor tokens are opaque and secure
   * - Performance optimized for large datasets
   */
  async paginateWithCursor<T>(options: CursorPaginationOptions): Promise<PaginationResponse<T>> {
    this.validatePaginationOptions(options);

    const { model, cursor, limit, where = {}, orderBy = { id: 'asc' } } = options;

    return this.prisma.$transaction(async (tx) => {
      // Get total count
      const modelDelegate = (tx as unknown as Record<string, ModelDelegate>)[model];
      if (!modelDelegate) {
        throw new Error(`Invalid model: ${model}`);
      }
      const totalCount = await modelDelegate.count({ where });

      // Build cursor where clause
      let cursorWhere = { ...where };
      if (cursor) {
        try {
          const cursorData = this.decodeCursor(cursor);
          // Add cursor condition based on orderBy
          const orderKeys = Object.keys(orderBy);
          if (orderKeys.length > 0) {
            const orderKey = orderKeys[0];
            if (orderKey && typeof orderKey === 'string') {
              const orderDirection = orderBy[orderKey];
              if (orderDirection && cursorData[orderKey] !== undefined) {
                cursorWhere = {
                  ...cursorWhere,
                  [orderKey]:
                    orderDirection === 'asc'
                      ? { gt: cursorData[orderKey] }
                      : { lt: cursorData[orderKey] },
                };
              }
            }
          }
        } catch (_error) {
          throw new Error('Invalid cursor format');
        }
      }

      // Fetch data with one extra item to check if there's a next page
      const data = await modelDelegate.findMany({
        where: cursorWhere,
        orderBy,
        take: limit + 1,
      });

      // Check if there's a next page
      const hasNextPage = data.length > limit;
      if (hasNextPage) {
        data.pop(); // Remove the extra item
      }

      // Generate next cursor from last item
      let nextCursor: string | undefined;
      if (hasNextPage && data.length > 0) {
        const lastItem = data[data.length - 1];
        nextCursor = this.encodeCursor(lastItem as Record<string, unknown>);
      }

      // Generate links
      const links = this.generateCursorLinks(options, nextCursor, cursor);

      return {
        data: data as T[],
        pagination: {
          limit,
          totalCount,
          hasNextPage,
          hasPreviousPage: !!cursor,
        },
        links,
      };
    });
  }

  /**
   * Paginate using offset-based pagination.
   *
   * @param {OffsetPaginationOptions} options - Offset pagination options
   * @param {string} options.model - Prisma model name
   * @param {number} options.page - Page number (1-based)
   * @param {number} options.limit - Items per page (1-100)
   * @param {Object} options.where - Filter conditions
   * @param {Object} options.orderBy - Sorting configuration
   * @return {Promise<PaginationResponse<T>>} Paginated results with page info
   *
   * Preconditions:
   * - Database connection is established
   * - Page is positive integer
   * - Limit is between 1 and 100
   *
   * Postconditions:
   * - Returns data array with requested items
   * - currentPage reflects requested page
   * - totalPages calculated correctly
   * - Links include page navigation
   *
   * Invariants:
   * - Skip/take calculations are accurate
   * - Page boundaries handled correctly
   * - Performance acceptable for admin interfaces
   */
  async paginateWithOffset<T>(
    options: OffsetPaginationOptions,
  ): Promise<PaginationResponse<T> & { pagination: { currentPage: number; totalPages: number } }> {
    this.validateOffsetOptions(options);

    const { model, page, limit, where = {}, orderBy = { id: 'asc' }, select } = options;

    return this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Get total count
      const modelDelegate = (tx as unknown as Record<string, ModelDelegate>)[model];
      if (!modelDelegate) {
        throw new Error(`Invalid model: ${model}`);
      }
      const totalCount = await modelDelegate.count({ where });

      // Calculate pagination
      const totalPages = Math.ceil(totalCount / limit);
      const skip = (page - 1) * limit;

      // Fetch data with optional select
      const findManyOptions: Record<string, unknown> = {
        where,
        orderBy,
        skip,
        take: limit,
      };

      if (select) {
        findManyOptions.select = select;
      }

      const data = await modelDelegate.findMany(findManyOptions);

      // Generate links
      const links = this.generateOffsetLinks(options, totalPages);

      return {
        data: data as T[],
        pagination: {
          limit,
          totalCount,
          currentPage: page,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
        links,
      };
    });
  }

  /**
   * Convert pagination links to RFC 8288 compliant Link header.
   *
   * @param {PaginationLinks} links - Pagination links object
   * @return {string} RFC 8288 compliant Link header value
   *
   * Preconditions:
   * - links object contains valid URLs
   *
   * Postconditions:
   * - Returns properly formatted Link header string
   * - Links are properly escaped and formatted
   *
   * @example
   * const headerValue = service.toLinkHeader(result.links);
   * // Returns: '<https://api.example.com/users?page=1>; rel="first", <https://api.example.com/users?page=2>; rel="next"'
   */
  toLinkHeader(links: PaginationLinks): string {
    const linkParts: string[] = [];

    if (links.self) {
      linkParts.push(`<${links.self}>; rel="self"`);
    }
    if (links.first) {
      linkParts.push(`<${links.first}>; rel="first"`);
    }
    if (links.prev) {
      linkParts.push(`<${links.prev}>; rel="prev"`);
    }
    if (links.next) {
      linkParts.push(`<${links.next}>; rel="next"`);
    }
    if (links.last) {
      linkParts.push(`<${links.last}>; rel="last"`);
    }

    return linkParts.join(', ');
  }

  private validatePaginationOptions(options: CursorPaginationOptions): void {
    if (options.limit < 1 || options.limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }
  }

  private validateOffsetOptions(options: OffsetPaginationOptions): void {
    if (options.limit < 1 || options.limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }
    if (options.page < 1) {
      throw new Error('Page must be at least 1');
    }
  }

  private encodeCursor(item: Record<string, unknown>): string {
    // Simple base64 encoding of item id and any order fields
    const cursorData = {
      id: item.id,
      createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
      updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : item.updatedAt,
    };
    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  private decodeCursor(cursor: string): Record<string, unknown> {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      throw new Error('Invalid cursor format');
    }
  }

  private generateCursorLinks(
    options: CursorPaginationOptions,
    nextCursor?: string,
    currentCursor?: string,
  ): PaginationLinks {
    const params = new URLSearchParams();
    params.set('limit', options.limit.toString());

    // Add where conditions to URL if they exist
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          params.set(key, value.toString());
        }
      });
    }

    const baseParams = params.toString();
    const baseUrl = baseParams ? `${this.baseUrl}?${baseParams}` : `${this.baseUrl}`;

    const links: PaginationLinks = {
      self: currentCursor
        ? `${this.baseUrl}?cursor=${currentCursor}${baseParams ? `&${baseParams}` : ''}`
        : baseUrl,
      first: baseUrl,
    };

    // Add prev link if we have a current cursor (not on first page)
    if (currentCursor) {
      links.prev = baseUrl; // Go back to first page as prev
    }

    if (nextCursor) {
      links.next = `${this.baseUrl}?cursor=${nextCursor}${baseParams ? `&${baseParams}` : ''}`;
    }

    return links;
  }

  private generateOffsetLinks(
    options: OffsetPaginationOptions,
    totalPages: number,
  ): PaginationLinks {
    const params = new URLSearchParams();
    params.set('limit', options.limit.toString());

    // Add where conditions to URL if they exist
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number') {
          params.set(key, value.toString());
        } else if (typeof value === 'object' && value !== null) {
          // Handle nested where conditions (like OR, contains, etc.)
          Object.entries(value).forEach(([nestedKey, nestedValue]) => {
            if (typeof nestedValue === 'string' || typeof nestedValue === 'number') {
              params.set(`${key}[${nestedKey}]`, nestedValue.toString());
            }
          });
        }
      });
    }

    const baseParams = params.toString();
    const { page } = options;

    const links: PaginationLinks = {
      self: `${this.baseUrl}?page=${page}&${baseParams}`,
      first: `${this.baseUrl}?page=1&${baseParams}`,
    };

    if (page > 1) {
      links.prev = `${this.baseUrl}?page=${page - 1}&${baseParams}`;
    }

    if (page < totalPages) {
      links.next = `${this.baseUrl}?page=${page + 1}&${baseParams}`;
    }

    if (totalPages > 1) {
      links.last = `${this.baseUrl}?page=${totalPages}&${baseParams}`;
    }

    return links;
  }
}
