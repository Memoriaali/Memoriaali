/**
 * Service-Level Authorization Utilities
 *
 * File Orientation:
 * This module provides programmatic authorization utilities for use in service layer
 * business logic. Unlike middleware-based authorization that works declaratively at
 * the route level, these utilities enable complex authorization decisions within
 * service methods where you have access to loaded resource data, multiple entities,
 * and complex business rules.
 *
 * System Integration:
 * - Used by: Service layer methods for business logic authorization
 * - Complements: Middleware-based route protection
 * - Depends on: AuthenticatedUser class for user context
 * - Security Layer: Layer 4 (Application Security) within services
 *
 * Design Principles:
 * - Fail-secure: All functions default to denying access
 * - Explicit results: Clear boolean or exception-based results
 * - Composable: Functions can be combined for complex authorization logic
 * - Type-safe: Full TypeScript support with proper type guards
 * - Resource-aware: Can work with loaded entity data for ownership checks
 */

import { ROLE_PERMISSIONS, hasPermission, type Permission } from '@memoriaali/access-control';
import { HttpException } from '../errors/http-exception';
import { AuthenticatedUser, UserRole } from '../types/authenticated-user';

/**
 * Interface for resources that have ownership (createdBy field)
 */
export interface OwnedResource {
  createdBy?: string | null;
  createdById?: string | null;
}

/**
 * Interface for resources with status-based access control
 */
export interface StatusResource {
  status?: string;
  isPublic?: boolean;
  isActive?: boolean;
}

/**
 * Authorization context that must be explicitly provided by calling code
 */
export interface AuthorizationContext {
  isOwner: boolean;
  isAssigned?: boolean;
  isPublic?: boolean;
  isActive?: boolean;
  customFlags?: Record<string, boolean>;
}

// ============================================================================
// BASIC ROLE AND PERMISSION CHECKS
// ============================================================================

/**
 * Check if user has a specific role
 *
 * @param {AuthenticatedUser} user - The authenticated user to check
 * @param {UserRole} role - The required role
 * @return {boolean} True if user has the role
 *
 * Preconditions:
 * - user must be a valid AuthenticatedUser instance
 * - role must be a valid UserRole enum value
 *
 * Postconditions:
 * - Returns true if user has exact role match
 * - Returns false for all other cases
 *
 * Invariants:
 * - No side effects, pure function
 * - Consistent results for same inputs
 *
 * @example
 * if (hasRole(user, 'ADMIN')) {
 *   // Allow admin-only operation
 * }
 */
export const hasRole = (user: AuthenticatedUser, role: UserRole): boolean => {
  return user.hasRole(role);
};

/**
 * Check if user has any of the specified roles
 *
 * @param {AuthenticatedUser} user - The authenticated user to check
 * @param {UserRole[]} allowedRoles - Array of acceptable roles
 * @return {boolean} True if user has any of the specified roles
 *
 * Preconditions:
 * - user must be a valid AuthenticatedUser instance
 * - allowedRoles array must contain valid UserRole enum values
 * - allowedRoles array must not be empty
 *
 * Postconditions:
 * - Returns true if user has any of the specified roles
 * - Returns false if user has none of the specified roles
 *
 * Invariants:
 * - No side effects, pure function
 * - Order of roles in array doesn't matter
 *
 * @example
 * if (hasAnyRole(user, ['ADMIN', 'MODERATOR'])) {
 *   // Allow admin or moderator operation
 * }
 */
export const hasAnyRole = (user: AuthenticatedUser, allowedRoles: UserRole[]): boolean => {
  return user.hasAnyRole(allowedRoles);
};

/**
 * Check if user is an admin (convenience function)
 *
 * @param {AuthenticatedUser} user - The authenticated user to check
 * @return {boolean} True if user has ADMIN role
 *
 * @example
 * if (isAdmin(user)) {
 *   // Allow admin-only operation
 * }
 */
export const isAdmin = (user: AuthenticatedUser): boolean => {
  return user.hasRole('ADMIN');
};

/**
 * Check if user is a moderator or admin (convenience function)
 *
 * @param {AuthenticatedUser} user - The authenticated user to check
 * @return {boolean} True if user has MODERATOR or ADMIN role
 *
 * @example
 * if (isModerator(user)) {
 *   // Allow moderation operation
 * }
 */
export const isModerator = (user: AuthenticatedUser): boolean => {
  return user.hasAnyRole(['MODERATOR', 'ADMIN']);
};

// ============================================================================
// ATOMIC AUTHORIZATION FUNCTIONS
// ============================================================================

/**
 * Get user permissions based on role
 *
 * @param {AuthenticatedUser} user - The authenticated user to check
 * @return {UserPermission[]} Array of permission strings
 */
export const getUserPermissions = (user: AuthenticatedUser): Permission[] => {
  return ROLE_PERMISSIONS[user.role] ?? [];
};

/**
/**
 * Require user to have specific role, throw exception if not
 *
 * @param {AuthenticatedUser} user - The authenticated user to check
 * @param {UserRole} role - The required role
 * @param {string} message - Custom error message (optional)
 * @return {void} Returns nothing if authorized
 *
 * @throws {HttpException} 403 Forbidden if user lacks required role
 */
export const requireRole = (user: AuthenticatedUser, role: UserRole, message?: string): void => {
  if (!hasRole(user, role)) {
    throw HttpException.forbidden(message ?? `Access denied. Required role: ${role}`);
  }
};

/**
 * Require user to have any of the specified roles, throw exception if not
 *
 * @param {AuthenticatedUser} user - The authenticated user to check
 * @param {UserRole[]} requiredRoles - Array of acceptable roles
 * @param {string} message - Custom error message (optional)
 * @return {void} Returns nothing if authorized
 *
 * @throws {HttpException} 403 Forbidden if user lacks required roles
 */
export const requireAnyRole = (
  user: AuthenticatedUser,
  requiredRoles: UserRole[],
  message?: string,
): void => {
  if (!hasAnyRole(user, requiredRoles)) {
    throw HttpException.forbidden(
      message ?? `Access denied. Required roles: ${requiredRoles.join(', ')}`,
    );
  }
};

/**
 * Require user to have specific permission, throw exception if not
 *
 * @param {AuthenticatedUser} user - The authenticated user to check
 * @param {UserPermission} requiredPermission - Required permission
 * @param {string} errorMessage - Optional custom error message
 * @return {void} No return value, throws HttpException if authorization fails
 *
 * @throws {HttpException} HTTP forbiddedn, when permission check fails
 */
export const requirePermission = (
  user: AuthenticatedUser,
  requiredPermission: Permission,
  errorMessage?: string,
): void => {
  const userPermissions = getUserPermissions(user);
  if (!hasPermission(userPermissions, requiredPermission)) {
    throw HttpException.forbidden(errorMessage ?? `Permission required: ${requiredPermission}`);
  }
};
