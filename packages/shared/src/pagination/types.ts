/**
 * Pagination Types for Memoriaali API
 *
 * This module defines the core pagination interfaces following RFC 8288 (Web Linking) standards.
 * These types provide a consistent contract for pagination across all API endpoints, ensuring
 * type safety and standards compliance.
 *
 * The pagination system supports both cursor-based and offset-based approaches, allowing
 * optimal performance choices based on use case requirements.
 */

/**
 * Parameters for pagination requests.
 *
 * This interface defines the contract for pagination parameters, supporting both
 * cursor-based (recommended) and offset-based pagination patterns.
 *
 * Invariants:
 * - limit must always be between 1 and 100 inclusive when provided
 * - cursor and page parameters are mutually exclusive
 * - cursor must be an opaque token when provided
 * - page must be a positive integer when provided
 *
 * @example
 * // Cursor-based pagination
 * const params: PaginationParams = { limit: 20, cursor: 'abc123' };
 *
 * // Offset-based pagination
 * const params: PaginationParams = { limit: 50, page: 2 };
 */
export interface PaginationParams {
  /** Maximum number of items per page (1-100, default: 20) */
  limit?: number;

  /** Opaque cursor token for cursor-based pagination */
  cursor?: string;

  /** Page number for offset-based pagination (starts from 1) */
  page?: number;
}

/**
 * Generic pagination response wrapper.
 *
 * This interface provides a consistent structure for all paginated API responses,
 * following RFC 8288 Web Linking standards for navigation links.
 *
 * Invariants:
 * - data array contains the requested items for current page
 * - pagination metadata accurately reflects current state
 * - links follow RFC 8288 relationship standards
 * - generic type T represents the item type being paginated
 *
 * @template T The type of items being paginated
 *
 * @example
 * const response: PaginationResponse<User> = {
 *   data: [user1, user2, user3],
 *   pagination: { limit: 20, totalCount: 150, hasNextPage: true, hasPreviousPage: false },
 *   links: { self: '/users?limit=20', next: '/users?cursor=xyz&limit=20' }
 * };
 */
export interface PaginationResponse<T> {
  /** Array of items for the current page */
  data: T[];

  /** Metadata about pagination state and navigation */
  pagination: PaginationMetadata;

  /** RFC 8288 compliant navigation links */
  links: PaginationLinks;
}

/**
 * Metadata describing the current pagination state.
 *
 * Provides comprehensive information about the current page position,
 * total available data, and navigation capabilities.
 *
 * Invariants:
 * - limit is always a positive integer between 1 and 100
 * - totalCount is always non-negative
 * - hasNextPage/hasPreviousPage accurately reflect navigation state
 * - currentPage and totalPages are only present for offset-based pagination
 * - when totalPages is present, currentPage must be <= totalPages
 *
 * @example
 * // Cursor-based pagination metadata
 * const metadata: PaginationMetadata = {
 *   limit: 20,
 *   totalCount: 150,
 *   hasNextPage: true,
 *   hasPreviousPage: false
 * };
 *
 * // Offset-based pagination metadata
 * const metadata: PaginationMetadata = {
 *   limit: 20,
 *   totalCount: 150,
 *   hasNextPage: true,
 *   hasPreviousPage: true,
 *   currentPage: 3,
 *   totalPages: 8
 * };
 */
export interface PaginationMetadata {
  /** Number of items requested per page */
  limit: number;

  /** Total number of items available across all pages */
  totalCount: number;

  /** Whether more items are available after current page */
  hasNextPage: boolean;

  /** Whether items are available before current page */
  hasPreviousPage: boolean;

  /** Current page number (offset pagination only, starts from 1) */
  currentPage?: number;

  /** Total number of pages available (offset pagination only) */
  totalPages?: number;
}

/**
 * RFC 8288 compliant navigation links for pagination.
 *
 * Provides standard relationship-based links for pagination navigation,
 * following Web Linking RFC 8288 specifications.
 *
 * Invariants:
 * - self link is always present and points to current page
 * - first link points to the first page when available
 * - prev link is present only when hasPreviousPage is true
 * - next link is present only when hasNextPage is true
 * - last link is optional (expensive to calculate for large datasets)
 * - all URLs are properly encoded and include necessary parameters
 *
 * @example
 * const links: PaginationLinks = {
 *   self: 'https://api.example.com/users?cursor=current&limit=20',
 *   first: 'https://api.example.com/users?limit=20',
 *   prev: 'https://api.example.com/users?cursor=previous&limit=20',
 *   next: 'https://api.example.com/users?cursor=next&limit=20',
 *   last: 'https://api.example.com/users?cursor=last&limit=20'
 * };
 */
export interface PaginationLinks {
  /** Link to the current page */
  self: string;

  /** Link to the first page (optional) */
  first?: string;

  /** Link to the previous page (present only if hasPreviousPage is true) */
  prev?: string;

  /** Link to the next page (present only if hasNextPage is true) */
  next?: string;

  /** Link to the last page (optional, expensive for large datasets) */
  last?: string;
}
