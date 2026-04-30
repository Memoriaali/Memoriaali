/**
 * Backend E2E Tests - Health Endpoints
 *
 * These tests verify the health check endpoints are working correctly
 * in the E2E environment with Docker containers running.
 */

import { describe, it, expect } from 'vitest';
import supertest from 'supertest';
import { app } from '@/index';

describe('Backend Health Endpoints E2E Tests', () => {
  describe('GET /api/v2/health', () => {
    it('should respond with 200 status', async () => {
      const response = await supertest(app).get('/api/v2/health');

      expect(response.status).toBe(200);
    });

    it('should return valid JSON response with health data', async () => {
      const response = await supertest(app).get('/api/v2/health');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();

      // Health endpoint should return status information
      expect(response.body).toHaveProperty('status');
    });

    it('should respond within reasonable time', async () => {
      const startTime = Date.now();
      const response = await supertest(app).get('/api/v2/health');
      const endTime = Date.now();

      const responseTime = endTime - startTime;

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should include timestamp in response', async () => {
      const response = await supertest(app).get('/api/v2/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('timestamp');

      // Timestamp should be a valid date string
      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
    });
  });

  describe('GET /api/v2/health/detailed', () => {
    it('should respond with detailed health information', async () => {
      const response = await supertest(app).get('/api/v2/health/detailed');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('services');
    });

    it('should include database status in detailed health', async () => {
      const response = await supertest(app).get('/api/v2/health/detailed');

      expect(response.status).toBe(200);
      expect(response.body.services).toHaveProperty('database');
      expect(response.body.services.database).toHaveProperty('status');
    });
  });

  describe('GET /api/v2/health/database', () => {
    it('should respond with database-specific health information', async () => {
      const response = await supertest(app).get('/api/v2/health/database');

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('status');
    });

    it('should include database response time', async () => {
      const response = await supertest(app).get('/api/v2/health/database');

      expect(response.status).toBe(200);

      if (response.body.status === 'connected') {
        expect(response.body).toHaveProperty('responseTime');
        expect(typeof response.body.responseTime).toBe('number');
        expect(response.body.responseTime).toBeGreaterThan(0);
      }
    });
  });

  describe('Health Endpoint Integration', () => {
    it('should handle multiple concurrent requests', async () => {
      const promises = Array.from({ length: 5 }, () => supertest(app).get('/api/v2/health'));

      const responses = await Promise.all(promises);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status');
      });
    });

    it('should maintain consistent response format', async () => {
      const response1 = await supertest(app).get('/api/v2/health');
      const response2 = await supertest(app).get('/api/v2/health');

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // Both responses should have the same structure
      expect(Object.keys(response1.body).sort()).toEqual(Object.keys(response2.body).sort());
    });
  });
});
