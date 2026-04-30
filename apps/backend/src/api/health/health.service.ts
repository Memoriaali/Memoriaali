import { PrismaClient } from '@memoriaali/database';

import { prisma } from '../../shared/database/prisma';

import { DatabaseHealth, SystemHealth, HealthResponse } from './health.schema';

export class HealthService {
  private readonly prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient ?? prisma;
  }

  /**
   * Performs comprehensive health check of all system components
   */
  async getSystemHealth(): Promise<HealthResponse> {
    try {
      // Check database health
      const databaseHealth = await this.checkDatabaseHealth();

      // Check system resources
      const systemHealth = this.checkSystemHealth();

      // Determine overall status
      const overallStatus = this.determineOverallStatus(databaseHealth, systemHealth);

      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: databaseHealth.status,
            userCount: databaseHealth.userCount,
            responseTime: databaseHealth.responseTime,
          },
        },
        version: process.env.npm_package_version ?? '2.0.0-dev',
        uptime: systemHealth.uptime,
      };
    } catch (_error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          database: {
            status: 'disconnected',
          },
        },
        version: process.env.npm_package_version ?? '2.0.0-dev',
        uptime: process.uptime(),
      };
    }
  }

  /**
   * Checks database connectivity and performance
   */
  async checkDatabaseHealth(): Promise<DatabaseHealth> {
    const startTime = Date.now();

    try {
      // Test basic connectivity with a simple query
      await this.prisma.$queryRaw`SELECT 1`;

      // Get user count as a health indicator
      const userCount = await this.prisma.user.count();

      const responseTime = Date.now() - startTime;

      return {
        status: 'connected',
        userCount,
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    } catch (_error) {
      const responseTime = Date.now() - startTime;

      return {
        status: 'disconnected',
        userCount: 0,
        responseTime,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Checks system resources and performance
   */
  checkSystemHealth(): SystemHealth {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Calculate memory usage percentage (rough estimate)
    const totalMemory = memoryUsage.rss + memoryUsage.external;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    // Determine status based on memory usage and uptime
    const resolveStatus = (): 'healthy' | 'degraded' | 'unhealthy' => {
      if (memoryPercentage > 90) {
        return 'unhealthy';
      }
      if (memoryPercentage > 75 || uptime < 30) {
        return 'degraded';
      }
      return 'healthy';
    };

    const status = resolveStatus();

    return {
      status,
      uptime,
      memoryUsage: {
        used: usedMemory,
        total: totalMemory,
        percentage: Math.round(memoryPercentage * 100) / 100,
      },
      version: process.env.npm_package_version ?? '2.0.0-dev',
    };
  }

  /**
   * Determines overall system status based on individual component health
   */
  private determineOverallStatus(
    databaseHealth: DatabaseHealth,
    systemHealth: SystemHealth,
  ): 'healthy' | 'unhealthy' {
    // System is unhealthy if database is disconnected or system is unhealthy
    if (databaseHealth.status === 'disconnected' || systemHealth.status === 'unhealthy') {
      return 'unhealthy';
    }

    // System is healthy if all components are working
    return 'healthy';
  }

  /**
   * Simple database connectivity check for quick health checks
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
}
