import { RequestHandler, Router } from 'express';

import {
  authenticateUser,
  criticalOperationLimiter,
  rateLimitAuth,
  rateLimitBasic,
} from '../../middleware';
import { prisma } from '../../shared/database/prisma';
import { AuthenticatedRequest } from '../../shared/types/AuthenticatedRequest';
import { asyncHandler } from '../../shared/utils/response.utils';

import { UsersController } from '../users/users.controller';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';

/**
 * Authentication routes with comprehensive security features
 *
 * Provides secure authentication endpoints with proper rate limiting
 * and validation. Login and refresh endpoints are public, logout
 * requires authentication.
 *
 * Security Features:
 * - Rate limiting on login attempts (5 per 15 minutes)
 * - Request validation
 * - Comprehensive error handling
 * - Authentication middleware where required
 */

/**
 * Create and configure authentication routes
 *
 * @returns Configured router with authentication endpoints
 */
export const createAuthRoutes = (): Router => {
  const router = Router();

  // Initialize controllers
  const authController = new AuthController();
  const usersService = new UsersService(prisma);
  const usersController = new UsersController(usersService);

  /**
   * @openapi
   * /api/v2/auth/register:
   *   post:
   *     summary: User registration
   *     description: |
   *       Creates a new user account and automatically logs them in.
   *       Returns access and refresh tokens for immediate access.
   *
   *       **Security Features**:
   *       - Rate limiting to prevent spam and abuse
   *       - Password strength validation
   *       - Username and email uniqueness validation
   *       - Automatic login after successful registration
   *     tags:
   *       - Authentication
   *     security: []
   *     operationId: register
   *     x-permissions: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/RegisterInput'
   *     responses:
   *       201:
   *         description: Registration successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   $ref: '#/components/schemas/LoginResponse'
   *                 message:
   *                   type: string
   *                   example: Registration successful
   *       400:
   *         description: Validation error
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 error:
   *                   type: string
   *                   example: VALIDATION_ERROR
   *                 message:
   *                   type: string
   *                   example: Validation failed
   *                 details:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       path:
   *                         type: string
   *                         example: password
   *                       message:
   *                         type: string
   *                         example: Password must contain uppercase, lowercase, and number
   *       409:
   *         description: Username or email already exists
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 error:
   *                   type: string
   *                   example: USER_ALREADY_EXISTS
   *                 message:
   *                   type: string
   *                   example: Username is already taken
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   */
  router.post(
    '/register',
    rateLimitBasic, // Rate limit registration attempts (100 per 15 minutes)
    asyncHandler<AuthenticatedRequest>(authController.register),
  );

  /**
   * @openapi
   * /api/v2/auth/login:
   *   post:
   *     summary: User login
   *     description: |
   *       Authenticates user credentials and returns access and refresh tokens.
   *       Supports login with either username or email address.
   *
   *       **Security Features**:
   *       - Rate limiting to prevent brute force attacks
   *       - Secure password verification with bcrypt
   *       - Account activation status validation
   *       - Comprehensive audit logging
   *     tags:
   *       - Authentication
   *     security: []
   *     operationId: login
   *     x-permissions: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - identifier
   *               - password
   *             properties:
   *               identifier:
   *                 type: string
   *                 description: Username or email address
   *                 example: "john.doe@example.com"
   *               password:
   *                 type: string
   *                 description: User password
   *                 example: "SecurePassword123"
   *     responses:
   *       200:
   *         $ref: '#/components/responses/AuthLoginSuccess'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         description: Invalid credentials
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 error:
   *                   type: string
   *                   example: INVALID_CREDENTIALS
   *                 message:
   *                   type: string
   *                   example: Invalid username or password
   *       403:
   *         description: Account not activated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 error:
   *                   type: string
   *                   example: ACCOUNT_NOT_ACTIVATED
   *                 message:
   *                   type: string
   *                   example: Your account is not activated. Please check your email
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   */
  router.post(
    '/login',
    rateLimitAuth, // Rate limit login attempts (5 per 15 minutes)
    asyncHandler<AuthenticatedRequest>(authController.login),
  );

  /**
   * @openapi
   * /api/v2/auth/refresh:
   *   post:
   *     summary: Refresh access token
   *     description: |
   *       Validates refresh token and returns new access token.
   *       Used to maintain user sessions without requiring re-authentication.
   *
   *       **Security Features**:
   *       - Refresh token validation against database
   *       - User activation status verification
   *       - Secure token rotation
   *     tags:
   *       - Authentication
   *     security: []
   *     operationId: refreshToken
   *     x-permissions: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - refreshToken
   *             properties:
   *               refreshToken:
   *                 type: string
   *                 description: Valid refresh token
   *                 example: "abc123def456..."
   *     responses:
   *       200:
   *         description: Token refreshed successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: object
   *                   properties:
   *                     accessToken:
   *                       type: string
   *                       description: New JWT access token
   *                     expiresIn:
   *                       type: number
   *                       description: Access token expiration time in seconds
   *                 message:
   *                   type: string
   *                   example: Token refreshed successfully
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       401:
   *         description: Invalid refresh token
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 error:
   *                   type: string
   *                   example: TOKEN_INVALID
   *                 message:
   *                   type: string
   *                   example: Invalid refresh token
   *       403:
   *         description: Account not activated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 error:
   *                   type: string
   *                   example: ACCOUNT_NOT_ACTIVATED
   *                 message:
   *                   type: string
   *                   example: Your account is not activated
   */
  router.post('/refresh', asyncHandler<AuthenticatedRequest>(authController.refreshToken));

  /**
   * @openapi
   * /api/v2/auth/activate:
   *   post:
   *     summary: Activate account with verification code
   *     operationId: activateAccount
   *     x-permissions: []
   *     description: |
   *       Public endpoint for users to activate their account using email and verification code.
   *       This is the main user-facing activation endpoint that doesn't require authentication.
   *
   *       Use cases:
   *       - Email verification after registration
   *       - Account activation after admin creation
   *       - Re-activation after account suspension
   *     tags:
   *       - Authentication
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - verificationCode
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: User's email address
   *                 example: user@example.com
   *               verificationCode:
   *                 type: string
   *                 description: Verification code sent to user's email
   *                 example: "123456"
   *     responses:
   *       200:
   *         description: Account successfully activated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 message:
   *                   type: string
   *                   example: Account activated successfully
   *                 data:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                       format: uuid
   *                     email:
   *                       type: string
   *                       format: email
   *                     isActivated:
   *                       type: boolean
   *                       example: true
   *       400:
   *         description: Invalid verification code or account already activated
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 message:
   *                   type: string
   *                   example: Invalid verification code
   *       404:
   *         description: User not found with provided email
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 message:
   *                   type: string
   *                   example: User not found with this email
   */
  router.post(
    '/activate',
    criticalOperationLimiter, // Rate limit critical operations
    asyncHandler(usersController.activateAccount.bind(usersController)),
  );

  /**
   * @openapi
   * /api/v2/auth/logout:
   *   post:
   *     summary: User logout
   *     description: |
   *       Invalidates user's refresh token to prevent further use.
   *       Requires authentication to identify the user.
   *
   *       **Security Features**:
   *       - Authentication required
   *       - Refresh token invalidation
   *       - Secure session termination
   *     security:
   *       - BearerAuth: []
   *     tags:
   *       - Authentication
   *     operationId: logout
   *     x-permissions: []
   *     responses:
   *       200:
   *         description: Logout successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 message:
   *                   type: string
   *                   example: Logout successful
   *       401:
   *         description: Authentication required
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 error:
   *                   type: string
   *                   example: AUTHENTICATION_REQUIRED
   *                 message:
   *                   type: string
   *                   example: Authentication required for logout
   */
  router.post(
    '/logout',
    authenticateUser as RequestHandler, // Require authentication for logout
    asyncHandler<AuthenticatedRequest>(authController.logout),
  );

  /**
   * @openapi
   * /api/v2/auth/forgot-password:
   *   post:
   *     summary: Request password reset
   *     description: |
   *       Initiates password reset process by sending a reset email to the user.
   *       Always returns success to prevent email enumeration attacks.
   *
   *       **Security Features**:
   *       - Rate limiting to prevent abuse
   *       - No email enumeration (always returns success)
   *       - Secure token generation with expiration
   *       - Only works for activated accounts
   *     tags:
   *       - Authentication
   *     security: []
   *     operationId: forgotPassword
   *     x-permissions: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 description: User's email address
   *                 example: "user@example.com"
   *     responses:
   *       200:
   *         description: Password reset request processed
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: "If an account with that email exists, a password reset link has been sent."
   *                 message:
   *                   type: string
   *                   example: "If an account with that email exists, a password reset link has been sent."
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   */
  router.post(
    '/forgot-password',
    rateLimitBasic, // Rate limit password reset requests
    asyncHandler<AuthenticatedRequest>(authController.forgotPassword),
  );

  /**
   * @openapi
   * /api/v2/auth/reset-password:
   *   post:
   *     summary: Reset password with token
   *     description: |
   *       Resets user password using a valid reset token from email.
   *       Invalidates the token after use and logs out all sessions.
   *
   *       **Security Features**:
   *       - Token validation with expiration check
   *       - Single-use tokens (invalidated after use)
   *       - Secure password hashing
   *       - Session invalidation for security
   *     tags:
   *       - Authentication
   *     security: []
   *     operationId: resetPassword
   *     x-permissions: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - token
   *               - password
   *             properties:
   *               token:
   *                 type: string
   *                 description: Password reset token from email
   *                 example: "a1b2c3d4e5f6..."
   *               password:
   *                 type: string
   *                 description: New password
   *                 example: "NewSecurePassword123!"
   *     responses:
   *       200:
   *         description: Password reset successful
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: object
   *                   properties:
   *                     message:
   *                       type: string
   *                       example: "Password has been successfully reset. Please log in with your new password."
   *                 message:
   *                   type: string
   *                   example: "Password has been successfully reset. Please log in with your new password."
   *       400:
   *         description: Invalid or expired token
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 error:
   *                   type: string
   *                   example: INVALID_CREDENTIALS
   *                 message:
   *                   type: string
   *                   example: Invalid or expired reset token
   *       429:
   *         $ref: '#/components/responses/TooManyRequests'
   */
  router.post(
    '/reset-password',
    rateLimitBasic, // Rate limit password reset attempts
    asyncHandler<AuthenticatedRequest>(authController.resetPassword),
  );

  return router;
};
