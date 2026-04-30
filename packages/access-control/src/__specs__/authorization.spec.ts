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

import { describe, expect, it } from 'vitest';

import { hasAllPermissions, hasAnyPermission, hasPermission } from '../authorization';
import { type Permission } from '../permissions';

describe('Authorization Utilities - Atomic Permission System', () => {
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
});
