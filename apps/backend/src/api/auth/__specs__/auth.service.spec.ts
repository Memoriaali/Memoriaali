import type { PrismaClient } from '@memoriaali/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HttpException } from '../../../shared/errors';
import { AuthService } from '../auth.service';

// Mock all dependencies
const mockBcryptCompare = vi.fn();
vi.mock('bcryptjs', () => ({
  compare: mockBcryptCompare,
}));

vi.mock('../../../shared/utils/jwt.utils', () => ({
  generateJwtToken: vi.fn(() => 'mock-access-token'),
  verifyJwtToken: vi.fn(),
}));

vi.mock('crypto', () => ({
  randomBytes: vi.fn(() => ({
    toString: () => 'mock-refresh-token',
  })),
}));

import { createSharedPrismaMock } from '../../../__mocks__/prisma.mock';
const { prismaMock, resetAll } = createSharedPrismaMock();
const mockPrisma = prismaMock as unknown as PrismaClient;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    resetAll();
    authService = new AuthService(mockPrisma);
  });

  describe('login', () => {
    it('should successfully authenticate user with valid credentials', async () => {
      // Mock user data
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        accountType: 'PRIVATE',
        isActivated: true,
        hashedPassword: 'hashed-password',
        salt: 'salt-123',
      };

      // Mock Prisma responses
      (mockPrisma.user.findFirst as any).mockResolvedValue(mockUser);
      (mockPrisma.refreshToken.findFirst as any).mockResolvedValue(null);
      (mockPrisma.refreshToken.create as any).mockResolvedValue({});

      // Mock bcrypt comparison to return true (valid password)
      mockBcryptCompare.mockResolvedValue(true);

      // Debug: Check if mock is set up correctly
      console.log('Mock bcrypt compare setup:', mockBcryptCompare.mockResolvedValue);
      console.log('Mock bcrypt compare calls:', mockBcryptCompare.mock.calls);

      // Test login
      const result = await authService.login({
        identifier: 'testuser',
        password: 'password123',
      });

      // Debug: Check what was called
      console.log('Mock bcrypt compare calls after login:', mockBcryptCompare.mock.calls);

      // Verify result
      expect(result).toEqual({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        user: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'USER',
          accountType: 'PRIVATE',
          isActivated: true,
        },
        expiresIn: expect.any(Number),
      });

      // Verify Prisma calls
      expect(mockPrisma.user.findFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ username: 'testuser' }, { email: 'testuser' }],
        },
      });

      // Verify bcrypt was called with correct parameters
      expect(mockBcryptCompare).toHaveBeenCalledWith('password123salt-123', 'hashed-password');
    });

    it('should throw error for non-existent user', async () => {
      // Mock Prisma to return null (user not found)
      (mockPrisma.user.findFirst as any).mockResolvedValue(null);

      // Test login with non-existent user
      await expect(
        authService.login({
          identifier: 'nonexistent',
          password: 'password123',
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should throw error for inactive user', async () => {
      // Mock user data with inactive account
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        accountType: 'PRIVATE',
        isActivated: false,
        hashedPassword: 'hashed-password',
        salt: 'salt-123',
      };

      // Mock Prisma responses
      (mockPrisma.user.findFirst as any).mockResolvedValue(mockUser);

      // Test login with inactive user
      await expect(
        authService.login({
          identifier: 'testuser',
          password: 'password123',
        }),
      ).rejects.toThrow(HttpException);
    });

    it('should throw error for invalid password', async () => {
      // Mock user data
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'USER',
        accountType: 'PRIVATE',
        isActivated: true,
        hashedPassword: 'hashed-password',
        salt: 'salt-123',
      };

      // Mock Prisma responses
      (mockPrisma.user.findFirst as any).mockResolvedValue(mockUser);

      // Mock bcrypt comparison to return false (invalid password)
      mockBcryptCompare.mockResolvedValue(false);

      // Test login with invalid password
      await expect(
        authService.login({
          identifier: 'testuser',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(HttpException);
    });
  });
});
