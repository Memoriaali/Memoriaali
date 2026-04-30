// Authentication middleware - Layer 4 Application Security
export { authenticateUser } from './authentication.middleware';

// Security middleware - Layer 4 Application Security
export {
  adminOperationLimiter,
  corsMiddleware,
  createRateLimiter,
  criticalOperationLimiter,
  passwordChangeLimiter,
  rateLimitAuth,
  rateLimitBasic,
  rateLimitUpload,
  requestValidationMiddleware,
  searchOperationLimiter,
  securityHeadersMiddleware,
  userCreationLimiter,
  validateApiKey,
} from './security.middleware';

// Authorization middleware
export {
  requireAdmin,
  requireAnyRole,
  requireAuthentication,
  requireModerator,
  requireRole,
} from './authorization.middleware';

// Permission-based middleware
export { hasPermission, requireAnyPermission, requirePermission } from './permissions.middleware';

// Error handling middleware
export { errorHandler } from './error-handler.middleware';

// Service-level authorization utilities (for use in business logic)
export * from '../shared/auth/authorization.utils';
export type { AuthorizationContext, OwnedResource } from '../shared/auth/authorization.utils';

// Worker authentication
export { requireWorkerAuth } from './worker-auth.middleware';
