import { Request } from 'express';
import { OwnedResource, hasAnyRole, hasRole } from '../auth/authorization.utils';

// Use the UserRole enum values directly since we know them from the schema
export type UserRole = 'ADMIN' | 'MODERATOR' | 'USER' | 'EXPERT';

/**
 * Express Request extended with authenticated user information
 */
export interface AuthenticatedRequest extends Request {
  authenticatedUser: AuthenticatedUser;
  validatedBody?: unknown;
}

const MODERATOR_ADMIN_ARRAY = ['MODERATOR', 'ADMIN'];
/**
 * AuthenticatedUser class represents verified user identity established by authentication middleware.
 * This is the single source of truth for user identity throughout the application.
 */
export class AuthenticatedUser {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly firstName: string,
    public readonly lastName: string,
    public readonly role: UserRole,
    public readonly isActive: boolean,
    public readonly isVerified: boolean,
    public readonly groupId: string | null = null,
    public readonly groupIds: string[] = [],
  ) {}

  /**
   * Get user's full name for display purposes
   */
  get fullName(): string {
    return `${this.firstName.trim()} ${this.lastName.trim()}`.trim();
  }

  /**
   * Check if user has specific role (for authorization logic)
   */
  hasRole(role: UserRole): boolean {
    return this.role === role;
  }

  /**
   * Check if user has any of the specified roles (for authorization logic)
   */
  hasAnyRole(roles: UserRole[]): boolean {
    return roles.includes(this.role);
  }

  /**
   * Check if user owns a resource (for authorization logic)
   */
  ownsResource(resourceUserId: string): boolean {
    return this.id === resourceUserId;
  }

  /**
   * Check if user is an admin (common authorization pattern)
   */
  get isAdmin(): boolean {
    return this.role === 'ADMIN';
  }

  /**
   * Check if user is a moderator or higher (common authorization pattern)
   */
  get isModerator(): boolean {
    return MODERATOR_ADMIN_ARRAY.includes(this.role);
  }

  /**
   * Check if user is an expert or higher (common authorization pattern)
   */
  get isExpert(): boolean {
    return ['EXPERT', 'MODERATOR', 'ADMIN'].includes(this.role);
  }
}

/**
 * Check if user owns a resource based on createdBy or createdById field
 *
 * @param {AuthenticatedUser} user - The authenticated user to check
 * @param {OwnedResource} resource - The resource with ownership information
 * @return {boolean} True if user owns the resource
 *
 * Preconditions:
 * - user must be a valid AuthenticatedUser instance
 * - resource must have createdBy or createdById field
 *
 * Postconditions:
 * - Returns true if user ID matches resource owner ID
 * - Returns false for all other cases (including null ownership)
 *
 * Invariants:
 * - No side effects, pure function
 * - Handles both createdBy and createdById field variations
 *
 * @example
 * const document = await prisma.document.findUnique({ where: { id } });
 * if (ownsResource(user, document)) {
 *   // Allow owner operation
 * }
 */
export const ownsResource = (user: AuthenticatedUser, resource: OwnedResource): boolean => {
  const ownerId = resource.createdBy ?? resource.createdById;
  return ownerId === user.id;
};

/**
 * Check if user owns resource OR has one of the specified roles
 *
 * @param {AuthenticatedUser} user - The authenticated user to check
 * @param {OwnedResource} resource - The resource with ownership information
 * @param {UserRole[]} allowedRoles - Roles that can access regardless of ownership
 * @return {boolean} True if user owns resource or has allowed role
 *
 * Preconditions:
 * - user must be a valid AuthenticatedUser instance
 * - resource must have ownership information
 * - allowedRoles must be a non-empty array of valid UserRole values
 *
 * Postconditions:
 * - Returns true if user owns resource OR has any of the allowed roles
 * - Returns false only if user neither owns resource nor has allowed role
 *
 * @example
 * const document = await prisma.document.findUnique({ where: { id } });
 * if (ownsResourceOr(user, document, ['ADMIN', 'MODERATOR'])) {
 *   // Allow owner, admin, or moderator operation
 * }
 */
export const ownsResourceOr = (
  user: AuthenticatedUser,
  resource: OwnedResource,
  allowedRoles: UserRole[],
): boolean => {
  return ownsResource(user, resource) || hasAnyRole(user, allowedRoles);
};

/**
 * Check if user can access resource based on ownership and role
 *
 * @param {AuthenticatedUser} user - The authenticated user to check
 * @param {OwnedResource} resource - The resource to check access for
 * @param {UserRole[]} privilegedRoles - Roles that have access regardless of ownership
 * @return {boolean} True if user can access the resource
 *
 * @example
 * const document = await prisma.document.findUnique({ where: { id } });
 * if (canAccess(user, document, ['ADMIN', 'MODERATOR'])) {
 *   // User can view/edit this document
 * }
 */
export const canAccess = (
  user: AuthenticatedUser,
  resource: OwnedResource,
  privilegedRoles: UserRole[] = ['ADMIN'],
): boolean => {
  return ownsResourceOr(user, resource, privilegedRoles);
};

/**
 * Get user's access level for a resource
 *
 * @param {AuthenticatedUser} user - The authenticated user to check
 * @param {OwnedResource} resource - The resource to check access for
 * @return {'none' | 'read' | 'write' | 'admin'} Access level
 *
 * @example
 * const document = await prisma.document.findUnique({ where: { id } });
 * const accessLevel = getAccessLevel(user, document);
 * switch (accessLevel) {
 *   case 'admin': // Full access
 *   case 'write': // Can edit
 *   case 'read': // Can view only
 *   case 'none': // No access
 * }
 */
export const getAccessLevel = (
  user: AuthenticatedUser,
  resource: OwnedResource,
): 'none' | 'read' | 'write' | 'admin' => {
  if (hasRole(user, 'ADMIN')) {
    return 'admin';
  }

  if (ownsResource(user, resource)) {
    return 'write';
  }

  if (hasAnyRole(user, ['MODERATOR', 'EXPERT'])) {
    return 'read';
  }

  return 'none';
};
