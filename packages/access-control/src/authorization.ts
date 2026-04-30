import { type UserRoleType } from '@memoriaali/api-types';
import { ROLE_PERMISSIONS, type Permission } from './permissions';

/**
 * Get permissions for a role.
 */
export const getPermissionsForRole = (role: UserRoleType): Permission[] => {
  return ROLE_PERMISSIONS[role] ?? [];
};

/**
 * Check if user has specific permission.
 */
export const hasPermission = (
  userPermissions: Permission[],
  requiredPermission: Permission,
): boolean => {
  return userPermissions.includes(requiredPermission);
};

/**
 * Check if user has any of the required permissions.
 */
export const hasAnyPermission = (
  userPermissions: Permission[],
  requiredPermissions: Permission[],
): boolean => {
  return requiredPermissions.some((permission) => userPermissions.includes(permission));
};

/**
 * Check if user has all of the required permissions.
 */
export const hasAllPermissions = (
  userPermissions: Permission[],
  requiredPermissions: Permission[],
): boolean => {
  return requiredPermissions.every((permission) => userPermissions.includes(permission));
};

/**
 * Check if user can perform administrative operations
 *
 * @param {AuthenticatedUser} user - The authenticated user to check
 * @return {boolean} True if user can perform admin operations
 */
// The following helpers are app-specific (depend on AuthenticatedUser); keep them in app code.

/**
 * Check if user can moderate content
 *
 * @param {AuthenticatedUser} user - The authenticated user to check
 * @return {boolean} True if user can moderate content
 */
// App-specific helpers (require application user model) should live in app code.
