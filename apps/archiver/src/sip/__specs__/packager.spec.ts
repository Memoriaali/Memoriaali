/**
 * Unit tests for SipPackager - Workspace & UPLOAD_DIR handling
 *
 * ARCHITECTURAL CONTEXT:
 * - Tests the archiver service layer that orchestrates workspace preparation and output placement
 *   before delegating to the Java CLI bridge. Verifies file IO and environment resolution.
 *
 * BUSINESS REQUIREMENTS:
 * - Input files are read from a shared UPLOAD_DIR under `documents/`
 * - Generated SIPs are written under `UPLOAD_DIR/sips/`
 * - Progress lines from the Java CLI are surfaced (streamed to backend in integration paths)
 *
 * KEY DEPENDENCIES:
 * - loadArchiverEnv() for UPLOAD_DIR resolution relative to repo root
 * - JavaBridge for invoking the commons-ip2-cli JAR (mocked here for isolation)
 *
 * SECURITY/COMPLIANCE:
 * - No secrets in test artifacts; WORKER_AUTH_SECRET provided as a dummy value
 *
 * CONTRACT SUMMARY:
 * - Preconditions: UPLOAD_DIR defined; document exists under UPLOAD_DIR/documents/<id>
 * - Postconditions: SIP file exists under UPLOAD_DIR/sips/<jobId>.zip; progress lines emitted
 * - Invariants: Workspace is cleaned up after run (no temp dirs left)
 */
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock JavaBridge used by SipPackager to avoid requiring Java in unit tests
vi.mock('../../java/java-bridge', () => {
  class MockJavaBridge {
    async buildSip(
      params: {
        workspaceDir: string;
        jobId: string;
        documentIds: string[];
        metadata: Record<string, unknown> | undefined;
      },
      onStdout?: (line: string) => void,
      _onStderr?: (line: string) => void,
    ) {
      const outPath = path.join(params.workspaceDir, `${params.jobId}.zip`);
      await fs.mkdir(params.workspaceDir, { recursive: true });
      await fs.writeFile(outPath, Buffer.from('dummy-sip'));
      if (onStdout) {
        onStdout('commons-ip: packaging started');
        onStdout('commons-ip: packaging completed');
      }
      return {
        sipPath: outPath,
        sipId: params.jobId,
        size: 10,
        documentCount: params.documentIds.length,
      };
    }
  }
  return { JavaBridge: MockJavaBridge };
});

// Import after mock so the mocked class is used inside the module
import { SipPackager } from '../packager';

const ensureDir = async (dir: string): Promise<void> => {
  await fs.mkdir(dir, { recursive: true });
};

describe('SipPackager', () => {
  let tmpUploadDir: string;

  beforeEach(async () => {
    tmpUploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'archiver-upload-'));
    process.env.WORKER_AUTH_SECRET = 'unit-test-secret';
    process.env.BACKEND_URL = 'http://localhost:8001';
    process.env.UPLOAD_DIR = tmpUploadDir; // absolute path supported by env loader
  });

  afterEach(async () => {
    // Best-effort cleanup
    try {
      await fs.rm(tmpUploadDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it('builds a SIP and writes it under UPLOAD_DIR/sips, emitting progress lines', async () => {
    const documentsDir = path.join(tmpUploadDir, 'documents');
    await ensureDir(documentsDir);
    const docId = '11111111-1111-4111-8111-111111111111';
    const srcPath = path.join(documentsDir, docId);
    await fs.writeFile(srcPath, Buffer.from('file-content'));

    const jobId = 'job-abc';
    const lines: string[] = [];

    const packager = new SipPackager();
    const result = await packager.run(
      jobId,
      {
        documentIds: [docId],
        relativePaths: [`documents/${docId}`],
        metadata: { title: 'Sample' },
      },
      (line) => {
        lines.push(line);
      },
    );

    const expectedOut = path.join(tmpUploadDir, 'sips', `${jobId}.zip`);
    const stat = await fs.stat(expectedOut);
    expect(stat.isFile()).toBe(true);
    expect(result.sipPath).toBe(expectedOut);
    expect(result.documentCount).toBe(1);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });
});
