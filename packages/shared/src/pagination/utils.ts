/**
 * Pagination Utility Functions
 *
 * This module provides pure utility functions for pagination calculations, cursor encoding/decoding,
 * and URL parameter building. All functions are stateless and follow functional programming principles,
 * ensuring predictable behavior and easy testing.
 *
 * Functions follow the single responsibility principle, with each function handling one specific
 * aspect of pagination logic.
 */

/**
 * Calculates offset for page-based pagination.
 *
 * @param {number} page - Page number (1-based indexing)
 * @param {number} pageSize - Number of items per page
 * @return {number} Zero-based offset for database queries
 *
 * Preconditions:
 * - page must be a positive integer (>= 1)
 * - pageSize must be a positive integer (>= 1)
 *
 * Postconditions:
 * - returns the correct offset for database skip operations
 * - result is always non-negative
 *
 * Invariants:
 * - function is pure (no side effects)
 * - calculation is deterministic for same inputs
 * - result follows formula: (page - 1) * pageSize
 *
 * @example
 * const offset = calculateOffset(1, 20); // Returns: 0 (first page)
 * const offset = calculateOffset(3, 20); // Returns: 40 (third page)
 *
 * @example
 * // For database query
 * const page = 5;
 * const limit = 25;
 * const skip = calculateOffset(page, limit); // Returns: 100
 */
export const calculateOffset = (page: number, pageSize: number): number => {
  return (page - 1) * pageSize;
};

/**
 * Calculates total number of pages for given total count and page size.
 *
 * @param {number} totalCount - Total number of items across all pages
 * @param {number} pageSize - Number of items per page
 * @return {number} Total number of pages needed to display all items
 *
 * Preconditions:
 * - totalCount must be a non-negative integer (>= 0)
 * - pageSize must be a positive integer (>= 1)
 *
 * Postconditions:
 * - returns minimum number of pages needed to contain all items
 * - result is always positive when totalCount > 0
 * - returns 0 when totalCount is 0
 *
 * Invariants:
 * - function is pure (no side effects)
 * - uses ceiling division to ensure all items fit
 * - calculation follows formula: Math.ceil(totalCount / pageSize)
 *
 * @example
 * const pages = calculateTotalPages(100, 20); // Returns: 5
 * const pages = calculateTotalPages(99, 20);  // Returns: 5 (partial last page)
 * const pages = calculateTotalPages(0, 20);   // Returns: 0 (no items)
 */
export const calculateTotalPages = (totalCount: number, pageSize: number): number => {
  if (totalCount === 0) return 0;
  return Math.ceil(totalCount / pageSize);
};

/**
 * Determines if there is a next page available.
 *
 * Preconditions:
 * - currentPage must be positive integer
 * - totalPages must be non-negative integer
 *
 * Postconditions:
 * - Returns true if more pages exist after current page
 * - Returns false if current page is the last page
 *
 * Invariants:
 * - hasNextPage = currentPage < totalPages
 * - Never true when totalPages is 0
 */
export const hasNextPage = (currentPage: number, totalPages: number): boolean => {
  if (currentPage < 1) {
    throw new Error('Current page must be at least 1');
  }

  if (totalPages < 0) {
    throw new Error('Total pages cannot be negative');
  }

  return currentPage < totalPages;
};

/**
 * Determines if there is a previous page available.
 *
 * Preconditions:
 * - currentPage must be positive integer
 *
 * Postconditions:
 * - Returns true if pages exist before current page
 * - Returns false if current page is the first page
 *
 * Invariants:
 * - hasPreviousPage = currentPage > 1
 * - Always false for page 1
 */
export const hasPreviousPage = (currentPage: number): boolean => {
  if (currentPage < 1) {
    throw new Error('Current page must be at least 1');
  }

  return currentPage > 1;
};

/**
 * Enhanced cursor data interface for bidirectional pagination.
 * Contains all necessary state for proper forward/backward navigation.
 *
 * Invariants:
 * - id is always present and represents the cursor position
 * - direction indicates the intended navigation direction
 * - sortField and sortOrder preserve original query context
 * - timestamp ensures cursor validity and prevents infinite loops
 */
export interface CursorData {
  /** Unique identifier for cursor position */
  id: string;

  /** Navigation direction from this cursor */
  direction: 'forward' | 'backward';

  /** Original sort field for maintaining consistency */
  sortField: string;

  /** Original sort order for proper direction handling */
  sortOrder: 'asc' | 'desc';

  /** Cursor creation timestamp for validation */
  timestamp: number;
}

/**
 * Encodes cursor data into an opaque, URL-safe token for bidirectional pagination.
 *
 * @param {CursorData} data - Cursor data containing position and navigation context
 * @return {string} Base64-encoded opaque cursor token
 *
 * Preconditions:
 * - data.id is non-empty string
 * - data.direction is valid navigation direction
 * - data.sortField is non-empty string
 * - data.sortOrder is valid sort direction
 *
 * Postconditions:
 * - Returns URL-safe base64 encoded string
 * - Token contains all necessary navigation state
 * - Token is opaque and secure for client usage
 *
 * Invariants:
 * - Generated tokens are deterministic for same input
 * - Tokens are URL-safe without additional encoding
 * - Token size is reasonable for HTTP headers
 *
 * @throws {Error} When required cursor data is missing
 * @throws {Error} When data contains invalid values
 *
 * @example
 * const cursor = encodeCursor({
 *   id: 'user_123',
 *   direction: 'forward',
 *   sortField: 'createdAt',
 *   sortOrder: 'asc',
 *   timestamp: Date.now()
 * });
 * // Returns: 'eyJpZCI6InVzZXJfMTIzIiwiZGlyZWN0aW9uIjoiZm9yd2FyZCIsInNvcnRGaWVsZCI6ImNyZWF0ZWRBdCIsInNvcnRPcmRlciI6ImFzYyIsInRpbWVzdGFtcCI6MTcwOTk5OTk5OTk5OX0='
 */
export const encodeCursor = (data: CursorData): string => {
  // Validate required fields
  if (!data.id || data.id.trim().length === 0) {
    throw new Error('Cursor data must include non-empty id');
  }

  if (!data.direction || !['forward', 'backward'].includes(data.direction)) {
    throw new Error('Cursor data must include valid direction (forward|backward)');
  }

  if (!data.sortField || data.sortField.trim().length === 0) {
    throw new Error('Cursor data must include non-empty sortField');
  }

  if (!data.sortOrder || !['asc', 'desc'].includes(data.sortOrder)) {
    throw new Error('Cursor data must include valid sortOrder (asc|desc)');
  }

  // Add timestamp if not provided
  const cursorData: CursorData = {
    ...data,
    timestamp: data.timestamp || Date.now(),
  };

  // Encode to base64 for opaque, URL-safe token
  const jsonString = JSON.stringify(cursorData);
  return Buffer.from(jsonString, 'utf8').toString('base64url');
};

/**
 * Decodes an opaque cursor token back to navigation data for bidirectional pagination.
 *
 * @param {string} cursor - Base64-encoded cursor token
 * @return {CursorData} Decoded cursor data with navigation context
 *
 * Preconditions:
 * - cursor is non-empty string
 * - cursor is valid base64url encoded JSON
 * - cursor contains required CursorData fields
 *
 * Postconditions:
 * - Returns valid CursorData object
 * - All navigation state is preserved
 * - Data is validated for consistency
 *
 * Invariants:
 * - Decoding is inverse of encoding operation
 * - Invalid tokens throw descriptive errors
 * - Security: no code execution from cursor content
 *
 * @throws {Error} When cursor format is invalid
 * @throws {Error} When cursor contains invalid data
 * @throws {Error} When cursor is expired (if validation enabled)
 *
 * @example
 * const data = decodeCursor('eyJpZCI6InVzZXJfMTIzIiwiZGlyZWN0aW9uIjoiZm9yd2FyZCJ9');
 * // Returns: { id: 'user_123', direction: 'forward', sortField: 'createdAt', ... }
 */
export const decodeCursor = (cursor: string): CursorData => {
  if (!cursor || cursor.trim().length === 0) {
    throw new Error('Cursor cannot be empty');
  }

  try {
    // Decode from base64url
    const jsonString = Buffer.from(cursor, 'base64url').toString('utf8');
    const data = JSON.parse(jsonString);

    // Validate decoded structure
    if (!data || typeof data !== 'object') {
      throw new Error('Cursor must contain valid object data');
    }

    if (!data.id || typeof data.id !== 'string') {
      throw new Error('Cursor must contain valid id field');
    }

    if (!data.direction || !['forward', 'backward'].includes(data.direction)) {
      throw new Error('Cursor must contain valid direction field');
    }

    if (!data.sortField || typeof data.sortField !== 'string') {
      throw new Error('Cursor must contain valid sortField');
    }

    if (!data.sortOrder || !['asc', 'desc'].includes(data.sortOrder)) {
      throw new Error('Cursor must contain valid sortOrder');
    }

    // Optional: Validate timestamp for cursor expiration
    if (data.timestamp && typeof data.timestamp === 'number') {
      const now = Date.now();
      const cursorAge = now - data.timestamp;
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      if (cursorAge > maxAge) {
        throw new Error('Cursor has expired');
      }
    }

    return data as CursorData;
  } catch (error) {
    if (error instanceof Error) {
      // Re-throw validation errors with context
      throw new Error(`Invalid cursor format: ${error.message}`);
    }
    throw new Error('Invalid cursor format: Unable to decode cursor data');
  }
};

/**
 * Builds URL with pagination parameters for navigation links.
 *
 * @param {string} baseUrl - Base URL without query parameters
 * @param {Record<string, string | number | boolean | undefined>} params - Query parameters to append
 * @return {string} Complete URL with encoded query parameters
 *
 * Preconditions:
 * - baseUrl must be a valid URL string
 * - params object values must be serializable to URL query parameters
 *
 * Postconditions:
 * - returns properly encoded URL with query parameters
 * - undefined values are filtered out
 * - special characters are URL encoded
 *
 * Invariants:
 * - function is pure (no side effects)
 * - URL encoding follows web standards
 * - empty params object returns baseUrl unchanged
 *
 * @example
 * const url = buildPaginationUrl('https://api.example.com/users', {
 *   limit: 20,
 *   cursor: 'abc123',
 *   search: 'john doe'
 * });
 * // Returns: 'https://api.example.com/users?limit=20&cursor=abc123&search=john%20doe'
 *
 * @example
 * const url = buildPaginationUrl('/api/users', { page: 2, limit: 50 });
 * // Returns: '/api/users?page=2&limit=50'
 */
export const buildPaginationUrl = (
  baseUrl: string,
  params: Record<string, string | number | boolean | undefined>,
): string => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * Validates pagination boundaries and adjusts if necessary.
 *
 * Preconditions:
 * - page must be positive integer when provided
 * - limit must be positive integer when provided
 * - maxLimit must be positive integer
 *
 * Postconditions:
 * - Returns normalized pagination parameters within valid ranges
 * - Page is set to 1 if invalid or missing
 * - Limit is constrained to maxLimit boundary
 *
 * Invariants:
 * - Result page is always >= 1
 * - Result limit is always between 1 and maxLimit
 * - Default values are applied for missing parameters
 */
export const normalizePaginationParams = (
  params: {
    page?: number;
    limit?: number;
  },
  maxLimit: number = 100,
): { page: number; limit: number } => {
  if (maxLimit < 1) {
    throw new Error('Max limit must be at least 1');
  }

  const page = Math.max(1, Math.floor(params.page || 1));
  const limit = Math.max(1, Math.min(maxLimit, Math.floor(params.limit || 20)));

  return { page, limit };
};

/**
 * Validates if a page number is within valid range for given total pages.
 *
 * @param {number} page - Page number to validate (1-based)
 * @param {number} totalPages - Total number of available pages
 * @return {boolean} True if page is valid, false otherwise
 *
 * Preconditions:
 * - page must be a number
 * - totalPages must be a non-negative number
 *
 * Postconditions:
 * - returns true only if page is within valid range [1, totalPages]
 * - returns false for pages outside valid range
 * - handles edge case when totalPages is 0
 *
 * Invariants:
 * - function is pure (no side effects)
 * - validation is consistent for same inputs
 * - handles boundary conditions correctly
 *
 * @example
 * const isValid = isValidPage(3, 5);  // Returns: true
 * const isValid = isValidPage(0, 5);  // Returns: false (page too low)
 * const isValid = isValidPage(6, 5);  // Returns: false (page too high)
 * const isValid = isValidPage(1, 0);  // Returns: false (no pages available)
 */
export const isValidPage = (page: number, totalPages: number): boolean => {
  return page >= 1 && page <= totalPages && totalPages > 0;
};

/**
 * Calculates the range of items being displayed.
 *
 * Preconditions:
 * - currentPage must be positive integer
 * - pageSize must be positive integer
 * - totalCount must be non-negative integer
 *
 * Postconditions:
 * - Returns start and end positions for current page
 * - Positions are 1-based for user display
 * - Range respects total count boundaries
 *
 * Invariants:
 * - start <= end
 * - end never exceeds totalCount
 * - start is 0 when no items exist
 */
export const calculateItemRange = (
  currentPage: number,
  pageSize: number,
  totalCount: number,
): { start: number; end: number } => {
  if (currentPage < 1) {
    throw new Error('Current page must be at least 1');
  }

  if (pageSize < 1) {
    throw new Error('Page size must be at least 1');
  }

  if (totalCount < 0) {
    throw new Error('Total count cannot be negative');
  }

  if (totalCount === 0) {
    return { start: 0, end: 0 };
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(start + pageSize - 1, totalCount);

  return { start, end };
};
