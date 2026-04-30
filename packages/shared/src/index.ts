/**
 * @memoriaali/shared
 *
 * Shared utilities and types for the Memoriaali project.
 * This package provides cross-environment types and utilities for pagination,
 * validation, and other common functionality.
 */

// Export pagination types and interfaces
export type {
  PaginationLinks,
  PaginationMetadata,
  PaginationParams,
  PaginationResponse,
} from './pagination/types';

// Export pagination validation schemas
export {
  PaginationMetadataSchema,
  PaginationParamsSchema,
  UserListQuerySchema,
  validatePaginationParams,
  validateUserListQuery,
} from './pagination/validation';

// Export pagination utility functions and types
export {
  buildPaginationUrl,
  calculateOffset,
  calculateTotalPages,
  decodeCursor,
  encodeCursor,
  isValidPage,
} from './pagination/utils';

export type { CursorData } from './pagination/utils';

// Export pagination constants and configuration
export {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  MIN_LIMIT,
  SORT_ORDER,
  USER_ROLES,
  USER_STATUS,
} from './pagination';

// Export security utilities
export { PasswordService, VerificationService } from './security';

// Shared user types to eliminate duplication
export type UserListItem = {
  id: string;
  username: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  accountType: string;
  isActivated: boolean;
  streetAddress: string | null;
  postalCode: string | null;
  postOffice: string | null;
  telephone: string | null;
  profession: string | null;
  companyName: string | null;
  companyEmail: string | null;
  companyTelephone: string | null;
  companyContactPerson: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdById: string | null; // Admin audit trail
  updatedById: string | null; // Admin audit trail
};
