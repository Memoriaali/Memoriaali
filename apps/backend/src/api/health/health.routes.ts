import { Router } from 'express';

import { asyncHandler } from '../../shared/utils/response.utils';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * Health check routes for monitoring application and database status
 *
 * Uses singleton PrismaClient instance from shared/database/prisma module.
 * Provides comprehensive health monitoring for production systems.
 *
 * @returns Configured Express router with health endpoints
 */
export const createHealthRoutes = (): Router => {
  const router = Router();

  // Initialize service and controller
  const healthService = new HealthService();
  const healthController = new HealthController(healthService);

  /**
   * @openapi
   * /api/v2/health:
   *   get:
   *     summary: Basic health check
   *     description: Returns basic application health status and uptime information
   *     tags: ['Health']
   *     security: []
   *     operationId: getHealth
   *     x-permissions: []
   *     responses:
   *       200:
   *         description: Application is healthy
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: object
   *                   properties:
   *                     status:
   *                       type: string
   *                       example: healthy
   *                     uptime:
   *                       type: number
   *                       example: 12345.67
   *                     timestamp:
   *                       type: string
   *                       format: date-time
   *                       example: "2024-01-15T10:30:00.000Z"
   *             examples:
   *               healthy:
   *                 summary: Healthy application
   *                 value:
   *                   status: success
   *                   data:
   *                     status: healthy
   *                     uptime: 12345.67
   *                     timestamp: "2024-01-15T10:30:00.000Z"
   *       500:
   *         description: Application health check failed
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/ErrorResponse'
   */
  router.get('/', asyncHandler(healthController.getHealthCheck.bind(healthController)));

  /**
   * @openapi
   * /api/v2/health/detailed:
   *   get:
   *     summary: Detailed health check
   *     description: Returns comprehensive health information including system details and component status
   *     tags: ['Health']
   *     security: []
   *     operationId: getDetailedHealth
   *     x-permissions: []
   *     responses:
   *       200:
   *         description: Detailed health information
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: object
   *                   properties:
   *                     status:
   *                       type: string
   *                       example: healthy
   *                     uptime:
   *                       type: number
   *                       example: 12345.67
   *                     timestamp:
   *                       type: string
   *                       format: date-time
   *                     environment:
   *                       type: string
   *                       example: development
   *                     version:
   *                       type: string
   *                       example: "2.0.0-dev"
   *                     database:
   *                       type: object
   *                       properties:
   *                         status:
   *                           type: string
   *                           example: connected
   *                         responseTime:
   *                           type: number
   *                           example: 25.5
   *                     memory:
   *                       type: object
   *                       properties:
   *                         used:
   *                           type: number
   *                           example: 52428800
   *                         free:
   *                           type: number
   *                           example: 134217728
   *             examples:
   *               detailed:
   *                 summary: Detailed health status
   *                 value:
   *                   status: success
   *                   data:
   *                     status: healthy
   *                     uptime: 12345.67
   *                     timestamp: "2024-01-15T10:30:00.000Z"
   *                     environment: development
   *                     version: "2.0.0-dev"
   *                     database:
   *                       status: connected
   *                       responseTime: 25.5
   *                     memory:
   *                       used: 52428800
   *                       free: 134217728
   */
  router.get('/detailed', asyncHandler(healthController.getDetailedHealth.bind(healthController)));

  /**
   * @openapi
   * /api/v2/health/database:
   *   get:
   *     summary: Database health check
   *     description: |
   *       Checks database connectivity and performance by executing a simple query.
   *       Measures response time and verifies connection status.
   *       Critical for monitoring database availability in production environments.
   *     tags: ['Health']
   *     operationId: getDatabaseHealth
   *     x-permissions: []
   *     responses:
   *       200:
   *         description: Database is healthy and responsive
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: success
   *                 data:
   *                   type: object
   *                   properties:
   *                     database:
   *                       type: object
   *                       properties:
   *                         status:
   *                           type: string
   *                           example: connected
   *                         responseTime:
   *                           type: number
   *                           description: Database response time in milliseconds
   *                           example: 15.25
   *                         timestamp:
   *                           type: string
   *                           format: date-time
   *                           example: "2024-01-15T10:30:00.000Z"
   *             examples:
   *               connected:
   *                 summary: Database connected successfully
   *                 value:
   *                   status: success
   *                   data:
   *                     database:
   *                       status: connected
   *                       responseTime: 15.25
   *                       timestamp: "2024-01-15T10:30:00.000Z"
   *       503:
   *         description: Database connection failed
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: error
   *                 message:
   *                   type: string
   *                   example: Database connection failed
   *                 statusCode:
   *                   type: integer
   *                   example: 503
   *                 code:
   *                   type: string
   *                   example: DATABASE_CONNECTION_FAILED
   *             examples:
   *               connection-failed:
   *                 summary: Database connection failed
   *                 value:
   *                   status: error
   *                   message: Database connection failed
   *                   statusCode: 503
   *                   code: DATABASE_CONNECTION_FAILED
   */
  router.get('/database', asyncHandler(healthController.getDatabaseHealth.bind(healthController)));

  return router;
};
