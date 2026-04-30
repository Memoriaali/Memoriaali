import { Prisma } from '@memoriaali/database';
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { ZodError } from 'zod';

import { HttpException } from '../shared/errors/index.js';

/**
 * Error response structure
 */
interface ErrorResponse {
  statusCode: number;
  body: {
    status: 'error';
    message: string;
    statusCode: number;
    code: string;
    details?: unknown;
    errors?: unknown;
    stack?: string;
  };
}

/**
 * Security event logging for error monitoring
 */
const logSecurityEvent = (eventType: string, error: Error, req: Request): void => {
  const event = {
    eventType,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.get('user-agent'),
    path: req.path,
    method: req.method,
    error: {
      name: error.name,
      message: error.message,
      code: error instanceof HttpException ? error.code : undefined,
      status: error instanceof HttpException ? error.status : undefined,
    },
  };

  // Log based on error severity
  if (error instanceof HttpException) {
    if (error.status >= 500) {
      console.error('System Error:', event);
    } else if (error.status === 401 || error.status === 403) {
      console.error('Security Event:', event);
    } else {
      console.error('Client Error:', event);
    }
  } else if (error instanceof ZodError || error.name === 'ZodError') {
    console.error('Client Error:', event); // ZodError = validation error = client error
  } else {
    console.error('System Error:', event);
  }
};

/**
 * Handle Prisma database errors with appropriate HTTP status codes
 */
const handlePrismaError = (err: Prisma.PrismaClientKnownRequestError): ErrorResponse => {
  switch (err.code) {
    case 'P2002': {
      // Unique constraint violation
      const target = (err.meta?.target as string[]) ?? ['field'];
      return {
        statusCode: StatusCodes.CONFLICT,
        body: {
          status: 'error',
          message: `${target.join(', ')} already exists`,
          statusCode: StatusCodes.CONFLICT,
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          details: { field: target[0] },
        },
      };
    }
    case 'P2025': {
      // Record not found
      return {
        statusCode: StatusCodes.NOT_FOUND,
        body: {
          status: 'error',
          message: 'Record not found',
          statusCode: StatusCodes.NOT_FOUND,
          code: 'RECORD_NOT_FOUND',
        },
      };
    }
    case 'P2003': {
      // Foreign key constraint violation
      return {
        statusCode: StatusCodes.BAD_REQUEST,
        body: {
          status: 'error',
          message: 'Invalid reference to related record',
          statusCode: StatusCodes.BAD_REQUEST,
          code: 'FOREIGN_KEY_CONSTRAINT',
        },
      };
    }
    default: {
      // Generic database error
      return {
        statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
        body: {
          status: 'error',
          message: 'Database operation failed',
          statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
          code: 'DATABASE_ERROR',
          details:
            process.env.NODE_ENV === 'development' ? { code: err.code, meta: err.meta } : undefined,
        },
      };
    }
  }
};

/**
 * Handle Zod validation errors with field-specific details
 */
const handleZodError = (err: ZodError): ErrorResponse => {
  const errors = err.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));

  return {
    statusCode: StatusCodes.BAD_REQUEST,
    body: {
      status: 'error',
      message: 'Validation failed',
      statusCode: StatusCodes.BAD_REQUEST,
      code: 'VALIDATION_ERROR',
      errors,
    },
  };
};

/**
 * Create error response based on error type
 * Uses early returns for clean control flow
 */
export const createErrorResponse = (err: Error): ErrorResponse => {
  // 1. Handle HttpException (custom API errors)
  if (err instanceof HttpException) {
    return {
      statusCode: err.status,
      body: err.toJSON() as ErrorResponse['body'],
    };
  }

  // 2. Handle Prisma database errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    return handlePrismaError(err);
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: StatusCodes.BAD_REQUEST,
      body: {
        status: 'error',
        message: 'Invalid database query parameters',
        statusCode: StatusCodes.BAD_REQUEST,
        code: 'DATABASE_VALIDATION_ERROR',
      },
    };
  }

  // 3. Handle Zod validation errors
  if (err instanceof ZodError) {
    return handleZodError(err);
  }

  // 3b. Handle Zod validation errors by name (in case instanceof fails)
  if (err.name === 'ZodError' || err.constructor.name === 'ZodError') {
    return handleZodError(err as ZodError);
  }

  // 4. Handle business logic errors (generic pattern)
  if (err && typeof err === 'object' && 'code' in err && 'message' in err) {
    const businessError = err as { code: string; message: string; details?: unknown };
    const body: ErrorResponse['body'] = {
      status: 'error',
      message: businessError.message,
      statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
      code: businessError.code,
    };

    if (businessError.details) {
      body.details = businessError.details;
    }

    return {
      statusCode: StatusCodes.UNPROCESSABLE_ENTITY,
      body,
    };
  }

  // 5. Handle generic errors (fallback)
  const body: ErrorResponse['body'] = {
    status: 'error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    code: 'INTERNAL_SERVER_ERROR',
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && err.stack) {
    body.stack = err.stack;
  }

  return {
    statusCode: StatusCodes.INTERNAL_SERVER_ERROR,
    body,
  };
};

/**
 * Global error handling middleware for Memoriaali V2
 *
 * Implements centralized error handling as part of Defense in Depth Layer 4.
 * Handles HttpException, Prisma, Zod, and generic errors with security logging.
 *
 * Security Features:
 * - Information leak prevention (sanitizes stack traces in production)
 * - Security event logging for authentication/authorization failures
 * - Consistent error response format
 * - Attack surface reduction through centralized handling
 *
 * @param err - The error to handle
 * @param req - The request object
 * @param res - The response object
 * @param next - The next function
 */
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction): void => {
  // Skip if response already sent
  if (res.headersSent) {
    logSecurityEvent('error_handling_late', err, req);
    return next(err);
  }

  // Log security-relevant errors
  logSecurityEvent('error_occurred', err, req);

  const errorResponse = createErrorResponse(err);

  res.status(errorResponse.statusCode).json(errorResponse.body);
};

/**
 * Not found handler for unmatched routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(StatusCodes.NOT_FOUND).json({
    status: 'error',
    message: `API endpoint not found: ${req.method} ${req.path}`,
    statusCode: StatusCodes.NOT_FOUND,
    code: 'ENDPOINT_NOT_FOUND',
    details: {
      method: req.method,
      path: req.path,
      availableEndpoints: {
        health: '/api/v2/health',
        documentation: '/api/v2/docs',
      },
    },
  });
};
