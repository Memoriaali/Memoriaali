/**
 * Account Activation Tests
 *
 * Tests for the user account activation functionality including
 * email verification and public activation endpoints.
 */

import { AccountType, PrismaClient, UserRole } from '@memoriaali/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PasswordService } from '@memoriaali/shared';
import { UserValidationService } from '../services/user-validation.service';
import { UsersService } from '../users.service';

// Mock the services
vi.mock('../services/email.service');
vi.mock('../services/user-validation.service');
vi.mock('@memoriaali/shared', () => ({
  PasswordService: vi.fn(),
  VerificationService: vi.fn(),
}));

describe('Account Activation', () => {
  let usersService: UsersService;
  let mockPrisma: PrismaClient;
  // let mockEmailService: EmailService;
  // let mockVerificationService: VerificationService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock Prisma client
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(),
    } as unknown as PrismaClient;

    // Create mock services
    // mockEmailService = {
    //   sendActivationEmail: vi.fn(),
    //   sendPasswordResetEmail: vi.fn(),
    //   sendWelcomeEmail: vi.fn(),
    // } as unknown as EmailService;

    // mockVerificationService = {
    //   generateEmailVerificationPackage: vi.fn(),
    //   generateVerificationCode: vi.fn(),
    //   generateSecureToken: vi.fn(),
    // } as unknown as VerificationService;

    // Create UsersService with mocked dependencies
    usersService = new UsersService(
      mockPrisma,
      new UserValidationService(mockPrisma),
      new PasswordService(),
    );
  });

  describe('activateAccountWithVerificationCode', () => {
    it('should activate account with valid email and verification code', async () => {
      // Arrange
      const email = 'test@example.com';
      const verificationCode = '123456';
      const mockUser = {
        id: 'user-123',
        email,
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        isActivated: false,
        verificationCode,
        role: UserRole.USER,
        accountType: AccountType.PRIVATE,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockActivatedUser = {
        ...mockUser,
        isActivated: true,
        verificationCode: '',
        updatedAt: new Date(),
      };

      (mockPrisma.$transaction as any).mockImplementation(
        (callback: (tx: { user: Record<string, unknown> }) => unknown) => {
          return callback({
            user: {
              findUnique: vi.fn().mockResolvedValue(mockUser),
              update: vi.fn().mockResolvedValue(mockActivatedUser),
            },
          });
        },
      );

      // Act
      const result = await usersService.activateAccountWithVerificationCode(
        email,
        verificationCode,
      );

      // Assert
      expect(result.isActivated).toBe(true);
      expect(result.verificationCode).toBe('');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw error when user not found', async () => {
      // Arrange
      const email = 'nonexistent@example.com';
      const verificationCode = '123456';

      (mockPrisma.$transaction as any).mockImplementation(
        (callback: (tx: { user: Record<string, unknown> }) => unknown) => {
          return callback({
            user: {
              findUnique: vi.fn().mockResolvedValue(null),
            },
          });
        },
      );

      // Act & Assert
      await expect(
        usersService.activateAccountWithVerificationCode(email, verificationCode),
      ).rejects.toThrow('User not found with this email');
    });

    it('should throw error when account already activated', async () => {
      // Arrange
      const email = 'test@example.com';
      const verificationCode = '123456';
      const mockUser = {
        id: 'user-123',
        email,
        isActivated: true,
        verificationCode,
      };

      (mockPrisma.$transaction as any).mockImplementation(
        (callback: (tx: { user: Record<string, unknown> }) => unknown) => {
          return callback({
            user: {
              findUnique: vi.fn().mockResolvedValue(mockUser),
            },
          });
        },
      );

      // Act & Assert
      await expect(
        usersService.activateAccountWithVerificationCode(email, verificationCode),
      ).rejects.toThrow('User account is already activated');
    });

    it('should throw error when verification code is invalid', async () => {
      // Arrange
      const email = 'test@example.com';
      const verificationCode = '123456';
      const mockUser = {
        id: 'user-123',
        email,
        isActivated: false,
        verificationCode: '654321', // Different code
      };

      (mockPrisma.$transaction as any).mockImplementation(
        (callback: (tx: { user: Record<string, unknown> }) => unknown) => {
          return callback({
            user: {
              findUnique: vi.fn().mockResolvedValue(mockUser),
            },
          });
        },
      );

      // Act & Assert
      await expect(
        usersService.activateAccountWithVerificationCode(email, verificationCode),
      ).rejects.toThrow('Invalid verification code');
    });

    it('should throw error when no verification code exists', async () => {
      // Arrange
      const email = 'test@example.com';
      const verificationCode = '123456';
      const mockUser = {
        id: 'user-123',
        email,
        isActivated: false,
        verificationCode: '', // No verification code
      };

      (mockPrisma.$transaction as any).mockImplementation(
        (callback: (tx: { user: Record<string, unknown> }) => unknown) => {
          return callback({
            user: {
              findUnique: vi.fn().mockResolvedValue(mockUser),
            },
          });
        },
      );

      // Act & Assert
      await expect(
        usersService.activateAccountWithVerificationCode(email, verificationCode),
      ).rejects.toThrow('No verification code found for this account');
    });
  });
});
