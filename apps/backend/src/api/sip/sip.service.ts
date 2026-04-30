/**
 * SIP (Submission Information Package) Orchestration Service
 *
 * Main orchestrator that coordinates the complete SIP creation workflow.
 * Handles job processing, validation, file management, metadata generation,
 * and database operations for SIP package generation.
 *
 * Design by Contract:
 * - Preconditions: Valid document IDs exist in database, files exist on filesystem
 * - Postconditions: SIP package created, database updated, cleanup performed
 * - Invariants: Atomic operations, guaranteed cleanup on failure
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { ERROR_CODES } from '../../shared/constants/error-codes';
import { prisma } from '../../shared/database/prisma';
import { HttpException } from '../../shared/errors';
import { Logger } from '../../shared/utils/logger';

// Import service dependencies
import { JavaBridgeService } from './services/java-bridge.service';
import { MetadataService } from './services/metadata.service';
import { queueService, type SipJob as InternalSipJob } from './services/queue.service';
// Note: Using internal SipJob type from queue service, not the database model
import { SipJobStage, SipJobStatus } from '@memoriaali/database/generated/client';
import { TempFileService } from './services/temp-file.service';

// Import types
import type { CreateSIPRequest } from './sip.schemas';
import { parseDocumentMetadata, type DocumentMetadata } from './types/metadata.types';

/**
 * Extended document interface for SIP processing
 */
interface ProcessedDocument {
  id: string;
  fileName: string;
  filePath: string;
  mimeType?: string | null;
  ocrText?: string | null;
  metadata: DocumentMetadata;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    username: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  };
}

/**
 * SIP processing result
 */
interface SIPProcessingResult {
  sipId: string;
  sipPath: string;
  documentCount: number;
  size: number;
  metadata: {
    packageMode: string;
    documentsProcessed: string[];
    createdAt: string;
    processingTimeMs: number;
  };
}

/**
 * Main SIP Orchestration Service
 *
 * Coordinates the entire SIP creation workflow by managing interactions between
 * the queue service, temp file service, metadata service, Java bridge service,
 * and database operations. Ensures proper cleanup and error handling.
 */
export class SIPService {
  private readonly logger = new Logger('SIPService');
  private readonly tempFileService: TempFileService;
  private readonly metadataService: MetadataService;
  private readonly javaBridgeService: JavaBridgeService;

  // Configuration constants
  private readonly UPLOAD_BASE_PATH = process.env.UPLOAD_PATH ?? '/app/uploads';
  private readonly SIP_OUTPUT_PATH = process.env.SIP_OUTPUT_PATH ?? '/app/sips';
  private readonly SIP_RETENTION_DAYS = parseInt(process.env.SIP_RETENTION_DAYS ?? '30', 10);

  constructor() {
    this.tempFileService = new TempFileService();
    this.metadataService = new MetadataService();
    this.javaBridgeService = new JavaBridgeService();

    // Register this service as the queue processor
    queueService.registerProcessor(this.processSipJob.bind(this));

    this.logger.info('🚀 SIP orchestration service initialized');
  }

  /**
   * Main SIP job processing method
   *
   * Orchestrates the complete SIP creation workflow:
   * 1. Validate documents exist in database
   * 2. Create temporary workspace
   * 3. Copy files to temporary location
   * 4. Generate metadata XML files
   * 5. Call Java service to create SIP package
   * 6. Move SIP to final storage location
   * 7. Update database with SIP record
   * 8. Clean up temporary files
   *
   * Ensures cleanup happens even on failure using try-finally blocks.
   *
   * @param job - SIP job to process
   */
  public processSipJob = async (job: InternalSipJob): Promise<void> => {
    const startTime = Date.now();
    let workspaceDir: string | null = null;
    let documents: ProcessedDocument[] = [];

    try {
      // Extract and validate documentIds from metadata
      const metadata = job.metadata as unknown;
      const meta =
        metadata && typeof metadata === 'object' && !Array.isArray(metadata)
          ? (metadata as Record<string, unknown>)
          : {};

      const documentIds: string[] = Array.isArray(meta.documentIds)
        ? (meta.documentIds as string[])
        : [];

      if (documentIds.length === 0) {
        throw new Error('No document IDs found in job metadata');
      }

      this.logger.info(`🔄 Processing SIP job ${job.id}`, {
        jobId: job.id,
        documentIds,
        metadata: job.metadata,
      });

      // Stage 1: Validate documents exist in database
      queueService.updateProgress(job.id, SipJobStage.VALIDATING, 10, 'Validating documents...', {
        totalDocuments: documentIds.length,
      });

      documents = await this.validateAndFetchDocuments(documentIds);

      this.logger.info(`✅ Validated ${documents.length} documents for job ${job.id}`);

      // Stage 2: Create temporary workspace
      queueService.updateProgress(
        job.id,
        SipJobStage.PREPARING,
        20,
        'Creating temporary workspace...',
      );

      workspaceDir = await this.tempFileService.createJobWorkspace(job.id);

      this.logger.info(`✅ Created workspace for job ${job.id}: ${workspaceDir}`);

      // Stage 3: Copy files to temporary workspace
      queueService.updateProgress(
        job.id,
        SipJobStage.PREPARING,
        30,
        'Copying files to workspace...',
        { totalDocuments: documents.length, processedDocuments: 0 },
      );

      const copiedFiles = await this.copyFilesToWorkspace(documents, workspaceDir, job.id);

      this.logger.info(`✅ Copied ${copiedFiles.length} files for job ${job.id}`);

      // Stage 4: Generate metadata files
      queueService.updateProgress(
        job.id,
        SipJobStage.GENERATING,
        50,
        'Generating metadata files...',
        { totalDocuments: documents.length, processedDocuments: documents.length },
      );

      // Process documents in parallel to generate metadata
      const metadataFiles = await Promise.all(
        documents.map(async (document, i) => {
          const workspace = workspaceDir;
          if (!workspace) {
            throw new Error('Workspace directory not initialized');
          }

          const metadataDir = join(workspace, 'metadata');
          // Ensure metadata directory exists (race condition handled by mkdir -p behavior or pre-creation)
          await fs.mkdir(metadataDir, { recursive: true });

          // Update progress - note: this might cause race conditions in progress updates, but it's acceptable for progress bars
          // For stricter progress, we could use a counter or sequential updates
          queueService.updateProgress(
            job.id,
            SipJobStage.GENERATING,
            50 + (i / documents.length) * 20, // 50-70% range
            `Generating metadata for ${document.fileName}...`,
            {
              currentFile: document.fileName,
              processedDocuments: i,
              totalDocuments: documents.length,
            },
          );

          // Generate Dublin Core metadata
          const dcMetadata = this.metadataService.generateDublinCoreXML(document);

          // Write metadata to file
          const metadataFileName = `${document.id}_dc.xml`;
          const metadataPath = join(metadataDir, metadataFileName);

          await fs.writeFile(metadataPath, dcMetadata, 'utf8');

          return {
            document,
            metadataPath,
          };
        }),
      );

      // Check if any file copies were skipped or missed in the mapping
      const validMetadataFiles = metadataFiles.filter(
        (
          f,
        ): f is {
          document: ProcessedDocument;
          metadataPath: string;
        } => f !== null,
      );

      if (validMetadataFiles.length !== documents.length) {
        throw new Error('Failed to generate all metadata files');
      }

      this.logger.info(
        `✅ Generated ${validMetadataFiles.length} metadata files for job ${job.id}`,
      );

      // Stage 5: Create SIP package using Java service
      queueService.updateProgress(job.id, SipJobStage.PACKAGING, 70, 'Creating SIP package...');

      const sipResult = await this.createSIPPackage(
        documents,
        copiedFiles,
        metadataFiles,
        workspaceDir,
        job.metadata as CreateSIPRequest,
        job.userId,
      );

      this.logger.info(`✅ Created SIP package for job ${job.id}: ${sipResult.sipPath}`);

      // Stage 6: Move SIP to final storage and update database
      queueService.updateProgress(job.id, SipJobStage.FINALIZING, 90, 'Finalizing SIP package...');

      const finalSipPath = await this.finalizeSIPPackage(
        sipResult,
        job.metadata as CreateSIPRequest,
        job.userId,
      );
      await this.createSIPRecord(job, documents, finalSipPath, sipResult);

      this.logger.info(`✅ Finalized SIP package for job ${job.id}: ${finalSipPath}`);

      // Mark job as completed
      const processingTimeMs = Date.now() - startTime;
      queueService.completeJob(job.id, {
        sipPath: finalSipPath,
        sipId: sipResult.sipId,
        documentCount: documents.length,
        size: sipResult.size,
      });

      this.logger.info(`🎉 Successfully completed SIP job ${job.id} in ${processingTimeMs}ms`);
    } catch (error) {
      this.logger.error(`❌ Failed to process SIP job ${job.id}:`, error);

      // Mark job as failed
      queueService.failJob(
        job.id,
        error instanceof Error ? error : new Error('Unknown error during SIP processing'),
        error instanceof HttpException ? error.code : ERROR_CODES.SYSTEM.INTERNAL_ERROR,
      );

      throw error;
    } finally {
      // Stage 7: Cleanup temporary workspace (always executed)
      if (workspaceDir) {
        try {
          queueService.updateProgress(
            job.id,
            job.status === SipJobStatus.COMPLETED ? SipJobStage.COMPLETE : SipJobStage.ERROR,
            100,
            'Cleaning up temporary files...',
          );

          await this.tempFileService.cleanup(job.id, true); // Force cleanup
          this.logger.info(`🧹 Cleaned up workspace for job ${job.id}`);
        } catch (cleanupError) {
          this.logger.error(`⚠️ Failed to cleanup workspace for job ${job.id}:`, cleanupError);
          // Don't throw cleanup errors, just log them
        }
      }
    }
  };

  /**
   * Validate that all document IDs exist in database and fetch their data
   */
  private validateAndFetchDocuments = async (
    documentIds: string[],
  ): Promise<ProcessedDocument[]> => {
    try {
      // Fetch documents with required relations
      const documents = await prisma.document.findMany({
        where: {
          id: { in: documentIds },
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Check if all documents were found
      if (documents.length !== documentIds.length) {
        const found = documents.map((d) => d.id);
        const missing = documentIds.filter((id) => !found.includes(id));

        throw HttpException.badRequest(
          ERROR_CODES.VALIDATION.INVALID_INPUT,
          `Documents not found: ${missing.join(', ')}`,
        );
      }

      // Convert to ProcessedDocument format and validate file paths
      // Validate files in parallel
      const processedDocuments = await Promise.all(
        documents.map(async (doc) => {
          const filePath = join(this.UPLOAD_BASE_PATH, doc.fileName);

          // Verify file exists on filesystem
          try {
            await fs.access(filePath);
            const stats = await fs.stat(filePath);

            if (!stats.isFile()) {
              throw new Error(`Path is not a file: ${filePath}`);
            }
          } catch (_error) {
            throw HttpException.badRequest(
              ERROR_CODES.FILE.NOT_FOUND,
              `File not found for document ${doc.id}: ${doc.fileName}`,
            );
          }

          return {
            ...doc,
            metadata: parseDocumentMetadata(doc.metadata),
            filePath,
          };
        }),
      );

      return processedDocuments;
    } catch (error) {
      this.logger.error('❌ Failed to validate documents:', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw HttpException.internalServerError(
        ERROR_CODES.SYSTEM.INTERNAL_ERROR,
        `Failed to validate documents: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  };

  /**
   * Copy files to temporary workspace
   */
  private async copyFilesToWorkspace(
    documents: ProcessedDocument[],
    workspaceDir: string,
    _jobId: string,
  ): Promise<Array<{ source: string; destination: string; document: ProcessedDocument }>> {
    const filesToCopy = documents.map((doc) => ({
      source: doc.filePath,
      filename: doc.fileName,
    }));

    const copyOperations = await this.tempFileService.copyFilesToTemp(filesToCopy, workspaceDir);

    return copyOperations.map((operation, index) => {
      const document = documents[index];
      if (!document) {
        throw new Error(`Document not found for copy operation at index ${index}`);
      }
      return {
        source: operation.source,
        destination: operation.destination,
        document,
      };
    });
  }

  /**
   * Generate metadata XML files for documents
   *
   * @deprecated Using inline parallel generation in processSipJob instead
   */
  /*
  private async generateMetadataFiles(
    documents: ProcessedDocument[],
    copiedFiles: Array<{ source: string; destination: string; document: ProcessedDocument }>,
    workspaceDir: string,
    jobData: CreateSIPRequest,
    jobId: string,
  ): Promise<Array<{ document: ProcessedDocument; metadataPath: string }>> {
    const metadataFiles: Array<{ document: ProcessedDocument; metadataPath: string }> = [];
    const metadataDir = join(workspaceDir, 'metadata');

    // Create metadata directory
    await fs.mkdir(metadataDir, { recursive: true });

    for (let i = 0; i < documents.length; i++) {
      const document = documents[i];
      if (!document) continue;

      // Update progress
      queueService.updateProgress(
        jobId,
        SipJobStage.GENERATING,
        50 + (i / documents.length) * 20, // 50-70% range
        `Generating metadata for ${document.fileName}...`,
        {
          currentFile: document.fileName,
          processedDocuments: i,
          totalDocuments: documents.length,
        },
      );

      // Generate Dublin Core metadata
      const dcMetadata = this.metadataService.generateDublinCoreXML(document);

      // Write metadata to file
      const metadataFileName = `${document.id}_dc.xml`;
      const metadataPath = join(metadataDir, metadataFileName);

      await fs.writeFile(metadataPath, dcMetadata, 'utf8');

      metadataFiles.push({
        document,
        metadataPath,
      });
    }

    return metadataFiles;
  }
  */

  /**
   * Create SIP package using Java bridge service
   */
  private async createSIPPackage(
    documents: ProcessedDocument[],
    copiedFiles: Array<{ source: string; destination: string; document: ProcessedDocument }>,
    metadataFiles: Array<{ document: ProcessedDocument; metadataPath: string }>,
    workspaceDir: string,
    jobData: CreateSIPRequest,
    userId: string,
  ): Promise<SIPProcessingResult> {
    const sipId = `sip-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const outputDir = join(workspaceDir, 'output');
    const sipOutputPath = join(outputDir, `${sipId}.zip`);

    // Prepare files array for Java service
    const filesForSip = documents.map((document, index) => {
      const copiedFile = copiedFiles[index];
      const metadataFile = metadataFiles[index];

      if (!copiedFile || !metadataFile) {
        throw new Error('Missing file or metadata for document');
      }

      return {
        filePath: copiedFile.destination,
        metadataPath: metadataFile.metadataPath,
        creatorName:
          document.user.firstName && document.user.lastName
            ? `${document.user.firstName} ${document.user.lastName}`
            : document.user.username,
        creatorUsername: document.user.username,
      };
    });

    // Get user info for SIP metadata
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user) {
      throw HttpException.notFound(ERROR_CODES.RESOURCE.NOT_FOUND, `User not found: ${userId}`);
    }

    // Generate PREMIS metadata for the package
    const premisMetadata = this.metadataService.generatePremisXML(sipId, documents);

    const premisPath = join(workspaceDir, 'metadata', 'premis.xml');
    await fs.writeFile(premisPath, premisMetadata, 'utf8');

    // Ensure metadata file exists
    const mainDcPath = metadataFiles[0]?.metadataPath;
    if (!mainDcPath) {
      throw new Error('No metadata files generated');
    }

    // Create SIP configuration
    const sipConfig = {
      sipId,
      outputPath: sipOutputPath,
      dcMetadataPath: mainDcPath, // Use first document's DC metadata
      premisMetadataPath: premisPath,
      metadataFormat: 'dc' as const,
      packageMode: jobData.packageMode === 'combined' ? ('multi' as const) : ('single' as const),
      submitter: {
        username: user.username,
        name:
          user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username,
      },
      archivist: {
        name: 'Memoriaali Archive System',
      },
      files: filesForSip,
    };

    // Call Java service to create SIP
    await this.javaBridgeService.createSIPPackage(sipConfig);

    // Get file size
    const stats = await fs.stat(sipOutputPath);

    return {
      sipId,
      sipPath: sipOutputPath,
      documentCount: documents.length,
      size: stats.size,
      metadata: {
        packageMode: jobData.packageMode,
        documentsProcessed: documents.map((d) => d.id),
        createdAt: new Date().toISOString(),
        processingTimeMs: Date.now() - Date.now(), // Will be set by caller
      },
    };
  }

  /**
   * Move SIP package to final storage location
   */
  private finalizeSIPPackage = async (
    sipResult: SIPProcessingResult,
    _jobData: CreateSIPRequest,
    _userId: string,
  ): Promise<string> => {
    // Ensure SIP output directory exists
    await fs.mkdir(this.SIP_OUTPUT_PATH, { recursive: true });

    // Generate final filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const finalFileName = `${sipResult.sipId}_${timestamp}.zip`;
    const finalPath = join(this.SIP_OUTPUT_PATH, finalFileName);

    // Move file from temporary location to final storage
    await fs.copyFile(sipResult.sipPath, finalPath);

    // Verify the move was successful
    const stats = await fs.stat(finalPath);
    if (stats.size !== sipResult.size) {
      throw HttpException.internalServerError(
        ERROR_CODES.FILE.CORRUPTED,
        'SIP package verification failed after move to final storage',
      );
    }

    return finalPath;
  };

  /**
   * Create SIP record in database
   */
  private async createSIPRecord(
    job: InternalSipJob,
    documents: ProcessedDocument[],
    finalSipPath: string,
    sipResult: SIPProcessingResult,
  ): Promise<void> {
    try {
      // Note: This assumes there's a SIP model in the schema
      // If not, you might need to add it or store in a different way
      await prisma.$executeRaw`
        INSERT INTO sip_packages (
          id,
          job_id,
          user_id,
          sip_id,
          file_path,
          file_size,
          document_count,
          package_mode,
          metadata,
          created_at,
          updated_at
        ) VALUES (
          ${sipResult.sipId},
          ${job.id},
          ${job.userId},
          ${sipResult.sipId},
          ${finalSipPath},
          ${sipResult.size},
          ${sipResult.documentCount},
          ${(job.metadata as CreateSIPRequest)?.packageMode ?? 'single'},
          ${JSON.stringify(sipResult.metadata)},
          NOW(),
          NOW()
        )
      `;

      this.logger.info(`✅ Created SIP record for job ${job.id}`, {
        sipId: sipResult.sipId,
        documentCount: sipResult.documentCount,
      });
    } catch (error) {
      this.logger.error(`❌ Failed to create SIP record for job ${job.id}:`, error);

      // Don't fail the job for database issues, just log
      // The SIP package was created successfully
    }
  }

  /**
   * Get service status and statistics
   */
  getStatus() {
    return {
      service: 'SIPService',
      version: '1.0.0',
      status: 'active',
      queueStats: queueService.getStats(),
      activeWorkspaces: this.tempFileService.getActiveWorkspaces(),
      configuration: {
        uploadBasePath: this.UPLOAD_BASE_PATH,
        sipOutputPath: this.SIP_OUTPUT_PATH,
        sipRetentionDays: this.SIP_RETENTION_DAYS,
      },
    };
  }

  /**
   * Cleanup service resources
   */
  async destroy(): Promise<void> {
    this.logger.info('🛑 Shutting down SIP service...');

    try {
      // Cleanup temp files
      await this.tempFileService.cleanupAll();

      this.logger.info('✅ SIP service shutdown completed');
    } catch (error) {
      this.logger.error('❌ Error during SIP service shutdown:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const sipService = new SIPService();
