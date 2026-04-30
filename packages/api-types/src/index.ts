/**
 * @memoriaali/api-types
 *
 * API contracts and type definitions for the Memoriaali project.
 * This package provides shared types and validation schemas for both frontend and backend.
 */

// Package metadata
export const PACKAGE_NAME = '@memoriaali/api-types';
export const VERSION = '2.0.0';

// Export ALL generated Zod schemas and types (single source of truth)
// This includes all Prisma models, enums, and their TypeScript types
export * from './generated';

// Export custom schemas with namespace to avoid conflicts
// Re-export the generated DocumentErrorTypeSchema since it's the enum from Prisma
export * as CustomSchemas from './schemas';

export * from './utils';
