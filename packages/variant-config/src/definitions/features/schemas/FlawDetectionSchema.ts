import { z } from 'zod';

/**
 * Flaw Detection feature configuration schema
 */
export const FlawDetectionConfigSchema = z.object({
  feature: z.literal('flawDetection'),
  config: z.object({
    api: z.string(),
    emptyPages: z.boolean(),
    postIt: z.boolean(),
    foldedCorner: z.boolean(),
  }),
});
