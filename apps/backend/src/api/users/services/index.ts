/**
 * User Services Index
 *
 * Centralized exports for all user-related helper services.
 * Provides clean import paths and service organization.
 *
 * Note: PasswordService and VerificationService have been moved to @memoriaali/shared
 * to enable reuse in database seeds and other packages.
 */

export { EmailService } from './email.service';
export { UserValidationService } from './user-validation.service';

/**
 * Service Types for Dependency Injection
 *
 * Type definitions for service interfaces to enable
 * dependency injection and testing with mocks.
 */
import type { EmailService } from './email.service';
import type { UserValidationService } from './user-validation.service';

export type { EmailService as IEmailService, UserValidationService as IUserValidationService };
