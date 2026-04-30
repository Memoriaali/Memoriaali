/**
 * USER VALIDATION SCHEMAS
 * =======================
 *
 * This module provides strict TypeScript/Zod schemas for user-related field validation.
 * These schemas are used to validate user input during registration and updates.
 *
 * Key Components:
 * - Email format validation
 * - Username format and length validation
 * - Name field validation (preventing empty strings)
 * - Company field validation
 */

import { z } from 'zod';

// =============================================
// EMAIL VALIDATION
// =============================================

/**
 * Email validation schema
 * Validates email format and length constraints
 */
export const EmailSchema = z
  .string()
  .trim()
  .min(1, 'Email is required')
  .max(255, 'Email must not exceed 255 characters')
  .email('Invalid email address')
  .transform((email) => email.toLowerCase());

/**
 * Optional email validation schema
 * For fields that can be empty or undefined
 */
export const OptionalEmailSchema = z
  .string()
  .trim()
  .max(255, 'Email must not exceed 255 characters')
  .email('Invalid email address')
  .transform((email) => email.toLowerCase())
  .optional();

// =============================================
// USERNAME VALIDATION
// =============================================

/**
 * Username validation schema
 * Validates username format, length, and character constraints
 */
export const UsernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(255, 'Username must not exceed 255 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, underscores, and hyphens',
  );

// =============================================
// NAME VALIDATION
// =============================================

/**
 * Name validation schema
 * Validates that name fields are not empty strings when provided
 */
export const NameSchema = z
  .string()
  .trim()
  .min(1, 'Name cannot be empty')
  .max(255, 'Name must not exceed 255 characters');

/**
 * Optional name validation schema
 * Allows null/undefined but prevents empty strings
 */
export const OptionalNameSchema = z
  .string()
  .trim()
  .min(1, 'Name cannot be empty')
  .max(255, 'Name must not exceed 255 characters')
  .nullable()
  .optional();

// =============================================
// COMPANY VALIDATION
// =============================================

/**
 * Company name validation schema
 * Validates company name format and length
 */
export const CompanyNameSchema = z
  .string()
  .trim()
  .min(1, 'Company name cannot be empty')
  .max(255, 'Company name must not exceed 255 characters');

/**
 * Optional company name validation schema
 */
export const OptionalCompanyNameSchema = z
  .string()
  .trim()
  .min(1, 'Company name cannot be empty')
  .max(255, 'Company name must not exceed 255 characters')
  .nullable()
  .optional();

// =============================================
// CONTACT VALIDATION
// =============================================

/**
 * Phone number validation schema
 * Basic phone number format validation
 */
export const PhoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone number cannot be empty')
  .max(50, 'Phone number must not exceed 50 characters')
  .regex(
    /^[+]?[0-9\s\-()]+$/,
    'Phone number can only contain numbers, spaces, hyphens, parentheses, and plus sign',
  );

/**
 * Optional phone number validation schema
 */
export const OptionalPhoneSchema = z
  .string()
  .trim()
  .min(1, 'Phone number cannot be empty')
  .max(50, 'Phone number must not exceed 50 characters')
  .regex(
    /^[+]?[0-9\s\-()]+$/,
    'Phone number can only contain numbers, spaces, hyphens, parentheses, and plus sign',
  )
  .nullable()
  .optional();

/**
 * Address validation schema
 * Validates address fields
 */
export const AddressSchema = z
  .string()
  .trim()
  .min(1, 'Address cannot be empty')
  .max(500, 'Address must not exceed 500 characters');

/**
 * Optional address validation schema
 */
export const OptionalAddressSchema = z
  .string()
  .trim()
  .min(1, 'Address cannot be empty')
  .max(500, 'Address must not exceed 500 characters')
  .nullable()
  .optional();
