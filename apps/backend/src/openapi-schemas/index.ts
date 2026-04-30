/**
 * Barrel exports for all schema-related modules
 *
 * This module provides centralized access to all OpenAPI/Swagger configuration,
 * schema registration, and utility functions for the Memoriaali V2 API.
 */

// Core utilities and Zod extensions
export * from './zod.utils';

// Schema registry and component generation
export * from './components.responses';
export * from './components.schemas';

// Swagger configuration
export * from '../../swagger.config';

// Re-export commonly used items for convenience
export { generateComponents, getRegisteredSchemas, registry } from './components.schemas';

export { generateSwaggerSpec, redocOptions, swaggerUiOptions } from '../../swagger.config';

export {
  createApiResponseSchema,
  createPaginatedResponseSchema,
  createPaginationSchema,
  culturalHeritageExamples,
  culturalSensitivitySchema,
  errorResponseSchema,
  makeNullableFieldsOptional,
  omitSystemFields,
  paginationSchema,
  submissionStatusSchema,
  userRoleSchema,
  validationErrorResponseSchema,
  z,
} from './zod.utils';
