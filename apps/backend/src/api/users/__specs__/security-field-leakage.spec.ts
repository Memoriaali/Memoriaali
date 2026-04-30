/**
 * Security Field Leakage Prevention Tests
 *
 * These tests verify that our secure-by-default field picking prevents
 * sensitive data from leaking through response schemas when new fields
 * are added to the User model.
 *
 * CRITICAL: These tests ensure that using .pick() instead of .omit()
 * prevents accidental exposure of new sensitive fields.
 */

import { describe, it, expect } from 'vitest';

import {
  UserPublicResponseSchema,
  UserOwnerResponseSchema,
  UserAdminResponseSchema,
  UserListResponseSchema,
} from '../users.schemas';

// Mock user data with sensitive fields that should NOT be exposed
const mockUserWithSensitiveData = {
  id: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  role: 'USER',
  accountType: 'PRIVATE',
  isActivated: true,
  streetAddress: '123 Test St',
  postalCode: '12345',
  postOffice: 'Test City',
  telephone: '+1234567890',
  profession: 'Tester',
  companyName: 'Test Corp',
  companyEmail: 'test@testcorp.com',
  companyTelephone: '+1234567891',
  companyContactPerson: 'Test Contact',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-02'),
  createdById: '550e8400-e29b-41d4-a716-446655440001', // Valid UUID
  updatedById: '550e8400-e29b-41d4-a716-446655440002', // Valid UUID

  // SENSITIVE FIELDS that should NEVER be exposed
  hashedPassword: '$2b$10$hashedpassword...',
  salt: 'randomsalt123',
  verificationCode: 'verification123',

  // SIMULATED NEW SENSITIVE FIELDS (e.g., added in future)
  socialSecurityNumber: '123-45-6789',
  bankAccountNumber: 'ACC-123456789',
  apiSecretKey: 'secret_key_12345',
  internalNotes: 'Confidential staff notes about user',
  previousPasswords: ['oldpass1', 'oldpass2'],
  loginAttempts: 5,
  suspiciousActivityLog: ['2024-01-01: unusual login pattern'],
};

describe('🔒 Security Field Leakage Prevention', () => {
  describe('UserPublicResponseSchema - Fail-Secure Pattern', () => {
    it('should only expose explicitly approved public fields', () => {
      // The schema should successfully parse the approved fields
      const result = UserPublicResponseSchema.safeParse(mockUserWithSensitiveData);

      expect(result.success).toBe(true);

      if (result.success) {
        // Verify only approved public fields are present
        expect(result.data).toEqual({
          id: '550e8400-e29b-41d4-a716-446655440000',
          username: 'testuser',
          firstName: 'Test',
          lastName: 'User',
          role: 'USER',
          accountType: 'PRIVATE',
          isActivated: true,
          createdAt: new Date('2024-01-01'),
        });

        // Verify sensitive fields are NOT present (the key test!)
        expect(result.data).not.toHaveProperty('hashedPassword');
        expect(result.data).not.toHaveProperty('salt');
        expect(result.data).not.toHaveProperty('verificationCode');
        expect(result.data).not.toHaveProperty('email');
        expect(result.data).not.toHaveProperty('socialSecurityNumber');
        expect(result.data).not.toHaveProperty('bankAccountNumber');
        expect(result.data).not.toHaveProperty('apiSecretKey');
        expect(result.data).not.toHaveProperty('internalNotes');
        expect(result.data).not.toHaveProperty('previousPasswords');
      }
    });

    it('should fail-secure by hiding new fields by default', () => {
      // Create a user object with a "new sensitive field" that wasn't in original schema
      const userWithNewSensitiveField = {
        ...mockUserWithSensitiveData,
        creditCardNumber: '4111-1111-1111-1111', // New sensitive field
        medicalRecords: 'Confidential medical data', // Another new sensitive field
      };

      const result = UserPublicResponseSchema.safeParse(userWithNewSensitiveField);

      expect(result.success).toBe(true);

      if (result.success) {
        // New sensitive fields should be automatically excluded (fail-secure)
        expect(result.data).not.toHaveProperty('creditCardNumber');
        expect(result.data).not.toHaveProperty('medicalRecords');

        // Only approved fields should be present
        expect(Object.keys(result.data).sort()).toEqual([
          'accountType',
          'createdAt',
          'firstName',
          'id',
          'isActivated',
          'lastName',
          'role',
          'username',
        ]);
      }
    });
  });

  describe('UserOwnerResponseSchema - Extended Safe Fields', () => {
    it('should expose owner-appropriate fields only', () => {
      const result = UserOwnerResponseSchema.safeParse(mockUserWithSensitiveData);

      expect(result.success).toBe(true);

      if (result.success) {
        // Verify owner can see their contact info but not system secrets
        expect(result.data).toHaveProperty('email');
        expect(result.data).toHaveProperty('telephone');
        expect(result.data).toHaveProperty('streetAddress');

        // But still no sensitive system fields
        expect(result.data).not.toHaveProperty('hashedPassword');
        expect(result.data).not.toHaveProperty('salt');
        expect(result.data).not.toHaveProperty('verificationCode');
        expect(result.data).not.toHaveProperty('socialSecurityNumber');
        expect(result.data).not.toHaveProperty('bankAccountNumber');
      }
    });
  });

  describe('UserAdminResponseSchema - Maximum Safe Fields', () => {
    it('should expose admin-appropriate fields but never password data', () => {
      const result = UserAdminResponseSchema.safeParse(mockUserWithSensitiveData);

      expect(result.success).toBe(true);

      if (result.success) {
        // Admins can see operational fields
        expect(result.data).toHaveProperty('email');
        expect(result.data).toHaveProperty('createdById');
        expect(result.data).toHaveProperty('updatedById');

        // But NEVER password-related data (even for admins!)
        expect(result.data).not.toHaveProperty('hashedPassword');
        expect(result.data).not.toHaveProperty('salt');
        expect(result.data).not.toHaveProperty('verificationCode');

        // And not the simulated sensitive fields
        expect(result.data).not.toHaveProperty('socialSecurityNumber');
        expect(result.data).not.toHaveProperty('previousPasswords');
      }
    });
  });

  describe('UserListResponseSchema - Pagination Security', () => {
    it('should use standardized pagination metadata', () => {
      const mockListResponse = {
        users: [
          {
            id: '550e8400-e29b-41d4-a716-446655440003',
            username: 'user1',
            firstName: 'User',
            lastName: 'One',
            role: 'USER',
            accountType: 'PRIVATE',
            isActivated: true,
            createdAt: new Date('2024-01-01'),
          },
        ],
        pagination: {
          limit: 20,
          totalCount: 150,
          hasNextPage: true,
          hasPreviousPage: false,
          currentPage: 1,
          totalPages: 8,
        },
      };

      const result = UserListResponseSchema.safeParse(mockListResponse);

      expect(result.success).toBe(true);

      if (result.success) {
        // Verify proper pagination structure
        expect(result.data.pagination).toHaveProperty('totalCount'); // Not 'total'
        expect(result.data.pagination).toHaveProperty('hasNextPage'); // Not 'hasNext'
        expect(result.data.pagination).toHaveProperty('hasPreviousPage'); // Not 'hasPrev'
        expect(result.data.pagination).toHaveProperty('currentPage'); // Not 'page'

        // Verify users array uses public schema
        expect(result.data.users[0]).not.toHaveProperty('email');
        expect(result.data.users[0]).not.toHaveProperty('hashedPassword');
      }
    });
  });

  describe('Regression Test - Pick vs Omit Pattern Comparison', () => {
    it('demonstrates why pick() pattern is safer than omit()', () => {
      // The key security difference is what happens when new fields are added to the base schema

      // With .omit() pattern (DANGEROUS):
      // - You list what to HIDE
      // - New fields are EXPOSED by default
      // - Risk: Forgetting to add new sensitive fields to the omit list

      // With .pick() pattern (SAFE):
      // - You list what to SHOW
      // - New fields are HIDDEN by default
      // - Safety: New fields must be explicitly approved for exposure

      // Our secure pick pattern
      const secureResult = UserPublicResponseSchema.safeParse(mockUserWithSensitiveData);
      expect(secureResult.success).toBe(true);

      if (secureResult.success) {
        // Verify that only explicitly picked fields are present
        const exposedFields = Object.keys(secureResult.data).sort();
        expect(exposedFields).toEqual([
          'accountType',
          'createdAt',
          'firstName',
          'id',
          'isActivated',
          'lastName',
          'role',
          'username',
        ]);

        // Verify sensitive fields are not exposed
        expect(secureResult.data).not.toHaveProperty('hashedPassword');
        expect(secureResult.data).not.toHaveProperty('verificationCode');
        expect(secureResult.data).not.toHaveProperty('createdById');
        expect(secureResult.data).not.toHaveProperty('email'); // Not in public schema
      }

      // The pick() pattern ensures that even if new sensitive fields were added
      // to the User model, they would NOT be exposed unless explicitly added
      // to the pick() list. This is "secure by default" design.
    });
  });

  describe('Field Count Validation', () => {
    it('should have predictable field counts for each response type', () => {
      const publicResult = UserPublicResponseSchema.safeParse(mockUserWithSensitiveData);
      const ownerResult = UserOwnerResponseSchema.safeParse(mockUserWithSensitiveData);
      const adminResult = UserAdminResponseSchema.safeParse(mockUserWithSensitiveData);

      expect(publicResult.success).toBe(true);
      expect(ownerResult.success).toBe(true);
      expect(adminResult.success).toBe(true);

      if (publicResult.success && ownerResult.success && adminResult.success) {
        // Public schema should have the fewest fields
        const publicFieldCount = Object.keys(publicResult.data).length;
        const ownerFieldCount = Object.keys(ownerResult.data).length;
        const adminFieldCount = Object.keys(adminResult.data).length;

        expect(publicFieldCount).toBeLessThan(ownerFieldCount);
        expect(ownerFieldCount).toBeLessThan(adminFieldCount);

        // Specific expected counts (adjust if schemas change)
        expect(publicFieldCount).toBe(8); // id, username, firstName, lastName, role, accountType, isActivated, createdAt
        expect(ownerFieldCount).toBeGreaterThan(8);
        expect(adminFieldCount).toBeGreaterThan(ownerFieldCount);
      }
    });
  });
});
