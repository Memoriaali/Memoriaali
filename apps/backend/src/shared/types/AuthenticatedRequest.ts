import { Request } from 'express';
import { AuthenticatedUser } from './authenticated-user';
// Use Express's bundled types to avoid extra deps
type ParamsDictionary = Record<string, string>;
type ParsedQs = Record<string, unknown>;

/**
 * Extend Express Request type to include authenticated user
 *
 * @template TParams - Route parameters type (e.g., { userId: string })
 * @template TBody - Request body type (from validation schemas)
 * @template TQuery - Query parameters type (from validation schemas)
 * @template TLocals - Response locals type (optional)
 */

export interface AuthenticatedRequest<
  TParams extends ParamsDictionary = ParamsDictionary,
  TBody = unknown,
  TQuery extends ParsedQs = ParsedQs,
  TLocals extends Record<string, unknown> = Record<string, unknown>,
> extends Request<TParams, unknown, TBody, TQuery, TLocals> {
  /**
   * The authenticated user info, when the request is authenticated.
   */
  authenticatedUser: AuthenticatedUser;

  /**
   * Validated request body from middleware
   */
  validatedBody?: unknown;

  /**
   * The path parameters of the request.
   */
  params: TParams;
}
