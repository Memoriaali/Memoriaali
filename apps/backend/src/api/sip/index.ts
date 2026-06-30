/**
 * SIP (Submission Information Package) Module
 *
 * Provides E-ARK compliant archival package creation functionality.
 *
 * Features:
 * - Document validation and aggregation
 * - Metadata generation (Dublin Core, PREMIS, EAD)
 * - Java-based SIP package creation using official commons-ip2 CLI
 * - Database-backed job queue with sequential processing
 * - Real-time progress tracking via Server-Sent Events
 * - Crash recovery with startup job restoration
 * - Comprehensive error handling and cleanup
 */

// Export main components
export { SIPController } from './sip.controller';
export { createSIPRoutes } from './sip.routes';

// Export schemas and types
export {
  CreateSIPRequestSchema,
  SIPJobListResponseSchema,
  SIPJobQuerySchema,
  SIPJobResponseSchema,
  SIPProgressSchema,
  SIPResponseSchema,
  type CreateSIPRequest,
  type SIPJobListResponse,
  type SIPJobQuery,
  type SIPProgress,
  type SIPResponse,
} from './sip.schemas';

export { type SIPPackageMode } from './sip.schemas';

// Module initialization

import { Logger } from '../../shared/utils/logger';
import { sipOrchestrator } from './services/sip-orchestrator.service';
import { SIPService } from './sip.service';

const logger = new Logger('SIPModule');
let sipService: SIPService;
/**
 * Initialize the SIP module
 *
 * This should be called during application startup to:
 * - Initialize orchestrator (reset stale jobs, start processing)
 * - Register the job processor with the queue (done in sip.service.ts constructor)
 * - Set up cleanup handlers (done in temp-file.service.ts)
 *
 * The SIP service automatically registers itself as the processor
 * when it's imported (via its constructor).
 */
export const initializeSIPModule = async (): Promise<void> => {
  try {
    logger.info('Initializing SIP module...');

    // Initialize orchestrator (startup recovery + processing loop)
    sipService = new SIPService();
    await sipOrchestrator.initialize();

    logger.info('SIP module initialized successfully (internal processing)');
  } catch (error) {
    logger.error('Failed to initialize SIP module:', error);
    throw error;
  }
};
