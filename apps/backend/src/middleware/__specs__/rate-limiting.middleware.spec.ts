/**
 * Rate Limiting Middleware Tests
 *
 * Tests the rate limiting middleware functionality in isolation.
 * Uses a simple test endpoint to focus purely on middleware behavior.
 *
 * Test Strategy:
 * - Isolated middleware testing with minimal test app
 * - Time-based testing with controlled timestamps
 * - Different key generation strategies
 * - Edge cases and boundary conditions
 * - Error handling and logging verification
 */

// As we test rate limiting, we must use await in a loop.
/* eslint-disable no-await-in-loop */

import express from 'express';
import { ipKeyGenerator } from 'express-rate-limit';
import supertest from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createRateLimiter } from '../security.middleware';

describe('Rate Limiting Middleware', () => {
  let app: express.Application;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  // Simple test endpoint that just returns success
  const testEndpoint = (req: express.Request, res: express.Response) => {
    res.json({ status: 'success', message: 'Test endpoint reached' });
  };

  // Error handler for rate limit exceptions
  const errorHandler = (
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

  beforeEach(() => {
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());

    // Mock console.warn to verify logging
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Mock Date.now for predictable time-based testing
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Basic Rate Limiting Functionality', () => {
    /**
     * Scenario: Rate limiter allows requests within limit
     * Expected outcome: All requests within limit pass through successfully
     * Contract: Middleware allows requests when under threshold
     */
    it('should allow requests within the rate limit', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000, // 1 minute
        maxRequests: 3,
      });

      app.get('/test', rateLimiter, testEndpoint);
      app.use(errorHandler);

      // Make 3 requests (at the limit)
      for (let i = 0; i < 3; i++) {
        const response = await supertest(app).get('/test');
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('success');
      }

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    /**
     * Scenario: Rate limiter blocks requests exceeding limit
     * Expected outcome: 4th request in window gets rate limited
     * Contract: Middleware blocks requests when threshold exceeded
     */
    it('should block requests exceeding the rate limit', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000, // 1 minute
        maxRequests: 3,
      });

      app.get('/test', rateLimiter, testEndpoint);
      app.use(errorHandler);

      // Make 3 successful requests
      for (let i = 0; i < 3; i++) {
        const response = await supertest(app).get('/test');
        expect(response.status).toBe(200);
      }

      // 4th request should be rate limited
      const response = await supertest(app).get('/test');
      expect(response.status).toBe(422); // UNPROCESSABLE_ENTITY
      expect(response.body.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(response.body.details).toEqual({
        retryAfter: 60, // 60 seconds
        limit: 3,
        window: 60000,
      });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Rate limit exceeded',
        expect.objectContaining({
          requests: 3,
          limit: 3,
          window: 60000,
        }),
      );
    });

    /**
     * Scenario: Rate limiter resets after time window expires
     * Expected outcome: Requests allowed again after window passes
     * Contract: Window sliding allows requests after expiration
     */
    it('should reset rate limit after time window expires', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000, // 1 minute
        maxRequests: 2,
      });

      app.get('/test', rateLimiter, testEndpoint);
      app.use(errorHandler);

      // Make 2 requests to hit the limit
      await supertest(app).get('/test');
      await supertest(app).get('/test');

      // 3rd request should be blocked
      const blockedResponse = await supertest(app).get('/test');
      expect(blockedResponse.status).toBe(422);

      // Advance time by 61 seconds (past the window)
      vi.advanceTimersByTime(61000);

      // Request should now be allowed
      const allowedResponse = await supertest(app).get('/test');
      expect(allowedResponse.status).toBe(200);
      expect(allowedResponse.body.status).toBe('success');
    });
  });

  describe('IP-Based Rate Limiting', () => {
    /**
     * Scenario: Different IP addresses have separate rate limits
     * Expected outcome: Each IP gets its own request quota
     * Contract: Rate limiting is isolated per IP address
     */
    it('should track rate limits separately for different IP addresses', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
      });

      app.get('/test', rateLimiter, testEndpoint);
      app.use(errorHandler);

      // Make 2 requests from first IP (192.168.1.1)
      await supertest(app).get('/test').set('X-Forwarded-For', '192.168.1.1');
      await supertest(app).get('/test').set('X-Forwarded-For', '192.168.1.1');

      // 3rd request from first IP should be blocked
      const blockedResponse = await supertest(app)
        .get('/test')
        .set('X-Forwarded-For', '192.168.1.1');
      expect(blockedResponse.status).toBe(422);

      // But requests from second IP (192.168.1.2) should still work
      const allowedResponse = await supertest(app)
        .get('/test')
        .set('X-Forwarded-For', '192.168.1.2');
      expect(allowedResponse.status).toBe(200);
    });

    /**
     * Scenario: Missing IP address uses fallback key
     * Expected outcome: Requests without IP use 'unknown' key
     * Contract: Graceful handling of missing IP information
     */
    it('should handle missing IP address with unknown key', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
      });

      app.get('/test', rateLimiter, testEndpoint);
      app.use(errorHandler);

      // First request should succeed
      const response1 = await supertest(app).get('/test');
      expect(response1.status).toBe(200);

      // Second request should be rate limited (using 'unknown' key)
      const response2 = await supertest(app).get('/test');
      expect(response2.status).toBe(422);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Rate limit exceeded',
        expect.objectContaining({
          key: 'unknown',
          ip: 'unknown',
        }),
      );
    });
  });

  describe('Custom Key Generation', () => {
    /**
     * Scenario: Custom key generator based on user ID
     * Expected outcome: Rate limiting per user rather than per IP
     * Contract: Custom key generation overrides default IP-based keys
     */
    it('should use custom key generator when provided', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
        keyGenerator: (req: express.Request) => {
          const userId = req.headers['x-user-id'] as string;
          return userId ?? 'anonymous';
        },
      });

      app.get('/test', rateLimiter, testEndpoint);
      app.use(errorHandler);

      // Make 2 requests for user-123
      await supertest(app).get('/test').set('X-User-ID', 'user-123');
      await supertest(app).get('/test').set('X-User-ID', 'user-123');

      // 3rd request for user-123 should be blocked
      const blockedResponse = await supertest(app).get('/test').set('X-User-ID', 'user-123');
      expect(blockedResponse.status).toBe(422);

      // But requests for user-456 should still work
      const allowedResponse = await supertest(app).get('/test').set('X-User-ID', 'user-456');
      expect(allowedResponse.status).toBe(200);

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Rate limit exceeded',
        expect.objectContaining({
          key: 'user-123',
        }),
      );
    });

    /**
     * Scenario: Custom key generator for email-based rate limiting
     * Expected outcome: Rate limiting per email address for password attempts
     * Contract: Supports email-based rate limiting for authentication
     */
    it('should support email-based rate limiting for authentication', async () => {
      const passwordAttemptLimiter = createRateLimiter({
        windowMs: 15 * 60 * 1000, // 15 minutes
        maxRequests: 5,
        keyGenerator: (req: express.Request) => {
          const email = req.body?.email as string;
          const ipKey = ipKeyGenerator(req.ip ?? 'unknown');
          return email ? `password_attempts:${email}` : `password_attempts:${ipKey}`;
        },
      });

      app.post('/login', passwordAttemptLimiter, testEndpoint);
      app.use(errorHandler);

      // Make 5 failed login attempts for same email
      const email = 'test@example.com';
      for (let i = 0; i < 5; i++) {
        const response = await supertest(app).post('/login').send({ email, password: 'wrong' });
        expect(response.status).toBe(200);
      }

      // 6th attempt should be rate limited
      const blockedResponse = await supertest(app)
        .post('/login')
        .send({ email, password: 'wrong' });
      expect(blockedResponse.status).toBe(422);

      // Different email should still work
      const allowedResponse = await supertest(app)
        .post('/login')
        .send({ email: 'other@example.com', password: 'wrong' });
      expect(allowedResponse.status).toBe(200);
    });
  });

  describe('Time Window Behavior', () => {
    /**
     * Scenario: Sliding window allows partial resets
     * Expected outcome: Old requests expire while new ones are added
     * Contract: Sliding window implementation, not fixed window
     */
    it('should implement sliding window (not fixed window)', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000, // 1 minute
        maxRequests: 3,
      });

      app.get('/test', rateLimiter, testEndpoint);
      app.use(errorHandler);

      // T=0: Make 3 requests
      await supertest(app).get('/test');
      await supertest(app).get('/test');
      await supertest(app).get('/test');

      // T=0: 4th request blocked
      const blocked1 = await supertest(app).get('/test');
      expect(blocked1.status).toBe(422);

      // T=30s: Still blocked (only 30s have passed)
      vi.advanceTimersByTime(30000);
      const blocked2 = await supertest(app).get('/test');
      expect(blocked2.status).toBe(422);

      // T=61s: First request from T=0 expires, so 1 slot available
      vi.advanceTimersByTime(31000);
      const allowed1 = await supertest(app).get('/test');
      expect(allowed1.status).toBe(200);

      // But still can't make another (would be 4 requests in 61s window)
      const blocked3 = await supertest(app).get('/test');
      expect(blocked3.status).toBe(422);
    });

    /**
     * Scenario: Very short windows work correctly
     * Expected outcome: Sub-second windows function properly
     * Contract: Supports high-frequency rate limiting
     */
    it('should handle very short time windows', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 1000, // 1 second
        maxRequests: 2,
      });

      app.get('/test', rateLimiter, testEndpoint);
      app.use(errorHandler);

      // Make 2 requests quickly
      await supertest(app).get('/test');
      await supertest(app).get('/test');

      // 3rd request should be blocked
      const blocked = await supertest(app).get('/test');
      expect(blocked.status).toBe(422);

      // After 1.1 seconds, should work again
      vi.advanceTimersByTime(1100);
      const allowed = await supertest(app).get('/test');
      expect(allowed.status).toBe(200);
    });

    /**
     * Scenario: Very long windows work correctly
     * Expected outcome: Multi-hour windows maintain state
     * Contract: Supports long-term rate limiting
     */
    it('should handle very long time windows', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 24 * 60 * 60 * 1000, // 24 hours
        maxRequests: 10,
      });

      app.get('/test', rateLimiter, testEndpoint);
      app.use(errorHandler);

      // Make 10 requests
      for (let i = 0; i < 10; i++) {
        const response = await supertest(app).get('/test');
        expect(response.status).toBe(200);
      }

      // 11th request should be blocked
      const blocked = await supertest(app).get('/test');
      expect(blocked.status).toBe(422);
      expect(blocked.body.details.retryAfter).toBe(24 * 60 * 60); // 24 hours in seconds
    });
  });

  describe('Memory Management and Cleanup', () => {
    /**
     * Scenario: Periodic cleanup removes old entries
     * Expected outcome: Memory usage doesn't grow unbounded
     * Contract: Automatic cleanup of expired entries
     */
    it('should periodically clean up old entries', async () => {
      // Mock Math.random to always trigger cleanup (1% chance normally)
      vi.spyOn(Math, 'random').mockReturnValue(0.005); // Always < 0.01

      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      });

      app.get('/test', rateLimiter, testEndpoint);
      app.use(errorHandler);

      // Make requests from different IPs to populate the map
      for (let i = 0; i < 10; i++) {
        await supertest(app).get('/test').set('X-Forwarded-For', `192.168.1.${i}`);
      }

      // Advance time way past the window
      vi.advanceTimersByTime(180000); // 3 minutes

      // Make another request to trigger cleanup
      const response = await supertest(app).get('/test').set('X-Forwarded-For', '192.168.1.100');
      expect(response.status).toBe(200);

      // Verify cleanup was triggered by checking that old entries would be removed
      // (This is implementation detail testing, but important for memory management)
    });

    /**
     * Scenario: Cleanup preserves recent entries
     * Expected outcome: Only truly old entries are removed
     * Contract: Cleanup is conservative and safe
     */
    it('should preserve recent entries during cleanup', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.005); // Always trigger cleanup

      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 2,
      });

      app.get('/test', rateLimiter, testEndpoint);
      app.use(errorHandler);

      // Make 2 requests from IP to fill its quota
      await supertest(app).get('/test').set('X-Forwarded-For', '192.168.1.1');
      await supertest(app).get('/test').set('X-Forwarded-For', '192.168.1.1');

      // Advance time by only 30 seconds (within window)
      vi.advanceTimersByTime(30000);

      // Make request from different IP to trigger cleanup
      await supertest(app).get('/test').set('X-Forwarded-For', '192.168.1.2');

      // Original IP should still be rate limited (entries preserved)
      const blocked = await supertest(app).get('/test').set('X-Forwarded-For', '192.168.1.1');
      expect(blocked.status).toBe(422);
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    /**
     * Scenario: Zero max requests
     * Expected outcome: All requests are immediately blocked
     * Contract: Edge case handling for restrictive limits
     */
    it('should handle zero max requests', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 0,
      });

      app.get('/test', rateLimiter, testEndpoint);
      app.use(errorHandler);

      const response = await supertest(app).get('/test');
      expect(response.status).toBe(422);
      expect(response.body.details.limit).toBe(0);
    });

    /**
     * Scenario: Very high max requests
     * Expected outcome: Practically unlimited requests allowed
     * Contract: Handles large limits without issues
     */
    it('should handle very high max requests', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1000000,
      });

      app.get('/test', rateLimiter, testEndpoint);
      app.use(errorHandler);

      // Make many requests quickly
      for (let i = 0; i < 100; i++) {
        const response = await supertest(app).get('/test');
        expect(response.status).toBe(200);
      }
    });

    /**
     * Scenario: Concurrent requests from same key
     * Expected outcome: Race conditions handled correctly
     * Contract: Thread-safe request counting
     */
    it('should handle concurrent requests correctly', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 3,
      });

      app.get('/test', rateLimiter, testEndpoint);
      app.use(errorHandler);

      // Make multiple concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        supertest(app).get('/test').set('X-Forwarded-For', '192.168.1.1'),
      );

      const responses = await Promise.all(promises);

      // Should have exactly 3 successful and 2 rate-limited
      const successful = responses.filter((r) => r.status === 200);
      const rateLimited = responses.filter((r) => r.status === 422);

      expect(successful.length).toBe(3);
      expect(rateLimited.length).toBe(2);
    });

    /**
     * Scenario: Custom key generator throws error
     * Expected outcome: Falls back to default IP-based key
     * Contract: Robust error handling in key generation
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
      app.use(errorHandler);

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
  });

  describe('Logging and Monitoring', () => {
    /**
     * Scenario: Rate limit violations are logged with context
     * Expected outcome: Comprehensive logging for security monitoring
     * Contract: Detailed logs for rate limit violations
     */
    it('should log rate limit violations with full context', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 1,
      });

      app.get('/test', rateLimiter, testEndpoint);
      app.use(errorHandler);

      // First request succeeds
      await supertest(app)
        .get('/test')
        .set('X-Forwarded-For', '192.168.1.100')
        .set('User-Agent', 'Test-Agent/1.0');

      // Second request should be rate limited and logged
      await supertest(app)
        .get('/test')
        .set('X-Forwarded-For', '192.168.1.100')
        .set('User-Agent', 'Test-Agent/1.0');

      expect(consoleWarnSpy).toHaveBeenCalledWith('Rate limit exceeded', {
        key: '192.168.1.100',
        requests: 1,
        limit: 1,
        window: 60000,
        ip: '192.168.1.100',
        path: '/test',
        timestamp: expect.any(String),
      });
    });

    /**
     * Scenario: No false positive logging
     * Expected outcome: No warnings when requests are within limits
     * Contract: Clean logs for normal operation
     */
    it('should not log when requests are within limits', async () => {
      const rateLimiter = createRateLimiter({
        windowMs: 60000,
        maxRequests: 5,
      });

      app.get('/test', rateLimiter, testEndpoint);
      app.use(errorHandler);

      // Make requests within limit
      for (let i = 0; i < 5; i++) {
        await supertest(app).get('/test');
      }

      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });
});
