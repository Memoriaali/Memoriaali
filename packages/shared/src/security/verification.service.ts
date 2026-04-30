import * as crypto from 'crypto';

/**
 * Verification Service
 *
 * Provides secure verification codes and tokens for Finnish memory institution user flows.
 * Handles email verification, password reset, and other authentication challenges.
 *
 * Design by Contract:
 * - Preconditions: Secure random sources available, valid length parameters
 * - Postconditions: Cryptographically secure codes and tokens
 * - Invariants: Each generation produces unique output, proper token formats
 */
export class VerificationService {
  private readonly defaultCodeLength: number = 6;
  private readonly defaultTokenLength: number = 32;
  private readonly passwordResetTokenLength: number = 64;

  /**
   * Generate numeric verification code
   *
   * Creates a random numeric code suitable for email verification.
   * Uses secure random generation to prevent prediction attacks.
   *
   * Preconditions: length is positive integer between 4 and 10
   * Postconditions: Returns string of digits with specified length
   * Invariants: Each call produces unique numeric code
   */
  generateVerificationCode(length: number = this.defaultCodeLength): string {
    if (length < 4 || length > 10) {
      throw new Error('Verification code length must be between 4 and 10 digits');
    }

    let code = '';
    for (let i = 0; i < length; i++) {
      // Generate digit 0-9, ensuring first digit is not 0 for readability
      const digit = i === 0 ? crypto.randomInt(1, 10) : crypto.randomInt(0, 10);
      code += digit.toString();
    }

    return code;
  }

  /**
   * Generate secure random token
   *
   * Creates URL-safe base64 encoded token for secure operations.
   * Suitable for password reset, email verification, and session tokens.
   *
   * Preconditions: length is positive integer
   * Postconditions: Returns URL-safe base64 string
   * Invariants: Each call produces unique token
   */
  generateSecureToken(length: number = this.defaultTokenLength): string {
    return crypto.randomBytes(length).toString('base64url');
  }

  /**
   * Generate hex token
   *
   * Creates hex-encoded token for operations requiring hex format.
   * Provides alternative encoding for different use cases.
   *
   * Preconditions: length is positive integer
   * Postconditions: Returns lowercase hex string (length * 2 characters)
   * Invariants: Each call produces unique hex token
   */
  generateHexToken(length: number = this.defaultTokenLength): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Generate timestamped token
   *
   * Creates token with embedded timestamp for expiration tracking.
   * Combines secure random data with current timestamp.
   *
   * Preconditions: length is positive integer
   * Postconditions: Returns object with token and timestamp
   * Invariants: Timestamp reflects generation time accurately
   */
  generateTimestampedToken(length: number = this.defaultTokenLength): {
    token: string;
    timestamp: Date;
    expiresAt: Date;
    isExpired: () => boolean;
  } {
    const token = this.generateSecureToken(length);
    const timestamp = new Date();
    const expiresAt = new Date(timestamp.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    return {
      token,
      timestamp,
      expiresAt,
      isExpired: () => new Date() > expiresAt,
    };
  }

  /**
   * Generate one-time token with purpose
   *
   * Creates single-use token with embedded purpose identifier.
   * Helps track token usage and prevent cross-purpose token reuse.
   *
   * Preconditions: purpose is non-empty string, length is positive
   * Postconditions: Returns object with token and metadata
   * Invariants: Purpose is preserved accurately, unique token generated
   */
  generateOneTimeToken(
    purpose: string,
    length: number = this.defaultTokenLength,
  ): {
    token: string;
    purpose: string;
    createdAt: Date;
    used: boolean;
    markAsUsed: () => void;
  } {
    if (!purpose || purpose.trim().length === 0) {
      throw new Error('Token purpose cannot be empty');
    }

    const token = this.generateSecureToken(length);
    const createdAt = new Date();
    let used = false;

    return {
      token,
      purpose: purpose.trim(),
      createdAt,
      used,
      markAsUsed: () => {
        used = true;
      },
    };
  }

  /**
   * Generate email verification package
   *
   * Creates complete verification package for email confirmation.
   * Includes both user-friendly code and secure token.
   *
   * Preconditions: None
   * Postconditions: Returns package with code, token, and expiration
   * Invariants: Code and token are unique, expiration is properly set
   */
  generateEmailVerificationPackage(): {
    code: string;
    token: string;
    expiresAt: Date;
    isExpired: () => boolean;
    isCodeValid: (inputCode: string) => boolean;
  } {
    const code = this.generateVerificationCode();
    const token = this.generateSecureToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    return {
      code,
      token,
      expiresAt,
      isExpired: () => new Date() > expiresAt,
      isCodeValid: (inputCode: string) => inputCode === code,
    };
  }

  /**
   * Generate password reset package
   *
   * Creates secure package for password reset flow.
   * Uses longer token for enhanced security.
   *
   * Preconditions: None
   * Postconditions: Returns package with long token and expiration
   * Invariants: Token is unique, expiration allows reasonable reset time
   */
  generatePasswordResetPackage(): {
    token: string;
    expiresAt: Date;
    isExpired: () => boolean;
    purpose: 'password_reset';
  } {
    const token = this.generateSecureToken(this.passwordResetTokenLength);
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    return {
      token,
      expiresAt,
      isExpired: () => new Date() > expiresAt,
      purpose: 'password_reset' as const,
    };
  }

  /**
   * Validate verification code format
   *
   * Checks if provided code matches expected format.
   * Validates length and numeric-only content.
   *
   * Preconditions: code is string
   * Postconditions: Returns boolean validation result
   * Invariants: Validation is deterministic for same input
   */
  isValidVerificationCodeFormat(
    code: string,
    expectedLength: number = this.defaultCodeLength,
  ): boolean {
    if (typeof code !== 'string') return false;
    if (code.length !== expectedLength) return false;
    if (!/^\d+$/.test(code)) return false;

    return true;
  }

  /**
   * Validate token format
   *
   * Checks if provided token matches expected format and length.
   * Validates base64url encoding and length requirements.
   *
   * Preconditions: token is string, expectedLength is positive
   * Postconditions: Returns boolean validation result
   * Invariants: Validation is consistent for same input
   */
  isValidTokenFormat(token: string, expectedLength?: number): boolean {
    if (typeof token !== 'string') return false;
    if (token.length === 0) return false;

    // Check if it's valid base64url (no padding, URL-safe characters)
    if (!/^[A-Za-z0-9_-]+$/.test(token)) return false;

    // If expected length specified, validate the source byte length
    if (expectedLength !== undefined) {
      // Base64url encoding: 4 chars per 3 bytes, no padding
      const expectedBase64Length = Math.ceil((expectedLength * 4) / 3);
      const minLength = expectedBase64Length - 1;
      const maxLength = expectedBase64Length + 1;
      if (token.length < minLength || token.length > maxLength) {
        return false;
      }
    }

    return true;
  }
}
