import { Permission, ROLE_PERMISSIONS } from '@memoriaali/access-control';
import { FeatureId, PublicVariantConfiguration } from '@memoriaali/variant-config';
import { User } from '../api/index';

/**
 * The Logic to determine if the children should be rendered
 */
export interface WithAccessProps {
  /**
   * The logic to use to determine if the children should be rendered
   * @default 'and'
   */
  logic: 'and' | 'or';
  /**
   * Render the children the user is not authenticated
   */
  whenAuthenticated?: boolean;
  /**
   * Render the children the user role is not met
   */
  withRole?: keyof typeof ROLE_PERMISSIONS;
  withRoles?: Array<keyof typeof ROLE_PERMISSIONS>;
  /**
   * Render the children the feature is not met
   */
  withFeature?: FeatureId;
  withFeatures?: FeatureId[];
  /**
   * Render the children the permission is not met
   */
  withPermission?: Permission;
  withPermissions?: Permission[];
}

/**
 * Check if the user has access to the given props
 * @param props - The props to check access for
 * @param user - The user to check access for
 * @param variantConfiguration - The variant configuration to check access for
 * @returns True if the user has access to the given props, false otherwise
 */
export const hasAccess = (
  props: WithAccessProps,
  user: User | null,
  variantConfiguration: PublicVariantConfiguration | null,
): boolean => {
  const checks: boolean[] = [];

  // Authentication check (supports both authenticated and unauthenticated rendering)
  if (typeof props.whenAuthenticated !== 'undefined') {
    const isAuthenticated = Boolean(user);
    checks.push(props.whenAuthenticated ? isAuthenticated : !isAuthenticated);
  }

  // Role checks
  if (props.withRole) {
    const hasRole = Boolean(user?.roles?.includes(props.withRole));
    checks.push(hasRole);
  }

  if (props.withRoles && props.withRoles.length > 0) {
    const userRoles = new Set(user?.roles ?? []);
    const hasAnyRole = props.withRoles.some((role) => userRoles.has(role));
    checks.push(hasAnyRole);
  }

  // Permission checks via role → permissions mapping
  if (props.withPermission || (props.withPermissions && props.withPermissions.length > 0)) {
    const roles = user?.roles ?? [];
    const permissions = new Set<Permission>();
    for (const role of roles) {
      const rolePerms = ROLE_PERMISSIONS[role];
      for (const perm of rolePerms) {
        permissions.add(perm);
      }
    }

    if (props.withPermission) {
      checks.push(permissions.has(props.withPermission));
    }
    if (props.withPermissions && props.withPermissions.length > 0) {
      const hasAnyPermission = props.withPermissions.some((perm) => permissions.has(perm));
      checks.push(hasAnyPermission);
    }
  }

  // Feature checks against variant configuration
  const featureIds: FeatureId[] = Array.isArray(variantConfiguration?.features)
    ? variantConfiguration.features.map((f) => f.feature)
    : [];

  if (props.withFeature) {
    checks.push(featureIds.includes(props.withFeature));
  }
  if (props.withFeatures && props.withFeatures.length > 0) {
    const hasAnyFeature = props.withFeatures.some((fid) => featureIds.includes(fid));
    checks.push(hasAnyFeature);
  }

  // Combine according to logic (default AND). If no checks provided, allow by default.
  if (checks.length === 0) {
    return true;
  }
  return props.logic === 'or' ? checks.some(Boolean) : checks.every(Boolean);
};
