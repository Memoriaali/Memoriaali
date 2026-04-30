import * as crypto from 'crypto';

import bcrypt from 'bcryptjs';

/**
 * Password Service
 *
 * Provides secure password handling for Finnish memory institution users.
 * Implements industry-standard cryptographic practices with configurable security parameters.
 *
 * Design by Contract:
 * - Preconditions: Valid password strings, secure random sources available
 * - Postconditions: Cryptographically secure hashes, constant-time verification
 * - Invariants: No plaintext password storage, secure random generation
 */
export class PasswordService {
  private readonly defaultSaltRounds: number = 12;
  private readonly minSaltRounds: number = 10;
  private readonly maxPasswordLength: number = 128;
  private readonly temporaryPasswordLength: number = 16;

  /**
   * Generate cryptographically secure salt
   *
   * Creates a 32-byte random salt encoded as 64-character hex string.
   * Used as additional salt layer beyond bcrypt's built-in salting.
   *
   * Preconditions: Secure random source available
   * Postconditions: Returns 64-character hex string
   * Invariants: Each call produces unique output
   */
  generateSalt = (): string => {
    return crypto.randomBytes(32).toString('hex');
  };

  /**
   * Hash password with bcrypt and custom salt
   *
   * Implements defense-in-depth password security:
   * - Custom salt layer for additional protection
   * - bcrypt with configurable rounds (minimum 10, default 12)
   * - Produces different hashes for same password with different salts
   *
   * Preconditions: password is non-empty string, salt is 64-character hex
   * Postconditions: Returns bcrypt hash string
   * Invariants: Same password+salt combination produces same hash
   */
  hashPassword = (
    password: string,
    salt: string,
    saltRounds: number = this.defaultSaltRounds,
  ): Promise<string> => {
    // Enforce minimum security standards
    const actualSaltRounds = Math.max(saltRounds, this.minSaltRounds);

    // Combine password with custom salt before bcrypt
    const saltedPassword = password + salt;

    // Use bcrypt for final hashing (includes its own salt)
    return bcrypt.hash(saltedPassword, actualSaltRounds);
  };

  /**
   * Create complete password hash with new salt
   *
   * Combines salt generation and password hashing in one operation.
   * Returns both salt and hash for database storage.
   *
   * Preconditions: password is non-empty string
   * Postconditions: Returns object with unique salt and corresponding hash
   * Invariants: Each call produces unique salt and hash combination
   */
  createPasswordHash = async (
    password: string,
    saltRounds: number = this.defaultSaltRounds,
  ): Promise<{ salt: string; hashedPassword: string }> => {
    const salt = this.generateSalt();
    const hashedPassword = await this.hashPassword(password, salt, saltRounds);

    return { salt, hashedPassword };
  };

  /**
   * Verify password against stored hash and salt
   *
   * Uses constant-time comparison via bcrypt.compare() to prevent timing attacks.
   * Reconstructs the same salting process used during hash creation.
   *
   * Preconditions: password is string, hashedPassword is bcrypt hash, salt is 64-character hex
   * Postconditions: Returns boolean verification result
   * Invariants: Verification is constant-time regardless of password correctness
   */
  verifyPassword = async (
    password: string,
    hashedPassword: string,
    salt: string,
  ): Promise<boolean> => {
    try {
      // Recreate the same salting process
      const saltedPassword = password + salt;

      // Use bcrypt's constant-time comparison
      return await bcrypt.compare(saltedPassword, hashedPassword);
    } catch (_error) {
      // Prevent timing attacks by always taking similar time
      await bcrypt.compare('dummy', hashedPassword).catch(() => false);
      return false;
    }
  };

  /**
   * Generate temporary password for user activation
   *
   * Creates secure random password avoiding visually ambiguous characters.
   * Suitable for email transmission and manual entry.
   *
   * Preconditions: length is positive integer
   * Postconditions: Returns string of specified length using safe character set
   * Invariants: Each call produces unique password
   */
  generateTemporaryPassword = (length: number = this.temporaryPasswordLength): string => {
    // Character set excluding visually ambiguous characters (0, O, l, I)
    const charset = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%&*';

    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = crypto.randomInt(0, charset.length);
      result += charset[randomIndex];
    }

    return result;
  };

  /**
   * Validate password strength against security requirements
   *
   * Implements comprehensive password policy for memory institutions:
   * - Minimum length requirements
   * - Character class diversity (uppercase, lowercase, numbers, special)
   * - Maximum length limits
   * - Scoring system for password quality assessment
   *
   * Preconditions: password is string
   * Postconditions: Returns validation object with isValid boolean and score 0-100
   * Invariants: Same password always produces same validation result
   */
  validatePasswordStrength = (
    password: string,
  ): {
    /**
     * Result of password strength validation.
     *
     * @property {boolean} isValid - Indicates if the password meets all security requirements.
     * @property {number} score - Password quality score (0-100), including bonuses and penalties.
     * @property {Object} requirements - Object indicating which requirements are met.
     * @property {boolean} requirements.minLength - True if password meets minimum length.
     * @property {boolean} requirements.hasUppercase - True if password contains uppercase letters.
     * @property {boolean} requirements.hasLowercase - True if password contains lowercase letters.
     * @property {boolean} requirements.hasNumbers - True if password contains numbers.
     * @property {boolean} requirements.hasSpecialChars - True if password contains special characters.
     * @property {boolean} requirements.withinMaxLength - True if password does not exceed max length.
     * @property {string[]} feedback - Array of feedback messages for unmet requirements or suggestions.
     */
    isValid: boolean;
    score: number;
    requirements: {
      minLength: boolean;
      hasUppercase: boolean;
      hasLowercase: boolean;
      hasNumbers: boolean;
      hasSpecialChars: boolean;
      withinMaxLength: boolean;
    };
    feedback: string[];
  } => {
    const feedback: string[] = [];
    const requirements = {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumbers: /\d/.test(password),
      hasSpecialChars: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password),
      withinMaxLength: password.length <= this.maxPasswordLength,
    };

    // Calculate score based on requirements and additional factors
    let score = 0;

    // Basic requirements (20 points each)
    if (requirements.minLength) {
      score += 20;
    } else {
      feedback.push('Password must be at least 8 characters long');
    }

    if (requirements.hasUppercase) {
      score += 20;
    } else {
      feedback.push('Password must contain at least one uppercase letter');
    }

    if (requirements.hasLowercase) {
      score += 20;
    } else {
      feedback.push('Password must contain at least one lowercase letter');
    }

    if (requirements.hasNumbers) {
      score += 20;
    } else {
      feedback.push('Password must contain at least one number');
    }

    if (requirements.hasSpecialChars) {
      score += 20;
    } else {
      feedback.push('Password must contain at least one special character');
    }

    // Length bonus (up to 10 points)
    if (password.length >= 12) {
      score += 5;
    }
    if (password.length >= 16) {
      score += 5;
    }

    // Penalize if too long
    if (!requirements.withinMaxLength) {
      score = Math.max(0, score - 30);
      feedback.push(`Password must not exceed ${this.maxPasswordLength} characters`);
    }

    // Penalize common patterns
    if (/(.)\1{2,}/.test(password)) {
      score = Math.max(0, score - 10);
      feedback.push('Avoid repeating characters');
    }

    if (/123|abc|qwe/i.test(password)) {
      score = Math.max(0, score - 10);
      feedback.push('Avoid common sequences');
    }

    const isValid = Object.values(requirements).every(Boolean);

    return {
      isValid,
      score: Math.min(100, score),
      requirements,
      feedback: feedback.length > 0 ? feedback : ['Password meets all security requirements'],
    };
  };
}
