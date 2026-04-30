import type { NextFunction, Request, Response } from 'express';

import { ERROR_CODES, HttpException } from '../shared/errors';

/**
 * Worker authentication middleware using shared secret header.
 *
 * Expects header: `x-worker-auth: <secret>` matching WORKER_AUTH_SECRET.
 */
export const requireWorkerAuth = (req: Request, _res: Response, next: NextFunction): void => {
  const secret = process.env.WORKER_AUTH_SECRET;
  if (!secret) {
    throw HttpException.internalServerError(
      ERROR_CODES.SYSTEM.CONFIGURATION_ERROR,
      'WORKER_AUTH_SECRET not configured',
    );
  }

  const header = req.header('x-worker-auth');
  if (!header || header !== secret) {
    throw HttpException.unauthorized(
      ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
      'Worker auth required',
    );
  }

  next();
};
