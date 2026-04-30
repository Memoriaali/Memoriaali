import {
  CollectionSchema,
  CommentSchema,
  CommentStateSchema,
  DefaultQuestionSchema,
  DocumentSchema,
  GroupSchema,
  ResearchRequestSchema,
  UsersInGroupsSchema,
} from '@memoriaali/api-types/generated';
import { createSchema } from 'zod-openapi'; // Import for TypeScript type augmentation

import { CustomSchemas } from '@memoriaali/api-types';
import {
  OralHistoryListResponseSchema,
  OralHistoryWithUserSchema,
} from '../api/oralhistories/oralhistories.schemas';
import { UserPublicResponseSchema } from '../api/users/users.schemas';
import { sipSchemas } from './sip.schemas';
import {
  accountTypeSchema,
  culturalSensitivitySchema,
  errorResponseSchema,
  paginationSchema,
  submissionStatusSchema,
  userRoleSchema,
  validationErrorResponseSchema,
  z,
} from './zod.utils';

/**
 * Schema registry using zod-openapi (Zod v4 native approach)
 *
 * Instead of using OpenAPIRegistry which requires .openapi() method,
 * we collect schemas and generate OpenAPI components using createSchema().
 * This works with any Zod instance without requiring extendZodWithOpenApi.
 */
const schemaRegistry: Record<string, z.ZodTypeAny> = {};

/**
 * Register a schema for OpenAPI component generation
 *
 * Stores the schema in the registry for later OpenAPI generation.
 * Does NOT add .meta() since schemas may already have IDs set.
 */
const register = (name: string, schema: z.ZodTypeAny) => {
  // Store schema directly - don't add .meta() since it may already have an ID
  // which would cause "ID already exists in the registry" error
  schemaRegistry[name] = schema;
};

// Register common schemas
register('ErrorResponse', errorResponseSchema);
register('ValidationErrorResponse', validationErrorResponseSchema);
register('PaginationMetadata', paginationSchema);
register('CulturalSensitivity', culturalSensitivitySchema);
register('SubmissionStatus', submissionStatusSchema);
register('UserRole', userRoleSchema);
register('AccountType', accountTypeSchema);

// Create and register pagination links schema
const PaginationLinksSchema = z.object({
  self: z.url(),
  first: z.url().optional(),
  prev: z.url().optional(),
  next: z.url().optional(),
  last: z.url().optional(),
});

register('PaginationLinks', PaginationLinksSchema);

// Generated schemas from @memoriaali/api-types/generated
// These work with zod-openapi using native .meta()
register('Collection', CollectionSchema);
register('Document', DocumentSchema);
register('Group', GroupSchema);
register('ResearchRequest', ResearchRequestSchema);
register('UsersInGroups', UsersInGroupsSchema);
register('DefaultQuestion', DefaultQuestionSchema);
register('Comment', CommentSchema);
register('CommentState', CommentStateSchema);

// Create comment schemas for OpenAPI documentation
const CommentWithUserSchema = CommentSchema.extend({
  user: z.object({
    id: z.uuid(),
    username: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
  }),
  createdBy: z.object({
    id: z.uuid(),
    username: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
  }),
  updatedBy: z.object({
    id: z.string().uuid(),
    username: z.string(),
    firstName: z.string().nullable(),
    lastName: z.string().nullable(),
  }),
});

const CreateCommentSchema = z.object({
  documentId: z.uuid('Invalid document ID'),
  comment: z.string().min(1, 'Comment cannot be empty').max(10000, 'Comment too long'),
});

const UpdateCommentSchema = z.object({
  comment: z.string().min(1, 'Comment cannot be empty').max(10000, 'Comment too long').optional(),
  state: CommentStateSchema.optional(),
});

const CommentQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
  documentId: z.uuid().optional(),
  userId: z.uuid().optional(),
  state: CommentStateSchema.optional(),
  search: z.string().optional(),
});

const CommentListResponseSchema = z.object({
  status: z.literal('success'),
  data: z.object({
    comments: z.array(CommentWithUserSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      pages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }),
  }),
});

const CommentResponseSchema = z.object({
  status: z.literal('success'),
  data: CommentWithUserSchema,
});

const CreateCommentResponseSchema = z.object({
  status: z.literal('success'),
  data: CommentWithUserSchema,
  message: z.string(),
});

const UpdateCommentResponseSchema = z.object({
  status: z.literal('success'),
  data: CommentWithUserSchema,
  message: z.string(),
});

const DeleteCommentResponseSchema = z.object({
  status: z.literal('success'),
  message: z.string(),
});

// Register the created schemas
register('CommentWithUser', CommentWithUserSchema);
register('CreateComment', CreateCommentSchema);
register('UpdateComment', UpdateCommentSchema);
register('CommentQuery', CommentQuerySchema);
register('CommentListResponse', CommentListResponseSchema);
register('CommentResponse', CommentResponseSchema);
register('CreateCommentResponse', CreateCommentResponseSchema);
register('UpdateCommentResponse', UpdateCommentResponseSchema);
register('DeleteCommentResponse', DeleteCommentResponseSchema);

// Health check schemas
const healthStatusSchema = z.enum(['healthy', 'degraded', 'unhealthy']).meta({
  description: 'Health status indicator',
  example: 'healthy',
});

const databaseHealthSchema = z.object({
  status: z.enum(['connected', 'disconnected']).meta({
    description: 'Database connection status',
    example: 'connected',
  }),
  responseTime: z.number().positive().meta({
    description: 'Database response time in milliseconds',
    example: 15.25,
  }),
  userCount: z.number().int().min(0).optional().meta({
    description: 'Total number of users in the system',
    example: 150,
  }),
});

const systemHealthSchema = z.object({
  status: healthStatusSchema,
  uptime: z.number().positive().meta({
    description: 'System uptime in seconds',
    example: 86400.5,
  }),
  memoryUsage: z.object({
    used: z.number().positive().meta({
      description: 'Used memory in bytes',
      example: 52428800,
    }),
    total: z.number().positive().meta({
      description: 'Total available memory in bytes',
      example: 134217728,
    }),
    percentage: z.number().min(0).max(100).meta({
      description: 'Memory usage percentage',
      example: 39.1,
    }),
  }),
  version: z.string().meta({
    description: 'Application version',
    example: '2.0.0-dev',
  }),
});

const healthResponseSchema = z.object({
  status: healthStatusSchema,
  timestamp: z.iso.datetime().meta({
    description: 'ISO timestamp of the health check',
    example: '2024-01-15T10:30:00.000Z',
  }),
  services: z.object({
    database: databaseHealthSchema,
  }),
  version: z.string().meta({
    description: 'Application version',
    example: '2.0.0-dev',
  }),
  uptime: z.number().positive().meta({
    description: 'System uptime in seconds',
    example: 86400.5,
  }),
});

// Register health schemas
register('HealthStatus', healthStatusSchema);
register('DatabaseHealth', databaseHealthSchema);
register('SystemHealth', systemHealthSchema);
register('HealthResponse', healthResponseSchema);

// User schemas (basic structure - to be expanded)
const userBaseSchema = z.object({
  // User information
  id: z.string().uuid().meta({
    description: 'Unique user identifier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  }),
  username: z.string().min(1).max(100).meta({
    description: 'Unique username for login',
    example: 'maijakorhonen',
  }),
  email: z.string().email().meta({
    description: 'User email address',
    example: 'maija.korhonen@helsinki.fi',
  }),
  firstName: z.string().min(1).max(100).meta({
    description: 'User first name',
    example: 'Maija',
  }),
  lastName: z.string().min(1).max(100).meta({
    description: 'User last name',
    example: 'Korhonen',
  }),
  streetAddress: z.string().min(1).max(200).meta({
    description: 'User street address',
    example: 'Katuosoite 1 A 2',
  }),
  postalCode: z.string().min(1).max(20).meta({
    description: 'User postal code',
    example: '00100',
  }),
  postOffice: z.string().min(1).max(100).meta({
    description: 'User post office',
    example: 'Helsinki',
  }),
  telephone: z.string().min(1).max(20).meta({
    description: 'User phone number',
    example: '0451234567',
  }),
  profession: z.string().min(1).max(100).meta({
    description: 'User profession',
    example: 'Opettaja',
  }),
  roles: z.array(userRoleSchema),
  role: userRoleSchema.optional().meta({
    description: 'Role of the user',
    example: 'USER',
  }),
  accountType: z.array(accountTypeSchema),
  isActive: z.boolean().meta({
    description: 'Whether the user account is active',
    example: true,
  }),
  createdAt: z.iso.datetime().meta({
    description: 'Account creation timestamp',
    example: '2024-01-01T00:00:00.000Z',
  }),
  updatedAt: z.iso.datetime().meta({
    description: 'Last account update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  }),

  // Company information
  companyName: z.string().min(1).max(200).meta({
    description: 'Company name',
    example: 'Yritys Oy',
  }),
  companyEmail: z.string().min(1).max(100).meta({
    description: 'Company email address',
    example: 'yritys@posti.fi',
  }),
  companyTelephone: z.string().min(1).max(20).meta({
    description: 'Company phone number',
    example: '0451234567',
  }),
  companyContactPerson: z.string().min(1).max(100).meta({
    description: 'Company contact person',
    example: 'Matti Meikäläinen',
  }),
});

register('User', userBaseSchema);

// Submission schemas (basic structure - to be expanded)
const submissionBaseSchema = z.object({
  id: z.string().uuid().meta({
    description: 'Unique submission identifier',
    example: '550e8400-e29b-41d4-a716-446655440001',
  }),
  title: z.string().min(5).max(200).meta({
    description: 'Descriptive title for the digital material',
    example: 'Historical photographs from Lappeenranta 1960-1970',
  }),
  description: z.string().min(10).max(2000).meta({
    description: 'Detailed description of the submitted materials',
    example:
      'Collection of photographs documenting the post-war reconstruction and daily life in Lappeenranta during the 1960s.',
  }),
  status: submissionStatusSchema,
  culturalSensitivity: culturalSensitivitySchema,
  submittedBy: z.string().uuid().meta({
    description: 'ID of the user who submitted the materials',
    example: '550e8400-e29b-41d4-a716-446655440000',
  }),
  submittedAt: z.iso.datetime().meta({
    description: 'Submission timestamp',
    example: '2024-01-15T10:30:00.000Z',
  }),
  createdAt: z.iso.datetime().meta({
    description: 'Record creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  }),
  updatedAt: z.iso.datetime().meta({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  }),
});

register('Submission', submissionBaseSchema);

register('OralHistoryListResponse', OralHistoryListResponseSchema);
register('OralHistory', OralHistoryWithUserSchema);

register('Pagination', paginationSchema);

register('MetadataSuggestionWithUser', CustomSchemas.MetadataSuggestionResponseSchema);
// Register user response schemas
register('UserPublicResponse', UserPublicResponseSchema);

// ================================================================================================
// OPENAPI-SPECIFIC AUTH SCHEMAS
// ================================================================================================
// These schemas are created specifically for OpenAPI documentation to avoid Zod transform issues.
// The original schemas (LoginUserResponseSchema, RegisterInputSchema, etc.) use EmailSchema
// which has .transform() for lowercase conversion - incompatible with OpenAPI generation.

/**
 * OpenAPI schema for login user response
 * Manually defined without transforms for OpenAPI compatibility
 */
const LoginUserResponseOpenAPI = z.object({
  id: z.uuid().meta({ description: 'User ID', example: '550e8400-e29b-41d4-a716-446655440000' }),
  username: z.string().meta({ description: 'Username', example: 'maijakorhonen' }),
  email: z.string().email().meta({ description: 'Email address', example: 'maija@example.com' }),
  firstName: z.string().nullable().meta({ description: 'First name', example: 'Maija' }),
  lastName: z.string().nullable().meta({ description: 'Last name', example: 'Korhonen' }),
  role: userRoleSchema.meta({ description: 'User role' }),
  accountType: accountTypeSchema.meta({ description: 'Account type' }),
  isActivated: z.boolean().meta({ description: 'Account activation status', example: true }),
  createdAt: z.coerce.date().meta({ description: 'Account creation date' }),
});

register('LoginUserResponse', LoginUserResponseOpenAPI);

/**
 * OpenAPI schema for login response
 * Manually defined without transforms for OpenAPI compatibility
 */
const LoginResponseOpenAPI = z.object({
  accessToken: z.string().meta({
    description: 'JWT access token for API authentication',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  }),
  refreshToken: z.string().meta({
    description: 'Refresh token for obtaining new access tokens',
    example: 'dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4...',
  }),
  user: LoginUserResponseOpenAPI,
  expiresIn: z
    .number()
    .meta({ description: 'Access token expiration time in seconds', example: 900 }),
});

register('LoginResponse', LoginResponseOpenAPI);

/**
 * OpenAPI schema for register input
 * Manually defined without transforms for OpenAPI compatibility
 */
const RegisterInputOpenAPI = z.object({
  username: z.string().min(3).max(255).meta({
    description: 'Username (3-255 characters)',
    example: 'newuser123',
  }),
  email: z.string().email().meta({
    description: 'Email address',
    example: 'newuser@example.com',
  }),
  password: z.string().min(8).meta({
    description:
      'Password (min 8 characters with uppercase, lowercase, number, and special character)',
    example: 'SecurePass123!',
  }),
  role: userRoleSchema.optional().meta({ description: 'User role (defaults to USER)' }),
  accountType: accountTypeSchema
    .optional()
    .meta({ description: 'Account type (defaults to PRIVATE)' }),
  firstName: z.string().max(255).optional().meta({ description: 'First name', example: 'Maija' }),
  lastName: z.string().max(255).optional().meta({ description: 'Last name', example: 'Korhonen' }),
  streetAddress: z.string().max(500).optional().meta({ description: 'Street address' }),
  postalCode: z.string().max(20).optional().meta({ description: 'Postal code', example: '00100' }),
  postOffice: z
    .string()
    .max(255)
    .optional()
    .meta({ description: 'Post office/city', example: 'Mikkeli' }),
  telephone: z
    .string()
    .max(50)
    .optional()
    .meta({ description: 'Phone number', example: '+358 40 123 4567' }),
  profession: z.string().max(255).optional().meta({ description: 'Profession' }),
  companyName: z.string().max(255).optional().meta({
    description: 'Company name (required for COMPANY account type)',
  }),
  companyEmail: z.string().email().optional().meta({
    description: 'Company email (required for COMPANY account type)',
  }),
  companyTelephone: z.string().max(50).optional().meta({ description: 'Company phone number' }),
  companyContactPerson: z
    .string()
    .max(255)
    .optional()
    .meta({ description: 'Company contact person' }),
});

register('RegisterInput', RegisterInputOpenAPI);

/**
 * OpenAPI schema for auth login success response
 * Manually defined without transforms for OpenAPI compatibility
 */
const AuthLoginSuccessOpenAPI = z.object({
  status: z.literal('success'),
  data: LoginResponseOpenAPI,
  message: z.string().meta({ example: 'Login successful' }),
});

register('AuthLoginSuccess', AuthLoginSuccessOpenAPI);

// Register SIP schemas
Object.entries(sipSchemas).forEach(([name, schema]) => {
  register(name, schema);
});

// Empty registry
export const registry = {
  definitions: [] as unknown[],
};

/**
 * Generate OpenAPI components from registered schemas
 *
 * Uses zod-openapi createSchema() to convert Zod schemas to OpenAPI format.
 * This approach works with Zod v4 and doesn't require extendZodWithOpenApi.
 */
export const generateComponents = (): Record<string, unknown> => {
  const schemas: Record<string, unknown> = {};

  for (const [name, schema] of Object.entries(schemaRegistry)) {
    try {
      const { schema: jsonSchema } = createSchema(schema);
      schemas[name] = jsonSchema;
    } catch (error) {
      // Log error but continue with other schemas
      console.warn(`Warning: Could not generate OpenAPI schema for ${name}:`, error);
      // Provide a fallback schema
      schemas[name] = {
        type: 'object',
        description: `Schema for ${name} (generation failed)`,
      };
    }
  }

  return schemas;
};

/**
 * Get all registered schema names
 */
export const getRegisteredSchemas = () => {
  return Object.keys(schemaRegistry);
};
