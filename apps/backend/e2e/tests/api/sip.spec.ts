import { app } from '@/index';
import { randomUUID } from 'crypto';
import supertest from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import { BackendAuthService } from '../utils/auth-service';

describe('SIP API - Integration (enqueue + worker callbacks + query)', () => {
  let authService: BackendAuthService;
  let adminToken: string;
  const workerSecret = process.env.WORKER_AUTH_SECRET || 'change-me-strong-secret';

  beforeAll(async () => {
    authService = new BackendAuthService(app);
    adminToken = await authService.getAdminToken();
    expect(authService.isValidJWTFormat(adminToken)).toBe(true);
  });

  it('POST /api/v2/sip/create should enqueue a job and return jobId + sseUrl', async () => {
    const payload = {
      documentIds: [randomUUID()],
      // optional fields omitted for simplicity
    };

    const res = await supertest(app)
      .post('/api/v2/sip/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toBeDefined();
    expect(res.body.data).toBeDefined();
    expect(res.body.data.job).toBeDefined();
    expect(typeof res.body.data.job.jobId).toBe('string');
    expect(typeof res.body.data.sseUrl).toBe('string');
  });

  it('Worker progress/complete updates should reflect in job details', async () => {
    // 1) Enqueue a job
    const payload = { documentIds: [randomUUID()] };
    const createRes = await supertest(app)
      .post('/api/v2/sip/create')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(createRes.status).toBe(201);
    const jobId: string = createRes.body.data.job.jobId;

    // 2) Worker claims next job
    const claimRes = await supertest(app)
      .get('/api/v2/sip/worker/jobs/next')
      .set('x-worker-auth', workerSecret);
    expect(claimRes.status).toBe(200);
    expect(claimRes.body.data.job).toBeDefined();

    // 3) Worker posts progress
    const progressRes = await supertest(app)
      .post(`/api/v2/sip/worker/jobs/${jobId}/progress`)
      .set('x-worker-auth', workerSecret)
      .set('Content-Type', 'application/json')
      .send({
        stage: 'preparing',
        status: 'processing',
        progress: 25,
        message: 'Preparing workspace',
      });
    expect(progressRes.status).toBe(200);

    // 4) Check job details reflect progress
    const detailsAfterProgress = await supertest(app)
      .get(`/api/v2/sip/jobs/${jobId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detailsAfterProgress.status).toBe(200);
    expect(detailsAfterProgress.body.data.stage).toBe('preparing');
    expect(detailsAfterProgress.body.data.progress).toBeGreaterThanOrEqual(25);

    // 5) Worker posts completion
    const completeRes = await supertest(app)
      .post(`/api/v2/sip/worker/jobs/${jobId}/complete`)
      .set('x-worker-auth', workerSecret)
      .set('Content-Type', 'application/json')
      .send({
        stage: 'complete',
        status: 'completed',
        progress: 100,
        message: 'SIP created',
        result: { sipPath: `/storage/${jobId}.zip`, sipId: jobId, size: 12345, documentCount: 1 },
      });
    expect(completeRes.status).toBe(200);

    // 6) Check job details reflect completion
    const detailsAfterComplete = await supertest(app)
      .get(`/api/v2/sip/jobs/${jobId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detailsAfterComplete.status).toBe(200);
    expect(detailsAfterComplete.body.data.stage).toBe('complete');
    expect(detailsAfterComplete.body.data.progress).toBe(100);
    expect(detailsAfterComplete.body.data.downloadUrl).toContain(jobId);
  });
});
