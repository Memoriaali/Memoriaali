import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

dotenv.config();

import { HttpException } from '../errors';

/**
 * JWT Token Utilities for Defense in Depth Authentication Layer
 *
 * Provides secure JWT token operations following industry best practices.
 * Implements Layer 4 (Application Security) within Defense in Depth strategy.
 *
 * Security Features:
 * - Configurable token expiration
 * - Secret rotation support
 * - Comprehensive error handling
 * - Audit logging integration points
 */

/**
 * JWT payload structure for user authentication
 */
export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

/**
 * Get available JWT secrets for verification
 *
 * Returns array of secrets supporting secret rotation.
 * Current secret is tried first, previous secret as fallback.
 *
 * @returns Array of JWT secrets
 */
const getJwtSecrets = (): string[] => {
  const secrets: string[] = [];

  // Current secret (required)
  if (process.env.JWT_SECRET) {
    secrets.push(process.env.JWT_SECRET);
  }

  // Previous secret for rotation (optional)
  if (process.env.JWT_SECRET_PREVIOUS) {
    secrets.push(process.env.JWT_SECRET_PREVIOUS);
  }

  return secrets;
};

/**
 * Verify JWT token with security validation
 *
 * Implements secure token verification with multiple secret support
 * for secret rotation scenarios. Provides detailed error handling
 * for different failure scenarios.
 *
 * @param token - JWT token to verify
 * @returns Decoded payload if valid
 * @throws HttpException for invalid tokens
 */
export const verifyJwtToken = (token: string): JwtPayload => {
  if (!token || typeof token !== 'string') {
    throw HttpException.unauthorized('Token is required');
  }

  const secrets = getJwtSecrets();
  if (secrets.length === 0) {
    throw new Error('JWT secrets not configured - check environment variables');
  }

  // Try current secret first, then fallback for rotation
  for (const secret of secrets) {
    try {
      const decoded = jwt.verify(token, secret) as JwtPayload;

      // Additional validation
      if (!decoded.userId || !decoded.email || !decoded.role) {
        throw HttpException.unauthorized('Invalid token payload structure');
      }

      return decoded;
    } catch (error) {
      // Continue to next secret if verification fails
      if (error instanceof jwt.TokenExpiredError) {
        throw HttpException.unauthorized('Token has expired', 'TOKEN_EXPIRED');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        // Continue to try next secret
        continue;
      }
      // Re-throw unexpected errors
      throw error;
    }
  }

  throw HttpException.unauthorized('Invalid token signature', 'INVALID_TOKEN');
};

/**
 * Generate JWT token for authenticated user
 *
 * Creates secure JWT token with appropriate expiration
 * and essential user identity claims.
 *
 * @param payload - User identity data
 * @returns Signed JWT token
 */
export const generateJwtToken = (payload: Omit<JwtPayload, 'iat' | 'exp'>): string => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET not configured - check environment variables');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN ?? '24h';

  try {
    return jwt.sign(payload, secret, {
      expiresIn,
      issuer: 'memoriaali-v2',
      audience: 'memoriaali-users',
    } as jwt.SignOptions);
  } catch (error) {
    throw new Error(
      `Failed to generate JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
};

/**
 * Validate JWT configuration at startup
 *
 * Ensures required JWT environment variables are configured.
 * Should be called during application initialization.
 *
 * @throws Error if configuration is invalid
 */
export const validateJwtConfig = (): void => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters for security');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN;
  if (expiresIn) {
    // Basic validation of expiration format
    if (!/^(\d+[smhd]|\d+)$/.test(expiresIn)) {
      throw new Error('JWT_EXPIRES_IN must be a valid time string (e.g., "24h", "7d", "3600")');
    }
  }
};
