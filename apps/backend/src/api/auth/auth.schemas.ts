/**
 * Authentication API Schema Definitions
 *
 * Provides comprehensive Zod validation schemas for authentication endpoints.
 * Implements security field-picking and follows project validation patterns.
 *
 * Design by Contract:
 * - Preconditions: Valid input data conforming to schema rules
 * - Postconditions: Type-safe validated data objects
 * - Invariants: Security field omission, data type consistency
 */

import { UserSchema } from '@memoriaali/api-types';
import { PasswordSchema } from '@memoriaali/api-types/schemas';
import { z } from 'zod';
import { accountTypeSchema, userRoleSchema } from '../../openapi-schemas/zod.utils';
import { UserOwnerResponseSchema } from '../users/users.schemas';
// ================================================================================================
// INPUT VALIDATION SCHEMAS
// ================================================================================================

/**
 * Schema for login password validation
 *
 * For login, we only need to validate that the password is a non-empty string.
 * Password strength validation is only required for new password creation (registration).
 *
 * Preconditions: User attempting to login with existing password
 * Postconditions: Returns validated password string
 * Invariants: Basic string validation only
 */
export const LoginPasswordSchema = z
  .string()
  .min(1, 'Password is required')
  .max(128, 'Password must not exceed 128 characters')
  .trim();

/**
 * Schema for user login requests
 *
 * Validates login credentials with appropriate security constraints.
 * Supports both username and email login for user convenience.
 *
 * Preconditions: Valid credential format
 * Postconditions: Returns validated login data
 * Invariants: Credential validation rules enforced
 */
export const LoginInputSchema = z.object({
  identifier: z
    .string()
    .min(1, 'Username or email is required')
    .max(255, 'Username or email must not exceed 255 characters')
    .trim(),
  password: LoginPasswordSchema,
});

/**
 * Schema for refresh token requests
 *
 * Validates refresh token for token renewal.
 *
 * Preconditions: Valid refresh token format
 * Postconditions: Returns validated refresh data
 * Invariants: Token validation rules enforced
 */
export const RefreshTokenInputSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required').trim(),
});

// ================================================================================================
// RESPONSE SCHEMAS
// ================================================================================================

/**
 * Login response schema
 *
 * Returns authentication tokens and user information.
 * Excludes sensitive fields and follows security field-picking patterns.
 *
 * Preconditions: Successful authentication
 * Postconditions: Returns secure response with tokens
 * Invariants: No sensitive data exposure
 */
export const LoginUserResponseSchema = UserOwnerResponseSchema.pick({
  id: true,
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  accountType: true,
  isActivated: true,
  createdAt: true,
}).describe('Authenticated user information for login');

// Override enum types to ensure they reference named OpenAPI enums
export const LoginUserResponseOpenAPISchema = LoginUserResponseSchema.extend({
  role: userRoleSchema,
  accountType: accountTypeSchema,
});

export const LoginResponseSchema = z.object({
  accessToken: z.string().describe('JWT access token for API authentication'),
  refreshToken: z.string().describe('Refresh token for obtaining new access tokens'),
  user: LoginUserResponseOpenAPISchema,
  expiresIn: z.number().describe('Access token expiration time in seconds'),
});

/**
 * Refresh token response schema
 *
 * Returns new access token when refresh token is valid.
 *
 * Preconditions: Valid refresh token
 * Postconditions: Returns new access token
 * Invariants: No sensitive data exposure
 */
export const RefreshTokenResponseSchema = z.object({
  accessToken: z.string().describe('New JWT access token'),
  expiresIn: z.number().describe('Access token expiration time in seconds'),
});

/**
 * Schema for user registration requests
 *
 * Validates new user registration data with appropriate constraints.
 * Combines user creation and login functionality.
 *
 * Preconditions: Valid registration data format
 * Postconditions: Returns validated registration data
 * Invariants: Username/email uniqueness, password strength
 */
export const RegisterInputSchema = UserSchema.omit({
  // Omit system-generated fields
  id: true,
  hashedPassword: true, // @never-expose - will be generated from password
  salt: true, // @never-expose - will be generated
  isActivated: true, // Server-controlled during registration
  verificationCode: true, // @admin-only - will be generated
  passwordResetToken: true, // @never-expose - will be generated when needed
  passwordResetExpires: true, // @never-expose - will be generated when needed
  createdAt: true, // Auto-generated timestamp
  updatedAt: true, // Auto-generated timestamp
  createdById: true, // @admin-only - set by system
  updatedById: true, // @admin-only - set by system
})
  .extend({
    // Add input-specific validation
    password: PasswordSchema,
  })
  .partial({
    // Make optional fields that can be provided later or have defaults
    role: true, // Defaults to USER if not provided
    accountType: true, // Defaults to PRIVATE if not provided
    firstName: true, // Optional personal info
    lastName: true, // Optional personal info
    streetAddress: true, // Optional contact info
    postalCode: true, // Optional contact info
    postOffice: true, // Optional contact info
    telephone: true, // Optional contact info
    profession: true, // Optional personal info
    companyName: true, // Optional unless COMPANY account
    companyEmail: true, // Optional unless COMPANY account
    companyTelephone: true, // Optional company info
    companyContactPerson: true, // Optional company info
  })
  .refine(
    (data) => {
      // Business rule: Company fields required for COMPANY account type
      if (data.accountType === 'COMPANY') {
        return data.companyName && data.companyEmail;
      }
      return true;
    },
    {
      message: 'Company name and email are required for COMPANY account type',
      path: ['companyName'],
    },
  );

/**
 * Register response schema
 *
 * Returns authentication tokens and user information after successful registration.
 * Same as login response for consistency.
 *
 * Preconditions: Successful registration
 * Postconditions: Returns secure response with tokens
 * Invariants: No sensitive data exposure
 */
export const RegisterResponseSchema = LoginResponseSchema;

// ================================================================================================
// TYPE EXPORTS FOR CONTROLLER USAGE
// ================================================================================================

/**
 * Schema for forgot password requests
 *
 * Validates email address for password reset requests.
 * Only requires email address to initiate password reset.
 *
 * Preconditions: Valid email format
 * Postconditions: Returns validated email for password reset
 * Invariants: Email validation rules enforced
 */
export const ForgotPasswordInputSchema = z.object({
  email: z.string().email('Valid email address is required').trim(),
});

/**
 * Schema for password reset requests
 *
 * Validates password reset token and new password.
 * Requires both reset token and new password for security.
 *
 * Preconditions: Valid reset token and password format
 * Postconditions: Returns validated reset data
 * Invariants: Token and password validation rules enforced
 */
export const ResetPasswordInputSchema = z.object({
  token: z.string().min(1, 'Reset token is required').trim(),
  password: PasswordSchema,
});

/**
 * Forgot password response schema
 *
 * Returns success message for password reset request.
 * Never exposes whether email exists for security.
 *
 * Preconditions: Password reset request processed
 * Postconditions: Returns generic success message
 * Invariants: No sensitive data exposure
 */
export const ForgotPasswordResponseSchema = z.object({
  message: z.string().describe('Success message for password reset request'),
});

/**
 * Reset password response schema
 *
 * Returns success message for password reset completion.
 * Indicates successful password update.
 *
 * Preconditions: Password reset completed successfully
 * Postconditions: Returns success confirmation
 * Invariants: No sensitive data exposure
 */
export const ResetPasswordResponseSchema = z.object({
  message: z.string().describe('Success message for password reset completion'),
});

// ================================================================================================
// TYPE EXPORTS FOR CONTROLLER USAGE
// ================================================================================================

export type LoginInput = z.infer<typeof LoginInputSchema>;
export type RefreshTokenInput = z.infer<typeof RefreshTokenInputSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type RefreshTokenResponse = z.infer<typeof RefreshTokenResponseSchema>;
export type RegisterInput = z.infer<typeof RegisterInputSchema>;
export type RegisterResponse = z.infer<typeof RegisterResponseSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordInputSchema>;
export type ForgotPasswordResponse = z.infer<typeof ForgotPasswordResponseSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordInputSchema>;
export type ResetPasswordResponse = z.infer<typeof ResetPasswordResponseSchema>;
