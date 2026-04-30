/**
 * Basic Rate Limiting Middleware Tests
 *
 * Simplified tests focused on core rate limiting functionality.
 * Tests the middleware behavior with a minimal setup.
 */

// As we test rate limiting, we must use await in a loop.
/* eslint-disable no-await-in-loop */

import express from 'express';
import { ipKeyGenerator } from 'express-rate-limit';
import supertest from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRateLimiter } from '../security.middleware';

describe('Rate Limiting Middleware - Basic Tests', () => {
  let app: express.Application;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  // Simple test endpoint
  const testEndpoint = (req: express.Request, res: express.Response) => {
    res.json({ status: 'success', message: 'Test endpoint reached' });
  };

  beforeEach(() => {
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());

    // Mock console.warn to verify logging
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock Date.now for predictable testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  /**
   * Test 1: Basic functionality - requests within limit should pass
   */
  it('should allow requests within the rate limit', async () => {
    const rateLimiter = createRateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: 3,
    });

    app.get('/test', rateLimiter, testEndpoint);

    // Make 3 requests (within the limit)
    for (let i = 0; i < 3; i++) {
      const response = await supertest(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
    }

    // No warnings should be logged for requests within limit
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });

  /**
   * Test 2: Rate limiting - 4th request should be blocked
   */
  it('should block requests when rate limit is exceeded', async () => {
    const rateLimiter = createRateLimiter({
      windowMs: 60000, // 1 minute
      maxRequests: 2,
    });

    app.get('/test', rateLimiter, testEndpoint);

    const _errorHandler = (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (err?.status) {
        return res.status(err.status).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    };

    // Make 2 successful requests
    const response1 = await supertest(app).get('/test');
    expect(response1.status).toBe(200);

    const response2 = await supertest(app).get('/test');
    expect(response2.status).toBe(200);

    // 3rd request should be rate limited
    const response3 = await supertest(app).get('/test');
    expect(response3.status).toBe(422); // UNPROCESSABLE_ENTITY
    expect(response3.body.code).toBe('RATE_LIMIT_EXCEEDED');

    // Verify warning was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Rate limit exceeded',
      expect.objectContaining({
        requests: 2,
        limit: 2,
        window: 60000,
      }),
    );
  });

  /**
   * Test 3: Time window reset - requests should be allowed after window expires
   */
  it('should reset rate limit after time window expires', async () => {
    const rateLimiter = createRateLimiter({
      windowMs: 1000, // 1 second for faster testing
      maxRequests: 1,
    });

    app.get('/test', rateLimiter, testEndpoint);

    const _errorHandler = (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (err?.status) {
        return res.status(err.status).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    };

    // Make 1 request to hit the limit
    const response1 = await supertest(app).get('/test');
    expect(response1.status).toBe(200);

    // 2nd request should be blocked
    const response2 = await supertest(app).get('/test');
    expect(response2.status).toBe(422);

    // Advance time by 1.1 seconds (past the window)
    vi.advanceTimersByTime(1100);

    // Request should now be allowed
    const response3 = await supertest(app).get('/test');
    expect(response3.status).toBe(200);
    expect(response3.body.status).toBe('success');
  });

  /**
   * Test 4: Key generator error handling
   */
  it('should handle key generator errors gracefully', async () => {
    const rateLimiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 2,
      keyGenerator: (req: express.Request) => {
        // Simulate error in key generation
        if (req.headers['x-cause-error']) {
          throw new Error('Key generation failed');
        }
        return ipKeyGenerator(req.ip ?? 'fallback');
      },
    });

    app.get('/test', rateLimiter, testEndpoint);

    // This should still work even though key generator throws - falls back to IP
    const response = await supertest(app).get('/test').set('X-Cause-Error', 'true');

    // Should succeed with fallback to IP-based key
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('success');

    // Verify the console warning was logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Key generator failed, falling back to IP',
      expect.objectContaining({
        error: 'Key generation failed',
        path: '/test',
      }),
    );
  });

  /**
   * Test 5: Zero max requests edge case
   */
  it('should handle zero max requests by blocking all requests', async () => {
    const rateLimiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 0,
    });

    app.get('/test', rateLimiter, testEndpoint);

    const _errorHandler = (
      err: any,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      if (err?.status) {
        return res.status(err.status).json({ error: err.message });
      }
      return res.status(500).json({ error: 'Internal server error' });
    };

    const response = await supertest(app).get('/test');
    expect(response.status).toBe(422);
    expect(response.body.details.limit).toBe(0);
  });

  /**
   * Test 6: High max requests should work normally
   */
  it('should handle very high max requests without issues', async () => {
    const rateLimiter = createRateLimiter({
      windowMs: 60000,
      maxRequests: 1000,
    });

    app.get('/test', rateLimiter, testEndpoint);

    // Make several requests quickly
    for (let i = 0; i < 10; i++) {
      const response = await supertest(app).get('/test');
      expect(response.status).toBe(200);
    }

    // No warnings should be logged
    expect(consoleWarnSpy).not.toHaveBeenCalled();
  });
});
