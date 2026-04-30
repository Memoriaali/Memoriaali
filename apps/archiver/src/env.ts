import * as dotenv from 'dotenv';
import * as path from 'path';

export interface ArchiverEnv {
  backendUrl: string;
  workerAuthSecret: string;
  uploadDirAbs: string;
}

export const loadArchiverEnv = (): ArchiverEnv => {
  const appDir = path.resolve(process.cwd());
  const rootDir = path.resolve(appDir, '../..');

  dotenv.config({ path: path.join(rootDir, '.env') });
  dotenv.config({ path: path.join(appDir, '.env'), override: true });
  dotenv.config({ path: path.join(appDir, '.env.local'), override: true });

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8001';
  const workerAuthSecret = process.env.WORKER_AUTH_SECRET || '';
  const uploadDirRel = process.env.UPLOAD_DIR || 'storage/uploads';
  const uploadDirAbs = path.resolve(rootDir, uploadDirRel);

  if (!workerAuthSecret) {
    // eslint-disable-next-line no-console
    console.error('WORKER_AUTH_SECRET missing');
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }

  return { backendUrl, workerAuthSecret, uploadDirAbs };
};
