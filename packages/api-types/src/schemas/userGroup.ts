/**
 * USER GROUP METADATA SCHEMAS
 * ============================
 *
 * This module provides strict TypeScript/Zod schemas for managing user group memberships
 * and their associated metadata in the Memoriaali system. It handles role-based permissions,
 * membership tracking, activity monitoring, and notification preferences.
 *
 * The schemas support both simple role assignments and complex metadata structures,
 * allowing for flexible group management while maintaining type safety.
 *
 * Key Components:
 * - Role and permission definitions
 * - Membership status tracking
 * - Activity and notification management
 * - Utility functions for common operations
 */

import { z } from 'zod';

// =============================================
// ROLE DEFINITION SCHEMAS
// =============================================

/**
 * Individual role definition schema
 * Defines the structure for group roles with validation rules
 */
export const RoleDefinitionSchema = z
  .object({
    /** Role identifier */
    id: z.string().trim().min(1).max(50),

    /** Human-readable role name */
    name: z.string().trim().min(1).max(100),

    /** Role description */
    description: z.string().trim().max(500).optional(),

    /** Role priority/level (higher = more permissions) */
    level: z.number().int().min(0).max(100),

    /** Role color for UI display */
    color: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),

    /** Whether role is active/enabled */
    active: z.boolean().default(true),
  })
  .strict();

/**
 * Permission definition schema
 * Defines granular permissions for different scopes and actions
 */
export const PermissionSchema = z
  .object({
    /** Permission identifier */
    id: z.string().trim().min(1).max(50),

    /** Permission scope (group, document, collection, etc.) */
    scope: z.enum(['group', 'document', 'collection', 'comment', 'user', 'metadata', 'admin']),

    /** Permission action */
    action: z.enum([
      'create',
      'read',
      'update',
      'delete',
      'moderate',
      'approve',
      'share',
      'export',
    ]),

    /** Permission granted */
    granted: z.boolean(),

    /** Conditions for permission (optional) */
    conditions: z.record(z.string(), z.any()).optional(),
  })
  .strict();

// =============================================
// GROUP MEMBERSHIP SCHEMAS
// =============================================

/**
 * User's membership status schema
 * Tracks membership lifecycle and approval process
 */
export const MembershipStatusSchema = z
  .object({
    /** Membership status */
    status: z.enum(['active', 'inactive', 'pending', 'suspended', 'banned']),

    /** Join date */
    joinedAt: z.string().datetime(),

    /** Last activity date */
    lastActiveAt: z.string().datetime().optional(),

    /** Membership expiry date */
    expiresAt: z.string().datetime().optional(),

    /** Suspension/ban reason */
    statusReason: z.string().trim().max(500).optional(),

    /** Who approved the membership */
    approvedBy: z.number().int().positive().optional(),

    /** Approval timestamp */
    approvedAt: z.string().datetime().optional(),
  })
  .strict();

/**
 * User's activity tracking schema
 * Monitors user engagement and contribution metrics
 */
export const ActivityTrackingSchema = z
  .object({
    /** Documents created in group context */
    documentsCreated: z.number().int().min(0).default(0),

    /** Comments posted in group */
    commentsPosted: z.number().int().min(0).default(0),

    /** Collections contributed to */
    collectionsContributed: z.number().int().min(0).default(0),

    /** Last login to group */
    lastLogin: z.string().datetime().optional(),

    /** Total time spent in group (minutes) */
    totalTimeSpent: z.number().min(0).default(0),

    /** Activity score */
    activityScore: z.number().min(0).max(100).optional(),
  })
  .strict();

// =============================================
// NOTIFICATION PREFERENCES
// =============================================

/**
 * User's notification preferences schema
 * Manages how users receive notifications for group activities
 */
export const NotificationPreferencesSchema = z
  .object({
    /** Email notifications enabled */
    emailNotifications: z.boolean().default(true),

    /** In-app notifications enabled */
    inAppNotifications: z.boolean().default(true),

    /** Notification frequency */
    frequency: z.enum(['immediate', 'daily', 'weekly', 'never']).default('daily'),

    /** Types of notifications to receive */
    notificationTypes: z.object({
      newDocuments: z.boolean().default(true),
      newComments: z.boolean().default(true),
      roleChanges: z.boolean().default(true),
      groupUpdates: z.boolean().default(true),
      mentions: z.boolean().default(true),
    }),
  })
  .strict();

// =============================================
// COMPLETE USER GROUP METADATA
// =============================================

/**
 * Complete metadata schema for user's membership in a group
 * Encompasses all aspects of group membership and user preferences
 */
export const UserGroupMetadataSchema = z
  .object({
    /** User's roles in this group */
    roles: z.array(RoleDefinitionSchema).optional(),

    /** User's permissions in this group */
    permissions: z.array(PermissionSchema).optional(),

    /** Membership status and history */
    membership: MembershipStatusSchema.optional(),

    /** Activity tracking */
    activity: ActivityTrackingSchema.optional(),

    /** Notification preferences */
    notifications: NotificationPreferencesSchema.optional(),

    /** Custom group-specific user data */
    customData: z.record(z.string(), z.any()).optional(),

    /** User's display preferences for this group */
    preferences: z
      .object({
        displayName: z.string().trim().max(100).optional(),
        avatar: z.string().url().optional(),
        bio: z.string().trim().max(500).optional(),
        visibility: z.enum(['public', 'group', 'private']).default('group'),
      })
      .optional(),
  })
  .strict();

/**
 * Simplified metadata schema for basic role assignment
 * Lightweight alternative for simple group membership scenarios
 */
export const SimpleUserGroupMetadataSchema = z
  .object({
    /** Simple role names */
    roles: z.array(z.string().trim().min(1).max(50)).optional(),

    /** Join timestamp */
    joinedAt: z.string().datetime().optional(),
  })
  .strict();

// =============================================
// TYPE EXPORTS
// =============================================

export type RoleDefinition = z.infer<typeof RoleDefinitionSchema>;
export type Permission = z.infer<typeof PermissionSchema>;
export type MembershipStatus = z.infer<typeof MembershipStatusSchema>;
export type ActivityTracking = z.infer<typeof ActivityTrackingSchema>;
export type NotificationPreferences = z.infer<typeof NotificationPreferencesSchema>;
export type UserGroupMetadata = z.infer<typeof UserGroupMetadataSchema>;
export type SimpleUserGroupMetadata = z.infer<typeof SimpleUserGroupMetadataSchema>;

// =============================================
// UTILITY FUNCTIONS
// =============================================

/**
 * Validates user group metadata against available schemas
 *
 * Preconditions: data is any unknown value
 * Postconditions: returns valid UserGroupMetadata or SimpleUserGroupMetadata, throws on invalid data
 * Invariants: input data is not mutated
 *
 * @param data - Unknown data to validate
 * @returns Validated metadata object
 */
export const validateUserGroupMetadata = (
  data: unknown,
): UserGroupMetadata | SimpleUserGroupMetadata => {
  const fullResult = UserGroupMetadataSchema.safeParse(data);

  if (fullResult.success) {
    return fullResult.data;
  }

  return SimpleUserGroupMetadataSchema.parse(data);
};

/**
 * Creates a simple role assignment with current timestamp
 *
 * Preconditions: roles is a non-empty array of valid role strings
 * Postconditions: returns valid SimpleUserGroupMetadata with roles and joinedAt timestamp
 * Invariants: current timestamp is used for joinedAt field
 *
 * @param roles - Array of role names to assign
 * @returns Simple metadata object with role assignment
 */
export const createSimpleRoleAssignment = (roles: string[]): SimpleUserGroupMetadata => {
  return SimpleUserGroupMetadataSchema.parse({
    roles,
    joinedAt: new Date().toISOString(),
  });
};

/**
 * Creates a basic membership record with active status
 *
 * Preconditions: approvedBy is undefined or a positive integer
 * Postconditions: returns valid MembershipStatus with active status and current timestamps
 * Invariants: status is always set to 'active', joinedAt is current timestamp
 *
 * @param approvedBy - Optional user ID who approved the membership
 * @returns Basic membership status record
 */
export const createMembershipRecord = (approvedBy?: number): MembershipStatus => {
  const currentTimestamp = new Date().toISOString();

  return MembershipStatusSchema.parse({
    status: 'active',
    joinedAt: currentTimestamp,
    approvedBy,
    approvedAt: approvedBy ? currentTimestamp : undefined,
  });
};

/**
 * Checks if user has specific permission in group metadata
 *
 * Preconditions: metadata is valid UserGroupMetadata, scope and action are valid enum values
 * Postconditions: returns true if permission is granted, false otherwise
 * Invariants: metadata object is not mutated
 *
 * @param metadata - User's group metadata to check
 * @param scope - Permission scope to check
 * @param action - Permission action to check
 * @returns True if user has the specified permission
 */
export const hasPermission = (
  metadata: UserGroupMetadata,
  scope: Permission['scope'],
  action: Permission['action'],
): boolean => {
  if (!metadata.permissions) {
    return false;
  }

  return metadata.permissions.some(
    (permission) =>
      permission.scope === scope && permission.action === action && permission.granted,
  );
};

/**
 * Gets the highest role level from user's roles
 *
 * Preconditions: metadata is valid UserGroupMetadata
 * Postconditions: returns highest role level as number, 0 if no roles
 * Invariants: metadata object is not mutated, return value is always >= 0
 *
 * @param metadata - User's group metadata
 * @returns Highest role level or 0 if no roles
 */
export const getHighestRoleLevel = (metadata: UserGroupMetadata): number => {
  if (!metadata.roles || metadata.roles.length === 0) {
    return 0;
  }
  return Math.max(...metadata.roles.map((role) => role.level));
};
