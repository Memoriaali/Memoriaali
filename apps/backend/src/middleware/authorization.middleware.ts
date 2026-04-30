/**
 * Authorization Middleware - Role-Based Access Control
 *
 * File Orientation:
 * This module implements role-based authorization middleware for the Memoriaali application.
 * It provides Express middleware functions that enforce user role requirements on protected routes.
 *
 * The module integrates with the four-layer architecture as the authorization layer within
 * the middleware stack, working alongside authentication.middleware.ts to provide complete
 * access control. It operates on AuthenticatedUser instances established by authentication
 * middleware and makes authorization decisions based on user roles.
 *
 * System Integration:
 * - Depends on: authentication.middleware.ts (req.authenticatedUser must be populated)
 * - Used by: Route definitions in apps/backend/src/api/routes.ts files
 * - Security Layer: Application Security (Layer 4 in Defense in Depth)
 *
 * Role Hierarchy (from highest to lowest privilege):
 * - ADMIN: Full system access, user management, all operations
 * - MODERATOR: Content moderation, user oversight, limited admin functions
 * - EXPERT: Advanced content operations, research access
 * - USER: Basic operations, own content management
 *
 * Design Principles:
 * - Fail-secure: Deny access by default when authorization fails
 * - Clear error messages: Specific feedback for debugging and user experience
 * - Composable: Middleware functions can be combined for complex authorization
 * - Stateless: No session state, relies only on request context
 */

import { NextFunction, Response } from 'express';

import { HttpException } from '../shared/errors';
import { AuthenticatedRequest } from '../shared/types/AuthenticatedRequest';
import { UserRole } from '../shared/types/authenticated-user';

/**
 * Middleware to require authentication for protected routes.
 *
 * This is the fundamental authorization check that ensures a user is authenticated
 * before accessing protected resources. It should be used before any role-based
 * authorization middleware to establish that a valid user context exists.
 *
 * @param {AuthenticatedRequest} req - Express request with optional user context
 * @param {Response} res - Express response (unused, errors bubble to error middleware)
 * @param {NextFunction} next - Express next function
 * @return {void} Calls next() if authenticated, throws HttpException otherwise
 *
 * Preconditions:
 * - Authentication middleware must have run first (sets req.authenticatedUser if auth valid)
 * - Route should be intended for authenticated users only
 *
 * Postconditions:
 * - Calls next() if req.authenticatedUser exists (user is authenticated)
 * - Throws HttpException.unauthorized if req.authenticatedUser is missing
 * - Never modifies request or response objects
 *
 * Invariants:
 * - Only authenticated users can proceed past this middleware
 * - Unauthenticated requests are always rejected with 401
 * - No privilege escalation possible
 *
 * Security Considerations:
 * - Fundamental gate for protected resources
 * - Works in conjunction with authentication middleware
 * - Provides clear authentication-specific error messages
 * - Foundation for additional role-based authorization
 *
 * Usage Pattern:
 * 1. Authentication middleware sets req.authenticatedUser (or leaves undefined)
 * 2. This middleware enforces authentication requirement
 * 3. Role-based middleware can then safely assume authenticated user
 *
 * @throws {HttpException} 401 Unauthorized when req.authenticatedUser is not present
 *
 * @example
 * // Protect any route that requires authentication
 * router.get('/profile', requireAuthentication(), controller.getProfile);
 *
 * @example
 * // Chain with role-based authorization
 * router.delete('/users/:id', requireAuthentication(), requireAdmin(), controller.deleteUser);
 */
export const requireAuthentication = () => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized(
        'Authentication required for this endpoint',
        'AUTHENTICATION_REQUIRED',
      );
    }
    next();
  };
};

/**
 * Creates middleware that requires a specific user role to access a route.
 *
 * This function implements role-based access control by checking if the authenticated
 * user has the exact role specified. It follows the principle of least privilege,
 * requiring exact role matches rather than role hierarchy comparisons.
 *
 * @param {UserRole} role - The exact user role required to access the route
 * @return {Function} Express middleware function for role-based authorization
 *
 * Preconditions:
 * - req.authenticatedUser must be populated by authentication middleware
 * - role parameter must be a valid UserRole enum value
 * - Route must be protected by authentication middleware first
 *
 * Postconditions:
 * - Calls next() if user has the exact required role
 * - Throws HttpException.unauthorized if user is not authenticated
 * - Throws HttpException.forbidden if user lacks the required role
 * - Never modifies request or response objects
 *
 * Invariants:
 * - Only users with the exact specified role gain access
 * - Unauthenticated requests are always rejected
 * - Error messages provide clear authorization feedback
 *
 * Security Considerations:
 * - Uses exact role matching (no role hierarchy)
 * - Fails secure when user context is missing
 * - Provides specific error messages for debugging
 * - No privilege escalation possible
 *
 * @throws {HttpException} 401 Unauthorized when req.authenticatedUser is not present
 * @throws {HttpException} 403 Forbidden when user lacks required role
 *
 * @example
 * // Protect admin-only route
 * router.delete('/users/:id', requireRole('ADMIN'), controller.deleteUser);
 *
 * @example
 * // Protect moderator-only route
 * router.post('/content/:id/approve', requireRole('MODERATOR'), controller.approve);
 */
export const requireRole = (role: UserRole) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized('Authentication required');
    }

    if (!req.authenticatedUser.hasRole(role)) {
      throw HttpException.forbidden(`Access denied. Required role: ${role}`);
    }

    next();
  };
};

/**
 * Creates middleware that requires any of the specified user roles to access a route.
 *
 * This function implements flexible role-based access control by allowing access
 * if the user has any of the specified roles. Useful for routes that should be
 * accessible to multiple role types with similar privilege levels.
 *
 * @param {UserRole[]} roles - Array of user roles, any of which grants access
 * @return {Function} Express middleware function for multi-role authorization
 *
 * Preconditions:
 * - req.authenticatedUser must be populated by authentication middleware
 * - roles array must contain valid UserRole enum values
 * - roles array must not be empty
 * - Route must be protected by authentication middleware first
 *
 * Postconditions:
 * - Calls next() if user has any of the specified roles
 * - Throws HttpException.unauthorized if user is not authenticated
 * - Throws HttpException.forbidden if user has none of the required roles
 * - Never modifies request or response objects
 *
 * Invariants:
 * - Access granted if user has ANY of the specified roles
 * - All roles in array are checked equally (no preference order)
 * - Empty roles array would deny all access
 * - Error messages list all required roles for clarity
 *
 * Security Considerations:
 * - Uses OR logic for role checking (any role grants access)
 * - Fails secure when user context is missing
 * - Comprehensive error messages aid debugging
 * - No unintended privilege escalation
 *
 * @throws {HttpException} 401 Unauthorized when req.authenticatedUser is not present
 * @throws {HttpException} 403 Forbidden when user has none of the required roles
 *
 * @example
 * // Allow moderators and admins to access content management
 * router.get('/admin/content', requireAnyRole(['MODERATOR', 'ADMIN']), controller.list);
 *
 * @example
 * // Allow experts and admins to access research data
 * router.get('/research/data', requireAnyRole(['EXPERT', 'ADMIN']), controller.getData);
 */
export const requireAnyRole = (roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.authenticatedUser) {
      throw HttpException.unauthorized('Authentication required');
    }

    if (!req.authenticatedUser.hasAnyRole(roles)) {
      throw HttpException.forbidden(`Access denied. Required roles: ${roles.join(', ')}`);
    }

    next();
  };
};

/**
 * Convenience middleware for admin-only routes.
 *
 * This is a specialized version of requireRole('ADMIN') that provides a more
 * semantic and readable way to protect admin-only routes. It implements the
 * highest level of access control in the system.
 *
 * @return {Function} Express middleware function requiring ADMIN role
 *
 * Preconditions:
 * - req.authenticatedUser must be populated by authentication middleware
 * - Route must be protected by authentication middleware first
 *
 * Postconditions:
 * - Calls next() if user has ADMIN role
 * - Throws HttpException for unauthorized or insufficient privileges
 * - Maintains all security guarantees of requireRole('ADMIN')
 *
 * Invariants:
 * - Only ADMIN role users gain access
 * - Equivalent to requireRole('ADMIN') in all security aspects
 * - No privilege escalation possible
 *
 * Security Considerations:
 * - Highest privilege level in the system
 * - Suitable for sensitive administrative operations
 * - User management, system configuration, data deletion
 *
 * @example
 * // Protect user deletion endpoint
 * router.delete('/users/:id', requireAdmin(), controller.deleteUser);
 *
 * @example
 * // Protect system configuration routes
 * router.post('/admin/config', requireAdmin(), controller.updateConfig);
 */
export const requireAdmin = () => requireRole('ADMIN');

/**
 * Convenience middleware for moderator or admin routes.
 *
 * This is a specialized version of requireAnyRole(['MODERATOR', 'ADMIN']) that
 * provides semantic access to moderation functionality. Useful for content
 * management and user oversight operations that don't require full admin privileges.
 *
 * @return {Function} Express middleware function requiring MODERATOR or ADMIN role
 *
 * Preconditions:
 * - req.authenticatedUser must be populated by authentication middleware
 * - Route must be protected by authentication middleware first
 *
 * Postconditions:
 * - Calls next() if user has MODERATOR or ADMIN role
 * - Throws HttpException for unauthorized or insufficient privileges
 * - Maintains all security guarantees of requireAnyRole(['MODERATOR', 'ADMIN'])
 *
 * Invariants:
 * - Both MODERATOR and ADMIN roles gain access
 * - Equivalent to requireAnyRole(['MODERATOR', 'ADMIN']) in all aspects
 * - Follows principle of least privilege for moderation functions
 *
 * Security Considerations:
 * - Appropriate for content moderation operations
 * - User oversight and community management functions
 * - Content approval, rejection, and flagging operations
 * - Does not grant full administrative privileges
 *
 * @example
 * // Protect content approval endpoint
 * router.post('/content/:id/approve', requireModerator(), controller.approve);
 *
 * @example
 * // Protect user list endpoint for oversight
 * router.get('/admin/users', requireModerator(), controller.listUsers);
 */
export const requireModerator = () => requireAnyRole(['MODERATOR', 'ADMIN']);
