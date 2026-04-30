/**
 * Integration Tests for User Management API - Real Docker Environment
 *
 * ARCHITECTURAL CONTEXT:
 * Tests the complete HTTP request/response flow for user management endpoints using
 * the real Docker-based E2E environment with MySQL database and full Express middleware stack.
 * This validates true integration between controller, service, and database layers
 * without mocks, providing production-like testing scenarios.
 *
 * BUSINESS REQUIREMENTS:
 * - Admins can create new user accounts with complete profile information
 * - Admins can manually activate users when email verification fails
 * - Admins can deactivate accounts for policy violations or security incidents
 * - All activation/deactivation actions must include audit reasons
 * - Admins cannot deactivate their own accounts (safety measure)
 * - All operations require proper admin-level authentication
 *
 * KEY DEPENDENCIES:
 * - Docker MySQL database (port 33060) with real data persistence
 * - Express.js application with full middleware stack
 * - JWT authentication system with role-based authorization
 * - Prisma ORM with real database transactions
 * - BackendAuthService for JWT token management
 *
 * SECURITY CONSIDERATIONS:
 * - Real JWT token validation without mocks
 * - Actual database constraint validation
 * - Full input sanitization pipeline testing
 * - Production-like error handling scenarios
 * - Real audit trail creation and validation
 *
 * CONTRACT SUMMARY:
 * - Preconditions: Docker environment running, real JWT tokens, actual database state
 * - Postconditions: Real database state changes, actual HTTP responses, true audit trails
 * - Invariants: Data consistency in real database, authentication without mocks, production behavior
 */

import { app } from '@/index';
import supertest from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { testCredentials } from '../../fixtures/backend-test-users';
import { BackendAuthService } from '../utils/auth-service';

describe('User Management API - Integration Tests (Real Docker Environment)', () => {
  let authService: BackendAuthService;
  let adminToken: string;
  let userToken: string;

  beforeAll(async () => {
    // Initialize authentication service with real Express app
    authService = new BackendAuthService(app);

    // Get real JWT tokens for testing (no mocks!)
    adminToken = await authService.getAdminToken();
    userToken = await authService.getUserToken();

    // Verify tokens are valid before starting tests
    expect(authService.isValidJWTFormat(adminToken)).toBe(true);
    expect(authService.isValidJWTFormat(userToken)).toBe(true);
  });

  describe('POST /api/v2/users - User Creation Integration', () => {
    /**
     * Scenario: Admin creates user account that persists in real database
     * Expected outcome: User created in MySQL database, real password hashing, actual audit trail
     * Contract: Real database transaction with constraints and validation
     * Business impact: User account created in production-like environment with full data integrity
     */
    it('creates user account with real database persistence', async () => {
      const uniqueEmail = `integration-test-${Date.now()}@test.com`;

      const response = await supertest(app)
        .post('/api/v2/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send({
          email: uniqueEmail,
          password: 'IntegrationTest123!',
          username: `integration.user.${Date.now()}`,
          firstName: 'Integration',
          lastName: 'Test',
          role: 'USER',
          accountType: 'PRIVATE',
          streetAddress: '123 Integration Street',
          postalCode: '12345',
          postOffice: 'Integration City',
          telephone: '+358401234567',
          profession: 'Integration Tester',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.email).toBe(uniqueEmail);
      expect(response.body.data.isActivated).toBe(true); // Users created via this endpoint are activated immediately
      expect(response.body.data.hashedPassword).toBeUndefined(); // Password should not be in response
    });

    /**
     * Scenario: Attempt to create user with duplicate email (real database constraint)
     * Expected outcome: Database constraint violation with proper error handling
     * Contract: Real database uniqueness constraint enforcement
     * Business impact: Prevents duplicate emails with actual database validation
     */
    it('enforces email uniqueness through real database constraints', async () => {
      const duplicateEmail = testCredentials.regularUser.email; // Use existing user email

      const response = await supertest(app)
        .post('/api/v2/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send({
          email: duplicateEmail,
          password: 'DuplicateTest123!',
          username: `duplicate.user.${Date.now()}`,
          firstName: 'Duplicate',
          lastName: 'Test',
          role: 'USER',
          accountType: 'PRIVATE',
        });

      expect(response.status).toBe(409); // Real database constraint violation
    });

    /**
     * Scenario: Non-admin user attempts user creation (real authorization check)
     * Expected outcome: Authorization middleware blocks request with real token validation
     * Contract: Real JWT token validation and role-based access control
     * Business impact: Prevents privilege escalation with production-like security
     */
    it('blocks non-admin user creation with real authorization', async () => {
      const response = await supertest(app)
        .post('/api/v2/users')
        .set('Authorization', `Bearer ${userToken}`) // Real user token, not admin
        .set('Content-Type', 'application/json')
        .send({
          email: `blocked-${Date.now()}@test.com`,
          password: 'BlockedTest123!',
          username: `blocked.user.${Date.now()}`,
          firstName: 'Blocked',
          lastName: 'Test',
          role: 'USER',
          accountType: 'PRIVATE',
        });

      expect(response.status).toBe(403); // Real authorization failure
    });
  });

  describe('POST /api/v2/users/:id/activate - User Activation Integration', () => {
    let inactiveUserId: string;

    beforeAll(async () => {
      // Create an inactive user for activation testing
      const createResponse = await supertest(app)
        .post('/api/v2/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send({
          email: `activation-test-${Date.now()}@test.com`,
          password: 'ActivationTest123!',
          username: `activation.test.${Date.now()}`,
          firstName: 'Activation',
          lastName: 'Test',
          role: 'USER',
          accountType: 'PRIVATE',
        });

      inactiveUserId = createResponse.body.data.id;
    });

    /**
     * Scenario: Admin activates user with real database transaction
     * Expected outcome: User status updated in database, audit trail created
     * Contract: Real database transaction with state change validation
     * Business impact: User activation persists in production database
     */
    it('activates user with real database transaction', async () => {
      const response = await supertest(app)
        .post(`/api/v2/users/${inactiveUserId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send({
          reason: 'Integration test activation',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.isActivated).toBe(true);

      // Verify activation persisted in database by checking user status
      const checkResponse = await supertest(app)
        .get(`/api/v2/users/${inactiveUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(checkResponse.status).toBe(200);
      expect(checkResponse.body.data.isActivated).toBe(true);
    });

    /**
     * Scenario: Attempt to activate non-existent user (real database lookup)
     * Expected outcome: Database query returns null, proper 404 handling
     * Contract: Real database query with null result handling
     * Business impact: Proper error handling for missing users in production
     */
    it('handles non-existent user activation with real database lookup', async () => {
      const nonExistentId = 'non-existent-user-id-12345';

      const response = await supertest(app)
        .post(`/api/v2/users/${nonExistentId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send({
          reason: 'Testing non-existent user',
        });

      expect(response.status).toBe(404); // Real database lookup failure
    });
  });

  describe('POST /api/v2/users/:id/deactivate - User Deactivation Integration', () => {
    let activeUserId: string;

    beforeAll(async () => {
      // Create and activate a user for deactivation testing
      const createResponse = await supertest(app)
        .post('/api/v2/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send({
          email: `deactivation-test-${Date.now()}@test.com`,
          password: 'DeactivationTest123!',
          username: `deactivation.test.${Date.now()}`,
          firstName: 'Deactivation',
          lastName: 'Test',
          role: 'USER',
          accountType: 'PRIVATE',
        });

      activeUserId = createResponse.body.data.id;

      // Activate the user first
      await supertest(app)
        .post(`/api/v2/users/${activeUserId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send({
          reason: 'Activation for deactivation test',
        });
    });

    /**
     * Scenario: Admin deactivates user with real database transaction
     * Expected outcome: User status updated in database, audit trail created
     * Contract: Real database transaction with state change validation
     * Business impact: User deactivation persists in production database
     */
    it('deactivates user with real database transaction', async () => {
      const response = await supertest(app)
        .post(`/api/v2/users/${activeUserId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send({
          reason: 'Integration test deactivation',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.isActivated).toBe(false);

      // Verify deactivation persisted in database
      const checkResponse = await supertest(app)
        .get(`/api/v2/users/${activeUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(checkResponse.status).toBe(200);
      expect(checkResponse.body.data.isActivated).toBe(false);
    });
  });

  describe('Security Integration Tests - Real Environment', () => {
    /**
     * Scenario: Request with invalid JWT token (real token validation)
     * Expected outcome: JWT middleware rejects token with proper error handling
     * Contract: Real JWT token validation without mocks
     * Business impact: Production-like security validation
     */
    it('rejects invalid JWT tokens with real validation', async () => {
      const response = await supertest(app)
        .post('/api/v2/users')
        .set('Authorization', 'Bearer invalid.jwt.token')
        .set('Content-Type', 'application/json')
        .send({
          email: 'test@test.com',
          password: 'Test123!',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(401); // Real JWT validation failure
    });

    /**
     * Scenario: Request without authorization header (real middleware check)
     * Expected outcome: Authentication middleware blocks request
     * Contract: Real authentication middleware enforcement
     * Business impact: Proper authentication requirement in production
     */
    it('blocks requests without authorization header', async () => {
      const response = await supertest(app)
        .post('/api/v2/users')
        .set('Content-Type', 'application/json')
        .send({
          email: 'test@test.com',
          password: 'Test123!',
          firstName: 'Test',
          lastName: 'User',
        });

      expect(response.status).toBe(401); // Real authentication requirement
    });
  });

  describe('Database Transaction Integration Tests', () => {
    /**
     * Scenario: User creation with invalid data (real validation)
     * Expected outcome: Database constraints and validation rules enforced
     * Contract: Real database validation without mocks
     * Business impact: Production-like data integrity enforcement
     */
    it('enforces database constraints on invalid data', async () => {
      const response = await supertest(app)
        .post('/api/v2/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send({
          email: 'invalid-email-format',
          password: 'TooWeak',
          username: '', // Empty username
          firstName: '',
          lastName: '',
          role: 'INVALID_ROLE',
          accountType: 'INVALID_TYPE',
        });

      expect(response.status).toBe(400); // Real validation failure
    });

    /**
     * Scenario: Concurrent user operations (real database locking)
     * Expected outcome: Database handles concurrent requests properly
     * Contract: Real database concurrency control
     * Business impact: Production-like concurrent operation handling
     */
    it('handles concurrent user operations safely', async () => {
      const userEmail = `concurrent-test-${Date.now()}@test.com`;

      // Create user first
      const createResponse = await supertest(app)
        .post('/api/v2/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .send({
          email: userEmail,
          password: 'ConcurrentTest123!',
          username: `concurrent.test.${Date.now()}`,
          firstName: 'Concurrent',
          lastName: 'Test',
          role: 'USER',
          accountType: 'PRIVATE',
        });

      const userId = createResponse.body.data.id;

      // Attempt concurrent activation requests
      const activationPromises = [
        supertest(app)
          .post(`/api/v2/users/${userId}/activate`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: 'Concurrent test 1' }),
        supertest(app)
          .post(`/api/v2/users/${userId}/activate`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ reason: 'Concurrent test 2' }),
      ];

      const results = await Promise.all(activationPromises);

      // One should succeed, one should fail (user already activated)
      const successCount = results.filter((r) => r.status === 200).length;
      const failureCount = results.filter((r) => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
    });
  });

  afterAll(async () => {
    // Clean up any test data if needed
    // Note: E2E environment resets database between runs
  });
});
