import * as fs from 'fs/promises';
import * as path from 'path';
import { loadArchiverEnv } from '../env';
import { BuiltSipResult, JavaBridge } from '../java/java-bridge';
import { MetadataService } from '../metadata/metadata.service';
import { TempWorkspaceService } from '../workspace/temp-file.service';

export class SipPackager {
  private readonly java = new JavaBridge();
  private readonly workspace = new TempWorkspaceService();
  private readonly metadata = new MetadataService();

  run = async (
    jobId: string,
    payload: {
      documentIds: string[];
      metadata?: Record<string, unknown>;
      // each id should map to a relative path when implemented
      relativePaths?: string[];
    },
    onProgressLine?: (line: string) => void,
  ): Promise<BuiltSipResult> => {
    const env = loadArchiverEnv();
    const dir = await this.workspace.create(jobId);
    try {
      const metadata = this.metadata.enrich(payload.metadata);

      // Copy source files from UPLOAD_DIR into workspace/data
      const dataDir = path.join(dir, 'data');
      await fs.mkdir(dataDir, { recursive: true });
      if (Array.isArray(payload.relativePaths)) {
        for (const rel of payload.relativePaths) {
          const src = path.join(env.uploadDirAbs, rel);
          const dest = path.join(dataDir, path.basename(rel));
          try {
            const buf = await fs.readFile(src);
            await fs.writeFile(dest, buf);
          } catch {
            // ignore missing for now; real implementation should report errors
          }
        }
      }

      const result = await this.java.buildSip(
        {
          workspaceDir: dir,
          jobId,
          documentIds: payload.documentIds,
          metadata,
        },
        onProgressLine,
        onProgressLine,
      );

      // Move output to UPLOAD_DIR/sips
      const outDir = path.join(env.uploadDirAbs, 'sips');
      await fs.mkdir(outDir, { recursive: true });
      const finalPath = path.join(outDir, path.basename(result.sipPath));
      try {
        await fs.rename(result.sipPath, finalPath);
      } catch {
        const buf = await fs.readFile(result.sipPath);
        await fs.writeFile(finalPath, buf);
      }

      return { ...result, sipPath: finalPath };
    } finally {
      await this.workspace.cleanup(dir);
    }
  };
}
