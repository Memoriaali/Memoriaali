import { BackendClient, type ClaimedJob } from '../clients/backend.client';
import { SipPackager } from '../sip/packager';

const getDocumentCount = (payload: unknown): number => {
  if (
    payload &&
    typeof payload === 'object' &&
    'documentIds' in (payload as Record<string, unknown>) &&
    Array.isArray((payload as { documentIds?: unknown }).documentIds)
  ) {
    return ((payload as { documentIds: unknown[] }).documentIds ?? []).length;
  }
  return 0;
};

export const runSipJobOnce = async (client: BackendClient, job: ClaimedJob): Promise<void> => {
  const { jobId } = job;
  const packager = new SipPackager();
  try {
    await client.postProgress(jobId, {
      stage: 'preparing',
      status: 'processing',
      progress: 20,
      message: 'Preparing workspace',
    });
    await new Promise((r) => setTimeout(r, 200));

    await client.postProgress(jobId, {
      stage: 'generating',
      status: 'processing',
      progress: 60,
      message: 'Generating SIP',
    });
    await new Promise((r) => setTimeout(r, 200));
    const baseDocumentIds = getDocumentCount(job.payload)
      ? (job.payload as { documentIds: string[] }).documentIds
      : [];
    const built = await packager.run(jobId, { documentIds: baseDocumentIds }, async (line) => {
      await client.postProgress(jobId, {
        stage: 'packaging',
        status: 'processing',
        progress: 80,
        message: line.slice(0, 200),
      });
    });
    await client.postComplete(jobId, {
      message: 'SIP created',
      result: built,
      stage: 'complete',
      status: 'completed',
      progress: 100,
    });
  } catch (error) {
    await client.postError(jobId, {
      stage: 'error',
      status: 'failed',
      progress: 0,
      message: 'Worker error',
      error: { message: String(error) },
    });
  }
};
