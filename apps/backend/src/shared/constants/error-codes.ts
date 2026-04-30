/**
 * Standardized Error Codes for Memoriaali V2 API
 *
 * Provides consistent error codes across the application for better error handling,
 * debugging, and client-side error management. Error codes follow a hierarchical
 * naming convention: DOMAIN_SPECIFIC_ERROR
 */

export const ERROR_CODES = {
  // ===========================
  // Authentication & Authorization
  // ===========================
  AUTH: {
    AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
    INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
    TOKEN_EXPIRED: 'TOKEN_EXPIRED',
    TOKEN_INVALID: 'TOKEN_INVALID',
    INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
    ACCESS_DENIED: 'ACCESS_DENIED',
    SESSION_EXPIRED: 'SESSION_EXPIRED',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    ACCOUNT_NOT_ACTIVATED: 'ACCOUNT_NOT_ACTIVATED',
  },

  // ===========================
  // User Management
  // ===========================
  USER: {
    NOT_FOUND: 'USER_NOT_FOUND',
    ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
    EMAIL_ALREADY_EXISTS: 'USER_EMAIL_ALREADY_EXISTS',
    USERNAME_ALREADY_EXISTS: 'USER_USERNAME_ALREADY_EXISTS',
    NOT_ACTIVATED: 'USER_NOT_ACTIVATED',
    ALREADY_ACTIVATED: 'USER_ALREADY_ACTIVATED',
    ALREADY_DEACTIVATED: 'USER_ALREADY_DEACTIVATED',
    CANNOT_DEACTIVATE_SELF: 'USER_CANNOT_DEACTIVATE_SELF',
    INVALID_PASSWORD: 'USER_INVALID_PASSWORD',
    PASSWORD_TOO_WEAK: 'USER_PASSWORD_TOO_WEAK',
    VERIFICATION_CODE_INVALID: 'USER_VERIFICATION_CODE_INVALID',
    VERIFICATION_CODE_EXPIRED: 'USER_VERIFICATION_CODE_EXPIRED',
    RESET_TOKEN_INVALID: 'USER_RESET_TOKEN_INVALID',
    RESET_TOKEN_EXPIRED: 'USER_RESET_TOKEN_EXPIRED',
    USER_ALREADY_IN_GROUP: 'USER_ALREADY_IN_GROUP',
    USER_NOT_IN_GROUP: 'USER_NOT_IN_GROUP',
  },

  // ===========================
  // Group Management
  // ===========================
  GROUPS: {
    GROUP_NOT_FOUND: 'GROUP_NOT_FOUND',
    GROUP_NAME_EXISTS: 'GROUP_NAME_EXISTS',
    GROUP_HAS_MEMBERS: 'GROUP_HAS_MEMBERS',
    GROUP_ACCESS_DENIED: 'GROUP_ACCESS_DENIED',
    GROUP_INVALID_STATE: 'GROUP_INVALID_STATE',
  },

  // ===========================
  // Validation Errors
  // ===========================
  VALIDATION: {
    FAILED: 'VALIDATION_FAILED',
    INVALID_INPUT: 'VALIDATION_INVALID_INPUT',
    MISSING_REQUIRED_FIELD: 'VALIDATION_MISSING_REQUIRED_FIELD',
    INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
    VALUE_TOO_LONG: 'VALIDATION_VALUE_TOO_LONG',
    VALUE_TOO_SHORT: 'VALIDATION_VALUE_TOO_SHORT',
    INVALID_EMAIL: 'VALIDATION_INVALID_EMAIL',
    INVALID_PHONE: 'VALIDATION_INVALID_PHONE',
    INVALID_DATE: 'VALIDATION_INVALID_DATE',
    INVALID_ENUM_VALUE: 'VALIDATION_INVALID_ENUM_VALUE',
  },

  // ===========================
  // Resource Management
  // ===========================
  RESOURCE: {
    NOT_FOUND: 'RESOURCE_NOT_FOUND',
    ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
    CONFLICT: 'RESOURCE_CONFLICT',
    LOCKED: 'RESOURCE_LOCKED',
    QUOTA_EXCEEDED: 'RESOURCE_QUOTA_EXCEEDED',
    INVALID_STATE: 'RESOURCE_INVALID_STATE',
  },

  // ===========================
  // File & Media Handling
  // ===========================
  FILE: {
    NOT_FOUND: 'FILE_NOT_FOUND',
    UPLOAD_FAILED: 'FILE_UPLOAD_FAILED',
    TOO_LARGE: 'FILE_TOO_LARGE',
    INVALID_TYPE: 'FILE_INVALID_TYPE',
    PROCESSING_FAILED: 'FILE_PROCESSING_FAILED',
    VIRUS_DETECTED: 'FILE_VIRUS_DETECTED',
    CORRUPTED: 'FILE_CORRUPTED',
  },

  // ===========================
  // Archive & Collection Management
  // ===========================
  ARCHIVE: {
    NOT_FOUND: 'ARCHIVE_NOT_FOUND',
    ACCESS_RESTRICTED: 'ARCHIVE_ACCESS_RESTRICTED',
    METADATA_INVALID: 'ARCHIVE_METADATA_INVALID',
    COLLECTION_FULL: 'ARCHIVE_COLLECTION_FULL',
    EMBARGO_ACTIVE: 'ARCHIVE_EMBARGO_ACTIVE',
    COPYRIGHT_RESTRICTED: 'ARCHIVE_COPYRIGHT_RESTRICTED',
  },

  // ===========================
  // Collection Management
  // ===========================
  COLLECTION: {
    NOT_FOUND: 'COLLECTION_NOT_FOUND',
    NAME_ALREADY_EXISTS: 'COLLECTION_NAME_ALREADY_EXISTS',
    HAS_DOCUMENTS: 'COLLECTION_HAS_DOCUMENTS',
    ACCESS_DENIED: 'COLLECTION_ACCESS_DENIED',
    INVALID_STATE: 'COLLECTION_INVALID_STATE',
  },

  // ===========================
  // Default Questions Management
  // ===========================
  DEFAULT_QUESTIONS: {
    NOT_FOUND: 'DEFAULT_QUESTIONS_NOT_FOUND',
    INVALID_ID: 'DEFAULT_QUESTIONS_INVALID_ID',
    INSUFFICIENT_PERMISSIONS: 'DEFAULT_QUESTIONS_INSUFFICIENT_PERMISSIONS',
    SORT_INDEX_CONFLICT: 'DEFAULT_QUESTIONS_SORT_INDEX_CONFLICT',
    TEXT_TOO_LONG: 'DEFAULT_QUESTIONS_TEXT_TOO_LONG',
    INVALID_SORT_INDEX: 'DEFAULT_QUESTIONS_INVALID_SORT_INDEX',
  },

  // ===========================
  // System & Infrastructure
  // ===========================
  SYSTEM: {
    INTERNAL_ERROR: 'SYSTEM_INTERNAL_ERROR',
    DATABASE_ERROR: 'SYSTEM_DATABASE_ERROR',
    NETWORK_ERROR: 'SYSTEM_NETWORK_ERROR',
    SERVICE_UNAVAILABLE: 'SYSTEM_SERVICE_UNAVAILABLE',
    MAINTENANCE_MODE: 'SYSTEM_MAINTENANCE_MODE',
    CONFIGURATION_ERROR: 'SYSTEM_CONFIGURATION_ERROR',
  },

  // ===========================
  // Rate Limiting & Quotas
  // ===========================
  RATE_LIMIT: {
    EXCEEDED: 'RATE_LIMIT_EXCEEDED',
    API_QUOTA_EXCEEDED: 'RATE_LIMIT_API_QUOTA_EXCEEDED',
    STORAGE_QUOTA_EXCEEDED: 'RATE_LIMIT_STORAGE_QUOTA_EXCEEDED',
    BANDWIDTH_EXCEEDED: 'RATE_LIMIT_BANDWIDTH_EXCEEDED',
  },

  // ===========================
  // Business Logic
  // ===========================
  BUSINESS: {
    INVALID_OPERATION: 'BUSINESS_INVALID_OPERATION',
    PRECONDITION_FAILED: 'BUSINESS_PRECONDITION_FAILED',
    WORKFLOW_ERROR: 'BUSINESS_WORKFLOW_ERROR',
    APPROVAL_REQUIRED: 'BUSINESS_APPROVAL_REQUIRED',
    DUPLICATE_SUBMISSION: 'BUSINESS_DUPLICATE_SUBMISSION',
  },

  // ===========================
  // Integration & External Services
  // ===========================
  INTEGRATION: {
    EXTERNAL_SERVICE_ERROR: 'INTEGRATION_EXTERNAL_SERVICE_ERROR',
    API_KEY_INVALID: 'INTEGRATION_API_KEY_INVALID',
    WEBHOOK_FAILED: 'INTEGRATION_WEBHOOK_FAILED',
    SYNC_FAILED: 'INTEGRATION_SYNC_FAILED',
  },

  // ===========================
  // Security
  // ===========================
  SECURITY: {
    SUSPICIOUS_REQUEST: 'SECURITY_SUSPICIOUS_REQUEST',
  },
} as const;

// Type for all error codes
export type ErrorCode =
  (typeof ERROR_CODES)[keyof typeof ERROR_CODES][keyof (typeof ERROR_CODES)[keyof typeof ERROR_CODES]];

// Helper to get flat list of all error codes (useful for validation)
export const ALL_ERROR_CODES = Object.values(ERROR_CODES).reduce((acc, category) => {
  return [...acc, ...Object.values(category)];
}, [] as string[]);

// Error code metadata for better error messages
export const ERROR_CODE_MESSAGES: Record<string, string> = {
  // Auth errors
  [ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED]: 'Authentication is required to access this resource',
  [ERROR_CODES.AUTH.INVALID_CREDENTIALS]: 'Invalid username or password',
  [ERROR_CODES.AUTH.TOKEN_EXPIRED]: 'Your session has expired. Please log in again',
  [ERROR_CODES.AUTH.TOKEN_INVALID]: 'Invalid authentication token',
  [ERROR_CODES.AUTH.INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action',
  [ERROR_CODES.AUTH.ACCESS_DENIED]: 'Access denied',
  [ERROR_CODES.AUTH.ACCOUNT_LOCKED]: 'Your account has been locked. Please contact support',
  [ERROR_CODES.AUTH.ACCOUNT_NOT_ACTIVATED]:
    'Your account is not activated. Please check your email',

  // User errors
  [ERROR_CODES.USER.NOT_FOUND]: 'User not found',
  [ERROR_CODES.USER.ALREADY_EXISTS]: 'User already exists',
  [ERROR_CODES.USER.EMAIL_ALREADY_EXISTS]: 'An account with this email already exists',
  [ERROR_CODES.USER.USERNAME_ALREADY_EXISTS]: 'This username is already taken',
  [ERROR_CODES.USER.NOT_ACTIVATED]: 'User account is not activated',
  [ERROR_CODES.USER.ALREADY_ACTIVATED]: 'User account is already activated',
  [ERROR_CODES.USER.ALREADY_DEACTIVATED]: 'User account is already deactivated',
  [ERROR_CODES.USER.CANNOT_DEACTIVATE_SELF]: 'You cannot deactivate your own account',
  [ERROR_CODES.USER.INVALID_PASSWORD]: 'Current password is incorrect',
  [ERROR_CODES.USER.PASSWORD_TOO_WEAK]: 'Password does not meet security requirements',
  [ERROR_CODES.USER.VERIFICATION_CODE_INVALID]: 'Invalid verification code',
  [ERROR_CODES.USER.VERIFICATION_CODE_EXPIRED]: 'Verification code has expired',

  // Group errors
  [ERROR_CODES.GROUPS.GROUP_NOT_FOUND]: 'Group not found',
  [ERROR_CODES.GROUPS.GROUP_NAME_EXISTS]: 'Group name already exists',
  [ERROR_CODES.GROUPS.GROUP_HAS_MEMBERS]: 'Cannot delete group with members',
  [ERROR_CODES.GROUPS.GROUP_ACCESS_DENIED]: 'Access denied to group',
  [ERROR_CODES.GROUPS.GROUP_INVALID_STATE]: 'Group is in an invalid state',

  // Collection errors
  [ERROR_CODES.COLLECTION.NOT_FOUND]: 'Collection not found',
  [ERROR_CODES.COLLECTION.NAME_ALREADY_EXISTS]: 'Collection name already exists',
  [ERROR_CODES.COLLECTION.HAS_DOCUMENTS]: 'Cannot delete collection that contains documents',
  [ERROR_CODES.COLLECTION.ACCESS_DENIED]: 'Access denied to collection',
  [ERROR_CODES.COLLECTION.INVALID_STATE]: 'Collection is in an invalid state',

  // Default Questions errors
  [ERROR_CODES.DEFAULT_QUESTIONS.NOT_FOUND]: 'Default question not found',
  [ERROR_CODES.DEFAULT_QUESTIONS.INVALID_ID]: 'Invalid default question ID',
  [ERROR_CODES.DEFAULT_QUESTIONS.INSUFFICIENT_PERMISSIONS]:
    'Insufficient permissions to access this default question',
  [ERROR_CODES.DEFAULT_QUESTIONS.SORT_INDEX_CONFLICT]:
    'A question with this sort index already exists',
  [ERROR_CODES.DEFAULT_QUESTIONS.TEXT_TOO_LONG]: 'Question text is too long',
  [ERROR_CODES.DEFAULT_QUESTIONS.INVALID_SORT_INDEX]: 'Invalid sort index value',

  // Validation errors
  [ERROR_CODES.VALIDATION.FAILED]: 'Validation failed',
  [ERROR_CODES.VALIDATION.INVALID_INPUT]: 'Invalid input provided',
  [ERROR_CODES.VALIDATION.MISSING_REQUIRED_FIELD]: 'Required field is missing',
  [ERROR_CODES.VALIDATION.INVALID_FORMAT]: 'Invalid format',
  [ERROR_CODES.VALIDATION.INVALID_EMAIL]: 'Invalid email format',
  [ERROR_CODES.VALIDATION.INVALID_PHONE]: 'Invalid phone number format',

  // Resource errors
  [ERROR_CODES.RESOURCE.NOT_FOUND]: 'Resource not found',
  [ERROR_CODES.RESOURCE.ALREADY_EXISTS]: 'Resource already exists',
  [ERROR_CODES.RESOURCE.CONFLICT]: 'Resource conflict',
  [ERROR_CODES.RESOURCE.LOCKED]: 'Resource is locked and cannot be modified',

  // System errors
  [ERROR_CODES.SYSTEM.INTERNAL_ERROR]: 'An internal error occurred',
  [ERROR_CODES.SYSTEM.DATABASE_ERROR]: 'Database operation failed',
  [ERROR_CODES.SYSTEM.SERVICE_UNAVAILABLE]: 'Service is temporarily unavailable',

  // Rate limit errors
  [ERROR_CODES.RATE_LIMIT.EXCEEDED]: 'Rate limit exceeded. Please try again later',
  [ERROR_CODES.RATE_LIMIT.API_QUOTA_EXCEEDED]: 'API quota exceeded',
};

// Helper function to get user-friendly message for an error code
export function getErrorMessage(code: string, defaultMessage?: string): string {
  return ERROR_CODE_MESSAGES[code] ?? defaultMessage ?? 'An error occurred';
}
