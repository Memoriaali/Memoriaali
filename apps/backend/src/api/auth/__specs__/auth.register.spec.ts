import { Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { prisma } from '../../../shared/database/prisma';
import { AuthenticatedRequest } from '../../../shared/types/AuthenticatedRequest';
import { generateJwtToken } from '../../../shared/utils/jwt.utils';
import { AuthController } from '../auth.controller';
import { RegisterInputSchema } from '../auth.schemas';

// Mock dependencies
vi.mock('../../../shared/database/prisma', () => {
  const user = {
    findFirst: vi.fn(),
    create: vi.fn(),
  };
  const refreshToken = {
    findFirst: vi.fn(),
    create: vi.fn(),
  };
  const prismaMock = { user, refreshToken };
  return {
    prisma: prismaMock,
    default: prismaMock,
  };
});
vi.mock('../../../shared/utils/jwt.utils');
vi.mock('../users/services/email.service', () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    sendActivationEmail: vi.fn().mockResolvedValue(undefined),
  })),
}));

describe('Auth Register Endpoint', () => {
  let authController: AuthController;
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  const mockPrisma = prisma as unknown as {
    user: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
    refreshToken: {
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
    };
  };
  const mockGenerateJwtToken = vi.mocked(generateJwtToken);

  beforeEach(() => {
    vi.clearAllMocks();

    authController = new AuthController();

    // Setup mock request
    mockRequest = {
      body: {},
    };

    // Setup mock response
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };

    // Setup JWT mock
    mockGenerateJwtToken.mockReturnValue('mock-access-token');
  });

  describe('Successful Registration', () => {
    it('should register new user and return tokens', async () => {
      const registrationData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'SecurePass123',
        firstName: 'New',
        lastName: 'User',
      };

      mockRequest.body = registrationData;

      // Mock no existing user
      mockPrisma.user.findFirst.mockResolvedValue(null);

      // Mock user creation
      const createdUser = {
        id: 'user-123',
        username: registrationData.username,
        email: registrationData.email,
        firstName: registrationData.firstName,
        lastName: registrationData.lastName,
        role: 'USER',
        accountType: 'PRIVATE',
        isActivated: false,
        hashedPassword: 'hashed-password',
        salt: 'salt-value',
        verificationCode: 'verification-code',
        createdAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(createdUser);

      // Mock refresh token operations
      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'token-123',
        userId: createdUser.id,
        token: 'mock-refresh-token',
      });

      await authController.register(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: expect.objectContaining({
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
          user: expect.objectContaining({
            id: createdUser.id,
            username: createdUser.username,
            email: createdUser.email,
            firstName: createdUser.firstName,
            lastName: createdUser.lastName,
            role: 'USER',
            accountType: 'PRIVATE',
            isActivated: false,
          }),
          expiresIn: expect.any(Number),
        }),
        message: 'Registration successful',
      });

      // Verify user was created with correct data
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: registrationData.username,
          email: registrationData.email.toLowerCase(),
          hashedPassword: expect.any(String),
          salt: expect.any(String),
          role: 'USER',
          accountType: 'PRIVATE',
          isActivated: false,
          verificationCode: expect.any(String),
          firstName: registrationData.firstName,
          lastName: registrationData.lastName,
        }),
      });
    });

    it('should handle optional fields correctly', async () => {
      const registrationData = {
        username: 'minimaluser',
        email: 'minimal@example.com',
        password: 'SecurePass123',
      };

      mockRequest.body = registrationData;

      mockPrisma.user.findFirst.mockResolvedValue(null);

      const createdUser = {
        id: 'user-456',
        username: registrationData.username,
        email: registrationData.email,
        firstName: null,
        lastName: null,
        companyName: null,
        role: 'USER',
        accountType: 'PRIVATE',
        isActivated: false,
        hashedPassword: 'hashed-password',
        salt: 'salt-value',
        verificationCode: 'verification-code',
        createdAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(createdUser);

      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'token-456',
        userId: createdUser.id,
        token: 'mock-refresh-token',
      });

      await authController.register(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firstName: null,
          lastName: null,
          companyName: null,
        }),
      });
    });

    it('should handle company account type', async () => {
      const registrationData = {
        username: 'companyuser',
        email: 'company@example.com',
        password: 'SecurePass123',
        companyName: 'Example Corp',
        accountType: 'COMPANY',
      };

      mockRequest.body = registrationData;

      mockPrisma.user.findFirst.mockResolvedValue(null);

      const createdUser = {
        id: 'user-789',
        username: registrationData.username,
        email: registrationData.email,
        companyName: registrationData.companyName,
        role: 'USER',
        accountType: 'COMPANY',
        isActivated: false,
        hashedPassword: 'hashed-password',
        salt: 'salt-value',
        verificationCode: 'verification-code',
        createdAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(createdUser);

      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'token-789',
        userId: createdUser.id,
        token: 'mock-refresh-token',
      });

      await authController.register(mockRequest as AuthenticatedRequest, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          accountType: 'COMPANY',
          companyName: registrationData.companyName,
        }),
      });
    });
  });

  describe('Registration Failures', () => {
    it('should reject registration when username already exists', async () => {
      const registrationData = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'SecurePass123',
      };

      mockRequest.body = registrationData;

      // Mock existing user with same username
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        username: 'existinguser',
        email: 'other@example.com',
      });

      await expect(
        authController.register(mockRequest as AuthenticatedRequest, mockResponse as Response),
      ).rejects.toThrow('Username is already taken');

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should reject registration when email already exists', async () => {
      const registrationData = {
        username: 'newuser',
        email: 'existing@example.com',
        password: 'SecurePass123',
      };

      mockRequest.body = registrationData;

      // Mock existing user with same email
      mockPrisma.user.findFirst.mockResolvedValue({
        id: 'existing-user',
        username: 'otheruser',
        email: 'existing@example.com',
      });

      await expect(
        authController.register(mockRequest as AuthenticatedRequest, mockResponse as Response),
      ).rejects.toThrow('Email is already registered');

      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('Input Validation', () => {
    it('should reject invalid username format', () => {
      const invalidData = {
        username: 'ab', // Too short
        email: 'test@example.com',
        password: 'SecurePass123',
      };

      expect(() => RegisterInputSchema.parse(invalidData)).toThrow(
        'Username must be at least 3 characters',
      );
    });

    it('should reject invalid email format', () => {
      const invalidData = {
        username: 'validuser',
        email: 'invalid-email',
        password: 'SecurePass123',
      };

      expect(() => RegisterInputSchema.parse(invalidData)).toThrow('Invalid email address');
    });

    it('should reject weak password', () => {
      const invalidData = {
        username: 'validuser',
        email: 'test@example.com',
        password: 'weak', // Too short, no uppercase/numbers
      };

      expect(() => RegisterInputSchema.parse(invalidData)).toThrow(
        'Password must be at least 8 characters',
      );
    });

    it('should reject password without uppercase', () => {
      const invalidData = {
        username: 'validuser',
        email: 'test@example.com',
        password: 'lowercase123',
      };

      expect(() => RegisterInputSchema.parse(invalidData)).toThrow(
        'Password must contain uppercase, lowercase, and number',
      );
    });

    it('should reject password without lowercase', () => {
      const invalidData = {
        username: 'validuser',
        email: 'test@example.com',
        password: 'UPPERCASE123',
      };

      expect(() => RegisterInputSchema.parse(invalidData)).toThrow(
        'Password must contain uppercase, lowercase, and number',
      );
    });

    it('should reject password without number', () => {
      const invalidData = {
        username: 'validuser',
        email: 'test@example.com',
        password: 'NoNumbers',
      };

      expect(() => RegisterInputSchema.parse(invalidData)).toThrow(
        'Password must contain uppercase, lowercase, and number',
      );
    });

    it('should reject username with invalid characters', () => {
      const invalidData = {
        username: 'user@name', // Contains @
        email: 'test@example.com',
        password: 'SecurePass123',
      };

      expect(() => RegisterInputSchema.parse(invalidData)).toThrow(
        'Username can only contain letters, numbers, underscores, and hyphens',
      );
    });

    it('should normalize email to lowercase', () => {
      const data = {
        username: 'validuser',
        email: 'Test@EXAMPLE.COM',
        password: 'SecurePass123',
      };

      const parsed = RegisterInputSchema.parse(data);
      expect(parsed.email).toBe('test@example.com');
    });

    it('should trim whitespace from inputs', () => {
      const data = {
        username: '  validuser  ',
        email: '  test@example.com  ',
        password: 'SecurePass123',
        firstName: '  John  ',
        lastName: '  Doe  ',
      };

      const parsed = RegisterInputSchema.parse(data);
      expect(parsed.username).toBe('validuser');
      expect(parsed.email).toBe('test@example.com');
      expect(parsed.firstName).toBe('John');
      expect(parsed.lastName).toBe('Doe');
    });
  });

  describe('Security Considerations', () => {
    it('should not expose sensitive information in response', async () => {
      const registrationData = {
        username: 'secureuser',
        email: 'secure@example.com',
        password: 'SecurePass123',
      };

      mockRequest.body = registrationData;

      mockPrisma.user.findFirst.mockResolvedValue(null);

      const createdUser = {
        id: 'user-secure',
        username: registrationData.username,
        email: registrationData.email,
        role: 'USER',
        accountType: 'PRIVATE',
        isActivated: false,
        hashedPassword: 'should-not-be-exposed',
        salt: 'should-not-be-exposed',
        verificationCode: 'should-not-be-exposed',
        createdAt: new Date(),
      };
      mockPrisma.user.create.mockResolvedValue(createdUser);

      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'token-secure',
        userId: createdUser.id,
        token: 'mock-refresh-token',
      });

      await authController.register(mockRequest as AuthenticatedRequest, mockResponse as Response);

      const responseJsonMock = mockResponse.json as unknown as ReturnType<typeof vi.fn>;
      const responseData = responseJsonMock.mock.calls[0][0].data;

      // Ensure sensitive fields are not exposed
      expect(responseData.user).not.toHaveProperty('hashedPassword');
      expect(responseData.user).not.toHaveProperty('salt');
      expect(responseData.user).not.toHaveProperty('verificationCode');
      expect(responseData.user).not.toHaveProperty('password');
    });

    it('should hash password before storage', async () => {
      const registrationData = {
        username: 'hashtest',
        email: 'hash@example.com',
        password: 'PlainTextPassword123',
      };

      mockRequest.body = registrationData;

      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-hash',
        username: registrationData.username,
        email: registrationData.email,
        role: 'USER',
        accountType: 'PRIVATE',
        isActivated: false,
        hashedPassword: 'hashed-version',
        salt: 'random-salt',
        verificationCode: 'verification-code',
        createdAt: new Date(),
      });

      mockPrisma.refreshToken.findFirst.mockResolvedValue(null);
      mockPrisma.refreshToken.create.mockResolvedValue({
        id: 'token-hash',
        userId: 'user-hash',
        token: 'mock-refresh-token',
      });

      await authController.register(mockRequest as AuthenticatedRequest, mockResponse as Response);

      // Verify password was not stored in plain text
      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(createCall.data.hashedPassword).not.toBe(registrationData.password);
      expect(createCall.data.hashedPassword).toBeTruthy();
      expect(createCall.data.salt).toBeTruthy();
      expect(createCall.data).not.toHaveProperty('password');
    });
  });
});
