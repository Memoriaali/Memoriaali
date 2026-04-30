/**
 * Main seed orchestrator for Memoriaali database
 *
 * This file coordinates all seeding operations across different models
 * and environments. Run with: pnpm db:seed
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { PrismaClient } from '../generated/client';
import { seedDocuments } from './data/documents';
import { seedUsers } from './data/users';
import { getEnvironment } from './utils/environment';
import { logger } from './utils/logger';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const env = getEnvironment();

  logger.info(`🌱 Starting database seeding for ${env.toUpperCase()} environment`);
  logger.info(`Database URL: ${process.env.DATABASE_URL?.replace(/\/\/.*@/, '//***:***@')}`);

  try {
    // Validate database connection
    await prisma.$connect();
    logger.info('✅ Database connection established');

    // Environment-specific validations
    if (env === 'production') {
      logger.warning('⚠️  PRODUCTION ENVIRONMENT - Only essential data will be seeded');

      // Confirm production seeding (could add interactive prompt here)
      const existingUsers = await prisma.user.count();
      if (existingUsers > 0) {
        logger.warning(
          `Found ${existingUsers} existing users. Seeding will update existing records.`,
        );
      }
    } else if (env === 'e2e') {
      logger.info('🧪 E2E ENVIRONMENT - Seeding test data for end-to-end testing');

      // E2E environment should reset data on every run
      const existingUsers = await prisma.user.count();
      if (existingUsers > 0) {
        logger.info(
          `Found ${existingUsers} existing users. E2E environment will be cleaned and reseeded.`,
        );
      }
    }

    // Seed models in dependency order
    logger.info('📋 Starting seeding sequence...');

    // NOTE: These are for as examples, and will not reflect the actual data model which
    // will be implemented in the future.

    // 1. Users (no dependencies)
    await seedUsers(prisma);

    // 2. Documents (depends on users)
    await seedDocuments(prisma);

    // Final statistics
    const stats = await getDatabaseStats(prisma);

    logger.success('🎉 Database seeding completed successfully!');
    logger.info('📊 Final statistics:');
    logger.info(`   Users: ${stats.users}`);
    logger.info(`   Documents: ${stats.documents}`);
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);

    if (error instanceof Error) {
      logger.error('Error details:', error.message);

      // Additional debug info for development
      if (env === 'development') {
        logger.error('Stack trace:', error.stack);
      }
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
    logger.info('🔌 Database connection closed');
  }
}

/**
 * Get database statistics for reporting
 */
async function getDatabaseStats(prisma: PrismaClient) {
  try {
    const [users, documents] = await Promise.all([prisma.user.count(), prisma.document.count()]);

    return { users, documents };
  } catch (error) {
    logger.warning('Could not retrieve database statistics:', error);
    return { users: '?', documents: '?' };
  }
}

/**
 * Handle graceful shutdown
 */
process.on('SIGINT', async () => {
  logger.info('🔄 Received SIGINT, gracefully shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('🔄 Received SIGTERM, gracefully shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

// Load environment variables before running main
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRootDir = path.resolve(__dirname, '../../..');
const databaseDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(repoRootDir, '.env') });
dotenv.config({ path: path.join(databaseDir, '.env') });
dotenv.config({ path: path.join(databaseDir, '.env.local') });

// Validate environment and run seeding (ESM-compatible check)
const isDirectRun =
  typeof process !== 'undefined' &&
  Array.isArray(process.argv) &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error('Unhandled error during seeding:', error);
    process.exit(1);
  });
}
