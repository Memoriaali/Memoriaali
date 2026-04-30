import { NextFunction, RequestHandler, Response } from 'express';

import { ROLE_PERMISSIONS, type Permission } from '@memoriaali/access-control';
import { ERROR_CODES, HttpException } from '../shared/errors';
import { AuthenticatedRequest } from '../shared/types/AuthenticatedRequest';
import { UserRole } from '../shared/types/authenticated-user';

/**
 * Require a specific permission to access the route
 */
export const requirePermission = (permission: Permission): RequestHandler => {
  return (req, _res: Response, next: NextFunction) => {
    const typedReq = req as unknown as AuthenticatedRequest;
    if (!typedReq.authenticatedUser) {
      throw HttpException.unauthorized(ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED);
    }

    const userPermissions = ROLE_PERMISSIONS[typedReq.authenticatedUser.role] ?? [];
    if (!userPermissions.includes(permission)) {
      throw HttpException.forbidden(
        ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS,
        `Access denied. Required permission: ${permission}`,
      );
    }

    next();
  };
};

/**
 * Require any of the specified permissions to access the route
 */
export const requireAnyPermission = (permissions: Permission[]): RequestHandler => {
  return (req, res: Response, next: NextFunction) => {
    const typedReq = req as unknown as AuthenticatedRequest;
    if (!typedReq.authenticatedUser) {
      throw HttpException.unauthorized(ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED);
    }

    const userPermissions = ROLE_PERMISSIONS[typedReq.authenticatedUser.role] ?? [];
    const hasAnyPermission = permissions.some((p) => userPermissions.includes(p));

    if (!hasAnyPermission) {
      throw HttpException.forbidden(
        ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS,
        `Access denied. Required permissions: ${permissions.join(', ')}`,
      );
    }

    next();
  };
};

/**
 * Utility function to check if a user has a specific permission
 */
export const hasPermission = (user: { role: UserRole }, permission: Permission): boolean => {
  const userPermissions = ROLE_PERMISSIONS[user.role] || [];
  return userPermissions.includes(permission);
};
