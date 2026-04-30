import { NextFunction, Request, RequestHandler, Response } from 'express';
import { StatusCodes } from 'http-status-codes';

import { HttpException } from '../errors';

// Standard API response format
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  timestamp: string;
  correlationId?: string;
}

// Pagination metadata
export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Paginated response format
export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  meta: PaginationMeta;
}

/**
 * Send a successful response with data
 */
export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = StatusCodes.OK,
  correlationId?: string,
): void => {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    ...(correlationId && { correlationId }),
  };

  res.status(statusCode).json(response);
};

/**
 * Send a paginated response
 */
export const sendPaginatedResponse = <T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  statusCode: number = StatusCodes.OK,
  correlationId?: string,
): void => {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    meta,
    timestamp: new Date().toISOString(),
    ...(correlationId && { correlationId }),
  };

  res.status(statusCode).json(response);
};

/**
 * Send an error response
 */
export const sendError = (
  res: Response,
  error: string,
  statusCode: number = StatusCodes.INTERNAL_SERVER_ERROR,
  code?: string,
  correlationId?: string,
): void => {
  const response: ApiResponse<never> = {
    success: false,
    error,
    timestamp: new Date().toISOString(),
    ...(code && { code }),
    ...(correlationId && { correlationId }),
  };

  res.status(statusCode).json(response);
};

/**
 * Create pagination metadata
 */
export const createPaginationMeta = (
  total: number,
  page: number,
  pageSize: number,
): PaginationMeta => {
  const totalPages = Math.ceil(total / pageSize);

  return {
    total,
    page,
    pageSize,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (page?: string, pageSize?: string) => {
  const parsedPage = page ? parseInt(page, 10) : 1;
  const parsedPageSize = pageSize ? parseInt(pageSize, 10) : 10;

  if (parsedPage < 1) {
    throw HttpException.badRequest('Page must be greater than 0');
  }

  if (parsedPageSize < 1 || parsedPageSize > 100) {
    throw HttpException.badRequest('Page size must be between 1 and 100');
  }

  return { page: parsedPage, pageSize: parsedPageSize };
};

// Error helper functions for common HTTP exceptions
export const throwBadRequest = (message: string, field?: string): never => {
  throw HttpException.badRequest(message, 'VALIDATION_ERROR', { field });
};

export const throwForbidden = (message: string, code?: string): never => {
  throw HttpException.forbidden(message, code ?? 'ACCESS_DENIED');
};

export const throwUnauthorized = (message?: string): never => {
  throw HttpException.unauthorized(message ?? 'Authentication required');
};

export const throwInternalError = (message: string, details?: unknown): never => {
  throw HttpException.internalServerError(message, 'INTERNAL_ERROR', details);
};

/**
 * Handle async route errors
 */
export type AsyncMiddleware<TReq = unknown> = (
  req: TReq,
  res: Response,
  next: NextFunction,
) => Promise<void>;

// Allow handlers that do not declare `next` explicitly
export type AsyncRequestHandler<TReq = unknown> = (req: TReq, res: Response) => Promise<void>;
export function asyncHandler<TReq = unknown>(fn: AsyncMiddleware<TReq>): RequestHandler;
export function asyncHandler<TReq = unknown>(fn: AsyncRequestHandler<TReq>): RequestHandler;
export function asyncHandler<TReq = unknown>(
  fn: AsyncMiddleware<TReq> | AsyncRequestHandler<TReq>,
): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // If handler expects 3 args, pass next. Otherwise, call with (req, res)
      if (fn.length >= 3) await (fn as AsyncMiddleware<TReq>)(req as unknown as TReq, res, next);
      else await (fn as AsyncRequestHandler<TReq>)(req as unknown as TReq, res);
    } catch (error) {
      next(error);
    }
  };
}
