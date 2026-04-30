/* eslint-disable n/no-sync */
// Load environment variables BEFORE any other imports
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve project directories robustly for both ts-node and compiled dist
// When compiled, __dirname is .../apps/backend/dist/src. When running TS, it's .../apps/backend/src

const findParentPackagejsonFolder = () => {
  let currentDir = __dirname;
  while (currentDir !== '/') {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      return currentDir;
    }
    currentDir = path.resolve(currentDir, '..');
  }
  return null;
};
const backendDir = findParentPackagejsonFolder(); // .../apps/backend

if (!backendDir) {
  throw new Error('Could not find package.json folder');
}

const rootDir = path.resolve(backendDir, '../../'); // monorepo root

console.info('backendDir:', backendDir);
console.info('rootDir:', rootDir);

console.info('__dirname:', __dirname);
console.info('__filename:', __filename);
console.info('import.meta.url:', import.meta.url);

// Load in order of priority (later loads override earlier ones)
dotenv.config({ path: path.join(rootDir, '.env') }); // monorepo .env
dotenv.config({ path: path.join(backendDir, '.env') }); // apps/backend/.env
dotenv.config({ path: path.join(backendDir, '.env.local') }); // apps/backend/.env.local (highest priority)

// Debug output
if (process.env.NODE_ENV !== 'production') {
  console.info('Environment variables loaded from:', backendDir);
  console.info('DATABASE_ENCRYPTION_KEY:', process.env.DATABASE_ENCRYPTION_KEY ? 'Set' : 'Not set');
}

// Basic validation for required variables
const requiredEnvVars = [
  // Worker secret is required to protect private endpoints
  'WORKER_AUTH_SECRET',
  // Variant is required to load the correct variant configuration
  'MEMORIAALI_VARIANT',
  // Shared upload directory (relative to monorepo root)
  'UPLOAD_DIR',
];

for (const key of requiredEnvVars) {
  if (!process.env[key] || String(process.env[key]).trim().length === 0) {
    console.error(`❌ Missing required environment variable: ${key}`);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  }
}

export {};

// Resolve UPLOAD_DIR relative to monorepo root and ensure it exists
const uploadDirRel = process.env.UPLOAD_DIR ?? 'storage/uploads';
const uploadDirAbs = path.resolve(rootDir, uploadDirRel);
try {
  fs.mkdirSync(uploadDirAbs, { recursive: true });
} catch {
  console.error('❌ Failed to ensure UPLOAD_DIR exists at', uploadDirAbs);
  // eslint-disable-next-line n/no-process-exit
  process.exit(1);
}
process.env.UPLOAD_DIR_ABS = uploadDirAbs;
/* eslint-enable n/no-sync */
