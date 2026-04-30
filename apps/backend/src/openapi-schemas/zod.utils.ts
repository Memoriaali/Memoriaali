import { z } from 'zod';
import 'zod-openapi';

export { z };

/**
 * Common OpenAPI decorators for cultural heritage domain
 */
export const culturalHeritageExamples = {
  submission: {
    title: 'Historical photographs from Lappeenranta',
    description:
      'Collection of 1960s photographs documenting life in Lappeenranta during the post-war reconstruction period',
  },
  oralHistory: {
    title: 'Interview with Aino Virtanen about life in 1940s Karelia',
    description:
      'Recorded interview discussing family life, traditions, and experiences during the evacuation from Karelia',
  },
  researcher: {
    firstName: 'Dr. Maija',
    lastName: 'Korhonen',
    email: 'maija.korhonen@helsinki.fi',
    affiliation: 'University of Helsinki, Department of History',
  },
  metadata: {
    creator: 'Pekka Virtanen',
    date: '1960-1965',
    subject: ['family history', 'Lappeenranta', 'post-war reconstruction', 'photography'],
    language: 'fi',
    type: 'Image',
    format: 'JPEG',
  },
};

/**
 * Pagination schema for list endpoints (singleton - not a factory)
 * Note: Does not use .meta({ id: ... }) to avoid Zod v4 global registry conflicts
 */
export const paginationSchema = z.object({
  page: z.number().int().min(1).meta({
    description: 'Current page number (1-based)',
    example: 1,
  }),
  limit: z.number().int().min(1).max(100).meta({
    description: 'Number of items per page',
    example: 20,
  }),
  total: z.number().int().min(0).meta({
    description: 'Total number of items across all pages',
    example: 150,
  }),
  totalPages: z.number().int().min(1).optional().meta({
    description: 'Total number of pages returned in response',
    example: 8,
  }),
  hasNext: z.boolean().optional().meta({
    description: 'Is there a next page available',
    example: true,
  }),
  hasPrev: z.boolean().optional().meta({
    description: 'Is there a previous page available',
    example: false,
  }),
  pages: z.number().int().min(1).optional().meta({
    description: 'Number of pages',
    example: 5,
  }),
});

/**
 * @deprecated Use paginationSchema directly instead
 */
export const createPaginationSchema = () => paginationSchema;

/**
 * Create standard API response wrapper
 */
export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    status: z.literal('success').meta({
      description: 'Response status indicator',
      example: 'success',
    }),
    data: dataSchema,
  });

/**
 * Create paginated response schema
 */
export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
  itemsKey: string = 'items',
) => {
  const dataSchema = z.object({
    [itemsKey]: z.array(itemSchema),
    pagination: createPaginationSchema(),
  });

  return createApiResponseSchema(dataSchema);
};

/**
 * Standard error response schema
 * Note: Does not use .meta({ id: ... }) to avoid Zod v4 global registry conflicts
 */
export const errorResponseSchema = z.object({
  status: z.literal('error').meta({
    description: 'Error status indicator',
    example: 'error',
  }),
  message: z.string().meta({
    description: 'Human-readable error message',
    example: 'Submission not found',
  }),
  statusCode: z.number().int().min(100).max(599).meta({
    description: 'HTTP status code',
    example: 404,
  }),
  code: z.string().optional().meta({
    description: 'Machine-readable error code for client handling',
    example: 'SUBMISSION_NOT_FOUND',
  }),
  details: z
    .record(z.string(), z.unknown())
    .optional()
    .meta({
      description: 'Additional error context and debugging information',
      example: { submissionId: 'uuid-123' },
    }),
});

/**
 * Validation error schema
 * Note: Does not use .meta({ id: ... }) to avoid Zod v4 global registry conflicts
 */
export const validationErrorSchema = z.object({
  field: z.string().meta({
    description: 'Field path that failed validation',
    example: 'metadata.title',
  }),
  message: z.string().meta({
    description: 'Validation error message',
    example: 'Title must be at least 5 characters long',
  }),
  code: z.string().meta({
    description: 'Validation error code',
    example: 'too_small',
  }),
});

/**
 * Validation error response schema
 * Note: Does not use .meta({ id: ... }) to avoid Zod v4 global registry conflicts
 */
export const validationErrorResponseSchema = errorResponseSchema.extend({
  errors: z.array(validationErrorSchema).meta({
    description: 'Detailed validation errors for each field',
  }),
});

/**
 * Cultural sensitivity levels for heritage materials
 */
export const culturalSensitivityLevelSchema = z
  .enum([
    'PUBLIC', // Publicly accessible materials
    'ACADEMIC', // Academic research access required
    'RESTRICTED', // Institution staff only
    'SENSITIVE', // Special permission required
  ])
  .meta({
    description: 'Cultural sensitivity level determining access requirements',
    example: 'ACADEMIC',
  });

/**
 * Cultural sensitivity restrictions
 */
export const culturalSensitivityRestrictionSchema = z
  .enum([
    'RELIGIOUS_CONTENT', // Contains religious or spiritual content
    'PERSONAL_DATA', // Contains personal information
    'SACRED_MATERIALS', // Contains sacred or ceremonial materials
    'INDIGENOUS_CONTENT', // Contains indigenous cultural content
  ])
  .meta({
    description: 'Specific cultural restrictions applying to material',
  });

/**
 * Cultural sensitivity configuration
 * Note: Does not use .meta({ id: ... }) to avoid Zod v4 global registry conflicts
 */
export const culturalSensitivitySchema = z.object({
  level: culturalSensitivityLevelSchema,
  restrictions: z
    .array(culturalSensitivityRestrictionSchema)
    .default([])
    .meta({
      description: 'List of specific cultural restrictions',
      example: ['PERSONAL_DATA'],
    }),
  accessNotes: z.string().optional().meta({
    description: 'Additional notes about access requirements or cultural considerations',
    example: 'Requires approval from cultural committee for indigenous content access',
  }),
});

/**
 * Submission status enum for digital materials
 */
export const submissionStatusSchema = z
  .enum([
    'DRAFT', // Being prepared by submitter
    'SUBMITTED', // Submitted for review
    'UNDER_REVIEW', // Being reviewed by staff
    'APPROVED', // Approved and archived
    'REJECTED', // Rejected with feedback
    'ARCHIVED', // Successfully archived
  ])
  .meta({
    description: 'Status of submission in the review and archiving workflow',
    example: 'SUBMITTED',
  });

/**
 * User role enum for cultural heritage platform
 * Defined here with .meta() to support OpenAPI generation
 */
export const userRoleSchema = z.enum(['ADMIN', 'MODERATOR', 'USER', 'EXPERT']).meta({
  description: 'User role in the cultural heritage platform',
  example: 'USER',
});

/**
 * Account type enum for user accounts
 * Defined here with .meta() to support OpenAPI generation
 */
export const accountTypeSchema = z.enum(['PRIVATE', 'COMPANY']).meta({
  description: 'Type of user account',
  example: 'PRIVATE',
});

/**
 * Makes nullable fields optional for response schemas
 * Used when converting database models to API responses
 */
export const makeNullableFieldsOptional = <T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
): z.ZodObject<z.ZodRawShape> => {
  const { shape } = schema;
  const newShape: Record<string, z.ZodTypeAny> = {};

  for (const [key, value] of Object.entries(shape)) {
    if (value instanceof z.ZodNullable) {
      newShape[key] = (value.unwrap() as z.ZodTypeAny).optional();
    } else {
      newShape[key] = value as z.ZodTypeAny;
    }
  }

  return z.object(newShape);
};

/**
 * Omits system fields (id, createdAt, updatedAt) from schemas
 * Used for input validation where these fields shouldn't be provided by users
 */
export const omitSystemFields = <T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
): z.ZodObject<z.ZodRawShape> => {
  // Create a new schema without the system fields
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...restShape } = schema.shape;
  return z.object(restShape);
};
