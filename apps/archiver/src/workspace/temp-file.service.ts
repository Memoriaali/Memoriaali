import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

export class TempWorkspaceService {
  create = async (jobId: string): Promise<string> => {
    const base = path.join(os.tmpdir(), 'archiver-workspaces');
    const dir = path.join(base, jobId);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  };

  cleanup = async (dir: string): Promise<void> => {
    await fs.rm(dir, { recursive: true, force: true });
  };
}
