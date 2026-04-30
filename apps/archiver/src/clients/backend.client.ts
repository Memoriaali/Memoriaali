import {
  SIPWorkerCompleteMessageSchema,
  SIPWorkerErrorMessageSchema,
  SIPWorkerProgressMessageSchema,
  type SIPWorkerCompleteMessage,
  type SIPWorkerErrorMessage,
  type SIPWorkerProgressMessage,
} from '@memoriaali/api-types/schemas';
import axios, { type AxiosInstance } from 'axios';

export interface ClaimedJob {
  jobId: string;
  payload: unknown;
}

const isClaimResponse = (
  value: unknown,
): value is { data: { job: { jobId: string; payload?: unknown } | null } } => {
  if (!value || typeof value !== 'object') return false;
  const data = (value as { data?: unknown }).data;
  if (!data || typeof data !== 'object') return false;
  const job = (data as { job?: unknown }).job;
  if (job == null) return true; // allow null (no job)
  if (typeof job !== 'object') return false;
  const jobId = (job as { jobId?: unknown }).jobId;
  return typeof jobId === 'string';
};

export class BackendClient {
  private readonly http: AxiosInstance;

  constructor(params: { baseUrl: string; workerSecret: string }) {
    this.http = axios.create({
      baseURL: params.baseUrl,
      headers: { 'x-worker-auth': params.workerSecret },
      validateStatus: () => true,
      timeout: 10000, // 10 second timeout
    });
  }

  async claimNextJob(): Promise<ClaimedJob | null> {
    try {
      const res = await this.http.get('/api/v2/sip/worker/jobs/next');
      if (res.status !== 200) {
        return null;
      }
      const job = res.data.data.job;
      if (!isClaimResponse(res.data)) {
        return null;
      }
      if (!job) {
        return null;
      }
      return { jobId: job.jobId, payload: job.payload };
    } catch (error) {
      // Re-throw connection errors so they can be handled by the main loop
      throw error;
    }
  }

  async postProgress(jobId: string, payload: SIPWorkerProgressMessage): Promise<void> {
    const body = SIPWorkerProgressMessageSchema.parse(payload);
    await this.http.post(`/api/v2/sip/worker/jobs/${jobId}/progress`, body);
  }

  async postComplete(jobId: string, payload: SIPWorkerCompleteMessage): Promise<void> {
    const body = SIPWorkerCompleteMessageSchema.parse(payload);
    await this.http.post(`/api/v2/sip/worker/jobs/${jobId}/complete`, body);
  }

  async postError(jobId: string, payload: SIPWorkerErrorMessage): Promise<void> {
    const body = SIPWorkerErrorMessageSchema.parse(payload);
    await this.http.post(`/api/v2/sip/worker/jobs/${jobId}/error`, body);
  }
}
