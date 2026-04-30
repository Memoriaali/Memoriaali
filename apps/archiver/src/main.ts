import { BackendClient } from './clients/backend.client';
import { loadArchiverEnv } from './env';
import { runSipJobOnce } from './worker/sip-runner';

export const start = async (): Promise<void> => {
  const env = loadArchiverEnv();
  const client = new BackendClient({ baseUrl: env.backendUrl, workerSecret: env.workerAuthSecret });

  console.log('🚀 Archiver starting...');
  console.log(`📡 Backend URL: ${env.backendUrl}`);
  console.log('🔄 Waiting for backend connection...');

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const job = await client.claimNextJob();
      if (!job) {
        // No job available, wait and retry
        await new Promise((r) => setTimeout(r, 5000)); // Wait 5 seconds
        continue;
      }
      console.log(`📦 Processing job: ${job.jobId}`);
      await runSipJobOnce(client, job);
    } catch (error) {
      // Handle axios errors specifically
      if (error && typeof error === 'object' && 'code' in error) {
        const axiosError = error as { code?: string; message?: string };
        if (axiosError.code === 'ECONNREFUSED') {
          console.log('🔌 Backend not available, waiting for connection...');
        } else if (axiosError.code === 'ETIMEDOUT' || axiosError.message?.includes('timeout')) {
          console.log('⏱️ Request timeout, retrying...');
        } else {
          console.error('❌ Network error:', axiosError.code || axiosError.message || 'Unknown');
        }
      } else if (error instanceof Error) {
        const errorMessage = error.message || error.toString();
        if (errorMessage.includes('ECONNREFUSED')) {
          console.log('🔌 Backend not available, waiting for connection...');
        } else if (errorMessage.includes('timeout')) {
          console.log('⏱️ Request timeout, retrying...');
        } else {
          console.error('❌ Error in archiver loop:', errorMessage);
        }
      } else {
        console.error('❌ Unknown error in archiver loop:', error);
      }
      console.log('⏳ Retrying in 10 seconds...');
      await new Promise((r) => setTimeout(r, 10000)); // Wait 10 seconds before retry
    }
  }
};

// Run if invoked directly
// eslint-disable-next-line n/no-process-env
if (process.env.NODE_ENV !== 'test') {
  start().catch((err) => {
    // eslint-disable-next-line no-console
    console.error('Archiver crashed', err);
    // eslint-disable-next-line n/no-process-exit
    process.exit(1);
  });
}
