/**
 * Simplified error handling for Memoriaali V2
 *
 * Uses HttpException as the primary error class with static factory methods
 * and standardized error codes for consistent error handling.
 */

// Core error classes
export * from './http-exception';

// Error codes
export { ERROR_CODES, getErrorMessage } from '../constants/error-codes';
export type { ErrorCode } from '../constants/error-codes';

// Re-export commonly used items for convenience
export { HttpException } from './http-exception';
export { StatusCodes } from 'http-status-codes';
