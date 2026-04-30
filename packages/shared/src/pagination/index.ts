/**
 * Pagination Package for Memoriaali API
 *
 * This package provides a comprehensive, standards-compliant pagination system following
 * RFC 8288 (Web Linking) specifications. It supports both cursor-based and offset-based
 * pagination patterns, enabling optimal performance choices based on use case requirements.
 *
 * The package is environment-agnostic and can be used in both frontend and backend applications,
 * providing consistent pagination interfaces across the entire application stack.
 *
 * Key Features:
 * - RFC 8288 compliant navigation links
 * - Type-safe interfaces with generic support
 * - Comprehensive input validation with Zod v4
 * - Pure utility functions for calculations
 * - Support for both cursor and offset pagination patterns
 * - Built-in security through parameter validation
 *
 * Architecture:
 * - Types: Core TypeScript interfaces for pagination contracts
 * - Validation: Zod schemas for runtime input validation
 * - Utils: Pure functions for pagination calculations
 *
 * Invariants:
 * - All functions are pure with no side effects
 * - Type safety is maintained throughout the API surface
 * - Validation contracts are enforced at runtime
 * - RFC 8288 compliance is maintained for all link generation
 *
 * @example
 * // Basic usage with validation
 * import { validatePaginationParams, calculateOffset, PaginationResponse } from '@memoriaali/shared';
 *
 * const params = validatePaginationParams({ limit: 20, page: 2 });
 * const offset = calculateOffset(params.page, params.limit);
 *
 * @example
 * // User list with filtering
 * import { validateUserListQuery, UserListQueryOutput } from '@memoriaali/shared';
 *
 * const query = validateUserListQuery({
 *   limit: 25,
 *   search: 'admin',
 *   role: 'ADMIN',
 *   sortBy: 'createdAt',
 *   sortOrder: 'desc'
 * });
 */

// Core Type Definitions
export type {
  PaginationParams,
  PaginationResponse,
  PaginationMetadata,
  PaginationLinks,
} from './types';

// Validation Schemas and Types
export {
  PaginationParamsSchema,
  PaginationMetadataSchema,
  UserListQuerySchema,
  validatePaginationParams,
  validateUserListQuery,
} from './validation';

export type {
  PaginationParamsInput,
  PaginationParamsOutput,
  PaginationMetadataInput,
  PaginationMetadataOutput,
  UserListQueryInput,
  UserListQueryOutput,
} from './validation';

// Utility Functions
export {
  calculateOffset,
  calculateTotalPages,
  encodeCursor,
  decodeCursor,
  buildPaginationUrl,
  isValidPage,
} from './utils';

/**
 * Default pagination configuration values.
 *
 * These constants provide sensible defaults for pagination parameters
 * while maintaining consistency across the application.
 *
 * Invariants:
 * - DEFAULT_LIMIT is within valid range [1, 100]
 * - MAX_LIMIT enforces reasonable performance constraints
 * - MIN_LIMIT ensures at least one item per page
 *
 * @example
 * import { DEFAULT_LIMIT, MAX_LIMIT } from '@memoriaali/shared';
 *
 * const userLimit = userInput?.limit ?? DEFAULT_LIMIT;
 * const validLimit = Math.min(userLimit, MAX_LIMIT);
 */
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;
export const MIN_LIMIT = 1;

/**
 * Pagination sort directions for consistent ordering.
 *
 * These constants ensure type safety and consistency when specifying
 * sort order across different parts of the application.
 *
 * Invariants:
 * - Values match database sorting semantics
 * - Constants prevent typos in sort order specifications
 *
 * @example
 * import { SORT_ORDER } from '@memoriaali/shared';
 *
 * const query = {
 *   sortBy: 'createdAt',
 *   sortOrder: SORT_ORDER.DESC
 * };
 */
export const SORT_ORDER = {
  ASC: 'asc' as const,
  DESC: 'desc' as const,
} as const;

/**
 * User role constants for filtering and validation.
 *
 * These constants provide type-safe user role values that match
 * the database schema and validation rules.
 *
 * Invariants:
 * - Values match Prisma schema enum definitions
 * - Constants ensure consistency across API endpoints
 *
 * @example
 * import { USER_ROLES } from '@memoriaali/shared';
 *
 * const adminUsers = await getUsers({ role: USER_ROLES.ADMIN });
 */
export const USER_ROLES = {
  ADMIN: 'ADMIN' as const,
  USER: 'USER' as const,
  MODERATOR: 'MODERATOR' as const,
} as const;

/**
 * User status constants for filtering and validation.
 *
 * These constants provide type-safe user status values for
 * filtering user lists by account status.
 *
 * Invariants:
 * - Values match application business logic
 * - Constants prevent inconsistent status handling
 *
 * @example
 * import { USER_STATUS } from '@memoriaali/shared';
 *
 * const activeUsers = await getUsers({ status: USER_STATUS.ACTIVE });
 */
export const USER_STATUS = {
  ACTIVE: 'active' as const,
  INACTIVE: 'inactive' as const,
  PENDING: 'pending' as const,
} as const;
