/**
 * Common seeding helper functions
 */

import { PrismaClient } from '../../generated/client';
import { logger } from './logger';

/**
 * Generic upsert helper that logs the operation
 */
export const upsertWithLog = async <T>(
  operation: () => Promise<T>,
  entityName: string,
  identifier: string,
): Promise<T> => {
  try {
    const result = await operation();
    logger.info(`✓ Upserted ${entityName}: ${identifier}`);
    return result;
  } catch (error) {
    logger.error(`Failed to upsert ${entityName}: ${identifier}`, error);
    throw error;
  }
};

/**
 * Batch upsert with progress logging
 */
export const batchUpsert = async <T, R>(
  items: T[],
  upsertFn: (item: T, index: number) => Promise<R>,
  entityName: string,
  batchSize = 10,
): Promise<R[]> => {
  const results: R[] = [];

  logger.info(`Processing ${items.length} ${entityName} records in batches of ${batchSize}`);

  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((item, batchIndex) => upsertFn(item, i + batchIndex)),
    );

    results.push(...batchResults);
    logger.info(
      `Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(items.length / batchSize)}`,
    );
  }

  return results;
};

/**
 * Check if seeding should be skipped based on existing data
 */
export const shouldSkipSeeding = async (
  prisma: PrismaClient,
  modelName: keyof PrismaClient,
  threshold = 0,
): Promise<boolean> => {
  try {
    // @ts-expect-error - Dynamic model access
    const count = await prisma[modelName].count();
    return count > threshold;
  } catch {
    return false;
  }
};

/**
 * Generate deterministic ID for consistent seeding
 */
export const generateSeedId = (prefix: string, identifier: string): string => {
  return `${prefix}-${identifier.toLowerCase().replace(/\s+/g, '-')}`;
};

/**
 * Create date range helper for temporal data
 */
export const createDateRange = (
  startDaysAgo: number,
  endDaysAgo = 0,
): { startDate: Date; endDate: Date } => {
  const now = new Date();
  const startDate = new Date(now.getTime() - startDaysAgo * 24 * 60 * 60 * 1000);
  const endDate = new Date(now.getTime() - endDaysAgo * 24 * 60 * 60 * 1000);

  return { startDate, endDate };
};

/**
 * Validate required environment variables
 */
export const validateEnvironment = (requiredVars: string[]): void => {
  const missing = requiredVars.filter((varName) => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables for seeding: ${missing.join(', ')}`);
  }
};
