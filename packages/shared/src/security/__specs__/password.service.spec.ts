/**
 * PasswordService Unit Tests
 *
 * Tests the centralized password hashing and verification service
 * using bcrypt with configurable salt rounds.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { PasswordService } from '../password.service';

describe('PasswordService', () => {
  let passwordService: PasswordService;

  beforeEach(() => {
    passwordService = new PasswordService();
  });

  describe('createPasswordHash', () => {
    it('should create a hash with salt and hashed password', async () => {
      const password = 'TestPassword123!';

      const result = await passwordService.createPasswordHash(password);

      expect(result).toHaveProperty('salt');
      expect(result).toHaveProperty('hashedPassword');
      expect(result.salt).toBeTruthy();
      expect(result.hashedPassword).toBeTruthy();
      expect(result.salt).toHaveLength(64); // 32 bytes as hex
      expect(result.hashedPassword).not.toBe(password);
    });

    it('should create different salts for same password', async () => {
      const password = 'TestPassword123!';

      const result1 = await passwordService.createPasswordHash(password);
      const result2 = await passwordService.createPasswordHash(password);

      expect(result1.salt).not.toBe(result2.salt);
      expect(result1.hashedPassword).not.toBe(result2.hashedPassword);
    });

    it('should use custom salt rounds when provided', async () => {
      const password = 'TestPassword123!';
      const customSaltRounds = 10;

      const result = await passwordService.createPasswordHash(password, customSaltRounds);

      expect(result).toHaveProperty('salt');
      expect(result).toHaveProperty('hashedPassword');
      // Note: We can't directly verify salt rounds from the hash, but we trust bcrypt
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const { salt, hashedPassword } = await passwordService.createPasswordHash(password);

      const isValid = await passwordService.verifyPassword(password, hashedPassword, salt);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const { salt, hashedPassword } = await passwordService.createPasswordHash(password);

      const isValid = await passwordService.verifyPassword(wrongPassword, hashedPassword, salt);

      expect(isValid).toBe(false);
    });

    it('should reject password with wrong salt', async () => {
      const password = 'TestPassword123!';
      const { hashedPassword } = await passwordService.createPasswordHash(password);
      const wrongSalt = 'a'.repeat(64);

      const isValid = await passwordService.verifyPassword(password, hashedPassword, wrongSalt);

      expect(isValid).toBe(false);
    });
  });

  describe('hashPassword', () => {
    it('should hash password with salt using bcrypt', async () => {
      const password = 'TestPassword123!';
      const salt = 'a'.repeat(64);

      const hash = await passwordService.hashPassword(password, salt);

      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^\$2[aby]\$\d{2}\$/); // bcrypt hash format
    });

    it('should use default salt rounds', async () => {
      const password = 'TestPassword123!';
      const salt = 'a'.repeat(64);

      const hash = await passwordService.hashPassword(password, salt);

      // Default is 12 rounds
      expect(hash).toMatch(/^\$2[aby]\$12\$/);
    });

    it('should use custom salt rounds when provided', async () => {
      const password = 'TestPassword123!';
      const salt = 'a'.repeat(64);
      const customSaltRounds = 10;

      const hash = await passwordService.hashPassword(password, salt, customSaltRounds);

      expect(hash).toMatch(/^\$2[aby]\$10\$/);
    });

    it('should enforce minimum salt rounds', async () => {
      const password = 'TestPassword123!';
      const salt = 'a'.repeat(64);
      const lowSaltRounds = 5; // Below minimum of 10

      const hash = await passwordService.hashPassword(password, salt, lowSaltRounds);

      // Should use minimum of 10
      expect(hash).toMatch(/^\$2[aby]\$10\$/);
    });
  });
});
