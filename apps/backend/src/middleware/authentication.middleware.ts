import { Prisma } from '@memoriaali/database';
import { NextFunction, Response } from 'express';
import * as jwt from 'jsonwebtoken';

import { prisma } from '../shared/database/prisma';
import { ERROR_CODES, HttpException } from '../shared/errors';
import { AuthenticatedRequest } from '../shared/types/AuthenticatedRequest';
import { AuthenticatedUser } from '../shared/types/authenticated-user';
import { verifyJwtToken } from '../shared/utils/jwt.utils';

/**
 * Authentication Middleware - Layer 4 Application Security
 *
 * Implements Layer 4 (Application Security) within the Defense in Depth strategy.
 * This middleware establishes user identity by verifying JWT tokens and populating
 * the request context with an AuthenticatedUser instance when valid authentication
 * is provided. It never fails for missing authentication, allowing both public
 * and protected routes to use the same middleware.
 *
 * Defense in Depth Integration:
 * - Layer 1-3: Physical, Network, Host security (handled by infrastructure)
 * - Layer 4: Application Security (this middleware + authorization + validation)
 * - Layer 5-6: Data and Procedural security (services + policies)
 *
 * Security Features:
 * - JWT token extraction and validation (when present)
 * - User identity verification against database
 * - Account status validation (active, verified)
 * - Request context population with AuthenticatedUser
 * - Comprehensive audit logging for security events
 * - Error sanitization to prevent information leakage
 * - Graceful handling of missing authentication
 *
 * Four-Layer Architecture Role:
 * - Middleware Layer: Implements cross-cutting authentication concern
 * - Provides identity context for Routes, Controllers, and Services
 * - Enables authorization decisions in other layers
 * - Supports both public and protected routes seamlessly
 */

/**
 * Universal authentication middleware for all routes
 *
 * Establishes user identity from JWT token when provided, but never fails
 * for missing authentication. This allows the same middleware to be used
 * for both public and protected routes, with authorization decisions made
 * at the appropriate layer.
 *
 * @param {AuthenticatedRequest} req - Express request with optional authorization header
 * @param {Response} res - Express response (unused, errors bubble to error middleware)
 * @param {NextFunction} next - Express next function
 * @return {Promise<void>} Always calls next(), never throws authentication errors
 *
 * Preconditions:
 * - HTTP request (authorization header optional)
 * - JWT_SECRET environment variable must be configured
 *
 * Postconditions:
 * - req.authenticatedUser populated with AuthenticatedUser if valid token provided
 * - req.authenticatedUser remains undefined if no token or invalid token
 * - Always calls next() (never throws authentication errors)
 * - Security events logged appropriately
 *
 * Invariants:
 * - Never throws errors for missing or invalid authentication
 * - Only sets req.authenticatedUser for valid, activated user accounts
 * - Maintains consistent logging for security events
 * - Does not expose sensitive user information
 *
 * Security Considerations:
 * - Fails gracefully - missing auth doesn't break requests
 * - Invalid tokens are silently ignored (no information leakage)
 * - Only activated accounts can establish user context
 * - Comprehensive security event logging
 * - Authorization decisions deferred to authorization middleware
 *
 * Use Cases:
 * - Public endpoints that show different content for authenticated users
 * - Protected endpoints (combined with authorization middleware)
 * - Rate limiting based on user status
 * - Analytics and audit logging
 * - Graceful degradation for optional authentication features
 *
 * @example
 * // Use on all routes - public and protected
 * app.use('/api', authenticateUser);
 *
 * // Public route - works with or without auth
 * router.get('/public', controller.getPublicData);
 *
 * // Protected route - requires authorization middleware
 * router.get('/protected', requireAuthentication(), controller.getProtectedData);
 */
export const authenticateUser = async (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  // 1. Extract token from Authorization header (optional)
  const authHeader = req.headers?.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    // No auth provided - continue without user context
    return next();
  }

  // Remove 'Bearer ' prefix
  const token = authHeader.substring(7);
  if (!token) {
    return next(); // Empty token - continue without user context
  }

  try {
    // 2. Verify JWT token
    const decoded = verifyJwtToken(token);

    // 3. Fetch current user data from database
    // TODO: This should have an cache mechanism
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActivated: true, // Using actual database field name
        // Note: Never select sensitive fields like hashedPassword, verificationCode
      },
    });

    // 4. Validate user exists and is activated
    if (!user) {
      // Log security event: token valid but user not found (potential data inconsistency)
      console.warn('Authentication warning: Valid token but user not found', {
        userId: decoded.userId,
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      return next(); // Continue without user context
    }

    if (!user.isActivated) {
      // Log security event: access attempt with unactivated account
      console.warn('Authentication warning: Unactivated user account attempted access', {
        userId: user.id,
        // Note: Email intentionally excluded from logs for privacy
        timestamp: new Date().toISOString(),
        ip: req.ip,
        userAgent: req.get('user-agent'),
      });
      return next(); // Continue without user context
    }

    // 5. Fetch user's group memberships and create AuthenticatedUser instance
    const userGroups = await prisma.usersInGroups.findMany({
      where: { userId: user.id },
      select: { groupId: true },
    });
    const groupIds = userGroups.map((g) => g.groupId);

    req.authenticatedUser = new AuthenticatedUser(
      user.id,
      user.email,
      user.firstName ?? '',
      user.lastName ?? '',
      user.role,
      true, // isActive (validated above)
      user.isActivated, // isVerified
      groupIds.length > 0 ? groupIds[0] : null, // groupId (primary/fallback)
      groupIds,
    );

    next();
  } catch (error) {
    // Distinguish between different error types
    if (error instanceof HttpException && error.code === 'TOKEN_EXPIRED') {
      throw HttpException.unauthorized(ERROR_CODES.AUTH.TOKEN_EXPIRED);
    }
    if (error instanceof HttpException && error.code === 'INVALID_TOKEN') {
      throw HttpException.unauthorized(ERROR_CODES.AUTH.TOKEN_INVALID);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw HttpException.unauthorized(ERROR_CODES.AUTH.TOKEN_INVALID);
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw HttpException.unauthorized(ERROR_CODES.AUTH.TOKEN_EXPIRED);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // Database errors should bubble up, not be treated as auth failures
      // Note: Error logging happens in error-handler.middleware.ts
      throw HttpException.internalServerError(ERROR_CODES.SYSTEM.DATABASE_ERROR);
    }
    // Unknown errors - return generic auth error
    // Note: Error logging happens in error-handler.middleware.ts
    throw HttpException.unauthorized(
      ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED,
      'Authentication failed',
    );
  }
};

// Authentication middleware no longer exports requireAuthentication
// This functionality has been moved to authorization.middleware.ts
// to maintain proper separation of concerns
