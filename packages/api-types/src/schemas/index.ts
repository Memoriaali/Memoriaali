/**
 * API TYPES - SCHEMAS
 * ===================
 *
 * This module serves as the central export point for all Zod schemas used throughout
 * the Memoriaali system. It provides type-safe validation for API requests, responses,
 * and database JSON fields.
 *
 * Architecture Overview:
 * - Document metadata schemas (archival standards compliant)
 * - Document quality tracking schemas (error detection & AI modifications)
 * - Oral history schemas (interview questions & keywords)
 * - User group schemas (roles & permissions)
 * - Common validation utilities
 *
 * The schemas are shared between frontend and backend applications to ensure
 * consistent data validation and type safety across the entire system.
 *
 * Standards Compliance:
 * - Dublin Core Metadata Terms (DCMI-Terms)
 * - EAD3 (Encoded Archival Description)
 * - Finnish National Archives specifications
 */

// Re-export all schemas for convenient importing
// This automatically exports everything from each module
export * from './comment';
export * from './database-schemas';
export * from './metadata';
export * from './metadata-suggestion';
export * from './oralHistory';
export * from './quality';
export * from './research-request';
export * from './security';
export * from './sip';
export * from './user-validation';
export * from './userGroup';
