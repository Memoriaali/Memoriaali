import * as jwt from 'jsonwebtoken';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { HttpException } from '../../errors';
import { verifyJwtToken, generateJwtToken, validateJwtConfig } from '../jwt.utils';

describe('JWT Utilities', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateJwtConfig', () => {
    /**
     * Scenario: validateJwtConfig passes when JWT_SECRET is properly configured
     * Expected outcome: function completes without throwing
     * Contract: precondition (JWT_SECRET environment variable exists with 32+ chars)
     */
    it('should pass when JWT_SECRET is configured', () => {
      process.env.JWT_SECRET = 'test-secret-key-minimum-32-chars';

      expect(() => validateJwtConfig()).not.toThrow();
    });

    /**
     * Scenario: validateJwtConfig throws when JWT_SECRET is missing
     * Expected outcome: throws error about missing configuration
     * Contract: precondition (JWT_SECRET must be configured)
     */
    it('should throw error when JWT_SECRET is missing', () => {
      delete process.env.JWT_SECRET;

      expect(() => validateJwtConfig()).toThrow('JWT_SECRET environment variable is required');
    });

    /**
     * Scenario: validateJwtConfig throws when JWT_SECRET is empty string
     * Expected outcome: throws error about missing configuration
     * Contract: precondition (JWT_SECRET must not be empty)
     */
    it('should throw error when JWT_SECRET is empty', () => {
      process.env.JWT_SECRET = '';

      expect(() => validateJwtConfig()).toThrow('JWT_SECRET environment variable is required');
    });

    /**
     * Scenario: validateJwtConfig throws when JWT_SECRET is too short
     * Expected outcome: throws error about insufficient key length
     * Contract: precondition (JWT_SECRET must be at least 32 characters for security)
     */
    it('should throw error when JWT_SECRET is short', () => {
      process.env.JWT_SECRET = 'short';

      expect(() => validateJwtConfig()).toThrow(
        'JWT_SECRET must be at least 32 characters for security',
      );
    });
  });

  describe('generateJwtToken', () => {
    beforeEach(() => {
      process.env.JWT_SECRET = 'test-secret-key-minimum-32-chars';
      process.env.JWT_EXPIRES_IN = '1h';
    });

    it('should generate valid JWT token with correct payload', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      };

      const token = generateJwtToken(payload);

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      // Verify token structure
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.iss).toBe('memoriaali-v2');
      expect(decoded.aud).toBe('memoriaali-users');
    });

    it('should use default expiration when JWT_EXPIRES_IN not set', () => {
      delete process.env.JWT_EXPIRES_IN;

      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      };

      const token = generateJwtToken(payload);
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

      // Should have expiration set (default 24h)
      expect(decoded.exp).toBeTruthy();
      expect(decoded.iat).toBeTruthy();
      expect(decoded.exp - decoded.iat).toBe(24 * 60 * 60); // 24 hours in seconds
    });

    it('should throw error when JWT_SECRET not configured', () => {
      delete process.env.JWT_SECRET;

      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'USER',
      };

      expect(() => generateJwtToken(payload)).toThrow('JWT_SECRET not configured');
    });
  });

  describe('verifyJwtToken', () => {
    const secret = 'test-secret-key-minimum-32-chars';

    beforeEach(() => {
      process.env.JWT_SECRET = secret;
    });

    it('should verify valid token and return payload', () => {
      const payload = {
        userId: 'user-123',
        email: 'test@example.com',
        role: 'ADMIN',
      };

      const token = jwt.sign(payload, secret, { expiresIn: '1h' });

      const result = verifyJwtToken(token);

      expect(result.userId).toBe(payload.userId);
      expect(result.email).toBe(payload.email);
      expect(result.role).toBe(payload.role);
    });

    it('should throw HttpException for missing token', () => {
      expect(() => verifyJwtToken('')).toThrow(HttpException);
      expect(() => verifyJwtToken('')).toThrow('Token is required');
    });

    it('should throw HttpException for null token', () => {
      expect(() => verifyJwtToken(null as any)).toThrow(HttpException);
      expect(() => verifyJwtToken(null as any)).toThrow('Token is required');
    });

    it('should throw HttpException for expired token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com', role: 'USER' };
      const expiredToken = jwt.sign(payload, secret, { expiresIn: '-1h' });

      expect(() => verifyJwtToken(expiredToken)).toThrow(HttpException);
      expect(() => verifyJwtToken(expiredToken)).toThrow('Token has expired');
    });

    it('should throw HttpException for invalid signature', () => {
      const payload = { userId: 'user-123', email: 'test@example.com', role: 'USER' };
      const tokenWithWrongSecret = jwt.sign(payload, 'wrong-secret', { expiresIn: '1h' });

      expect(() => verifyJwtToken(tokenWithWrongSecret)).toThrow(HttpException);
      expect(() => verifyJwtToken(tokenWithWrongSecret)).toThrow('Invalid token signature');
    });

    it('should throw HttpException for malformed token', () => {
      const malformedToken = 'not.a.valid.jwt.token';

      expect(() => verifyJwtToken(malformedToken)).toThrow(HttpException);
      expect(() => verifyJwtToken(malformedToken)).toThrow('Invalid token signature');
    });

    it('should support token rotation with previous secret', () => {
      const currentSecret = 'current-secret-key-minimum-32-chars';
      const previousSecret = 'previous-secret-key-minimum-32-chars';

      process.env.JWT_SECRET = currentSecret;
      process.env.JWT_SECRET_PREVIOUS = previousSecret;

      const payload = { userId: 'user-123', email: 'test@example.com', role: 'USER' };
      const tokenWithPreviousSecret = jwt.sign(payload, previousSecret, { expiresIn: '1h' });

      const result = verifyJwtToken(tokenWithPreviousSecret);

      expect(result.userId).toBe(payload.userId);
      expect(result.email).toBe(payload.email);
      expect(result.role).toBe(payload.role);
    });

    it('should validate payload structure', () => {
      const incompletePayload = { userId: 'user-123' }; // Missing email and role
      const token = jwt.sign(incompletePayload, secret, { expiresIn: '1h' });

      expect(() => verifyJwtToken(token)).toThrow(HttpException);
      expect(() => verifyJwtToken(token)).toThrow('Invalid token payload structure');
    });

    it('should throw error when no secrets configured', () => {
      delete process.env.JWT_SECRET;
      delete process.env.JWT_SECRET_PREVIOUS;

      const payload = { userId: 'user-123', email: 'test@example.com', role: 'USER' };
      const token = jwt.sign(payload, 'any-secret', { expiresIn: '1h' });

      expect(() => verifyJwtToken(token)).toThrow('JWT secrets not configured');
    });
  });
});
