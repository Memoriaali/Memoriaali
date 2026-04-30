/**
 * Unit Tests for Authorization Utilities - Service-Level Access Control
 *
 * ARCHITECTURAL CONTEXT:
 * Tests the service-layer authorization utilities that provide programmatic access control
 * within business logic. These utilities use atomic permission checking with explicit
 * ownership context instead of complex configuration objects.
 *
 * BUSINESS REQUIREMENTS:
 * - Resource ownership must be explicitly determined by calling code
 * - Role hierarchy must be enforced (ADMIN > MODERATOR > EXPERT > USER)
 * - Permission strings must follow consistent naming conventions
 * - Authorization must be atomic and predictable
 *
 * KEY DEPENDENCIES:
 * - AuthenticatedUser class for user identity
 * - HttpException for error handling
 * - Simple permission string arrays
 *
 * SECURITY CONSIDERATIONS:
 * - All functions must fail secure (deny by default)
 * - Ownership must be explicitly provided by calling code
 * - Permission checks must be exact string matches
 * - Exception-throwing functions must provide clear error messages
 *
 * CONTRACT SUMMARY:
 * - Preconditions: Valid AuthenticatedUser instance, explicit AuthorizationContext
 * - Postconditions: Permission arrays or boolean results or exceptions with clear reasons
 * - Invariants: No side effects, consistent results for same inputs
 */

import { UserRole } from '@memoriaali/database';
import { describe, expect, it } from 'vitest';

import {
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  type Permission,
} from '@memoriaali/access-control';
import { HttpException } from '../../errors/http-exception';
import { AuthenticatedUser } from '../../types/authenticated-user';
import {
  getUserPermissions,
  hasRole,
  isAdmin,
  isModerator,
  requireAnyRole,
  requirePermission,
  requireRole,
} from '../authorization.utils';

// Test fixtures
const createUser = (role: UserRole, id = 'user-123'): AuthenticatedUser => {
  return new AuthenticatedUser(id, 'test@example.com', 'Test', 'User', role, true, true);
};

const adminUser = createUser('ADMIN', 'admin-123');
const moderatorUser = createUser('MODERATOR', 'moderator-123');
const expertUser = createUser('EXPERT', 'expert-123');
const regularUser = createUser('USER', 'user-123');

describe('Authorization Utilities - Atomic Permission System', () => {
  describe('getUserPermissions', () => {
    it('returns correct permissions for admin users', () => {
      const permissions = getUserPermissions(adminUser);

      expect(permissions).toContain('users:read');
      expect(permissions).toContain('users:write');
      expect(permissions).toContain('users:delete');
      expect(permissions).toContain('documents:read');
      expect(permissions).toContain('documents:write');
      expect(permissions).toContain('documents:delete');
      expect(permissions).toContain('documents:publish');
      expect(permissions).toContain('admin:manage');
      expect(permissions).toContain('admin:all');
    });

    it('returns correct permissions for moderator users', () => {
      const permissions = getUserPermissions(moderatorUser);

      expect(permissions).toContain('users:read');
      expect(permissions).toContain('documents:read');
      expect(permissions).toContain('documents:write');
      expect(permissions).toContain('documents:approve');
      expect(permissions).toContain('research:approve');
      expect(permissions).not.toContain('admin:all');
    });

    it('returns correct permissions for regular users', () => {
      const permissions = getUserPermissions(regularUser);

      expect(permissions).toContain('documents:read');
      expect(permissions).toContain('documents:create');
      expect(permissions).not.toContain('documents:write');
      expect(permissions).toContain('research:read');
      expect(permissions).toContain('research:request');
    });

    it('returns correct permissions for expert users', () => {
      const permissions = getUserPermissions(expertUser);

      expect(permissions).toContain('documents:read');
      expect(permissions).toContain('documents:create');
      expect(permissions).toContain('documents:write');
      expect(permissions).toContain('research:read');
      expect(permissions).toContain('research:request');
      expect(permissions).not.toContain('comments:write');
    });
  });

  describe('hasPermission', () => {
    it('returns true when user has the specific permission', () => {
      const permissions: Permission[] = ['documents:read', 'documents:write', 'comments:read'];

      expect(hasPermission(permissions, 'documents:write')).toBe(true);
      expect(hasPermission(permissions, 'comments:read')).toBe(true);
    });

    it('returns false when user does not have the specific permission', () => {
      const permissions: Permission[] = ['documents:read', 'comments:read'];

      expect(hasPermission(permissions, 'documents:write')).toBe(false);
      expect(hasPermission(permissions, 'admin:all')).toBe(false);
    });
  });

  describe('hasAnyPermission', () => {
    it('returns true when user has at least one of the required permissions', () => {
      const permissions: Permission[] = ['documents:read', 'comments:read'];

      expect(hasAnyPermission(permissions, ['documents:write', 'documents:read'])).toBe(true);
      expect(hasAnyPermission(permissions, ['comments:read', 'admin:all'])).toBe(true);
    });

    it('returns false when user has none of the required permissions', () => {
      const permissions: Permission[] = ['documents:read', 'comments:read'];

      expect(hasAnyPermission(permissions, ['documents:write', 'admin:all'])).toBe(false);
      expect(hasAnyPermission(permissions, ['users:manage', 'documents:delete'])).toBe(false);
    });
  });

  describe('hasAllPermissions', () => {
    it('returns true when user has all of the required permissions', () => {
      const permissions: Permission[] = [
        'documents:read',
        'documents:write',
        'comments:read',
        'comments:write',
      ];

      expect(hasAllPermissions(permissions, ['documents:read', 'documents:write'])).toBe(true);
      expect(hasAllPermissions(permissions, ['comments:read'])).toBe(true);
    });

    it('returns false when user is missing any of the required permissions', () => {
      const permissions: Permission[] = ['documents:read', 'comments:read'];

      expect(hasAllPermissions(permissions, ['documents:read', 'documents:write'])).toBe(false);
      expect(hasAllPermissions(permissions, ['comments:read', 'admin:all'])).toBe(false);
    });
  });

  describe('requireSpecificPermission', () => {
    it('does not throw when user has the required permission', () => {
      expect(() => {
        requirePermission(adminUser, 'documents:write');
      }).not.toThrow();
    });

    it('throws HttpException when user lacks the required permission', () => {
      expect(() => {
        requirePermission(regularUser, 'documents:write');
      }).toThrow(HttpException);

      try {
        requirePermission(regularUser, 'documents:write');
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).message).toContain('Permission required: documents:write');
      }
    });

    it('uses custom error message when provided', () => {
      const customMessage = 'Custom access denied message';

      expect(() => {
        requirePermission(regularUser, 'documents:write', customMessage);
      }).toThrow(HttpException);

      try {
        requirePermission(regularUser, 'documents:write', customMessage);
      } catch (error) {
        expect(error).toBeInstanceOf(HttpException);
        expect((error as HttpException).message).toBe(customMessage);
      }
    });
  });

  describe('Role-based helpers and requirements', () => {
    it('requireRole allows correct role and throws otherwise', () => {
      expect(() => requireRole(adminUser, 'ADMIN')).not.toThrow();
      expect(() => requireRole(regularUser, 'ADMIN')).toThrow(HttpException);
    });

    it('requireAnyRole allows any acceptable role', () => {
      expect(() => requireAnyRole(moderatorUser, ['ADMIN', 'MODERATOR'])).not.toThrow();
      expect(() => requireAnyRole(regularUser, ['ADMIN', 'MODERATOR'])).toThrow(HttpException);
    });
  });

  // Backward compatibility tests for existing functions
  describe('Backward Compatibility - Role Functions', () => {
    it('hasRole works correctly', () => {
      expect(hasRole(adminUser, 'ADMIN')).toBe(true);
      expect(hasRole(adminUser, 'USER')).toBe(false);
      expect(hasRole(regularUser, 'USER')).toBe(true);
      expect(hasRole(regularUser, 'ADMIN')).toBe(false);
    });

    it('isAdmin works correctly', () => {
      expect(isAdmin(adminUser)).toBe(true);
      expect(isAdmin(moderatorUser)).toBe(false);
      expect(isAdmin(regularUser)).toBe(false);
    });

    it('isModerator works correctly', () => {
      expect(isModerator(moderatorUser)).toBe(true);
      expect(isModerator(adminUser)).toBe(true); // Admins also have moderator capabilities
      expect(isModerator(regularUser)).toBe(false);
    });
  });

  // Removed ownership helpers tests: not part of current public API
});
