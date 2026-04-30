import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';

import { HealthResponseSchema } from './health.schema';
import { HealthService } from './health.service';

export class HealthController {
  constructor(private healthService: HealthService) {}

  /**
   * GET /api/health
   * Basic health check endpoint for load balancers
   */
  async getHealthCheck(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const isHealthy = await this.healthService.isHealthy();

      res.status(isHealthy ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE).json({
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * GET /api/health/detailed
   * Comprehensive health check with system metrics
   */
  async getDetailedHealth(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const healthData = await this.healthService.getSystemHealth();

      // Validate response against schema
      const validatedHealth = HealthResponseSchema.parse(healthData);

      // Set appropriate HTTP status code
      const statusCode =
        validatedHealth.status === 'healthy' ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE;

      res.status(statusCode).json(validatedHealth);
    } catch (error) {
      res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: 'disconnected',
          },
        },
        error: error instanceof Error ? error.message : 'Health check failed',
      });
    }
  }

  /**
   * GET /api/health/database
   * Database-specific health check
   */
  async getDatabaseHealth(req: Request, res: Response, _next: NextFunction): Promise<void> {
    try {
      const databaseHealth = await this.healthService.checkDatabaseHealth();

      // Set status code based on database connectivity
      const statusCode =
        databaseHealth.status === 'connected' ? StatusCodes.OK : StatusCodes.SERVICE_UNAVAILABLE;

      res.status(statusCode).json(databaseHealth);
    } catch (error) {
      res.status(StatusCodes.SERVICE_UNAVAILABLE).json({
        status: 'disconnected',
        userCount: 0,
        responseTime: 0,
        lastChecked: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Database check failed',
      });
    }
  }
}
