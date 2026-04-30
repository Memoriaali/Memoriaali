/**
 * Temporary File Management Service for SIP Jobs
 *
 * Provides robust temporary file and workspace management for SIP package generation.
 * Handles job lifecycle, cleanup strategies, and atomic file operations with proper
 * error handling and resource management.
 *
 * Design by Contract:
 * - Preconditions: Valid job IDs, sufficient disk space, proper permissions
 * - Postconditions: Clean resource management, guaranteed cleanup on process exit
 * - Invariants: No orphaned files, atomic operations, consistent state
 */

import { createHash, randomBytes } from 'crypto';
import { promises as fs, constants as fsConstants } from 'fs';
import { tmpdir } from 'os';
import { basename, join } from 'path';

import { ERROR_CODES, HttpException } from '../../../shared/errors';

// Constants for configuration
const TEMP_DIR_PREFIX = 'memoriaali-sip';
const CLEANUP_AGE_HOURS = 24;
const LOCK_FILE_SUFFIX = '.lock';
const MIN_DISK_SPACE_MB = 100;
const CLEANUP_BATCH_SIZE = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 100;

// Types for service operations
interface JobWorkspace {
  jobId: string;
  workspaceDir: string;
  lockFile: string;
  createdAt: Date;
  files: string[];
}

interface CopyOperation {
  source: string;
  destination: string;
  verified: boolean;
}

interface CleanupStats {
  workspacesRemoved: number;
  filesRemoved: number;
  errors: string[];
  duration: number;
}

/**
 * Temporary File Service for SIP Job Management
 *
 * Manages temporary workspaces for SIP package generation with robust cleanup,
 * atomic operations, and process-safe file handling. Implements multiple cleanup
 * strategies to prevent orphaned files and resource leaks.
 */
export class TempFileService {
  private readonly baseDir: string;
  private readonly activeJobs = new Map<string, JobWorkspace>();
  private processHandlersSetup = false;
  private cleanupInProgress = false;

  constructor(customTempDir?: string) {
    this.baseDir = join(customTempDir ?? tmpdir(), TEMP_DIR_PREFIX);
    this.setupProcessHandlers();
  }

  /**
   * Create temporary workspace for SIP job
   *
   * Creates an isolated directory structure for a specific job with lock files
   * to prevent cleanup of active workspaces. Verifies disk space availability.
   *
   * Preconditions: Valid jobId, sufficient disk space, proper permissions
   * Postconditions: Workspace directory created, lock file written, job tracked
   * Invariants: Unique workspace per jobId, atomic creation process
   */
  async createJobWorkspace(jobId: string): Promise<string> {
    try {
      // Validate job ID
      if (!jobId || typeof jobId !== 'string' || jobId.length === 0) {
        throw HttpException.badRequest(
          ERROR_CODES.VALIDATION.INVALID_INPUT,
          'Job ID must be a non-empty string',
        );
      }

      // Check if workspace already exists
      const existingWorkspace = this.activeJobs.get(jobId);
      if (existingWorkspace) {
        console.warn(
          `⚠️ Workspace already exists for job ${jobId}: ${existingWorkspace.workspaceDir}`,
        );
        return existingWorkspace.workspaceDir;
      }

      // Check available disk space
      await this.verifyDiskSpace();

      // Ensure base directory exists
      await this.ensureDirectoryExists(this.baseDir);

      // Create unique workspace directory
      const timestamp = Date.now();
      const randomSuffix = randomBytes(4).toString('hex');
      const workspaceName = `${jobId}-${timestamp}-${randomSuffix}`;
      const workspaceDir = join(this.baseDir, workspaceName);

      // Create workspace directory structure
      await fs.mkdir(workspaceDir, { recursive: true, mode: 0o755 });
      await fs.mkdir(join(workspaceDir, 'input'), { mode: 0o755 });
      await fs.mkdir(join(workspaceDir, 'output'), { mode: 0o755 });
      await fs.mkdir(join(workspaceDir, 'temp'), { mode: 0o755 });

      // Create lock file to prevent cleanup
      const lockFile = join(workspaceDir, `${jobId}${LOCK_FILE_SUFFIX}`);
      const lockData = {
        jobId,
        pid: process.pid,
        createdAt: new Date().toISOString(),
        hostname: require('os').hostname(),
      };
      await fs.writeFile(lockFile, JSON.stringify(lockData, null, 2), { mode: 0o644 });

      // Track the workspace
      const workspace: JobWorkspace = {
        jobId,
        workspaceDir,
        lockFile,
        createdAt: new Date(),
        files: [],
      };
      this.activeJobs.set(jobId, workspace);

      console.info(`✅ Created SIP workspace for job ${jobId}: ${workspaceDir}`);
      return workspaceDir;
    } catch (error) {
      console.error(`❌ Failed to create workspace for job ${jobId}:`, error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw HttpException.internalServerError(
        ERROR_CODES.SYSTEM.INTERNAL_ERROR,
        `Failed to create job workspace: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Copy files to temporary workspace with verification
   *
   * Atomically copies files to the workspace with integrity verification.
   * Uses checksums to ensure data integrity during transfer operations.
   *
   * Preconditions: Valid file paths, workspace exists, sufficient disk space
   * Postconditions: Files copied with integrity verification, workspace updated
   * Invariants: Atomic copy operations, data integrity maintained
   */
  async copyFilesToTemp(
    files: Array<{ source: string; filename?: string }>,
    tempDir: string,
  ): Promise<CopyOperation[]> {
    const operations: CopyOperation[] = [];

    try {
      // Validate inputs
      if (!Array.isArray(files) || files.length === 0) {
        throw HttpException.badRequest(
          ERROR_CODES.VALIDATION.INVALID_INPUT,
          'Files array must be non-empty',
        );
      }

      if (!(await this.directoryExists(tempDir))) {
        throw HttpException.badRequest(
          ERROR_CODES.FILE.NOT_FOUND,
          'Target directory does not exist',
        );
      }

      // Verify available space for all files
      const totalSize = await this.calculateTotalFileSize(files.map((f) => f.source));
      await this.verifyDiskSpace(totalSize);

      const inputDir = join(tempDir, 'input');

      // Copy each file with verification
      for (const { source, filename } of files) {
        const operation = await this.copyFileWithVerification(source, inputDir, filename);
        operations.push(operation);

        // Update workspace tracking
        const jobId = this.findJobIdByWorkspace(tempDir);
        if (jobId) {
          const workspace = this.activeJobs.get(jobId);
          if (workspace) {
            workspace.files.push(operation.destination);
          }
        }
      }

      console.info(`✅ Successfully copied ${operations.length} files to ${tempDir}`);
      return operations;
    } catch (error) {
      console.error('❌ Failed to copy files to temporary workspace:', error);

      // Attempt to cleanup partial operations
      await this.cleanupPartialOperations(operations);

      if (error instanceof HttpException) {
        throw error;
      }

      throw HttpException.internalServerError(
        ERROR_CODES.FILE.UPLOAD_FAILED,
        `Failed to copy files: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Clean up specific job workspace
   *
   * Removes workspace directory and all associated files for a specific job.
   * Supports force cleanup to override lock files during error recovery.
   *
   * Preconditions: Valid jobId
   * Postconditions: Workspace removed, job tracking cleared
   * Invariants: Complete cleanup, no partial state remaining
   */
  async cleanup(jobId: string, force = false): Promise<void> {
    try {
      if (!jobId || typeof jobId !== 'string') {
        throw HttpException.badRequest(
          ERROR_CODES.VALIDATION.INVALID_INPUT,
          'Job ID must be a valid string',
        );
      }

      const workspace = this.activeJobs.get(jobId);
      if (!workspace) {
        console.warn(`⚠️ No active workspace found for job ${jobId}`);
        return;
      }

      console.info(`🧹 Cleaning up workspace for job ${jobId}...`);

      // Check if workspace directory exists
      if (await this.directoryExists(workspace.workspaceDir)) {
        // Remove lock file first if not forced
        if (!force && (await this.fileExists(workspace.lockFile))) {
          await this.removeFileWithRetry(workspace.lockFile);
        }

        // Remove entire workspace directory
        await this.removeDirectoryRecursive(workspace.workspaceDir);
      }

      // Remove from tracking
      this.activeJobs.delete(jobId);

      console.info(`✅ Successfully cleaned up workspace for job ${jobId}`);
    } catch (error) {
      console.error(`❌ Failed to cleanup workspace for job ${jobId}:`, error);

      // Still remove from tracking to prevent memory leaks
      this.activeJobs.delete(jobId);

      throw HttpException.internalServerError(
        ERROR_CODES.SYSTEM.INTERNAL_ERROR,
        `Failed to cleanup workspace: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Emergency cleanup of all active workspaces
   *
   * Removes all tracked workspaces immediately. Used during application shutdown
   * or error recovery scenarios. Provides comprehensive cleanup statistics.
   *
   * Preconditions: None
   * Postconditions: All workspaces removed, tracking cleared
   * Invariants: Complete system cleanup
   */
  async cleanupAll(): Promise<CleanupStats> {
    const startTime = Date.now();
    const stats: CleanupStats = {
      workspacesRemoved: 0,
      filesRemoved: 0,
      errors: [],
      duration: 0,
    };

    try {
      console.info('🧹 Starting emergency cleanup of all SIP workspaces...');

      const jobIds = Array.from(this.activeJobs.keys());

      for (const jobId of jobIds) {
        try {
          await this.cleanup(jobId, true); // Force cleanup
          stats.workspacesRemoved++;
        } catch (error) {
          const errorMsg = `Failed to cleanup job ${jobId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          stats.errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      }

      stats.duration = Date.now() - startTime;
      console.info(
        `✅ Emergency cleanup completed: ${stats.workspacesRemoved} workspaces removed in ${stats.duration}ms`,
      );

      return stats;
    } catch (error) {
      stats.duration = Date.now() - startTime;
      const errorMsg = `Emergency cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      stats.errors.push(errorMsg);
      console.error('❌', errorMsg);
      return stats;
    }
  }

  /**
   * Clean up orphaned and old temporary files
   *
   * Removes temporary files older than the configured age limit and workspaces
   * without valid lock files. Prevents accumulation of abandoned resources.
   *
   * Preconditions: Base directory accessible
   * Postconditions: Old files removed, orphaned workspaces cleaned
   * Invariants: Active workspaces protected by lock files
   */
  async cleanupOrphaned(): Promise<CleanupStats> {
    if (this.cleanupInProgress) {
      console.warn('⚠️ Orphaned cleanup already in progress, skipping...');
      return { workspacesRemoved: 0, filesRemoved: 0, errors: [], duration: 0 };
    }

    this.cleanupInProgress = true;
    const startTime = Date.now();
    const stats: CleanupStats = {
      workspacesRemoved: 0,
      filesRemoved: 0,
      errors: [],
      duration: 0,
    };

    try {
      console.info('🧹 Starting orphaned workspace cleanup...');

      if (!(await this.directoryExists(this.baseDir))) {
        console.info('ℹ️ Base temporary directory does not exist, nothing to clean');
        return stats;
      }

      const entries = await fs.readdir(this.baseDir, { withFileTypes: true });
      const cutoffTime = new Date(Date.now() - CLEANUP_AGE_HOURS * 60 * 60 * 1000);

      // Process directories in batches
      for (let i = 0; i < entries.length; i += CLEANUP_BATCH_SIZE) {
        const batch = entries.slice(i, i + CLEANUP_BATCH_SIZE);

        await Promise.allSettled(
          batch
            .filter((entry) => entry.isDirectory())
            .map(async (entry) => {
              try {
                await this.processOrphanedWorkspace(entry.name, cutoffTime, stats);
              } catch (error) {
                const errorMsg = `Failed to process ${entry.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
                stats.errors.push(errorMsg);
                console.error('❌', errorMsg);
              }
            }),
        );
      }

      stats.duration = Date.now() - startTime;
      console.info(
        `✅ Orphaned cleanup completed: ${stats.workspacesRemoved} workspaces, ${stats.filesRemoved} files removed in ${stats.duration}ms`,
      );

      return stats;
    } catch (error) {
      stats.duration = Date.now() - startTime;
      const errorMsg = `Orphaned cleanup failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      stats.errors.push(errorMsg);
      console.error('❌', errorMsg);
      return stats;
    } finally {
      this.cleanupInProgress = false;
    }
  }

  /**
   * Setup process exit handlers for cleanup
   *
   * Registers signal handlers for graceful shutdown cleanup. Ensures temporary
   * resources are cleaned up when the process terminates normally or abnormally.
   *
   * Preconditions: Process signals available
   * Postconditions: Exit handlers registered
   * Invariants: Cleanup on process termination guaranteed
   */
  setupProcessHandlers(): void {
    if (this.processHandlersSetup) {
      return; // Already setup
    }

    const cleanup = async (signal: string) => {
      console.info(`🔄 Received ${signal}, cleaning up SIP temporary files...`);
      try {
        const stats = await this.cleanupAll();
        console.info(`✅ Cleanup completed: ${stats.workspacesRemoved} workspaces removed`);
        // eslint-disable-next-line n/no-process-exit -- Legitimate use in signal handler
        process.exit(0);
      } catch (error) {
        console.error('❌ Cleanup failed during process exit:', error);
        // eslint-disable-next-line n/no-process-exit -- Legitimate use in signal handler
        process.exit(1);
      }
    };

    // Register handlers for different termination signals
    process.on('SIGINT', () => cleanup('SIGINT'));
    process.on('SIGTERM', () => cleanup('SIGTERM'));
    process.on('SIGHUP', () => cleanup('SIGHUP'));

    // Handle uncaught exceptions and unhandled rejections
    process.on('uncaughtException', async (error) => {
      console.error('❌ Uncaught exception, cleaning up:', error);
      try {
        await this.cleanupAll();
      } catch (cleanupError) {
        console.error('❌ Cleanup failed after uncaught exception:', cleanupError);
      }
      // eslint-disable-next-line n/no-process-exit -- Legitimate use in error handler
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason, _promise) => {
      console.error('❌ Unhandled rejection, cleaning up:', reason);
      try {
        await this.cleanupAll();
      } catch (cleanupError) {
        console.error('❌ Cleanup failed after unhandled rejection:', cleanupError);
      }
      // eslint-disable-next-line n/no-process-exit -- Legitimate use in error handler
      process.exit(1);
    });

    this.processHandlersSetup = true;
    console.info('✅ Process exit handlers setup for SIP temporary file cleanup');
  }

  // ===========================
  // Private Helper Methods
  // ===========================

  /**
   * Verify sufficient disk space is available
   */
  private async verifyDiskSpace(additionalBytes = 0): Promise<void> {
    try {
      const stats = await fs.statfs(this.baseDir);
      const availableBytes = stats.bavail * stats.bsize;
      const requiredBytes = MIN_DISK_SPACE_MB * 1024 * 1024 + additionalBytes;

      if (availableBytes < requiredBytes) {
        throw HttpException.badRequest(
          ERROR_CODES.RESOURCE.QUOTA_EXCEEDED,
          `Insufficient disk space. Available: ${Math.round(availableBytes / 1024 / 1024)}MB, Required: ${Math.round(requiredBytes / 1024 / 1024)}MB`,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.warn('⚠️ Could not verify disk space:', error);
    }
  }

  /**
   * Ensure directory exists with proper permissions
   */
  private async ensureDirectoryExists(dir: string): Promise<void> {
    try {
      await fs.access(dir, fsConstants.F_OK);
    } catch {
      await fs.mkdir(dir, { recursive: true, mode: 0o755 });
    }
  }

  /**
   * Check if directory exists
   */
  private async directoryExists(dir: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dir);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Check if file exists
   */
  private async fileExists(file: string): Promise<boolean> {
    try {
      await fs.access(file, fsConstants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Calculate total size of files
   */
  private async calculateTotalFileSize(filePaths: string[]): Promise<number> {
    let totalSize = 0;

    for (const filePath of filePaths) {
      try {
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      } catch (error) {
        console.warn(`⚠️ Could not stat file ${filePath}:`, error);
      }
    }

    return totalSize;
  }

  /**
   * Copy single file with integrity verification
   */
  private async copyFileWithVerification(
    source: string,
    targetDir: string,
    filename?: string,
  ): Promise<CopyOperation> {
    // Generate destination path
    const originalName = basename(source);
    const finalName = filename ?? originalName;
    const destination = join(targetDir, finalName);

    // Check source exists
    if (!(await this.fileExists(source))) {
      throw HttpException.badRequest(
        ERROR_CODES.FILE.NOT_FOUND,
        `Source file does not exist: ${source}`,
      );
    }

    // Copy file
    await fs.copyFile(source, destination);

    // Verify integrity with checksums
    const sourceChecksum = await this.calculateFileChecksum(source);
    const destChecksum = await this.calculateFileChecksum(destination);

    const verified = sourceChecksum === destChecksum;
    if (!verified) {
      await this.removeFileWithRetry(destination);
      throw HttpException.internalServerError(
        ERROR_CODES.FILE.CORRUPTED,
        `File integrity check failed for ${originalName}`,
      );
    }

    return { source, destination, verified };
  }

  /**
   * Calculate SHA256 checksum of file
   */
  private async calculateFileChecksum(filePath: string): Promise<string> {
    const data = await fs.readFile(filePath);
    return createHash('sha256').update(data).digest('hex');
  }

  /**
   * Find job ID by workspace directory
   */
  private findJobIdByWorkspace(workspaceDir: string): string | null {
    for (const [jobId, workspace] of Array.from(this.activeJobs.entries())) {
      if (workspace.workspaceDir === workspaceDir) {
        return jobId;
      }
    }
    return null;
  }

  /**
   * Cleanup partial file operations
   */
  private async cleanupPartialOperations(operations: CopyOperation[]): Promise<void> {
    for (const operation of operations) {
      if (operation.destination && (await this.fileExists(operation.destination))) {
        try {
          await this.removeFileWithRetry(operation.destination);
        } catch (error) {
          console.warn(`⚠️ Failed to cleanup partial operation ${operation.destination}:`, error);
        }
      }
    }
  }

  /**
   * Process potentially orphaned workspace
   */
  private async processOrphanedWorkspace(
    workspaceName: string,
    cutoffTime: Date,
    stats: CleanupStats,
  ): Promise<void> {
    const workspaceDir = join(this.baseDir, workspaceName);

    try {
      const workspaceStat = await fs.stat(workspaceDir);

      // Check if workspace is old enough
      if (workspaceStat.ctime > cutoffTime) {
        return; // Too recent, skip
      }

      // Look for lock file
      const lockFiles = await fs.readdir(workspaceDir);
      const lockFile = lockFiles.find((f) => f.endsWith(LOCK_FILE_SUFFIX));

      if (lockFile) {
        // Check if lock is valid (process still running)
        const lockData = await this.readLockFile(join(workspaceDir, lockFile));
        if (lockData && this.isProcessRunning(lockData.pid)) {
          return; // Process still running, skip
        }
      }

      // Safe to remove
      const fileCount = await this.countFilesInDirectory(workspaceDir);
      await this.removeDirectoryRecursive(workspaceDir);

      stats.workspacesRemoved++;
      stats.filesRemoved += fileCount;
      console.info(`🗑️ Removed orphaned workspace: ${workspaceName} (${fileCount} files)`);
    } catch (error) {
      throw new Error(
        `Failed to process workspace ${workspaceName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Read and parse lock file
   */
  private async readLockFile(lockPath: string): Promise<{ pid: number; createdAt: string } | null> {
    try {
      const data = await fs.readFile(lockPath, 'utf8');
      return JSON.parse(data) as { pid: number; createdAt: string };
    } catch {
      return null;
    }
  }

  /**
   * Check if process is still running
   */
  private isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Count files in directory recursively
   */
  private async countFilesInDirectory(dir: string): Promise<number> {
    let count = 0;
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile()) {
          count++;
        } else if (entry.isDirectory()) {
          count += await this.countFilesInDirectory(join(dir, entry.name));
        }
      }
    } catch {
      // Ignore errors
    }
    return count;
  }

  /**
   * Remove file with retry logic
   */
  private async removeFileWithRetry(filePath: string): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        await fs.unlink(filePath);
        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < MAX_RETRIES) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * attempt));
        }
      }
    }

    throw lastError;
  }

  /**
   * Remove directory recursively with proper error handling
   */
  private async removeDirectoryRecursive(dir: string): Promise<void> {
    try {
      await fs.rm(dir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`⚠️ Failed to remove directory ${dir}:`, error);
      throw error;
    }
  }

  /**
   * Get workspace information for debugging
   */
  getActiveWorkspaces(): Array<{
    jobId: string;
    workspaceDir: string;
    createdAt: Date;
    fileCount: number;
  }> {
    return Array.from(this.activeJobs.entries()).map(([jobId, workspace]) => ({
      jobId,
      workspaceDir: workspace.workspaceDir,
      createdAt: workspace.createdAt,
      fileCount: workspace.files.length,
    }));
  }
}
