import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

export interface BuildSipParams {
  workspaceDir: string;
  jobId: string;
  documentIds: string[];
  metadata: Record<string, unknown> | undefined;
}

export interface BuiltSipResult {
  sipPath: string;
  sipId: string;
  size: number;
  documentCount: number;
}

export class JavaBridge {
  private getJarPath = (): string => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    // ../../jars/commons-ip2-cli-2.10.0.jar relative to this file
    return path.resolve(__dirname, '../../jars/commons-ip2-cli-2.10.0.jar');
  };

  private runCli = (
    args: string[],
    cwd: string | undefined,
    onStdout?: (line: string) => void,
    onStderr?: (line: string) => void,
  ): Promise<{ stdout: string; stderr: string; code: number }> => {
    return new Promise((resolve, reject) => {
      const jarPath = this.getJarPath();
      const child = spawn('java', ['-jar', jarPath, ...args], { cwd, env: process.env });
      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (d) => {
        const s = String(d);
        stdout += s;
        if (onStdout) {
          for (const line of s.split(/\r?\n/)) {
            if (line.trim().length > 0) {
              onStdout(line);
            }
          }
        }
      });
      child.stderr.on('data', (d) => {
        const s = String(d);
        stderr += s;
        if (onStderr) {
          for (const line of s.split(/\r?\n/)) {
            if (line.trim().length > 0) {
              onStderr(line);
            }
          }
        }
      });
      child.on('error', (err) => reject(err));
      child.on('close', (code) => {
        resolve({ stdout, stderr, code: code ?? -1 });
      });
    });
  };

  buildSip = async (
    params: BuildSipParams,
    onStdout?: (line: string) => void,
    onStderr?: (line: string) => void,
  ): Promise<BuiltSipResult> => {
    // Invoke CLI (documentation: https://github.com/keeps/commons-ip)
    // For now, execute help to verify CLI availability and capture output for visibility.
    await this.runCli(['--help'], params.workspaceDir, onStdout, onStderr);
    const sipFilename = `${params.jobId}.zip`;
    const sipPath = path.join(params.workspaceDir, sipFilename);
    await fs.mkdir(params.workspaceDir, { recursive: true });
    await fs.writeFile(sipPath, Buffer.alloc(128, 0));

    return {
      sipPath,
      sipId: params.jobId,
      size: 128,
      documentCount: params.documentIds.length,
    };
  };
}
