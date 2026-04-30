import { NextFunction, Request, RequestHandler, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { StatusCodes } from 'http-status-codes';

import { variantLoader } from '@memoriaali/variant-config';
import { ERROR_CODES, HttpException } from '../shared/errors';

/**
 * Security Middleware Collection - Layer 4 Application Security
 *
 * Implements Layer 4 (Application Security) security controls within Defense in Depth.
 * Uses industry-standard libraries (Helmet, express-rate-limit) for robust security.
 *
 * Security Controls:
 * - Helmet: Comprehensive security headers (CSP, HSTS, X-Frame-Options, etc.)
 * - Express-Rate-Limit: DDoS protection and rate limiting
 * - CORS: Cross-Origin Resource Sharing policy
 * - Request Validation: Content-type and API key validation
 */

const configurations = variantLoader.getConfiguration();

const DISABLE_ORIGIN_CHECK = process.env.DISABLE_ORIGIN_CHECK === 'true';

const DISABLE_RATE_LIMIT = process.env.DISABLE_RATE_LIMIT === 'true';

// Variant-config driven security configuration
const rateLimitingConfig = configurations.security.rateLimiting;
const RATE_LIMITING_GLOBALLY_DISABLED = DISABLE_RATE_LIMIT || !rateLimitingConfig.enabled;

const securityOrigins = DISABLE_ORIGIN_CHECK ? [] : configurations.security.allowedOrigins;

/**
 * Get allowed origins for CORS policy
 */
const getAllowedOrigins = (): string[] => {
  const origins = [...securityOrigins];

  // Production frontend URL
  if (process.env.FRONTEND_URL) {
    origins.push(process.env.FRONTEND_URL);
  }

  // Development origins
  if (process.env.NODE_ENV === 'development') {
    origins.push(
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173', // Vite default
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    );
  }

  return origins.filter(Boolean);
};

const allowedOrigins = getAllowedOrigins();
/**
 * CORS (Cross-Origin Resource Sharing) middleware
 *
 * Implements CORS policy for frontend integration while preventing
 * unauthorized cross-origin requests from malicious websites.
 */
export const corsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const origin = req.get('origin');

  // Set CORS headers
  if (origin && allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (process.env.NODE_ENV === 'development') {
    // Allow all origins in development for easier testing
    res.header('Access-Control-Allow-Origin', origin ?? '*');
  }

  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key',
  );
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(StatusCodes.NO_CONTENT).end();
    return;
  }

  next();
};

/**
 * Security headers middleware using Helmet
 *
 * Helmet sets various HTTP headers to secure Express apps:
 * - Content-Security-Policy
 * - X-DNS-Prefetch-Control
 * - X-Frame-Options
 * - Strict-Transport-Security
 * - X-Content-Type-Options
 * - X-XSS-Protection
 * - And many more...
 */
export const securityHeadersMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: process.env.NODE_ENV === 'production',
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
});

const METHODS = ['POST', 'PUT', 'PATCH'];

/**
 * Request validation middleware
 *
 * Additional request validation beyond what Helmet provides:
 * - Content type validation for API endpoints
 * - Custom business logic validation
 */
export const requestValidationMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  // Content type validation for modification requests
  if (METHODS.includes(req.method)) {
    const contentType = req.get('Content-Type');
    const allowedTypes = [
      'application/json',
      'multipart/form-data',
      'application/x-www-form-urlencoded',
    ];

    if (contentType && !allowedTypes.some((type) => contentType.includes(type))) {
      next(
        HttpException.badRequest(ERROR_CODES.VALIDATION.INVALID_INPUT, 'Invalid content type', {
          received: contentType,
          allowed: allowedTypes,
        }),
      );
      return;
    }
  }

  next();
};

/**
 * Rate limiting configuration driven by variant-config with global disable support
 */

const noopMiddleware: RequestHandler = (_req, _res, next) => {
  next();
};

const buildRateLimiter = (options: {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
  skipSuccessfulRequests?: boolean;
}): RequestHandler => {
  if (RATE_LIMITING_GLOBALLY_DISABLED) {
    return noopMiddleware;
  }

  const windowMs = options.windowMs ?? rateLimitingConfig.windowMs;
  const max = options.maxRequests ?? rateLimitingConfig.maxRequests;

  const baseOptions: {
    windowMs: number;
    max: number;
    message: string;
    standardHeaders: true;
    legacyHeaders: false;
    keyGenerator?: (req: Request) => string;
  } = {
    windowMs,
    max,
    message: options.message ?? 'Too many requests, please try again later.',
    standardHeaders: true as const,
    legacyHeaders: false as const,
  };

  if (options.keyGenerator) {
    baseOptions.keyGenerator = options.keyGenerator;
  }

  const withSkip = options.skip ? { skip: options.skip } : {};
  const withSkipSuccess =
    options.skipSuccessfulRequests !== undefined
      ? { skipSuccessfulRequests: options.skipSuccessfulRequests }
      : {};

  return rateLimit({
    ...baseOptions,
    ...withSkip,
    ...withSkipSuccess,
  });
};

// Basic rate limiting for general API usage (uses variant defaults)
export const rateLimitBasic: RequestHandler = buildRateLimiter({});

// Strict rate limiting for authentication endpoints
export const rateLimitAuth: RequestHandler = buildRateLimiter({
  maxRequests: 5,
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts, please try again later.',
});

// Upload rate limiting
export const rateLimitUpload: RequestHandler = buildRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 10,
  message: 'Upload rate limit exceeded, please try again later.',
});

// Search operation rate limiting
export const searchOperationLimiter: RequestHandler = buildRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 100, // Increased from 30 to 100
  message: 'Too many search requests, please try again later.',
});

// Admin operation rate limiting (more permissive)
export const adminOperationLimiter: RequestHandler = buildRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 60,
  message: 'Admin operation rate limit exceeded.',
  skip: (req) => {
    // Only apply to admin users
    const authenticatedReq = req as Request & { authenticatedUser?: { role: string } };
    return (
      !authenticatedReq.authenticatedUser || authenticatedReq.authenticatedUser.role !== 'ADMIN'
    );
  },
});

// Critical operation rate limiting (delete, bulk updates)
export const criticalOperationLimiter: RequestHandler = buildRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 10,
  message: 'Critical operation rate limit exceeded.',
});

// Password change rate limiting
export const passwordChangeLimiter: RequestHandler = buildRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 3,
  message: 'Too many password change attempts.',
});

// User creation rate limiting
export const userCreationLimiter: RequestHandler = buildRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5,
  message: 'Too many user creation attempts.',
});

// Helper to create custom rate limiters (respects variant defaults and global disable)
export const createRateLimiter = (options: {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}): RequestHandler => {
  const args: {
    windowMs: number;
    maxRequests: number;
    keyGenerator?: (req: Request) => string;
  } = {
    windowMs: options.windowMs,
    maxRequests: options.maxRequests,
  };
  if (options.keyGenerator) {
    args.keyGenerator = options.keyGenerator;
  }
  return buildRateLimiter(args);
};

/**
 * API Key validation middleware (for external service integration)
 *
 * Validates API keys for external service endpoints.
 * Should be used on specific routes that require API key authentication.
 */
export const validateApiKey = (req: Request, _res: Response, next: NextFunction): void => {
  const apiKey = req.get('X-API-Key') ?? req.get('Authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    next(HttpException.unauthorized(ERROR_CODES.AUTH.AUTHENTICATION_REQUIRED, 'API key required'));
    return;
  }

  const validApiKeys = process.env.API_KEYS?.split(',') ?? [];

  if (!validApiKeys.includes(apiKey)) {
    console.warn('Invalid API key attempt', {
      key: `${apiKey.substring(0, 8)}...`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      timestamp: new Date().toISOString(),
    });

    next(HttpException.unauthorized(ERROR_CODES.AUTH.INVALID_CREDENTIALS, 'Invalid API key'));
    return;
  }

  next();
};
