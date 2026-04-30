// Load environment variables BEFORE any other imports
import './env.js';

import express, { Express } from 'express';

import { createV2Router } from './api/router';
import { initializeSIPModule } from './api/sip/index.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.middleware';
import {
  corsMiddleware,
  rateLimitBasic,
  securityHeadersMiddleware,
} from './middleware/security.middleware.js';
import { disconnectPrisma, isDatabaseHealthy } from './shared/database/prisma.js';

const app: Express = express();

// Security middleware configuration
// Disable the X-Powered-By header (redundant with Helmet but explicit)
app.disable('x-powered-by');

// Apply Helmet security headers
app.use(securityHeadersMiddleware);

// CORS configuration
app.use(corsMiddleware);

// Basic rate limiting for all requests
app.use(rateLimitBasic);

// Enable JSON body parsing
app.use(express.json());

const port = process.env.PORT ?? 3001;

// Mount API routers
app.use('/api/v2', createV2Router());

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    name: 'Memoriaali V2 API',
    version: '2.0.0-dev',
    documentation: {
      swagger: '/api/v2/docs',
      redoc: '/api/v2/redoc',
      openapi: '/api/v2/docs.json',
    },
  });
});

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

export { app };

// Startup the backend server
const startServer = async () => {
  try {
    console.info('🔍 Checking database connection...');
    const isHealthy = await isDatabaseHealthy();

    if (!isHealthy) {
      console.error(
        '❌ Database connection failed. Please check your DATABASE_URL environment variable.',
      );
      // eslint-disable-next-line n/no-process-exit
      process.exit(1);
    }

    console.info('✅ Database connection established');

    // Initialize SIP module (startup recovery + processing)
    await initializeSIPModule();

    app.listen(port, () => {
      console.info(`🚀 Memoriaali backend server running on port ${port}`);
      console.info(`📊 Health check: http://localhost:${port}/api/v2/health`);
      console.info(`📚 API documentation: http://localhost:${port}/api/v2/docs`);
      console.info(`📄 OpenAPI JSON: http://localhost:${port}/api/v2/docs.json`);
      console.info(`📦 SIP service ready at: http://localhost:${port}/api/v2/sip`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }
};

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.info('🔄 Received SIGINT, shutting down gracefully...');
  try {
    await disconnectPrisma();
    // eslint-disable-next-line n/no-process-exit
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.info('🔄 Received SIGTERM, shutting down gracefully...');
  try {
    await disconnectPrisma();
    // eslint-disable-next-line n/no-process-exit
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
  console.error('❌ Uncaught Exception:', error);
  try {
    await disconnectPrisma();
  } catch (disconnectError) {
    console.error('❌ Error during emergency disconnect:', disconnectError);
  }
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  try {
    await disconnectPrisma();
  } catch (disconnectError) {
    console.error('❌ Error during emergency disconnect:', disconnectError);
  }
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
});

// Start the server
if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    console.error('Failed to start server:', error);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  });
}
