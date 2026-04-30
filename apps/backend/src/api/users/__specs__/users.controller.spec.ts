/**
 * Unit Tests for UsersController - Admin Account Management
 *
 * Tests controller layer for admin-only activation and deactivation operations including:
 * - HTTP request/response handling for user activation
 * - HTTP request/response handling for user deactivation
 * - Authorization and validation error handling
 * - Proper HTTP status codes and response formats
 *
 * Each test verifies the contract: preconditions, postconditions, and invariants
 */

import { AccountType, User, UserRole } from '@memoriaali/database';
import { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpException } from '../../../shared/errors';
import { AuthenticatedRequest } from '../../../shared/types/AuthenticatedRequest';
import { AuthenticatedUser } from '../../../shared/types/authenticated-user';
import { UsersController } from '../users.controller';
import { UsersService } from '../users.service';

describe('UsersController - Admin Account Management', () => {
  let usersController: UsersController;
  let mockUsersService: any;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;

  // Test user fixtures - using proper AuthenticatedUser class instances
  const testUsers = {
    adminUser: new AuthenticatedUser(
      'admin-123',
      'admin@example.com',
      'Admin',
      'User',
      'ADMIN',
      true, // isActive
      true, // isVerified
    ),

    regularUser: new AuthenticatedUser(
      'user-456',
      'user@example.com',
      'Regular',
      'User',
      'USER',
      true, // isActive
      true, // isVerified
    ),

    inactiveUser: {
      id: 'user-789',
      username: 'inactive.user',
      hashedPassword: '$2b$12$test.hash.here',
      salt: 'test-salt-789',
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

    activatedUser: {
      id: 'user-789',
      username: 'inactive.user',
      hashedPassword: '$2b$12$test.hash.here',
      salt: 'test-salt-789',
      role: UserRole.USER,
      accountType: AccountType.PRIVATE,
      isActivated: true,
      verificationCode: '',
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
      updatedById: 'admin-123',
    } as User,
  };

  beforeEach(() => {
    // Create fresh mocks for each test
    mockUsersService = {
      adminActivateUser: vi.fn(),
      adminDeactivateUser: vi.fn(),
    };

    mockResponse = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
    };

    usersController = new UsersController(mockUsersService as UsersService);
  });

  describe('activateUser', () => {
    /**
     * Scenario: activateUser succeeds when admin makes valid request
     * Expected outcome: user activated and success response returned
     * Contract: postcondition (HTTP 200, success message, activation status returned)
     */
    it('activates user successfully when admin makes valid request', async () => {
      const activationData = {
        reason: 'Email verification not working for user',
      };

      mockRequest = {
        authenticatedUser: testUsers.adminUser,
        params: { id: testUsers.inactiveUser.id },
        body: activationData,
      };

      mockUsersService.adminActivateUser.mockResolvedValue(testUsers.activatedUser);

      await usersController.activateUser(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      expect(mockUsersService.adminActivateUser).toHaveBeenCalledWith(
        testUsers.inactiveUser.id,
        { ...activationData, isActivated: true },
        testUsers.adminUser.id,
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'User account activated successfully',
        data: {
          id: testUsers.activatedUser.id,
          isActivated: testUsers.activatedUser.isActivated,
        },
      });
    });

    /**
     * Scenario: activateUser throws when non-admin user makes request
     * Expected outcome: throws HttpException with 403 status for non-admin user
     * Contract: precondition (user must have admin privileges)
     */
    it('throws HttpException when non-admin user makes request', async () => {
      mockRequest = {
        authenticatedUser: testUsers.regularUser,
        params: { id: testUsers.inactiveUser.id },
        body: { reason: 'Unauthorized activation attempt' },
      };

      await expect(
        usersController.activateUser(mockRequest as AuthenticatedRequest, mockResponse as Response),
      ).rejects.toThrow(HttpException);

      await expect(
        usersController.activateUser(mockRequest as AuthenticatedRequest, mockResponse as Response),
      ).rejects.toThrow('FORBIDDEN');

      expect(mockUsersService.adminActivateUser).not.toHaveBeenCalled();
    });

    /**
     * Scenario: activateUser throws when user ID is missing
     * Expected outcome: throws HttpException with 400 status for missing user ID
     * Contract: precondition (user ID must be provided in URL params)
     */
    it('throws HttpException when user ID is missing', async () => {
      mockRequest = {
        authenticatedUser: testUsers.adminUser,
        params: {},
        body: { reason: 'Test activation' },
      };

      await expect(
        usersController.activateUser(mockRequest as AuthenticatedRequest, mockResponse as Response),
      ).rejects.toThrow(HttpException);

      await expect(
        usersController.activateUser(mockRequest as AuthenticatedRequest, mockResponse as Response),
      ).rejects.toThrow('BAD_REQUEST');

      expect(mockUsersService.adminActivateUser).not.toHaveBeenCalled();
    });

    /**
     * Scenario: activateUser validates input schema
     * Expected outcome: schema validation applied to request body including reason field
     * Contract: invariant (all input data validated according to UserActivationInputSchema)
     */
    it('validates input according to UserActivationInputSchema', async () => {
      const activationData = {
        reason: 'Valid activation reason',
      };

      mockRequest = {
        authenticatedUser: testUsers.adminUser,
        params: { id: testUsers.inactiveUser.id },
        body: activationData,
      };

      mockUsersService.adminActivateUser.mockResolvedValue(testUsers.activatedUser);

      await usersController.activateUser(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      // Verify that the schema parsing adds isActivated: true
      expect(mockUsersService.adminActivateUser).toHaveBeenCalledWith(
        testUsers.inactiveUser.id,
        { reason: activationData.reason, isActivated: true },
        testUsers.adminUser.id,
      );
    });
  });

  describe('deactivateUser', () => {
    /**
     * Scenario: deactivateUser succeeds when admin makes valid request
     * Expected outcome: user deactivated and success response returned
     * Contract: postcondition (HTTP 200, success message, deactivation status returned)
     */
    it('deactivates user successfully when admin makes valid request', async () => {
      const deactivationData = {
        reason: 'Policy violation - inappropriate content',
      };

      const deactivatedUser = {
        ...testUsers.activatedUser,
        isActivated: false,
        updatedById: testUsers.adminUser.id,
      };

      mockRequest = {
        authenticatedUser: testUsers.adminUser,
        params: { id: testUsers.activatedUser.id },
        body: deactivationData,
      };

      mockUsersService.adminDeactivateUser.mockResolvedValue(deactivatedUser);

      await usersController.deactivateUser(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      expect(mockUsersService.adminDeactivateUser).toHaveBeenCalledWith(
        testUsers.activatedUser.id,
        { ...deactivationData, isActivated: false },
        testUsers.adminUser.id,
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'User account deactivated successfully',
        data: {
          id: deactivatedUser.id,
          isActivated: deactivatedUser.isActivated,
        },
      });
    });

    /**
     * Scenario: deactivateUser throws when non-admin user makes request
     * Expected outcome: throws HttpException with 403 status for non-admin user
     * Contract: precondition (user must have admin privileges)
     */
    it('throws HttpException when non-admin user makes request', async () => {
      mockRequest = {
        authenticatedUser: testUsers.regularUser,
        params: { id: testUsers.activatedUser.id },
        body: { reason: 'Unauthorized deactivation attempt' },
      };

      await expect(
        usersController.deactivateUser(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
        ),
      ).rejects.toThrow(HttpException);

      await expect(
        usersController.deactivateUser(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
        ),
      ).rejects.toThrow('FORBIDDEN');

      expect(mockUsersService.adminDeactivateUser).not.toHaveBeenCalled();
    });

    /**
     * Scenario: deactivateUser throws when user ID is missing
     * Expected outcome: throws HttpException with 400 status for missing user ID
     * Contract: precondition (user ID must be provided in URL params)
     */
    it('throws HttpException when user ID is missing', async () => {
      mockRequest = {
        authenticatedUser: testUsers.adminUser,
        params: {},
        body: { reason: 'Test deactivation' },
      };

      await expect(
        usersController.deactivateUser(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
        ),
      ).rejects.toThrow(HttpException);

      await expect(
        usersController.deactivateUser(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
        ),
      ).rejects.toThrow('BAD_REQUEST');

      expect(mockUsersService.adminDeactivateUser).not.toHaveBeenCalled();
    });

    /**
     * Scenario: deactivateUser prevents admin from deactivating themselves
     * Expected outcome: throws HttpException with 400 status when admin tries to deactivate own account
     * Contract: invariant (admin cannot deactivate their own account)
     */
    it('prevents admin from deactivating their own account', async () => {
      mockRequest = {
        authenticatedUser: testUsers.adminUser,
        params: { id: testUsers.adminUser.id },
        body: { reason: 'Self-deactivation attempt' },
      };

      await expect(
        usersController.deactivateUser(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
        ),
      ).rejects.toThrow(HttpException);

      await expect(
        usersController.deactivateUser(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
        ),
      ).rejects.toThrow('BAD_REQUEST');

      expect(mockUsersService.adminDeactivateUser).not.toHaveBeenCalled();
    });

    /**
     * Scenario: deactivateUser validates input schema
     * Expected outcome: schema validation applied to request body including reason field
     * Contract: invariant (all input data validated according to UserActivationInputSchema)
     */
    it('validates input according to UserActivationInputSchema', async () => {
      const deactivationData = {
        reason: 'Valid deactivation reason',
      };

      const deactivatedUser = {
        ...testUsers.activatedUser,
        isActivated: false,
        updatedById: testUsers.adminUser.id,
      };

      mockRequest = {
        authenticatedUser: testUsers.adminUser,
        params: { id: testUsers.activatedUser.id },
        body: deactivationData,
      };

      mockUsersService.adminDeactivateUser.mockResolvedValue(deactivatedUser);

      await usersController.deactivateUser(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response,
      );

      // Verify that the schema parsing adds isActivated: false
      expect(mockUsersService.adminDeactivateUser).toHaveBeenCalledWith(
        testUsers.activatedUser.id,
        { reason: deactivationData.reason, isActivated: false },
        testUsers.adminUser.id,
      );
    });

    /**
     * Scenario: deactivateUser handles service layer errors properly
     * Expected outcome: service errors bubble up as HttpExceptions
     * Contract: invariant (service layer errors propagate correctly to error handling middleware)
     */
    it('handles service layer errors properly', async () => {
      mockRequest = {
        authenticatedUser: testUsers.adminUser,
        params: { id: 'non-existent-user' },
        body: { reason: 'Test deactivation' },
      };

      const serviceError = new HttpException(404, 'USER_NOT_FOUND', 'User not found');
      mockUsersService.adminDeactivateUser.mockRejectedValue(serviceError);

      await expect(
        usersController.deactivateUser(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response,
        ),
      ).rejects.toThrow(serviceError);

      expect(mockUsersService.adminDeactivateUser).toHaveBeenCalledWith(
        'non-existent-user',
        { reason: 'Test deactivation', isActivated: false },
        testUsers.adminUser.id,
      );
    });
  });
});
