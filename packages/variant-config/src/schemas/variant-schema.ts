/**
 * Zod schemas for runtime validation of variant configurations.
 */

import { z } from 'zod';
import {
  FeatureConfigurationSchema as DEF_FeatureConfigurationSchema,
  FEATURE_KEYS,
} from '../definitions/features';

/**
 * Feature configuration schemas
 */
const BaseFeatureConfigSchema = z.object({
  feature: z.enum(FEATURE_KEYS as [string, ...string[]]),
});

// User management schemas
const UserManagementConfigSchema = BaseFeatureConfigSchema.extend({
  feature: z.literal('userManagement'),
  config: z.object({
    allowSelfRegistration: z.boolean(),
    requireEmailVerification: z.boolean(),
    passwordPolicy: z.object({
      minLength: z.number().min(1),
      requireUppercase: z.boolean(),
      requireLowercase: z.boolean(),
      requireNumbers: z.boolean(),
      requireSpecialChars: z.boolean(),
      maxAge: z.number().optional(),
    }),
    sessionTimeout: z.number(),
    allowProfileEditing: z.boolean(),
  }),
});

// Documents schemas
const DocumentsConfigSchema = BaseFeatureConfigSchema.extend({
  feature: z.literal('documents'),
  config: z.object({
    maxFileSize: z.string(),
    allowedFormats: z.array(z.string()),
    processInBackground: z.boolean(),
    enableVersioning: z.boolean(),
    enableOcr: z.boolean(),
    batchUpload: z.object({
      enabled: z.boolean(),
      maxBatchSize: z.number(),
    }),
    workflow: z.object({
      enabled: z.boolean(),
      requireApproval: z.boolean(),
      approvalLevels: z.number(),
    }),
  }),
});

// Flaw detection schemas
const FlawDetectionConfigSchema = BaseFeatureConfigSchema.extend({
  feature: z.literal('flawDetection'),
  config: z.object({
    api: z.string(),
    emptyPages: z.boolean(),
    postIt: z.boolean(),
    foldedCorner: z.boolean(),
  }),
});

// Metadata detection schemas
const MetadataDetectionConfigSchema = BaseFeatureConfigSchema.extend({
  feature: z.literal('metadataDetection'),
  config: z.object({
    api: z.string(),
    annif: z.boolean(),
    gpe: z.boolean(),
    date: z.boolean(),
    name: z.boolean(),
    act: z.boolean(),
    y_field: z.boolean(),
    diar: z.boolean(),
    product: z.boolean(),
    event: z.boolean(),
    norp: z.boolean(),
  }),
});

// Oral History schemas
const OralHistoryConfigSchema = BaseFeatureConfigSchema.extend({
  feature: z.literal('oralHistory'),
  config: z.object({
    enabled: z.boolean(),
  }),
});

// Group management schemas
const GroupManagementConfigSchema = BaseFeatureConfigSchema.extend({
  feature: z.literal('groupManagement'),
  config: z.object({
    allowUserCreatedGroups: z.boolean(),
    maxGroupSize: z.number(),
    requireApprovalToJoin: z.boolean(),
    allowNestedGroups: z.boolean(),
    defaultPermissions: z.array(z.string()),
  }),
});

// SIP schemas
const SipConfigSchema = BaseFeatureConfigSchema.extend({
  feature: z.literal('sip'),
  config: z.object({
    enabled: z.boolean(),
  }),
});

/**
 * Union of all feature configuration schemas
 */
const FeatureConfigurationSchema = z.discriminatedUnion('feature', [
  UserManagementConfigSchema,
  DocumentsConfigSchema,
  FlawDetectionConfigSchema,
  MetadataDetectionConfigSchema,
  OralHistoryConfigSchema,
  GroupManagementConfigSchema,
  SipConfigSchema,
]);

/**
 * Localization configuration schema
 */
const LocaleEnum = z.enum(['fi', 'en', 'sv', 'et', 'ru']);

export const LocalizationConfigurationSchema = z
  .object({
    defaultLocale: LocaleEnum,
    availableLocales: z.array(LocaleEnum),
    dateFormat: z.string(),
    timeFormat: z.string(),
    timeZone: z.string(),
    firstDayOfWeek: z.union([
      z.literal(0),
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
      z.literal(6),
    ]),
    numberFormat: z.object({
      decimalSeparator: z.enum(['.', ',']),
      thousandsSeparator: z.enum([' ', ',', '.']),
      currency: z.string(),
      currencyPosition: z.enum(['before', 'after']),
    }),
    customTranslations: z.record(z.string(), z.record(z.string(), z.string())).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.customTranslations) {
      return;
    }
    const allowedLocales = new Set(value.availableLocales);
    for (const locale of Object.keys(value.customTranslations)) {
      if (!allowedLocales.has(locale as (typeof value.availableLocales)[number])) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['customTranslations', locale],
          message: 'Locale must be one of availableLocales',
        });
      }
    }
  });

export type LocalizationConfiguration = z.infer<typeof LocalizationConfigurationSchema>;

/**
 * Security configuration schema
 */
const SecurityConfigurationSchema = z.object({
  sessionTimeout: z.number(),
  refreshTokenEnabled: z.boolean(),
  allowedOrigins: z.array(z.string()),
  allowedDomains: z.array(z.string()),
  ipWhitelist: z.array(z.string()).optional(),
  ipBlacklist: z.array(z.string()).optional(),
  maxLoginAttempts: z.number(),
  lockoutDuration: z.number(),
  requireHttps: z.boolean(),
  contentSecurityPolicy: z.string().optional(),
  rateLimiting: z.object({
    enabled: z.boolean(),
    windowMs: z.number(),
    maxRequests: z.number(),
  }),
});

export type SecurityConfiguration = z.infer<typeof SecurityConfigurationSchema>;

/**
 * Organization configuration schema
 */
export const OrganizationConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(['university', 'archive', 'library', 'museum', 'government', 'private']),
  country: z.string(),
  language: z.string(),
  contact: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    website: z.string().url().optional(),
  }),
  legal: z
    .object({
      privacyPolicyUrl: z.string().url().optional(),
      termsOfServiceUrl: z.string().url().optional(),
      dataProtectionOfficer: z.string().optional(),
      gdprCompliant: z.boolean(),
    })
    .optional(),
});

export type OrganizationConfiguration = z.infer<typeof OrganizationConfigurationSchema>;

/**
 * Permissions configuration schema
 */
export const PermissionsConfigurationSchema = z.object({
  defaultRole: z.string(),
  customRoles: z.array(
    z.object({
      id: z.string(),
      name: z.record(z.string(), z.string()),
      permissions: z.array(z.string()),
      isDefault: z.boolean().optional(),
    }),
  ),
});

export type PermissionsConfiguration = z.infer<typeof PermissionsConfigurationSchema>;

/**
 * Complete variant configuration schema
 */
export const VariantConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  version: z.string(),
  organization: OrganizationConfigurationSchema,
  features: z.array(DEF_FeatureConfigurationSchema),
  localization: LocalizationConfigurationSchema,
  security: SecurityConfigurationSchema,
  permissions: PermissionsConfigurationSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/**
 * Type inference from schema
 */
export type VariantConfiguration = z.infer<typeof VariantConfigurationSchema>;

/**
 * Public (frontend-safe) variant configuration schema and type.
 * Security fields are intentionally excluded from the public shape.
 */
export const PublicVariantConfigurationSchema = VariantConfigurationSchema.pick({
  id: true,
  name: true,
  description: true,
  version: true,
  organization: true,
  features: true,
  localization: true,
  metadata: true,
  createdAt: true,
  updatedAt: true,
});

export type PublicVariantConfiguration = z.infer<typeof PublicVariantConfigurationSchema>;

/**
 * Extract a public configuration by validating and stripping sensitive fields.
 */
export const extractPublicVariantConfiguration = (
  config: VariantConfiguration,
): PublicVariantConfiguration => {
  const { security: _omit, ...publicConfig } = config;
  return PublicVariantConfigurationSchema.parse(publicConfig);
};

/**
 * Safe validate with error handling.
 *
 * @param config - Unknown data to validate
 * @returns Validated and typed data
 * @throws ZodError if validation fails
 */
export const validateVariantConfiguration = (
  config: VariantConfiguration,
): VariantConfiguration => {
  const result = VariantConfigurationSchema.parse(config);
  return result as VariantConfiguration;
};
