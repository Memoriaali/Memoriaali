/**
 * User API Schema Definitions
 *
 * Provides comprehensive Zod validation schemas for user management endpoints.
 * Implements security field-picking and references Prisma-generated types as single source of truth.
 *
 * Design by Contract:
 * - Preconditions: Valid input data conforming to schema rules
 * - Postconditions: Type-safe validated data objects
 * - Invariants: Security field omission, data type consistency
 *
 * CRITICAL: ALL schemas derive from UserSchema (single source of truth)
 * NEVER manually recreate field definitions - always use .omit() and .extend()
 */

import { UserSchema } from '@memoriaali/api-types/generated';
import { PasswordSchema } from '@memoriaali/api-types/schemas';
import { AccountType, UserRole } from '@memoriaali/database';
import { PaginationMetadataSchema } from '@memoriaali/shared';
import { z } from 'zod';

// ================================================================================================
// INPUT VALIDATION SCHEMAS - DERIVED FROM BASE USERSCHEMA
// ================================================================================================

/**
 * Schema for creating new user accounts
 *
 * Derives from UserSchema, omitting system-generated fields and adding password validation.
 * Follows single source of truth principle - field definitions come from Prisma schema.
 *
 * Preconditions: username/email uniqueness validated separately
 * Postconditions: Returns validated user creation data
 * Invariants: Password strength requirements enforced
 */
export const CreateUserInputSchema = UserSchema.omit({
  // Omit system-generated fields
  id: true,
  hashedPassword: true, // @never-expose - will be generated from password
  salt: true, // @never-expose - will be generated
  isActivated: true, // Server-controlled during registration
  verificationCode: true, // @admin-only - will be generated
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
      if (data.accountType === AccountType.COMPANY) {
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
 * Schema for updating existing user accounts
 *
 * Derives from UserSchema with all updateable fields optional.
 * Omits immutable and system-controlled fields.
 *
 * Preconditions: User exists and requester has permission
 * Postconditions: Returns validated update data
 * Invariants: Password updates handled separately
 */
export const UpdateUserInputSchema = UserSchema.omit({
  // Omit immutable fields
  id: true,
  email: true, // Email changes require separate verification flow
  hashedPassword: true, // @never-expose - use ChangePasswordInputSchema
  salt: true, // @never-expose - updated with password
  isActivated: true, // Admin-only activation control
  verificationCode: true, // @admin-only - system controlled
  createdAt: true, // Immutable creation timestamp
  updatedAt: true, // Auto-generated
  createdById: true, // @admin-only - immutable
  updatedById: true, // @admin-only - set by system
}).partial(); // Make all remaining fields optional for updates

/**
 * Schema for password change requests
 *
 * Independent schema for password operations with security validation.
 * Does not derive from UserSchema as this is a specialized operation.
 *
 * Preconditions: User authenticated and authorized
 * Postconditions: Returns validated password data
 * Invariants: Current password verification required
 */
export const ChangePasswordInputSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: PasswordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from current password',
    path: ['newPassword'],
  });

/**
 * Schema for user listing/search requests
 *
 * Uses the shared pagination validation with user-specific extensions.
 * Leverages the project's standardized pagination system for consistency.
 *
 * Preconditions: Requester has appropriate permissions
 * Postconditions: Returns validated query parameters with proper pagination
 * Invariants: Pagination limits enforced, role validation consistent
 */
export const ListUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().min(1).optional(), // Search by username or email
  role: z.nativeEnum(UserRole).optional(),
  accountType: z.nativeEnum(AccountType).optional(),
  isActivated: z.coerce.boolean().optional(),
  sortBy: z.enum(['createdAt', 'email', 'username', 'firstName', 'lastName']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

/**
 * Schema for user activation/deactivation
 *
 * Admin-only operation for controlling user account status.
 *
 * Preconditions: Admin privileges required
 * Postconditions: Returns validated activation data
 * Invariants: Activation reason tracking
 */
export const UserActivationInputSchema = z.object({
  isActivated: z.boolean(),
  reason: z.string().min(1, 'Activation/deactivation reason is required'),
});

/**
 * Schema for account activation input
 *
 * Used for public account activation endpoint where users provide
 * their email and verification code to activate their account.
 *
 * Preconditions: User exists with provided email, verification code is valid
 * Postconditions: Returns validated activation data
 * Invariants: Email format validation, verification code format validation
 */
export const AccountActivationInputSchema = z.object({
  email: z.string().email('Invalid email format'),
  verificationCode: z.string().min(1, 'Verification code is required'),
});

// ================================================================================================
// RESPONSE SCHEMAS WITH SECURITY FIELD-PICKING - DERIVED FROM GENERATED USERSCHEMA
// ================================================================================================

/**
 * Public user response schema - SECURE BY DEFAULT
 *
 * Security: Uses explicit field picking to prevent accidental exposure of new sensitive fields
 * Used for: Public user directories, non-owner access
 * Postconditions: Only explicitly approved fields exposed
 *
 * CRITICAL: Uses .pick() to fail secure - new fields are hidden by default
 */
export const UserPublicResponseSchema = UserSchema.pick({
  id: true, // Reviewed: Safe public identifier
  username: true, // Reviewed: Safe public display name
  firstName: true, // Reviewed: Safe public display name
  lastName: true, // Reviewed: Safe public display name
  role: true, // Reviewed: Safe public role information
  accountType: true, // Reviewed: Safe account type (PRIVATE/COMPANY)
  isActivated: true, // Reviewed: Safe activation status
  createdAt: true, // Reviewed: Safe public timestamp
  // New fields are hidden by default until explicitly approved for public exposure
});

/**
 * Owner user response schema - SECURE BY DEFAULT
 *
 * Security: User can see their own data but new fields require explicit approval
 * Used for: User's own profile access
 * Postconditions: Owner sees approved personal data
 */
export const UserOwnerResponseSchema = UserSchema.pick({
  id: true, // Safe: Public identifier
  username: true, // Safe: Own username
  email: true, // Safe: Own email address (@sensitive but owner can see)
  firstName: true, // Safe: Own name
  lastName: true, // Safe: Own name
  role: true, // Safe: Own role
  accountType: true, // Safe: Own account type
  isActivated: true, // Safe: Own activation status
  streetAddress: true, // Safe: Own address
  postalCode: true, // Safe: Own postal code
  postOffice: true, // Safe: Own post office
  telephone: true, // Safe: Own telephone
  profession: true, // Safe: Own profession
  companyName: true, // Safe: Own company (if applicable)
  companyEmail: true, // Safe: Own company email (if applicable)
  companyTelephone: true, // Safe: Own company phone (if applicable)
  companyContactPerson: true, // Safe: Own company contact (if applicable)
  createdAt: true, // Safe: Account creation time
  updatedAt: true, // Safe: Profile update time
  // New fields are hidden by default until explicitly approved for owner access
});

/**
 * Admin user response schema - SECURE BY DEFAULT
 *
 * Security: Admins see operational fields but new fields require explicit approval
 * Used for: Administrative user management
 * Postconditions: Full operational visibility for approved fields only
 */
export const UserAdminResponseSchema = UserSchema.pick({
  id: true, // Admin: User identifier
  username: true, // Admin: Username
  email: true, // Admin: Contact information (@sensitive but admin can see)
  firstName: true, // Admin: Full name
  lastName: true, // Admin: Full name
  role: true, // Admin: Role management
  accountType: true, // Admin: Account type
  isActivated: true, // Admin: Activation status
  streetAddress: true, // Admin: Address for verification
  postalCode: true, // Admin: Postal code
  postOffice: true, // Admin: Post office
  telephone: true, // Admin: Contact phone
  profession: true, // Admin: User profession
  companyName: true, // Admin: Company information
  companyEmail: true, // Admin: Company email
  companyTelephone: true, // Admin: Company phone
  companyContactPerson: true, // Admin: Company contact
  createdAt: true, // Admin: Account creation
  updatedAt: true, // Admin: Last modification
  createdById: true, // Admin: Audit trail (@admin-only)
  updatedById: true, // Admin: Audit trail (@admin-only)
  // Still excludes: hashedPassword (@never-expose), salt (@never-expose), verificationCode (security token)
  // New sensitive fields are hidden by default until explicitly approved for admin access
});

/**
 * User list response schema - STANDARDIZED PAGINATION
 *
 * Security: Paginated response with appropriate field filtering
 * Used for: User listing endpoints
 * Postconditions: Consistent pagination structure using shared standards
 *
 * CRITICAL: Uses shared PaginationMetadataSchema for RFC 8288 compliance
 */
export const UserListResponseSchema = z.object({
  users: z.array(UserPublicResponseSchema),
  pagination: PaginationMetadataSchema,
});

// ================================================================================================
// DYNAMIC SCHEMA SELECTION UTILITY
// ================================================================================================

/**
 * Select appropriate response schema based on viewer context
 *
 * Implements dynamic security field-picking based on authorization
 *
 * Preconditions: Valid viewer role and ownership context
 * Postconditions: Returns security-appropriate schema
 * Invariants: Security rules consistently applied
 */
export const selectUserResponseSchema = (viewerRole: UserRole, isOwner: boolean) => {
  if (viewerRole === UserRole.ADMIN) {
    return UserAdminResponseSchema;
  }

  if (isOwner) {
    return UserOwnerResponseSchema;
  }

  return UserPublicResponseSchema;
};

// ================================================================================================
// TYPE EXPORTS FOR CONTROLLER USAGE
// ================================================================================================

/**
 * Login input schema for user authentication
 */
export const LoginInputSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Password reset input schema for password recovery
 */
export const PasswordResetInputSchema = z.object({
  email: z.string().email('Valid email address is required'),
});

export type CreateUserInput = z.infer<typeof CreateUserInputSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserInputSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordInputSchema>;
export type UserActivationInput = z.infer<typeof UserActivationInputSchema>;
export type AccountActivationInput = z.infer<typeof AccountActivationInputSchema>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
export type PasswordResetInput = z.infer<typeof PasswordResetInputSchema>;

export type UserPublicResponse = z.infer<typeof UserPublicResponseSchema>;
export type UserOwnerResponse = z.infer<typeof UserOwnerResponseSchema>;
export type UserAdminResponse = z.infer<typeof UserAdminResponseSchema>;
export type UserListResponse = z.infer<typeof UserListResponseSchema>;
