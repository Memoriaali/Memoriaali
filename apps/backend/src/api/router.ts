import { Router } from 'express';

import { createAuthRoutes } from './auth/index.js';
import { createCollectionRoutes } from './collections/index.js';
import { createCommentRoutes } from './comments/index.js';
import { createDefaultQuestionRoutes } from './defaultquestions/index.js';
import { createDocumentationRouter } from './documentation.js';
import { createDocumentRoutes } from './documents/index.js';
import { createDocumentsInCollectionsRoutes } from './documentsincollections/index.js';
import { createFilesRoutes } from './files/index.js';
import { createGroupsRoutes } from './groups/index.js';
import { createHealthRoutes } from './health/index.js';
import { createMetadataSuggestionsRoutes } from './metadatasuggestions/index.js';
import { createOralHistoryRoutes } from './oralhistories/index.js';
import { createResearchRequestRoutes } from './researchrequests/index.js';
import { createSIPRoutes } from './sip/index.js';
import { createUploadRoutes } from './uploads/index.js';
import { createUserRoutes } from './users/index.js';
import { createUsersInGroupsRoutes } from './usersingroups/index.js';

/**
 * Main API router that delegates to sub-routers
 *
 * This router serves as the central aggregation point for all API routes,
 * following a modular architecture where each feature module (health, users,
 * submissions, etc.) provides its own router factory function.
 *
 * Uses singleton PrismaClient pattern for database operations.
 *
 * @returns Configured Express router with all API routes
 */
export const createApiRouter = (): Router => {
  const router = Router();

  // Mount documentation routes (must be before other routes to avoid conflicts)
  router.use('/', createDocumentationRouter());

  // Mount health check routes
  router.use('/health', createHealthRoutes());

  // Mount authentication routes (public endpoints)
  router.use('/auth', createAuthRoutes());

  // Mount user management routes (authentication applied per route)
  router.use('/users', createUserRoutes());

  // Mount groups management routes (authentication applied per route)
  router.use('/groups', createGroupsRoutes());

  // Mount users in groups management routes (authentication applied per route)
  router.use('/usersingroups', createUsersInGroupsRoutes());

  // Mount document management routes (authentication applied per route)
  router.use('/documents', createDocumentRoutes());

  // Mount collection management routes (authentication applied per route)
  router.use('/collections', createCollectionRoutes());

  // Mount default questions management routes (authentication applied per route)
  router.use('/defaultquestions', createDefaultQuestionRoutes());

  // Mount documents in collections management routes (authentication applied per route)
  router.use('/documentsincollections', createDocumentsInCollectionsRoutes());

  // Mount comment management routes (authentication applied per route)
  router.use('/comments', createCommentRoutes());

  // Mount metadata suggestions management routes (authentication applied per route)
  router.use('/metadatasuggestions', createMetadataSuggestionsRoutes());

  // Mount oral history management routes (authentication applied per route)
  router.use('/oralhistories', createOralHistoryRoutes());

  // Mount SIP (Submission Information Package) routes (authentication applied per route)
  router.use('/sip', createSIPRoutes());

  // Mount research request management routes (authentication applied per route)
  router.use('/researchrequests', createResearchRequestRoutes());

  // Mount file upload routes (authentication applied per route)
  router.use('/uploads', createUploadRoutes());

  // Mount file download routes (authentication applied per route)
  router.use('/files', createFilesRoutes());

  // TODO: Add more route modules as they are implemented
  // router.use('/submissions', createSubmissionRoutes());
  // router.use('/metadata', createMetadataRoutes());

  return router;
};

/**
 * API v2 router factory
 *
 * Creates a versioned API router that can be mounted at `/api/v2`.
 * This allows for API versioning and backwards compatibility.
 *
 * @returns Router configured for API v2
 */
export const createV2Router = (): Router => {
  const router = Router();

  // Mount the main API router
  router.use('/', createApiRouter());

  // API v2 specific middleware can be added here
  // router.use(apiV2SpecificMiddleware);

  return router;
};
