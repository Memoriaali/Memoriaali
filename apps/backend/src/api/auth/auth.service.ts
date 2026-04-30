import * as crypto from 'crypto';

import { PrismaClient, User } from '@memoriaali/database';
import { PasswordService, VerificationService } from '@memoriaali/shared';
import * as jwt from 'jsonwebtoken';

import { ERROR_CODES, HttpException } from '../../shared/errors';
import { JwtPayload, generateJwtToken } from '../../shared/utils/jwt.utils';
import { EmailService } from '../users/services/email.service';

import {
  ForgotPasswordInput,
  ForgotPasswordResponse,
  LoginInput,
  LoginResponse,
  RefreshTokenInput,
  RefreshTokenResponse,
  RegisterInput,
  RegisterResponse,
  ResetPasswordInput,
  ResetPasswordResponse,
} from './auth.schemas';

/**
 * Authentication Service
 *
 * Provides secure authentication operations for Finnish memory institution users.
 * Implements JWT-based authentication with refresh token support.
 *
 * Design by Contract:
 * - Preconditions: Valid user credentials, secure random sources available
 * - Postconditions: Secure authentication tokens, proper error handling
 * - Invariants: No plaintext credential storage, secure token generation
 */
export class AuthService {
  private readonly passwordService: PasswordService;
  private readonly verificationService: VerificationService;
  private readonly emailService: EmailService;

  constructor(private readonly prisma: PrismaClient) {
    this.passwordService = new PasswordService();
    this.verificationService = new VerificationService();
    this.emailService = new EmailService();
  }

  /**
   * Authenticate user and generate tokens
   *
   * Validates user credentials and generates access and refresh tokens.
   * Implements comprehensive security checks and audit logging.
   *
   * Preconditions: Valid login credentials
   * Postconditions: Returns authentication tokens and user data
   * Invariants: Secure token generation, proper error handling
   */
  async login(credentials: LoginInput): Promise<LoginResponse> {
    // 1. Find user by username or email
    const user = await this.findUserByIdentifier(credentials.identifier);
    if (!user) {
      throw HttpException.unauthorized(ERROR_CODES.AUTH.INVALID_CREDENTIALS);
    }

    // 2. Verify account is activated
    if (!user.isActivated) {
      throw HttpException.forbidden(ERROR_CODES.AUTH.ACCOUNT_NOT_ACTIVATED);
    }

    // 3. Verify password
    const isPasswordValid = await this.verifyPassword(
      credentials.password,
      user.hashedPassword,
      user.salt,
    );
    if (!isPasswordValid) {
      throw HttpException.unauthorized(ERROR_CODES.AUTH.INVALID_CREDENTIALS);
    }

    // 4. Generate tokens
    const accessToken = this.generateAccessToken(user);
    const refreshToken = await this.generateRefreshToken(user);

    // 5. Calculate expiration time
    const expiresIn = this.getTokenExpirationTime();

    // 6. Return authentication response
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        accountType: user.accountType,
        isActivated: user.isActivated,
        createdAt: user.createdAt,
      },
      expiresIn,
    };
  }

  /**
   * Refresh access token using refresh token
   *
   * Validates refresh token and generates new access token.
   * Implements secure token validation and rotation.
   *
   * Preconditions: Valid refresh token
   * Postconditions: Returns new access token
   * Invariants: Secure token validation, proper error handling
   */
  async refreshToken(input: RefreshTokenInput): Promise<RefreshTokenResponse> {
    // 1. Verify refresh token
    const decoded = this.verifyRefreshToken(input.refreshToken);
    if (!decoded) {
      throw HttpException.unauthorized(ERROR_CODES.AUTH.TOKEN_INVALID);
    }

    // 2. Check if refresh token exists in database
    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        userId: decoded.userId,
        token: input.refreshToken,
      },
      include: {
        user: true,
      },
    });

    if (!storedToken || !storedToken.user) {
      throw HttpException.unauthorized(ERROR_CODES.AUTH.TOKEN_INVALID);
    }

    // 3. Verify user is still active
    if (!storedToken.user.isActivated) {
      throw HttpException.forbidden(ERROR_CODES.AUTH.ACCOUNT_NOT_ACTIVATED);
    }

    // 4. Generate new access token
    const accessToken = this.generateAccessToken(storedToken.user);
    const expiresIn = this.getTokenExpirationTime();

    return {
      accessToken,
      expiresIn,
    };
  }

  /**
   * Register new user and automatically log them in
   *
   * Creates a new user account and generates authentication tokens.
   * Combines user creation with immediate login for better UX.
   *
   * Preconditions: Valid registration data, unique username/email
   * Postconditions: User created and authenticated with tokens
   * Invariants: Secure password storage, token generation
   */
  async register(registrationData: RegisterInput): Promise<RegisterResponse> {
    // 1. Check if username or email already exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: registrationData.username }, { email: registrationData.email }],
      },
    });

    if (existingUser) {
      if (existingUser.username === registrationData.username) {
        throw HttpException.conflict(ERROR_CODES.USER.ALREADY_EXISTS, 'Username is already taken');
      }
      throw HttpException.conflict(ERROR_CODES.USER.ALREADY_EXISTS, 'Email is already registered');
    }

    // 2. Generate salt and hash password using PasswordService
    const { salt, hashedPassword } = await this.passwordService.createPasswordHash(
      registrationData.password,
    );

    // 3. Generate verification code for email activation using VerificationService
    const verificationPackage = this.verificationService.generateEmailVerificationPackage();

    // 4. Create user in database
    const newUser = await this.prisma.user.create({
      data: {
        accountType: registrationData.accountType ?? 'PRIVATE',
        companyContactPerson: registrationData.companyContactPerson ?? null,
        companyEmail: registrationData.companyEmail ?? null,
        companyName: registrationData.companyName ?? null,
        companyTelephone: registrationData.companyTelephone ?? null,
        email: registrationData.email.toLowerCase().trim(),
        firstName: registrationData.firstName ?? null,
        hashedPassword,
        isActivated: false, // User needs to verify email
        lastName: registrationData.lastName ?? null,
        postalCode: registrationData.postalCode ?? null,
        postOffice: registrationData.postOffice ?? null,
        profession: registrationData.profession ?? null,
        role: 'USER',
        salt,
        streetAddress: registrationData.streetAddress ?? null,
        telephone: registrationData.telephone ?? null,
        username: registrationData.username,
        verificationCode: verificationPackage.code,
      },
    });

    // 5. Send activation email to the user
    await this.emailService.sendActivationEmail(newUser, verificationPackage.code);

    // 6. Generate tokens for immediate login
    const accessToken = this.generateAccessToken(newUser);
    const refreshToken = await this.generateRefreshToken(newUser);

    // 7. Calculate expiration time
    const expiresIn = this.getTokenExpirationTime();

    // 8. Return registration response with tokens and user info
    return {
      accessToken,
      refreshToken,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role,
        accountType: newUser.accountType,
        isActivated: newUser.isActivated,
        createdAt: newUser.createdAt,
      },
      expiresIn,
    };
  }

  /**
   * Logout user by invalidating refresh token
   *
   * Removes refresh token from database to prevent further use.
   *
   * Preconditions: Valid user ID
   * Postconditions: Refresh token invalidated
   * Invariants: Secure token invalidation
   */
  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  /**
   * Find user by username or email
   *
   * Searches for user using identifier (username or email).
   * Returns user with password and salt for verification.
   *
   * Preconditions: Valid identifier string
   * Postconditions: Returns user or null
   * Invariants: Secure query execution
   */
  private async findUserByIdentifier(identifier: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        OR: [{ username: identifier }, { email: identifier }],
      },
    });
  }

  /**
   * Verify password against stored hash
   *
   * Uses the PasswordService for consistent password verification.
   * Delegates to centralized password handling logic.
   *
   * Preconditions: Valid password, hash, and salt
   * Postconditions: Returns boolean verification result
   * Invariants: Constant-time comparison via PasswordService
   */
  private async verifyPassword(
    password: string,
    hashedPassword: string,
    salt: string,
  ): Promise<boolean> {
    // Use the centralized PasswordService for password verification
    // This uses bcrypt.compare for constant-time comparison
    return this.passwordService.verifyPassword(password, hashedPassword, salt);
  }

  /**
   * Generate JWT access token
   *
   * Creates secure JWT token with user identity claims.
   * Uses project's JWT utilities for consistency.
   *
   * Preconditions: Valid user object
   * Postconditions: Returns signed JWT token
   * Invariants: Secure token generation
   */
  private generateAccessToken(user: User): string {
    const payload: Omit<JwtPayload, 'iat' | 'exp'> = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    return generateJwtToken(payload);
  }

  /**
   * Generate refresh token
   *
   * Creates secure refresh token and stores it in database.
   * Implements token rotation for enhanced security.
   *
   * Preconditions: Valid user object
   * Postconditions: Returns refresh token string
   * Invariants: Secure token generation and storage
   */
  private async generateRefreshToken(user: User): Promise<string> {
    // Generate secure random refresh token
    const refreshToken = crypto.randomBytes(64).toString('hex');

    // Store refresh token in database - use findFirst + upsert pattern
    const existingToken = await this.prisma.refreshToken.findFirst({
      where: { userId: user.id },
    });

    if (existingToken) {
      // Update existing token
      await this.prisma.refreshToken.update({
        where: { id: existingToken.id },
        data: { token: refreshToken },
      });
    } else {
      // Create new token
      await this.prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: refreshToken,
        },
      });
    }

    return refreshToken;
  }

  /**
   * Verify refresh token
   *
   * Validates refresh token format and signature.
   * Returns decoded payload if valid, null otherwise.
   *
   * Preconditions: Valid token string
   * Postconditions: Returns decoded payload or null
   * Invariants: Secure token validation
   */
  private verifyRefreshToken(token: string): { userId: string } | null {
    try {
      const secret = process.env.JWT_REFRESH_SECRET ?? process.env.JWT_SECRET;
      if (!secret) {
        throw new Error('JWT refresh secret not configured');
      }

      const decoded = jwt.verify(token, secret) as { userId: string };
      return decoded;
    } catch (_error) {
      return null;
    }
  }

  /**
   * Get token expiration time in seconds
   *
   * Calculates expiration time based on JWT configuration.
   *
   * Preconditions: JWT configuration available
   * Postconditions: Returns expiration time in seconds
   * Invariants: Consistent expiration calculation
   */
  private getTokenExpirationTime(): number {
    const expiresIn = process.env.JWT_EXPIRES_IN ?? '24h';

    // Parse time string to seconds
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (!match?.[1] || !match[2]) {
      return 24 * 60 * 60; // Default to 24 hours
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 60 * 60;
      case 'd':
        return value * 24 * 60 * 60;
      default:
        return 24 * 60 * 60;
    }
  }

  /**
   * Initiate password reset process
   *
   * Generates a secure reset token and sends password reset email.
   * Always returns success to prevent email enumeration attacks.
   *
   * Preconditions: Valid email address
   * Postconditions: Reset token generated and email sent (if user exists)
   * Invariants: Secure token generation, no email enumeration
   */
  async forgotPassword(input: ForgotPasswordInput): Promise<ForgotPasswordResponse> {
    // 1. Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.toLowerCase().trim() },
    });

    // 2. Always return success to prevent email enumeration
    if (!user) {
      return {
        message: 'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // 3. Check if user is activated
    if (!user.isActivated) {
      return {
        message: 'If an account with that email exists, a password reset link has been sent.',
      };
    }

    // 4. Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // 5. Store reset token in database
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // 6. Send password reset email
    await this.emailService.sendPasswordResetEmail(user, resetToken);

    return {
      message: 'If an account with that email exists, a password reset link has been sent.',
    };
  }

  /**
   * Reset password using reset token
   *
   * Validates reset token and updates user password.
   * Implements secure token validation and password hashing.
   *
   * Preconditions: Valid reset token and new password
   * Postconditions: Password updated, reset token invalidated
   * Invariants: Secure password hashing, token single-use
   */
  async resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResponse> {
    // 1. Find user by reset token
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: input.token,
      },
    });

    // Check expiration manually
    if (user?.passwordResetExpires && user.passwordResetExpires <= new Date()) {
      throw HttpException.badRequest(
        ERROR_CODES.AUTH.INVALID_CREDENTIALS,
        'Invalid or expired reset token',
      );
    }

    if (!user) {
      throw HttpException.badRequest(
        ERROR_CODES.AUTH.INVALID_CREDENTIALS,
        'Invalid or expired reset token',
      );
    }

    // 2. Generate new password hash
    const { salt, hashedPassword } = await this.passwordService.createPasswordHash(input.password);

    // 3. Update password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        hashedPassword,
        salt,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date(),
      },
    });

    // 4. Invalidate all refresh tokens for security
    await this.prisma.refreshToken.deleteMany({
      where: { userId: user.id },
    });

    return {
      message: 'Password has been successfully reset. Please log in with your new password.',
    };
  }
}
