/**
 * Standard OpenAPI response components for Memoriaali V2 API
 *
 * These reusable response definitions ensure consistency across all endpoints
 * and provide clear documentation for different error scenarios specific to
 * cultural heritage data management.
 */

export const componentsResponses = {
  // Success responses
  Success: {
    description: 'Operation completed successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['success'],
              example: 'success',
            },
            data: {
              type: 'object',
              description: 'Response data (structure varies by endpoint)',
            },
          },
          required: ['status', 'data'],
        },
      },
    },
  },

  // Auth responses
  AuthLoginSuccess: {
    description: 'Login successful',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/AuthLoginSuccess',
        },
      },
    },
  },

  // Client error responses (4xx)
  BadRequest: {
    description: 'Bad Request - The request was malformed or contains invalid data',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ValidationErrorResponse',
        },
        examples: {
          'validation-error': {
            summary: 'Validation error example',
            value: {
              status: 'error',
              message: 'Validation failed',
              statusCode: 400,
              code: 'VALIDATION_ERROR',
              errors: [
                {
                  field: 'title',
                  message: 'Title must be at least 5 characters long',
                  code: 'too_small',
                },
                {
                  field: 'culturalSensitivity.level',
                  message: 'Invalid cultural sensitivity level',
                  code: 'invalid_enum_value',
                },
              ],
            },
          },
        },
      },
    },
  },

  Unauthorized: {
    description: 'Unauthorized - Authentication is required to access this resource',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
        examples: {
          'no-token': {
            summary: 'No authentication token provided',
            value: {
              status: 'error',
              message: 'Authentication required',
              statusCode: 401,
              code: 'AUTHENTICATION_REQUIRED',
            },
          },
          'invalid-token': {
            summary: 'Invalid or expired token',
            value: {
              status: 'error',
              message: 'Invalid or expired authentication token',
              statusCode: 401,
              code: 'INVALID_TOKEN',
            },
          },
        },
      },
    },
  },

  Forbidden: {
    description: 'Forbidden - User lacks sufficient permissions or cultural access level',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
        examples: {
          'insufficient-role': {
            summary: 'Insufficient user role',
            value: {
              status: 'error',
              message: 'Insufficient permissions. Required roles: MODERATOR, ADMIN',
              statusCode: 403,
              code: 'INSUFFICIENT_PERMISSIONS',
              details: {
                userRoles: ['USER'],
                requiredRoles: ['MODERATOR', 'ADMIN'],
              },
            },
          },
          'cultural-access-denied': {
            summary: 'Insufficient cultural access level',
            value: {
              status: 'error',
              message:
                'Insufficient cultural access level. Required: SENSITIVE, User has: ACADEMIC',
              statusCode: 403,
              code: 'INSUFFICIENT_CULTURAL_ACCESS',
              details: {
                userLevel: 'ACADEMIC',
                requiredLevel: 'SENSITIVE',
                materialId: 'uuid-123',
              },
            },
          },
          'resource-ownership': {
            summary: 'Resource ownership required',
            value: {
              status: 'error',
              message: 'Access denied. You can only access your own submissions',
              statusCode: 403,
              code: 'RESOURCE_OWNERSHIP_REQUIRED',
              details: {
                submissionId: 'uuid-123',
              },
            },
          },
        },
      },
    },
  },

  NotFound: {
    description: 'Not Found - The requested resource does not exist',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
        examples: {
          'submission-not-found': {
            summary: 'Submission not found',
            value: {
              status: 'error',
              message: 'Submission not found',
              statusCode: 404,
              code: 'SUBMISSION_NOT_FOUND',
              details: {
                submissionId: 'uuid-123',
              },
            },
          },
          'user-not-found': {
            summary: 'User not found',
            value: {
              status: 'error',
              message: 'User not found',
              statusCode: 404,
              code: 'USER_NOT_FOUND',
              details: {
                userId: 'uuid-456',
              },
            },
          },
          'endpoint-not-found': {
            summary: 'API endpoint not found',
            value: {
              status: 'error',
              message: 'API endpoint not found',
              statusCode: 404,
              code: 'ENDPOINT_NOT_FOUND',
            },
          },
        },
      },
    },
  },

  Conflict: {
    description: 'Conflict - The request conflicts with the current state of the resource',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
        examples: {
          'duplicate-submission': {
            summary: 'Duplicate submission',
            value: {
              status: 'error',
              message: 'A submission with this title already exists',
              statusCode: 409,
              code: 'DUPLICATE_SUBMISSION',
              details: {
                title: 'Historical photographs from Lappeenranta',
                existingSubmissionId: 'uuid-789',
              },
            },
          },
          'email-already-exists': {
            summary: 'Email already registered',
            value: {
              status: 'error',
              message: 'User with this email already exists',
              statusCode: 409,
              code: 'EMAIL_ALREADY_EXISTS',
              details: {
                email: 'maija.korhonen@helsinki.fi',
              },
            },
          },
        },
      },
    },
  },

  TooManyRequests: {
    description: 'Too Many Requests - Rate limit exceeded',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
        examples: {
          'rate-limit-exceeded': {
            summary: 'Rate limit exceeded',
            value: {
              status: 'error',
              message: 'Too many requests. Please try again later',
              statusCode: 429,
              code: 'RATE_LIMIT_EXCEEDED',
              details: {
                retryAfter: 300,
                limit: 1000,
                windowMs: 3600000,
              },
            },
          },
        },
      },
    },
  },

  // Server error responses (5xx)
  InternalServerError: {
    description: 'Internal Server Error - An unexpected error occurred',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
        examples: {
          'generic-server-error': {
            summary: 'Generic server error',
            value: {
              status: 'error',
              message: 'An internal server error occurred',
              statusCode: 500,
              code: 'INTERNAL_SERVER_ERROR',
            },
          },
          'database-error': {
            summary: 'Database connection error',
            value: {
              status: 'error',
              message: 'Database operation failed',
              statusCode: 500,
              code: 'DATABASE_ERROR',
            },
          },
        },
      },
    },
  },

  ServiceUnavailable: {
    description: 'Service Unavailable - The service is temporarily unavailable',
    content: {
      'application/json': {
        schema: {
          $ref: '#/components/schemas/ErrorResponse',
        },
        examples: {
          'database-unavailable': {
            summary: 'Database service unavailable',
            value: {
              status: 'error',
              message: 'Database service is currently unavailable',
              statusCode: 503,
              code: 'DATABASE_UNAVAILABLE',
            },
          },
          'maintenance-mode': {
            summary: 'System maintenance',
            value: {
              status: 'error',
              message: 'System is currently under maintenance',
              statusCode: 503,
              code: 'MAINTENANCE_MODE',
              details: {
                estimatedDuration: '30 minutes',
                maintenanceType: 'scheduled',
              },
            },
          },
        },
      },
    },
  },
};
