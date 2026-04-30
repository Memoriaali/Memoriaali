import { StatusCodes } from 'http-status-codes';

import { ERROR_CODES, getErrorMessage } from '../constants/error-codes';

/**
 * Custom HTTP exception class for Memoriaali V2 API
 *
 * Provides structured error handling with standardized error codes and
 * semantic HTTP status codes from the http-status-codes library.
 */
export class HttpException extends Error {
  public readonly status: StatusCodes;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(status: StatusCodes, code: string, message?: string, details?: unknown) {
    // Use provided message or look up default message for the error code
    const errorMessage = message ?? getErrorMessage(code, 'An error occurred');
    super(errorMessage);

    this.status = status;
    this.code = code;
    this.details = details;
    this.name = 'HttpException';

    // Maintain proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, HttpException.prototype);
  }

  /**
   * Create a Bad Request error (400)
   */
  static badRequest(
    code: string = ERROR_CODES.VALIDATION.INVALID_INPUT,
    message?: string,
    details?: unknown,
  ): HttpException {
    return new HttpException(StatusCodes.BAD_REQUEST, code, message, details);
  }

  /**
   * Create an Unauthorized error (401)
   */
  static unauthorized(
    code: string = ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
    message?: string,
  ): HttpException {
    return new HttpException(StatusCodes.UNAUTHORIZED, code, message);
  }

  /**
   * Create a Forbidden error (403)
   */
  static forbidden(
    code: string = ERROR_CODES.AUTH.ACCESS_DENIED,
    message?: string,
    details?: unknown,
  ): HttpException {
    return new HttpException(StatusCodes.FORBIDDEN, code, message, details);
  }

  /**
   * Create a Not Found error (404)
   */
  static notFound(
    code: string = ERROR_CODES.RESOURCE.NOT_FOUND,
    message?: string,
    details?: unknown,
  ): HttpException {
    return new HttpException(StatusCodes.NOT_FOUND, code, message, details);
  }

  /**
   * Create a Conflict error (409)
   */
  static conflict(
    code: string = ERROR_CODES.RESOURCE.CONFLICT,
    message?: string,
    details?: unknown,
  ): HttpException {
    return new HttpException(StatusCodes.CONFLICT, code, message, details);
  }

  /**
   * Create an Unprocessable Entity error (422)
   */
  static unprocessableEntity(
    code: string = ERROR_CODES.BUSINESS.INVALID_OPERATION,
    message?: string,
    details?: unknown,
  ): HttpException {
    return new HttpException(StatusCodes.UNPROCESSABLE_ENTITY, code, message, details);
  }

  /**
   * Create a Too Many Requests error (429)
   */
  static tooManyRequests(
    code: string = ERROR_CODES.RATE_LIMIT.EXCEEDED,
    message?: string,
    details?: unknown,
  ): HttpException {
    return new HttpException(StatusCodes.TOO_MANY_REQUESTS, code, message, details);
  }

  /**
   * Create an Internal Server Error (500)
   */
  static internalServerError(
    code: string = ERROR_CODES.SYSTEM.INTERNAL_ERROR,
    message?: string,
    details?: unknown,
  ): HttpException {
    return new HttpException(StatusCodes.INTERNAL_SERVER_ERROR, code, message, details);
  }

  /**
   * Convert to JSON representation for API responses
   */
  toJSON() {
    return {
      status: 'error',
      message: this.message,
      statusCode: this.status,
      code: this.code,
      details: this.details,
    };
  }
}
