/**
 * Backend Authentication Service for E2E Tests
 *
 * This service handles authentication with the backend API during E2E testing.
 * It provides methods to obtain JWT tokens for different user types and
 * manages authentication state for test scenarios.
 */

import { Express } from 'express';
import supertest from 'supertest';
import { testCredentials } from '../../fixtures/backend-test-users';

/**
 * Authentication service for Backend E2E tests (REST API testing)
 * Handles JWT token authentication with the backend API using Supertest
 */
export class BackendAuthService {
  private app: Express;
  private tokenCache = new Map<string, { token: string; expiresAt: number }>();

  constructor(app: Express) {
    this.app = app;
  }

  /**
   * Get admin JWT token for backend API testing
   *
   * @returns Promise<string> JWT token for admin user
   * @throws Error if authentication fails
   */
  async getAdminToken(): Promise<string> {
    return this.getTokenForUser(testCredentials.admin.email, testCredentials.admin.password);
  }

  /**
   * Get regular user JWT token for backend API testing
   *
   * @returns Promise<string> JWT token for regular user
   * @throws Error if authentication fails
   */
  async getUserToken(): Promise<string> {
    return this.getTokenForUser(
      testCredentials.regularUser.email,
      testCredentials.regularUser.password,
    );
  }

  /**
   * Get inactive user JWT token for backend API testing
   * Note: This should typically fail unless the user has been activated
   *
   * @returns Promise<string> JWT token for inactive user
   * @throws Error if authentication fails
   */
  async getInactiveUserToken(): Promise<string> {
    return this.getTokenForUser(
      testCredentials.inactiveUser.email,
      testCredentials.inactiveUser.password,
    );
  }

  /**
   * Generic method to get JWT token for any user
   * Includes token caching to avoid repeated authentication calls
   *
   * @param email User email
   * @param password User password
   * @returns Promise<string> JWT token
   * @throws Error if authentication fails
   */
  async getTokenForUser(email: string, password: string): Promise<string> {
    const cacheKey = `${email}:${password}`;
    const cached = this.tokenCache.get(cacheKey);

    // Return cached token if still valid (with 1 minute buffer)
    if (cached && cached.expiresAt > Date.now() + 60000) {
      return cached.token;
    }

    try {
      const response = await supertest(this.app).post('/api/v2/auth/login').send({
        identifier: email,
        password,
      });

      if (response.status !== 200) {
        throw new Error(`Authentication failed with status ${response.status}`);
      }

      const token = response.body.token;
      if (!token) {
        throw new Error('No token received from authentication response');
      }

      // Cache token for 23 hours (assuming 24h expiry)
      this.tokenCache.set(cacheKey, {
        token,
        expiresAt: Date.now() + 23 * 60 * 60 * 1000,
      });

      return token;
    } catch (error) {
      throw new Error(`Failed to authenticate user ${email}: ${error}`);
    }
  }

  /**
   * Create authorization headers for API requests
   *
   * @param token JWT token
   * @returns Object with Authorization header
   */
  createAuthHeaders(token: string): Record<string, string> {
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Validate JWT token format (basic check)
   *
   * @param token JWT token to validate
   * @returns boolean True if token appears to be valid JWT format
   */
  isValidJWTFormat(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3 && parts.every((part) => part.length > 0);
  }

  /**
   * Clear all cached tokens
   * Useful for test cleanup or when testing token expiry
   */
  clearTokenCache(): void {
    this.tokenCache.clear();
  }

  /**
   * Test authentication endpoint health
   * Verifies that the authentication endpoint is responding
   *
   * @returns Promise<boolean> True if auth endpoint is healthy
   */
  async isAuthEndpointHealthy(): Promise<boolean> {
    try {
      const response = await supertest(this.app).post('/api/v2/auth/login').send({
        email: 'nonexistent@test.com',
        password: 'invalid',
      });

      // We expect 401 or 400, not 500 or no response
      return response.status === 401 || response.status === 400;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test unauthorized access to protected endpoint
   * Verifies that protected endpoints properly reject requests without valid tokens
   *
   * @param endpoint Protected endpoint to test
   * @returns Promise<boolean> True if endpoint properly rejects unauthorized access
   */
  async testUnauthorizedAccess(endpoint: string): Promise<boolean> {
    try {
      const response = await supertest(this.app).get(endpoint);
      return response.status === 401;
    } catch (error) {
      return false;
    }
  }

  /**
   * Test invalid token rejection
   * Verifies that endpoints properly reject requests with invalid tokens
   *
   * @param endpoint Protected endpoint to test
   * @returns Promise<boolean> True if endpoint properly rejects invalid tokens
   */
  async testInvalidTokenRejection(endpoint: string): Promise<boolean> {
    try {
      const response = await supertest(this.app)
        .get(endpoint)
        .set('Authorization', 'Bearer invalid.jwt.token');

      return response.status === 401;
    } catch (error) {
      return false;
    }
  }
}
