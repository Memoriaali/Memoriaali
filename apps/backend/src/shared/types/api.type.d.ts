import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from './AuthenticatedRequest';

/**
 * Type definition for endpoint service call handlers with optional type safety.
 *
 * Defines the signature for Express route handlers that can work with both
 * authenticated and non-authenticated requests, with optional strict typing
 * for parameters, body, and query data.
 *
 * @template TParams - Route parameters type (e.g., { userId: string, postId: string })
 * @template TBody - Request body type (inferred from validation schemas)
 * @template TQuery - Query parameters type (inferred from validation schemas)
 * @template TLocals - Response locals type for passing data between middlewares
 *
 * @param {Request | AuthenticatedRequest<TParams, TBody, TQuery, TLocals>} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function for middleware chain
 * @return {Promise<void>} Promise that resolves when handler completes
 *
 * Preconditions:
 * - req must be a valid Express Request or AuthenticatedRequest
 * - res must be a valid Express Response object
 * - next must be a valid Express NextFunction
 *
 * Postconditions:
 * - Returns a Promise that resolves when handler processing is complete
 * - Handler may call res.send(), res.json(), or next() as appropriate
 * - Handler must not throw unhandled errors (should use next(error) instead)
 *
 * Invariants:
 * - Handler function signature remains consistent with Express middleware pattern
 * - Type parameters provide compile-time safety when specified
 * - Backward compatibility maintained when type parameters are omitted
 *
 * @example
 * // Basic usage (current pattern)
 * const handler: EndpointServiceCall = async (req, res, next) => {
 *   // req.params, req.body, req.query are loosely typed
 *   res.json({ success: true });
 * };
 *
 * @example
 * // Strict typing usage (future enhancement)
 * const strictHandler: EndpointServiceCall<
 *   { userId: string },           // params must have userId
 *   CreateUserInput,              // body must be CreateUserInput
 *   { search?: string }           // query can have optional search
 * > = async (req, res, next) => {
 *   // req.params.userId is guaranteed string
 *   // req.body is guaranteed CreateUserInput
 *   // req.query.search is string | undefined
 *   res.json({ userId: req.params.userId });
 * };
 */
export type EndpointServiceCall<
  TParams extends Record<string, string> = Record<string, string>,
  TBody = unknown,
  TQuery = Record<string, unknown>,
  TLocals extends Record<string, unknown> = Record<string, unknown>,
> = (
  req: Request | AuthenticatedRequest<TParams, TBody, TQuery, TLocals>,
  res: Response,
  next: NextFunction,
) => Promise<void>;
