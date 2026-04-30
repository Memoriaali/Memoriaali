/**
 * MEMORIAALI V2.0 PRISMA CLIENT SINGLETON
 * ======================================
 *
 * Proper PrismaClient lifecycle management following official Prisma best practices.
 * This module ensures a single PrismaClient instance is reused across the application
 * and handles connection pooling and lifecycle management correctly.
 *
 * Key Design Principles:
 * - Single instance pattern to prevent connection pool exhaustion
 * - Global variable in development to prevent hot-reload issues
 * - Proper connection pool configuration for long-running processes
 * - Graceful shutdown handling
 *
 * References:
 * - https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections
 * - https://www.prisma.io/docs/orm/more/help-and-troubleshooting/help-articles/nextjs-prisma-client-dev-practices
 */

import { createSecureClient, type PrismaClient } from '@memoriaali/database';

// Global variable type for development environment
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Lazy-initialized PrismaClient instance
 *
 * Uses a getter to ensure environment variables are loaded before
 * creating the client instance.
 */
let _prisma: PrismaClient | undefined;

/**
 * Get singleton PrismaClient instance
 *
 * Lazy initialization ensures environment variables are loaded before
 * creating the client instance.
 */
function getPrismaClient(): PrismaClient {
  if (!_prisma) {
    if (globalForPrisma.prisma) {
      _prisma = globalForPrisma.prisma;
    } else {
      _prisma = createSecureClient();
      // Store in global variable only in development to prevent hot-reload issues
      if (process.env.NODE_ENV !== 'production') {
        globalForPrisma.prisma = _prisma;
      }
    }
  }
  return _prisma;
}

/**
 * Singleton PrismaClient instance
 *
 * In development: Uses global variable to prevent hot-reload from creating multiple instances
 * In production: Creates single instance that is cached via module system
 *
 * This pattern ensures:
 * - Only one connection pool per application instance
 * - Proper resource management
 * - Hot-reload compatibility in development
 * - Lazy initialization for proper env loading
 *
 * Access this export to get the PrismaClient instance.
 * The instance is created on first access, ensuring env vars are loaded.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    const client = getPrismaClient();
    return client[prop as keyof PrismaClient];
  },
  has(target, prop) {
    const client = getPrismaClient();
    return prop in client;
  },
});

/**
 * Graceful shutdown handler for PrismaClient
 *
 * Ensures proper cleanup of database connections when the application shuts down.
 * This prevents connection leaks and ensures clean termination.
 *
 * @returns Promise that resolves when disconnection is complete
 */
export const disconnectPrisma = async (): Promise<void> => {
  try {
    const client = getPrismaClient();
    await client.$disconnect();
    console.info('🔌 Database connection closed gracefully');
  } catch (error) {
    console.error('❌ Error during database disconnection:', error);
    throw error;
  }
};

/**
 * Database health check utility
 *
 * Performs a simple connectivity test to verify database availability.
 * Used by health check endpoints and startup validation.
 *
 * @returns Promise<boolean> - true if database is accessible
 */
export const isDatabaseHealthy = async (): Promise<boolean> => {
  try {
    const client = getPrismaClient();
    await client.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    return false;
  }
};

/**
 * Connection pool metrics utility
 *
 * Provides insights into connection pool usage for monitoring and debugging.
 * Useful for performance optimization and troubleshooting connection issues.
 *
 * @returns Promise with connection pool statistics
 */
export const getConnectionPoolMetrics = async () => {
  try {
    // Note: This requires the metrics preview feature to be enabled
    // For now, we'll return basic connection info
    const isConnected = await isDatabaseHealthy();

    return {
      isConnected,
      timestamp: new Date().toISOString(),
      // Additional metrics can be added when Prisma metrics are available
    };
  } catch (error) {
    console.error('❌ Failed to get connection pool metrics:', error);
    return {
      isConnected: false,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

// Export the singleton instance as default for convenience
export default prisma;
