/**
 * Unit Tests for UsersService - Admin Account Management
 *
 * Tests admin-only activation and deactivation operations including:
 * - Admin user account activation (bypass verification)
 * - Admin user account deactivation (prevent login)
 * - Error handling for invalid operations
 * - Transaction safety and audit trail creation
 *
 * Each test verifies the contract: preconditions, postconditions, and invariants
 */

import { User, UserRole, AccountType } from '@memoriaali/database';
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { HttpException } from '../../../shared/errors';
import { UserActivationInput } from '../users.schemas';
import { UsersService } from '../users.service';

describe('UsersService - Admin Account Management', () => {
  let usersService: UsersService;
  let mockPrisma: any;
  let mockTransaction: any;

  // Test user fixtures
  const testUsers = {
    adminUser: {
      id: 'admin-123',
      username: 'admin.user',
      hashedPassword: '$2b$12$test.hash.here',
      salt: 'test-salt-123',
      role: UserRole.ADMIN,
      accountType: AccountType.PRIVATE,
      isActivated: true,
      verificationCode: '',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      streetAddress: null,
      postalCode: null,
      postOffice: null,
      telephone: null,
      profession: null,
      companyName: null,
      companyEmail: null,
      companyTelephone: null,
      companyContactPerson: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      createdById: null,
      updatedById: null,
    } as User,

    inactiveUser: {
      id: 'user-456',
      username: 'inactive.user',
      hashedPassword: '$2b$12$test.hash.here',
      salt: 'test-salt-456',
      role: UserRole.USER,
      accountType: AccountType.PRIVATE,
      isActivated: false,
      verificationCode: 'activation-token-123',
      email: 'inactive@example.com',
      firstName: 'Inactive',
      lastName: 'User',
      streetAddress: null,
      postalCode: null,
      postOffice: null,
      telephone: null,
      profession: null,
      companyName: null,
      companyEmail: null,
      companyTelephone: null,
      companyContactPerson: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      createdById: null,
      updatedById: null,
    } as User,

    activeUser: {
      id: 'user-789',
      username: 'active.user',
      hashedPassword: '$2b$12$test.hash.here',
      salt: 'test-salt-789',
      role: UserRole.USER,
      accountType: AccountType.PRIVATE,
      isActivated: true,
      verificationCode: '',
      email: 'active@example.com',
      firstName: 'Active',
      lastName: 'User',
      streetAddress: null,
      postalCode: null,
      postOffice: null,
      telephone: null,
      profession: null,
      companyName: null,
      companyEmail: null,
      companyTelephone: null,
      companyContactPerson: null,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T10:00:00Z'),
      createdById: null,
      updatedById: null,
    } as User,
  };

  // Test data fixtures
  const activationData: UserActivationInput = {
    isActivated: true,
    reason: 'Email verification not working for user',
  };

  const deactivationData: UserActivationInput = {
    isActivated: false,
    reason: 'Policy violation - inappropriate content',
  };

  beforeEach(() => {
    // Create fresh mock for each test
    mockTransaction = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    mockPrisma = {
      $transaction: vi.fn(),
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    usersService = new UsersService(mockPrisma);
  });

  describe('adminActivateUser', () => {
    /**
     * Scenario: adminActivateUser succeeds for inactive user
     * Expected outcome: user activated, verification code cleared, audit trail created
     * Contract: postcondition (user.isActivated = true, verification code cleared, updatedById set)
     */
    it('activates inactive user successfully', async () => {
      const activatedUser = {
        ...testUsers.inactiveUser,
        isActivated: true,
        verificationCode: '',
        updatedById: testUsers.adminUser.id,
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.user.findUnique.mockResolvedValue(testUsers.inactiveUser);
        mockTransaction.user.update.mockResolvedValue(activatedUser);
        return await callback(mockTransaction);
      });

      const result = await usersService.adminActivateUser(
        testUsers.inactiveUser.id,
        activationData,
        testUsers.adminUser.id,
      );

      expect(result).toEqual(activatedUser);
      expect(mockTransaction.user.findUnique).toHaveBeenCalledWith({
        where: { id: testUsers.inactiveUser.id },
      });
      expect(mockTransaction.user.update).toHaveBeenCalledWith({
        where: { id: testUsers.inactiveUser.id },
        data: {
          isActivated: true,
          verificationCode: '',
          updatedById: testUsers.adminUser.id,
        },
      });
    });

    /**
     * Scenario: adminActivateUser throws when user not found
     * Expected outcome: throws HttpException with 404 status for non-existent user
     * Contract: precondition (user must exist)
     */
    it('throws HttpException when user not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.user.findUnique.mockResolvedValue(null);
        return await callback(mockTransaction);
      });

      await expect(
        usersService.adminActivateUser('non-existent-id', activationData, testUsers.adminUser.id),
      ).rejects.toThrow(HttpException);

      await expect(
        usersService.adminActivateUser('non-existent-id', activationData, testUsers.adminUser.id),
      ).rejects.toThrow('USER_NOT_FOUND');
    });

    /**
     * Scenario: adminActivateUser throws when user already activated
     * Expected outcome: throws HttpException with 400 status for already active user
     * Contract: precondition (user must not be already activated)
     */
    it('throws HttpException when user already activated', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.user.findUnique.mockResolvedValue(testUsers.activeUser);
        return await callback(mockTransaction);
      });

      await expect(
        usersService.adminActivateUser(
          testUsers.activeUser.id,
          activationData,
          testUsers.adminUser.id,
        ),
      ).rejects.toThrow(HttpException);

      await expect(
        usersService.adminActivateUser(
          testUsers.activeUser.id,
          activationData,
          testUsers.adminUser.id,
        ),
      ).rejects.toThrow('USER_ALREADY_ACTIVATED');
    });

    /**
     * Scenario: adminActivateUser logs activation reason
     * Expected outcome: activation reason logged for audit compliance
     * Contract: invariant (audit logging for all admin actions)
     */
    it('logs activation reason for audit compliance', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const activatedUser = {
        ...testUsers.inactiveUser,
        isActivated: true,
        verificationCode: '',
        updatedById: testUsers.adminUser.id,
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.user.findUnique.mockResolvedValue(testUsers.inactiveUser);
        mockTransaction.user.update.mockResolvedValue(activatedUser);
        return await callback(mockTransaction);
      });

      await usersService.adminActivateUser(
        testUsers.inactiveUser.id,
        activationData,
        testUsers.adminUser.id,
      );

      expect(consoleSpy).toHaveBeenCalledWith('Admin activation:', {
        userId: testUsers.inactiveUser.id,
        adminId: testUsers.adminUser.id,
        reason: activationData.reason,
        timestamp: expect.any(String),
      });

      consoleSpy.mockRestore();
    });
  });

  describe('adminDeactivateUser', () => {
    /**
     * Scenario: adminDeactivateUser succeeds for active user
     * Expected outcome: user deactivated, audit trail created
     * Contract: postcondition (user.isActivated = false, updatedById set)
     */
    it('deactivates active user successfully', async () => {
      const deactivatedUser = {
        ...testUsers.activeUser,
        isActivated: false,
        updatedById: testUsers.adminUser.id,
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.user.findUnique.mockResolvedValue(testUsers.activeUser);
        mockTransaction.user.update.mockResolvedValue(deactivatedUser);
        return await callback(mockTransaction);
      });

      const result = await usersService.adminDeactivateUser(
        testUsers.activeUser.id,
        deactivationData,
        testUsers.adminUser.id,
      );

      expect(result).toEqual(deactivatedUser);
      expect(mockTransaction.user.findUnique).toHaveBeenCalledWith({
        where: { id: testUsers.activeUser.id },
      });
      expect(mockTransaction.user.update).toHaveBeenCalledWith({
        where: { id: testUsers.activeUser.id },
        data: {
          isActivated: false,
          updatedById: testUsers.adminUser.id,
        },
      });
    });

    /**
     * Scenario: adminDeactivateUser throws when user not found
     * Expected outcome: throws HttpException with 404 status for non-existent user
     * Contract: precondition (user must exist)
     */
    it('throws HttpException when user not found', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.user.findUnique.mockResolvedValue(null);
        return await callback(mockTransaction);
      });

      await expect(
        usersService.adminDeactivateUser(
          'non-existent-id',
          deactivationData,
          testUsers.adminUser.id,
        ),
      ).rejects.toThrow(HttpException);

      await expect(
        usersService.adminDeactivateUser(
          'non-existent-id',
          deactivationData,
          testUsers.adminUser.id,
        ),
      ).rejects.toThrow('USER_NOT_FOUND');
    });

    /**
     * Scenario: adminDeactivateUser throws when user already deactivated
     * Expected outcome: throws HttpException with 400 status for already inactive user
     * Contract: precondition (user must be currently activated)
     */
    it('throws HttpException when user already deactivated', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.user.findUnique.mockResolvedValue(testUsers.inactiveUser);
        return await callback(mockTransaction);
      });

      await expect(
        usersService.adminDeactivateUser(
          testUsers.inactiveUser.id,
          deactivationData,
          testUsers.adminUser.id,
        ),
      ).rejects.toThrow(HttpException);

      await expect(
        usersService.adminDeactivateUser(
          testUsers.inactiveUser.id,
          deactivationData,
          testUsers.adminUser.id,
        ),
      ).rejects.toThrow('USER_ALREADY_DEACTIVATED');
    });

    /**
     * Scenario: adminDeactivateUser prevents self-deactivation
     * Expected outcome: throws HttpException with 400 status when admin tries to deactivate themselves
     * Contract: invariant (admin cannot deactivate their own account)
     */
    it('prevents admin from deactivating their own account', async () => {
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.user.findUnique.mockResolvedValue(testUsers.adminUser);
        return await callback(mockTransaction);
      });

      await expect(
        usersService.adminDeactivateUser(
          testUsers.adminUser.id,
          deactivationData,
          testUsers.adminUser.id,
        ),
      ).rejects.toThrow(HttpException);

      await expect(
        usersService.adminDeactivateUser(
          testUsers.adminUser.id,
          deactivationData,
          testUsers.adminUser.id,
        ),
      ).rejects.toThrow('CANNOT_DEACTIVATE_SELF');
    });

    /**
     * Scenario: adminDeactivateUser logs deactivation reason
     * Expected outcome: deactivation reason logged for audit compliance
     * Contract: invariant (audit logging for all admin actions)
     */
    it('logs deactivation reason for audit compliance', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const deactivatedUser = {
        ...testUsers.activeUser,
        isActivated: false,
        updatedById: testUsers.adminUser.id,
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        mockTransaction.user.findUnique.mockResolvedValue(testUsers.activeUser);
        mockTransaction.user.update.mockResolvedValue(deactivatedUser);
        return await callback(mockTransaction);
      });

      await usersService.adminDeactivateUser(
        testUsers.activeUser.id,
        deactivationData,
        testUsers.adminUser.id,
      );

      expect(consoleSpy).toHaveBeenCalledWith('Admin deactivation:', {
        userId: testUsers.activeUser.id,
        adminId: testUsers.adminUser.id,
        reason: deactivationData.reason,
        timestamp: expect.any(String),
      });

      consoleSpy.mockRestore();
    });
  });
});
