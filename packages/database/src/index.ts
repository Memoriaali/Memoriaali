/**
 * Database package entrypoint
 * - Re-exports Prisma generated client types
 * - Re-exports field encryption extension for consumer integration
 * - Exposes pagination services and generated sensitive-field utilities
 */

// =============================================
// FIELD ENCRYPTION EXTENSION
// =============================================

// Re-export the prisma-field-encryption extension for use in app clients
export { fieldEncryptionExtension } from 'prisma-field-encryption';

// Re-export generated Prisma types for API development
export * from '../generated/client/index.js';
// Explicitly export PrismaClient type for better DX
export type { PrismaClient } from '../generated/client/index.js';

// =============================================
// SECURE CLIENT FACTORIES
// =============================================
// Expose secure Prisma client factories for application usage
export { createSecureClient, validateSecurityConfiguration } from './secure-client';

// =============================================
// GENERATED SENSITIVE FIELD UTILITIES
// =============================================
export {
  adminFieldSelectors,
  safeFieldSelectors,
} from '../generated/sensitive-fields/field-selectors.js';
export {
  createSecureSelector,
  getSensitiveFields,
  isSensitiveField,
  omitSensitiveFields,
  pickSafeFields,
} from '../generated/sensitive-fields/security-utils.js';

// =============================================
// PAGINATION SERVICES
// =============================================

// Export pagination service
export { PrismaPaginationService } from './pagination/prisma-pagination.service';
export type {
  CursorPaginationOptions,
  OffsetPaginationOptions,
} from './pagination/prisma-pagination.service';
