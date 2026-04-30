import { z } from 'zod';

/**
 * SIP Worker → Backend progress message schema
 * Defines the payload the archiver posts to report progress.
 */
export const SIPWorkerProgressMessageSchema = z
  .object({
    stage: z.enum([
      'queued',
      'validating',
      'preparing',
      'generating',
      'packaging',
      'finalizing',
      'complete',
      'error',
    ]),
    status: z
      .enum(['pending', 'processing', 'completed', 'failed', 'cancelled'])
      .default('processing'),
    progress: z.number().int().min(0).max(100).default(0),
    message: z.string().min(1).max(1000).optional(),
    timestamp: z.string().datetime().optional(),
  })
  .strict();

/**
 * SIP Worker → Backend completion message schema
 */
export const SIPWorkerCompleteMessageSchema = SIPWorkerProgressMessageSchema.extend({
  stage: z.literal('complete'),
  status: z.literal('completed'),
  progress: z.literal(100),
  result: z
    .object({
      sipPath: z.string().min(1),
      sipId: z.string().min(1),
      size: z.number().int().min(0),
      documentCount: z.number().int().min(0),
    })
    .strict(),
}).strict();

/**
 * SIP Worker → Backend error message schema
 */
export const SIPWorkerErrorMessageSchema = SIPWorkerProgressMessageSchema.extend({
  stage: z.literal('error'),
  status: z.literal('failed'),
  error: z
    .object({
      code: z.string().optional(),
      message: z.string().min(1),
      details: z.unknown().optional(),
    })
    .strict(),
}).strict();

export type SIPWorkerProgressMessage = z.infer<typeof SIPWorkerProgressMessageSchema>;
export type SIPWorkerCompleteMessage = z.infer<typeof SIPWorkerCompleteMessageSchema>;
export type SIPWorkerErrorMessage = z.infer<typeof SIPWorkerErrorMessageSchema>;
