/**
 * DATABASE JSON FIELD SCHEMAS
 * ============================
 *
 * This module exports Zod validation schemas specifically designed for database
 * JSON fields. These schemas provide type-safe validation for complex data
 * structures stored as JSON in the database.
 *
 * Purpose:
 * - Validates JSON field content in database models
 * - Ensures type safety between database JSON fields and application code
 * - Provides reusable schemas for generated database types
 *
 * Usage:
 * These schemas are used by the code generation pipeline to create type-safe
 * database access patterns. They ensure that JSON field content matches
 * expected structures and validation rules.
 *
 * Architecture:
 * This module is framework-agnostic and contains no database-specific imports.
 * It focuses purely on data validation and type definitions.
 */

// Document metadata schemas
export {
  ArchivalMetadataSchema,
  DocumentMetadataSchema,
  DublinCoreMetadataSchema,
  EadMetadataSchema,
  IrisSchema,
  LegacyFieldsSchema,
  LinkedDataSchema,
  TechnicalMetadataSchema,
  VisibilityControlSchema,
} from './metadata';

// Document quality schemas
export {
  AiModifiedFieldsArraySchema,
  DocumentErrorTypeSchema,
  ErrorPageNumbersArraySchema,
  ErrorTypesArraySchema,
  PluginsEnabledSchema,
  SimplePluginsEnabledSchema,
} from './quality';

// Oral history schemas
export {
  InterviewQuestionSchema,
  KeywordsArraySchema,
  KeywordSchema,
  QuestionsArraySchema,
  SimpleKeywordsArraySchema,
  SimpleQuestionsArraySchema,
} from './oralHistory';

// User group schemas
export {
  PermissionSchema,
  RoleDefinitionSchema,
  SimpleUserGroupMetadataSchema,
  UserGroupMetadataSchema,
} from './userGroup';

// User validation schemas
export {
  AddressSchema,
  CompanyNameSchema,
  EmailSchema,
  NameSchema,
  OptionalAddressSchema,
  OptionalCompanyNameSchema,
  OptionalEmailSchema,
  OptionalNameSchema,
  OptionalPhoneSchema,
  PhoneSchema,
  UsernameSchema,
} from './user-validation';

// Request state schema
import { z } from 'zod';

/**
 * Request State Schema
 *
 * Validation schema for research request approval workflow states
 */
export const RequestStateSchema = z.enum(['PENDING', 'APPROVED', 'REJECTED']);
