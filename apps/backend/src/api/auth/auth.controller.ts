import { Response } from 'express';

import { prisma } from '../../shared/database/prisma';
import { AuthenticatedRequest } from '../../shared/types/AuthenticatedRequest';

import {
  ForgotPasswordInputSchema,
  ForgotPasswordResponseSchema,
  LoginInputSchema,
  LoginResponseSchema,
  RefreshTokenInputSchema,
  RegisterInputSchema,
  RegisterResponseSchema,
  ResetPasswordInputSchema,
  ResetPasswordResponseSchema,
} from './auth.schemas';
import { AuthService } from './auth.service';

/**
 * Authentication Controller
 *
 * Handles HTTP requests for authentication operations.
 * Implements request validation, service delegation, and response formatting.
 *
 * Design by Contract:
 * - Preconditions: Valid HTTP requests with proper validation
 * - Postconditions: Structured API responses with appropriate status codes
 * - Invariants: Consistent error handling, security field omission
 */
export class AuthController {
  private readonly authService: AuthService;

  constructor() {
    this.authService = new AuthService(prisma);
  }

  /**
   * Handle user login request
   *
   * Validates login credentials and returns authentication tokens.
   * Implements comprehensive security checks and audit logging.
   *
   * Preconditions: Valid login request with credentials
   * Postconditions: Returns authentication response or error
   * Invariants: Secure credential handling, proper error responses
   */
  login = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // 1. Validate request body
    const validatedData = LoginInputSchema.parse(req.body);

    // 2. Authenticate user and generate tokens
    const result = await this.authService.login(validatedData);

    // 3. Validate response
    const validatedResponse = LoginResponseSchema.parse(result);

    // 4. Return success response
    res.status(200).json({
      status: 'success',
      data: validatedResponse,
      message: 'Login successful',
    });
  };

  /**
   * Handle refresh token request
   *
   * Validates refresh token and returns new access token.
   * Implements secure token validation and rotation.
   *
   * Preconditions: Valid refresh token in request body
   * Postconditions: Returns new access token or error
   * Invariants: Secure token handling, proper error responses
   */
  refreshToken = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // 1. Validate request body
    const validatedData = RefreshTokenInputSchema.parse(req.body);

    // 2. Refresh access token
    const result = await this.authService.refreshToken(validatedData);

    // 3. Return success response
    res.status(200).json({
      status: 'success',
      data: result,
      message: 'Token refreshed successfully',
    });
  };

  /**
   * Handle user registration request
   *
   * Creates a new user account and automatically logs them in.
   * Returns authentication tokens for immediate access.
   *
   * Preconditions: Valid registration data, unique username/email
   * Postconditions: User created and authenticated
   * Invariants: Secure password storage, proper error responses
   */
  register = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // 1. Validate request body
    const validatedData = RegisterInputSchema.parse(req.body);

    // 2. Register user and generate tokens
    const result = await this.authService.register(validatedData);

    // 3. Validate response
    const validatedResponse = RegisterResponseSchema.parse(result);

    // 4. Return success response
    res.status(201).json({
      status: 'success',
      data: validatedResponse,
      message: 'Registration successful',
    });
  };

  /**
   * Handle user logout request
   *
   * Invalidates user's refresh token to prevent further use.
   * Requires authentication to identify the user.
   *
   * Preconditions: Authenticated user request
   * Postconditions: Refresh token invalidated
   * Invariants: Secure token invalidation, proper error responses
   */
  logout = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // 1. Get user ID from authenticated request
    const userId = req.authenticatedUser?.id;
    if (!userId) {
      res.status(401).json({
        status: 'error',
        error: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required for logout',
      });
      return;
    }

    // 2. Invalidate refresh token
    await this.authService.logout(userId);

    // 3. Return success response
    res.status(200).json({
      status: 'success',
      message: 'Logout successful',
    });
  };

  /**
   * Handle forgot password request
   *
   * Initiates password reset process by sending reset email.
   * Always returns success to prevent email enumeration attacks.
   *
   * Preconditions: Valid email address
   * Postconditions: Reset email sent (if user exists)
   * Invariants: No email enumeration, secure token generation
   */
  forgotPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // 1. Validate request body
    const validatedData = ForgotPasswordInputSchema.parse(req.body);

    // 2. Process password reset request
    const result = await this.authService.forgotPassword(validatedData);

    // 3. Validate response
    const validatedResponse = ForgotPasswordResponseSchema.parse(result);

    // 4. Return success response
    res.status(200).json({
      status: 'success',
      data: validatedResponse,
      message: validatedResponse.message,
    });
  };

  /**
   * Handle password reset confirmation
   *
   * Resets user password using valid reset token.
   * Implements secure token validation and password update.
   *
   * Preconditions: Valid reset token and new password
   * Postconditions: Password updated, token invalidated
   * Invariants: Secure password hashing, token single-use
   */
  resetPassword = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    // 1. Validate request body
    const validatedData = ResetPasswordInputSchema.parse(req.body);

    // 2. Process password reset
    const result = await this.authService.resetPassword(validatedData);

    // 3. Validate response
    const validatedResponse = ResetPasswordResponseSchema.parse(result);

    // 4. Return success response
    res.status(200).json({
      status: 'success',
      data: validatedResponse,
      message: validatedResponse.message,
    });
  };
}
